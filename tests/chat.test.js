import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import chatHandler from '../api/chat.js';

let fetchMock;

// Crea solicitudes HTTP de prueba sin depender de un servidor real.
function createChatRequest(body, method = 'POST') {
  return new Request('http://localhost/api/chat', {
    method,
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(body),
  });
}

// Aísla cada prueba de la clave y de la red externas.
beforeEach(() => {
  vi.stubEnv('GEMINI_API_KEY', 'clave-simulada-para-pruebas');
  fetchMock = vi.fn();
  vi.stubGlobal('fetch', fetchMock);
});

afterEach(() => {
  vi.unstubAllEnvs();
  vi.unstubAllGlobals();
  vi.restoreAllMocks();
});

describe('endpoint del chat con Gemini', () => {
  it('rechaza métodos distintos de POST', async () => {
    const response = await chatHandler.fetch(
      createChatRequest(undefined, 'GET')
    );

    expect(response.status).toBe(405);
    expect(response.headers.get('Allow')).toBe('POST');
    expect(fetchMock).not.toHaveBeenCalled();
  });

  it('responde con error si falta la clave de Gemini', async () => {
    vi.stubEnv('GEMINI_API_KEY', '');

    const response = await chatHandler.fetch(
      createChatRequest({ messages: [{ role: 'user', text: 'Hola' }] })
    );

    expect(response.status).toBe(503);
    expect(await response.json()).toMatchObject({
      error: expect.stringContaining('GEMINI_API_KEY'),
    });
    expect(fetchMock).not.toHaveBeenCalled();
  });

  it('rechaza solicitudes cuyo cuerpo no es JSON válido', async () => {
    const request = new Request('http://localhost/api/chat', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: '{json roto',
    });

    const response = await chatHandler.fetch(request);

    expect(response.status).toBe(400);
    expect(fetchMock).not.toHaveBeenCalled();
  });

  it('rechaza historiales inválidos antes de llamar a Gemini', async () => {
    const response = await chatHandler.fetch(
      createChatRequest({
        messages: [
          { role: 'user', text: 'Hola' },
          { role: 'assistant', text: '¡Hola!' },
        ],
      })
    );

    expect(response.status).toBe(400);
    expect(fetchMock).not.toHaveBeenCalled();
  });

  it('transforma el historial y devuelve el texto generado', async () => {
    fetchMock.mockResolvedValueOnce(
      Response.json({
        candidates: [
          { content: { parts: [{ text: ' ¡Hola ' }, { text: 'de veras! ' }] } },
        ],
      })
    );
    const messages = [
      { role: 'user', text: '  Hola, Naruto  ' },
      { role: 'assistant', text: '¡Qué bueno verte!' },
      { role: 'user', text: '¿Cómo estás?' },
    ];

    const response = await chatHandler.fetch(createChatRequest({ messages }));
    const requestOptions = fetchMock.mock.calls[0][1];
    const geminiBody = JSON.parse(requestOptions.body);

    expect(response.status).toBe(200);
    expect(await response.json()).toEqual({ reply: '¡Hola de veras!' });
    expect(response.headers.get('Cache-Control')).toBe('no-store');
    expect(requestOptions.headers['x-goog-api-key']).toBe(
      'clave-simulada-para-pruebas'
    );
    expect(geminiBody.contents).toEqual([
      { role: 'user', parts: [{ text: 'Hola, Naruto' }] },
      { role: 'model', parts: [{ text: '¡Qué bueno verte!' }] },
      { role: 'user', parts: [{ text: '¿Cómo estás?' }] },
    ]);
    expect(geminiBody.systemInstruction.parts[0].text).toContain(
      'Eres Naruto Uzumaki'
    );
  });

  it('convierte una respuesta temporal de Gemini en un error recuperable', async () => {
    fetchMock.mockResolvedValueOnce(
      new Response('Servicio ocupado', { status: 503 })
    );

    const response = await chatHandler.fetch(
      createChatRequest({ messages: [{ role: 'user', text: 'Hola' }] })
    );

    expect(response.status).toBe(503);
    expect((await response.json()).error).toContain('Inténtalo de nuevo');
  });

  it('informa cuando Gemini no devuelve texto', async () => {
    fetchMock.mockResolvedValueOnce(
      Response.json({ candidates: [{ content: { parts: [] } }] })
    );

    const response = await chatHandler.fetch(
      createChatRequest({ messages: [{ role: 'user', text: 'Hola' }] })
    );

    expect(response.status).toBe(502);
    expect((await response.json()).error).toContain('respuesta de texto');
  });

  it('responde con timeout si Gemini tarda demasiado', async () => {
    const timeoutError = new Error('Tiempo agotado');
    timeoutError.name = 'TimeoutError';
    fetchMock.mockRejectedValueOnce(timeoutError);

    const response = await chatHandler.fetch(
      createChatRequest({ messages: [{ role: 'user', text: 'Hola' }] })
    );

    expect(response.status).toBe(504);
    expect((await response.json()).error).toContain('tardó demasiado');
  });
});

describe('validaciones y personajes del endpoint', () => {
  const okResponse = () =>
    Response.json({
      candidates: [{ content: { parts: [{ text: 'Listo.' }] } }],
    });

  it('rechaza un personaje que no existe', async () => {
    const response = await chatHandler.fetch(
      createChatRequest({
        characterId: 'sakura',
        messages: [{ role: 'user', text: 'Hola' }],
      })
    );

    expect(response.status).toBe(400);
    expect((await response.json()).error).toContain('personaje');
    expect(fetchMock).not.toHaveBeenCalled();
  });

  it('rechaza historiales con más de 100 mensajes', async () => {
    const messages = Array.from({ length: 101 }, (_, index) => ({
      role: index % 2 === 0 ? 'user' : 'assistant',
      text: `mensaje ${index}`,
    }));

    const response = await chatHandler.fetch(createChatRequest({ messages }));

    expect(response.status).toBe(400);
    expect(fetchMock).not.toHaveBeenCalled();
  });

  it('rechaza mensajes de más de 500 caracteres', async () => {
    const response = await chatHandler.fetch(
      createChatRequest({ messages: [{ role: 'user', text: 'a'.repeat(501) }] })
    );

    expect(response.status).toBe(400);
    expect(fetchMock).not.toHaveBeenCalled();
  });

  it('acepta respuestas largas del personaje dentro del historial', async () => {
    fetchMock.mockResolvedValueOnce(okResponse());
    const messages = [
      { role: 'user', text: 'Cuéntame tu historia' },
      { role: 'assistant', text: 'a'.repeat(800) },
      { role: 'user', text: 'Sigue' },
    ];

    const response = await chatHandler.fetch(createChatRequest({ messages }));

    expect(response.status).toBe(200);
    expect(fetchMock).toHaveBeenCalled();
  });

  it.each([
    ['naruto', 'Eres Naruto Uzumaki'],
    ['sasuke', 'Eres Sasuke Uchiha'],
    ['madara', 'Eres Madara Uchiha'],
    ['kakashi', 'Eres Kakashi Hatake'],
  ])('usa el prompt propio de %s', async (characterId, expectedStart) => {
    fetchMock.mockResolvedValueOnce(okResponse());

    const response = await chatHandler.fetch(
      createChatRequest({
        characterId,
        messages: [{ role: 'user', text: 'Hola' }],
      })
    );
    const geminiBody = JSON.parse(fetchMock.mock.calls[0][1].body);

    expect(response.status).toBe(200);
    expect(geminiBody.systemInstruction.parts[0].text).toContain(expectedStart);
  });

  it('avisa cuando la respuesta de Gemini queda incompleta', async () => {
    fetchMock.mockResolvedValueOnce(
      Response.json({
        candidates: [
          {
            finishReason: 'MAX_TOKENS',
            content: { parts: [{ text: 'Me cor' }] },
          },
        ],
      })
    );

    const response = await chatHandler.fetch(
      createChatRequest({
        characterId: 'kakashi',
        messages: [{ role: 'user', text: 'Hola' }],
      })
    );

    expect(response.status).toBe(502);
    expect((await response.json()).error).toContain('Kakashi');
  });

  it('convierte un error no temporal de Gemini en un 502', async () => {
    fetchMock.mockResolvedValueOnce(
      new Response('Error interno', { status: 500 })
    );

    const response = await chatHandler.fetch(
      createChatRequest({ messages: [{ role: 'user', text: 'Hola' }] })
    );

    expect(response.status).toBe(502);
  });
});

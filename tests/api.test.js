import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { requestCharacterReply } from '../src/api.js';

let fetchMock;

// Aísla cada prueba de la red real.
beforeEach(() => {
  fetchMock = vi.fn();
  vi.stubGlobal('fetch', fetchMock);
});

afterEach(() => {
  vi.unstubAllGlobals();
});

describe('requestCharacterReply', () => {
  it('envía solo rol y texto al endpoint y devuelve la respuesta limpia', async () => {
    fetchMock.mockResolvedValueOnce(Response.json({ reply: '  ¡Hola!  ' }));
    const messages = [
      { role: 'user', text: 'Hola', timestamp: '2026-10-27T10:00:00.000Z' },
    ];

    const reply = await requestCharacterReply('naruto', messages);
    const [url, options] = fetchMock.mock.calls[0];

    expect(reply).toBe('¡Hola!');
    expect(url).toBe('/api/chat');
    expect(JSON.parse(options.body)).toEqual({
      characterId: 'naruto',
      messages: [{ role: 'user', text: 'Hola' }],
    });
  });

  it('limita el contexto a los últimos 100 mensajes', async () => {
    fetchMock.mockResolvedValueOnce(Response.json({ reply: 'Listo' }));
    const messages = Array.from({ length: 121 }, (_, index) => ({
      role: index % 2 === 0 ? 'user' : 'assistant',
      text: `mensaje ${index}`,
    }));

    await requestCharacterReply('sasuke', messages);

    expect(
      JSON.parse(fetchMock.mock.calls[0][1].body).messages.length
    ).toBeLessThanOrEqual(100);
  });

  it('muestra un mensaje en español si falla la conexión', async () => {
    fetchMock.mockRejectedValueOnce(new TypeError('Failed to fetch'));

    await expect(
      requestCharacterReply('naruto', [{ role: 'user', text: 'Hola' }])
    ).rejects.toThrow('No hay conexión');
  });

  it('propaga el mensaje de error que envía el servidor', async () => {
    fetchMock.mockResolvedValueOnce(
      Response.json({ error: 'Gemini está ocupado.' }, { status: 503 })
    );

    await expect(
      requestCharacterReply('naruto', [{ role: 'user', text: 'Hola' }])
    ).rejects.toThrow('Gemini está ocupado.');
  });

  it('detecta respuestas que no son JSON', async () => {
    fetchMock.mockResolvedValueOnce(
      new Response('<html>Error</html>', { status: 500 })
    );

    await expect(
      requestCharacterReply('naruto', [{ role: 'user', text: 'Hola' }])
    ).rejects.toThrow('no devolvió JSON');
  });

  it('rechaza respuestas vacías', async () => {
    fetchMock.mockResolvedValueOnce(Response.json({ reply: '   ' }));

    await expect(
      requestCharacterReply('naruto', [{ role: 'user', text: 'Hola' }])
    ).rejects.toThrow('vacía');
  });
});

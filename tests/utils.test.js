import { describe, expect, it } from 'vitest';
import {
  formatMessageTime,
  getGeminiContext,
  makeId,
  makeTitle,
  sanitizeMessages,
} from '../src/utils.js';

describe('makeTitle', () => {
  it('compacta los espacios y los saltos de línea', () => {
    expect(makeTitle('  Hola   \n  Naruto  ')).toBe('Hola Naruto');
  });

  it('recorta los títulos largos y añade puntos suspensivos', () => {
    expect(makeTitle('a'.repeat(50))).toBe(`${'a'.repeat(36)}…`);
  });
});

describe('sanitizeMessages', () => {
  it('devuelve una lista vacía si el valor no es un arreglo', () => {
    expect(sanitizeMessages(null)).toEqual([]);
    expect(sanitizeMessages('hola')).toEqual([]);
  });

  it('descarta roles inválidos, textos vacíos y textos de más de 500 caracteres', () => {
    const result = sanitizeMessages([
      { role: 'user', text: '  Hola  ', timestamp: '2026-10-27T10:00:00.000Z' },
      { role: 'system', text: 'no permitido' },
      { role: 'assistant', text: '   ' },
      { role: 'user', text: 'a'.repeat(501) },
      null,
    ]);

    expect(result).toEqual([
      { role: 'user', text: 'Hola', timestamp: '2026-10-27T10:00:00.000Z' },
    ]);
  });

  it('acepta respuestas largas del personaje pero no mensajes largos del usuario', () => {
    const result = sanitizeMessages([
      { role: 'assistant', text: 'a'.repeat(800) },
      { role: 'user', text: 'a'.repeat(800) },
    ]);

    expect(result).toHaveLength(1);
    expect(result[0].role).toBe('assistant');
  });

  it('pone timestamp null cuando la fecha no es válida', () => {
    const [message] = sanitizeMessages([
      { role: 'user', text: 'Hola', timestamp: 'ayer' },
    ]);

    expect(message.timestamp).toBeNull();
  });
});

describe('getGeminiContext', () => {
  const buildMessages = (count) =>
    Array.from({ length: count }, (_, index) => ({
      role: index % 2 === 0 ? 'user' : 'assistant',
      text: `mensaje ${index}`,
    }));

  it('no cambia las conversaciones cortas', () => {
    const messages = buildMessages(3);

    expect(getGeminiContext(messages)).toEqual(messages);
  });

  it('envía como máximo los últimos 100 mensajes y nunca empieza con el asistente', () => {
    const context = getGeminiContext(buildMessages(121));

    expect(context.length).toBeLessThanOrEqual(100);
    expect(context[0].role).toBe('user');
    expect(context.at(-1).text).toBe('mensaje 120');
  });
});

describe('formatMessageTime y makeId', () => {
  it('devuelve texto vacío si no hay fecha', () => {
    expect(formatMessageTime(null)).toBe('');
  });

  it('formatea la hora con horas y minutos', () => {
    expect(formatMessageTime('2026-10-27T15:30:00.000Z')).toMatch(
      /\d{1,2}:\d{2}/
    );
  });

  it('genera identificadores distintos', () => {
    expect(makeId()).not.toBe(makeId());
  });
});

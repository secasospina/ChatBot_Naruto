import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { loadConversations, saveConversations } from '../src/storage.js';

const KEY = 'conversaciones-prueba';
const LEGACY_KEY = 'historial-antiguo';
let store;

// Simula localStorage con un objeto en memoria.
beforeEach(() => {
  store = new Map();
  vi.stubGlobal('localStorage', {
    getItem: (key) => (store.has(key) ? store.get(key) : null),
    setItem: (key, value) => store.set(key, String(value)),
    removeItem: (key) => store.delete(key),
  });
});

afterEach(() => {
  vi.unstubAllGlobals();
});

describe('loadConversations', () => {
  it('devuelve un estado vacío cuando no hay nada guardado', () => {
    expect(loadConversations(KEY, LEGACY_KEY)).toEqual({
      conversations: [],
      activeConversationId: null,
      hasStorageError: false,
    });
  });

  it('limpia datos inválidos y ordena de la más reciente a la más antigua', () => {
    store.set(
      KEY,
      JSON.stringify({
        activeConversationId: 'no-existe',
        conversations: [
          {
            id: 'a',
            updatedAt: '2026-10-01T10:00:00.000Z',
            messages: [
              { role: 'user', text: 'Hola' },
              { role: 'system', text: 'x' },
            ],
          },
          { id: 'b', updatedAt: '2026-10-03T10:00:00.000Z', messages: [] },
          {
            id: 'c',
            updatedAt: '2026-10-02T10:00:00.000Z',
            messages: [{ role: 'user', text: 'Otra' }],
          },
        ],
      })
    );

    const result = loadConversations(KEY, LEGACY_KEY);

    expect(result.conversations.map((item) => item.id)).toEqual(['c', 'a']);
    expect(result.conversations[1].messages).toHaveLength(1);
    expect(result.activeConversationId).toBeNull();
    expect(result.hasStorageError).toBe(false);
  });

  it('migra el historial antiguo a una conversación y borra la clave vieja', () => {
    store.set(
      LEGACY_KEY,
      JSON.stringify([
        {
          role: 'user',
          text: 'Hola Naruto',
          timestamp: '2026-09-01T10:00:00.000Z',
        },
        {
          role: 'assistant',
          text: '¡Dattebayo!',
          timestamp: '2026-09-01T10:01:00.000Z',
        },
      ])
    );

    const result = loadConversations(KEY, LEGACY_KEY);

    expect(result.conversations).toHaveLength(1);
    expect(result.conversations[0].title).toBe('Hola Naruto');
    expect(result.activeConversationId).toBe(result.conversations[0].id);
    expect(store.has(LEGACY_KEY)).toBe(false);
    expect(store.has(KEY)).toBe(true);
  });

  it('marca error de almacenamiento si el JSON guardado está roto', () => {
    store.set(KEY, '{json roto');

    expect(loadConversations(KEY, LEGACY_KEY)).toMatchObject({
      conversations: [],
      hasStorageError: true,
    });
  });
});

describe('saveConversations', () => {
  it('guarda las conversaciones y devuelve false si todo salió bien', () => {
    const hadError = saveConversations(KEY, [{ id: 'a', messages: [] }], 'a');

    expect(hadError).toBe(false);
    expect(JSON.parse(store.get(KEY)).activeConversationId).toBe('a');
  });

  it('devuelve true si el navegador no permite guardar', () => {
    vi.stubGlobal('localStorage', {
      setItem: () => {
        throw new Error('Cuota excedida');
      },
    });

    expect(saveConversations(KEY, [], null)).toBe(true);
  });
});

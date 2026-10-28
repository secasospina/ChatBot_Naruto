import { makeId, makeTitle, sanitizeMessages } from './utils.js';

export const LEGACY_STORAGE_PREFIX = 'hokage-chat-history-v1';
export const CONVERSATION_STORAGE_PREFIX = 'hokage-chat-conversations-v2';

// Lee y valida conversaciones, migrando el historial anterior sin perderlo.
export function loadConversations(storageKey, legacyKey) {
  let stored;
  try {
    stored = localStorage.getItem(storageKey);
    if (stored !== null) {
      const parsed = JSON.parse(stored);
      if (!parsed || !Array.isArray(parsed.conversations))
        throw new Error('Formato inválido');
      const conversations = parsed.conversations
        .filter((item) => item && typeof item.id === 'string')
        .map((item) => {
          const messages = sanitizeMessages(item.messages);
          const firstUserMessage = messages.find(
            (message) => message.role === 'user'
          );
          return {
            id: item.id,
            title:
              typeof item.title === 'string'
                ? item.title
                : firstUserMessage
                  ? makeTitle(firstUserMessage.text)
                  : 'Conversación',
            createdAt:
              typeof item.createdAt === 'string'
                ? item.createdAt
                : new Date().toISOString(),
            updatedAt:
              typeof item.updatedAt === 'string'
                ? item.updatedAt
                : new Date().toISOString(),
            messages,
          };
        })
        .filter((item) => item.messages.length > 0)
        .sort((a, b) => Date.parse(b.updatedAt) - Date.parse(a.updatedAt));
      const activeConversationId = conversations.some(
        (item) => item.id === parsed.activeConversationId
      )
        ? parsed.activeConversationId
        : null;
      return { conversations, activeConversationId, hasStorageError: false };
    }

    const oldValue = localStorage.getItem(legacyKey);
    if (!oldValue)
      return {
        conversations: [],
        activeConversationId: null,
        hasStorageError: false,
      };
    const messages = sanitizeMessages(JSON.parse(oldValue));
    if (!messages.length)
      return {
        conversations: [],
        activeConversationId: null,
        hasStorageError: false,
      };
    const firstUserMessage = messages.find(
      (message) => message.role === 'user'
    );
    const now = new Date().toISOString();
    const migrated = {
      id: makeId(),
      title: firstUserMessage
        ? makeTitle(firstUserMessage.text)
        : 'Conversación anterior',
      createdAt: messages[0].timestamp || now,
      updatedAt: messages.at(-1).timestamp || now,
      messages,
    };
    const result = {
      conversations: [migrated],
      activeConversationId: migrated.id,
    };
    localStorage.setItem(storageKey, JSON.stringify(result));
    localStorage.removeItem(legacyKey);
    return { ...result, hasStorageError: false };
  } catch {
    return {
      conversations: [],
      activeConversationId: null,
      hasStorageError: true,
    };
  }
}

// Guarda la lista de conversaciones sin interrumpir la conversación activa.
// Devuelve true si hubo un error al guardar.
export function saveConversations(
  storageKey,
  conversations,
  activeConversationId
) {
  try {
    localStorage.setItem(
      storageKey,
      JSON.stringify({ conversations, activeConversationId })
    );
    return false;
  } catch {
    return true;
  }
}

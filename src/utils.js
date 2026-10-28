// Funciones puras de apoyo: no tocan el DOM ni la red, así que son fáciles de probar.
export const MAX_CONTEXT_MESSAGES = 100;
export const MAX_USER_MESSAGE_LENGTH = 500;
export const MAX_ASSISTANT_MESSAGE_LENGTH = 6000;

// El límite de 500 caracteres es para lo que escribe la persona; las respuestas del personaje pueden ser más largas.
function maxLengthFor(role) {
  return role === 'user'
    ? MAX_USER_MESSAGE_LENGTH
    : MAX_ASSISTANT_MESSAGE_LENGTH;
}

// Conserva solo mensajes válidos del historial local.
export function sanitizeMessages(value) {
  if (!Array.isArray(value)) return [];
  return value
    .filter(
      (message) =>
        message &&
        ['user', 'assistant'].includes(message.role) &&
        typeof message.text === 'string' &&
        message.text.trim().length > 0 &&
        message.text.trim().length <= maxLengthFor(message.role)
    )
    .map(({ role, text, timestamp }) => ({
      role,
      text: text.trim(),
      timestamp:
        typeof timestamp === 'string' && !Number.isNaN(Date.parse(timestamp))
          ? timestamp
          : null,
    }));
}

// Crea un título breve a partir del primer mensaje del usuario.
export function makeTitle(text) {
  const title = text.replace(/\s+/g, ' ').trim();
  return title.length > 36 ? `${title.slice(0, 36).trimEnd()}…` : title;
}

// Genera un identificador único compatible con navegadores modernos.
export function makeId() {
  return (
    globalThis.crypto?.randomUUID?.() ??
    `${Date.now()}-${Math.random().toString(16).slice(2)}`
  );
}

// Formatea la hora local de cada mensaje.
export function formatMessageTime(timestamp) {
  if (!timestamp) return '';
  return new Intl.DateTimeFormat('es-CO', {
    hour: '2-digit',
    minute: '2-digit',
  }).format(new Date(timestamp));
}

// Limita el contexto enviado al modelo y evita que empiece con una respuesta del asistente.
export function getGeminiContext(messages) {
  const context = messages.slice(-MAX_CONTEXT_MESSAGES);
  return context[0]?.role === 'assistant' ? context.slice(1) : context;
}

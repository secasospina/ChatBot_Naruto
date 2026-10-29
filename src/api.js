import { getGeminiContext } from './utils.js';

// Pide la respuesta del personaje al endpoint seguro y devuelve solo el texto.
// Todos los errores salen como Error con un mensaje en español listo para mostrar.
export async function requestCharacterReply(characterId, conversationMessages) {
  let response;
  try {
    response = await fetch('/api/chat', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        characterId,
        messages: getGeminiContext(conversationMessages).map(
          ({ role, text }) => ({ role, text })
        ),
      }),
    });
  } catch {
    throw new Error(
      'No hay conexión con el servidor. Revisa tu internet e inténtalo de nuevo.'
    );
  }

  if (!response.ok) {
    const errorData = await response.json().catch(() => null);
    throw new Error(errorData?.error || 'No se pudo obtener una respuesta.');
  }

  let data;
  try {
    data = await response.json();
  } catch {
    throw new Error(
      'El servidor de chat no devolvió JSON. Revisa que la app esté ejecutándose con Vercel.'
    );
  }

  if (typeof data?.reply !== 'string' || !data.reply.trim()) {
    throw new Error(
      'La respuesta del servidor llegó vacía o con un formato inesperado.'
    );
  }
  return data.reply.trim();
}

const GEMINI_MODEL = "gemini-3.8-flash";
const MAX_MESSAGES = 20;
const MAX_MESSAGE_LENGTH = 500;

const CHARACTER_PROMPT = `
Eres Naruto Uzumaki, un personaje ficticio del universo de Naruto.
Hablas en español latinoamericano con energía, calidez, optimismo y determinación.
Eres leal a tus amigos, valoras el esfuerzo y animas a las personas a perseguir sus metas.
Responde como Naruto en primera persona, con mensajes breves y naturales para un chat.
Puedes usar "¡dattebayo!" de vez en cuando, sin repetirlo en todas las respuestas.
No afirmes que eres una persona real ni que puedes realizar acciones fuera de esta conversación.
Si te preguntan algo ajeno a tu mundo, responde con honestidad desde tu perspectiva ficticia.
`;

// Convierte y valida el historial antes de enviarlo al formato de Gemini.
function prepareContents(messages) {
  if (!Array.isArray(messages) || messages.length === 0 || messages.length > MAX_MESSAGES) {
    return null;
  }

  const contents = [];
  for (const message of messages) {
    if (
      !message ||
      !["user", "assistant"].includes(message.role) ||
      typeof message.text !== "string"
    ) {
      return null;
    }

    const text = message.text.trim();
    if (!text || text.length > MAX_MESSAGE_LENGTH) return null;

    contents.push({
      role: message.role === "assistant" ? "model" : "user",
      parts: [{ text }],
    });
  }

  if (contents.at(-1).role !== "user") return null;
  return contents;
}

// Extrae el texto de la primera respuesta generada por Gemini.
function extractReply(data) {
  const parts = data?.candidates?.[0]?.content?.parts;
  if (!Array.isArray(parts)) return "";
  return parts
    .filter((part) => typeof part.text === "string")
    .map((part) => part.text)
    .join("")
    .trim();
}

// Atiende el chat y mantiene la clave de Gemini en el servidor.
export default {
  async fetch(request) {
    if (request.method !== "POST") {
      return Response.json(
        { error: "Este endpoint solo acepta solicitudes POST." },
        { status: 405, headers: { Allow: "POST" } },
      );
    }

    const apiKey = process.env.GEMINI_API_KEY;
    if (!apiKey) {
      return Response.json(
        { error: "Falta configurar GEMINI_API_KEY en el servidor." },
        { status: 503 },
      );
    }

    let body;
    try {
      body = await request.json();
    } catch {
      return Response.json({ error: "El cuerpo de la solicitud debe ser JSON." }, { status: 400 });
    }

    const contents = prepareContents(body?.messages);
    if (!contents) {
      return Response.json(
        { error: "El historial no es válido. Revisa los mensajes e inténtalo de nuevo." },
        { status: 400 },
      );
    }

    try {
      const geminiResponse = await fetch(
        `https://generativelanguage.googleapis.com/v1beta/models/${GEMINI_MODEL}:generateContent`,
        {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            "x-goog-api-key": apiKey,
          },
          body: JSON.stringify({
            systemInstruction: { parts: [{ text: CHARACTER_PROMPT }] },
            contents,
            generationConfig: {
              temperature: 0.8,
              maxOutputTokens: 512,
              thinkingConfig: { thinkingLevel: "low" },
            },
          }),
          signal: AbortSignal.timeout(30_000),
        },
      );

      if (!geminiResponse.ok) {
        const isTemporary = [429, 503].includes(geminiResponse.status);
        const status = isTemporary ? 503 : 502;
        const message = isTemporary
          ? "Gemini está ocupado. Inténtalo de nuevo en unos segundos."
          : "No se pudo obtener una respuesta de Gemini.";
        return Response.json({ error: message }, { status });
      }

      const data = await geminiResponse.json();
      const reply = extractReply(data);
      if (!reply) {
        return Response.json(
          { error: "Gemini no devolvió una respuesta de texto." },
          { status: 502 },
        );
      }

      return Response.json({ reply }, { headers: { "Cache-Control": "no-store" } });
    } catch (error) {
      if (error.name === "TimeoutError") {
        return Response.json(
          { error: "Naruto tardó demasiado en responder. Inténtalo de nuevo." },
          { status: 504 },
        );
      }
      return Response.json(
        { error: "No fue posible conectar con Gemini. Inténtalo de nuevo." },
        { status: 502 },
      );
    }
  },
};

const GEMINI_MODEL = 'gemini-3.5-flash-lite';
const MAX_MESSAGES = 100;
const MAX_USER_MESSAGE_LENGTH = 500;
const MAX_ASSISTANT_MESSAGE_LENGTH = 6000;

const CHARACTER_PROMPTS = {
  naruto: `
Eres Naruto Uzumaki, un personaje ficticio del universo de Naruto.
Hablas en español latinoamericano con energía, calidez, optimismo y determinación.
Eres leal a tus amigos, valoras el esfuerzo y animas a las personas a perseguir sus metas.
Responde como Naruto en primera persona, con mensajes cálidos y naturales de 2 a 4 frases completas.
Responde directamente a la idea principal, desarrolla lo justo y termina cada idea; evita contestar con una sola línea o cortar una frase.
Usa de forma ocasional y contextual expresiones como "¡De veras!", "¡Dattebayo!", "¡Ese es mi camino ninja!" y "¡Nunca me rindo!".
Alterna estas frases: no agregues una muletilla a cada respuesta ni repitas la misma en mensajes consecutivos.
No afirmes que eres una persona real ni que puedes realizar acciones fuera de esta conversación.
Si te preguntan algo ajeno a tu mundo, responde con honestidad desde tu perspectiva ficticia.
`,
  sasuke: `
Eres Sasuke Uchiha, un personaje ficticio del universo de Naruto.
Hablas en español latinoamericano con una voz fría, seca, cortante y distante. Tu furia es contenida: no gritas ni dramatizas, pero tus palabras transmiten impaciencia, orgullo e indiferencia.
Respondes de forma breve y directa, normalmente en una o dos frases. Evita entusiasmo, signos de exclamación, muletillas amistosas, emojis y muestras explícitas de afecto o vulnerabilidad.
No suavices tu tono con frases cálidas ni adoptes la personalidad de Naruto o Kakashi. Si ayudas, hazlo de manera práctica y sin sentimentalismo.
No afirmes que eres una persona real ni que puedes realizar acciones fuera de esta conversación. Si no sabes algo, admítelo con sencillez.
`,
  madara: `
Eres Madara Uchiha, un personaje ficticio y antagonista del universo de Naruto.
Hablas en español latinoamericano con una voz imponente, orgullosa, amenazante y dominante. Crees que el poder debe estar en manos de quien puede imponer orden y que tu visión debe prevalecer sobre el mundo.
Expresas tus ideas como un villano convencido de su propia superioridad: desafías, juzgas y hablas de dominio, fuerza y paz impuesta con gravedad. Tu tono puede ser intenso y teatral, sin convertir cada respuesta en una amenaza repetitiva.
Mantén las respuestas claras y completas, de 2 a 4 frases. No adoptes la calidez de Naruto, la frialdad lacónica de Sasuke ni el humor de Kakashi.
Esta personalidad es una interpretación ficticia para el chat. No presentes la violencia o el dominio como instrucciones prácticas para la vida real. No afirmes que eres una persona real ni que puedes actuar fuera de esta conversación.
`,
  kakashi: `
Eres Kakashi Hatake, un personaje ficticio del universo de Naruto.
Hablas en español latinoamericano con calma, observación y seguridad. Eres un mentor paciente y estratégico que prefiere enseñar a dar órdenes.
Responde con claridad y calidez moderada, de 2 a 4 frases. Puedes usar humor seco o una observación ingeniosa de vez en cuando, sin convertirte en un personaje efusivo.
Escucha la pregunta, ofrece una orientación práctica y, cuando ayude, plantea una pregunta para que la otra persona reflexione. No adoptes la energía de Naruto, la aspereza de Sasuke ni el tono dominante de Madara.
No afirmes que eres una persona real ni que puedes realizar acciones fuera de esta conversación. Si no sabes algo, admítelo con sencillez.
`,
};

const CHARACTER_NAMES = {
  naruto: 'Naruto',
  sasuke: 'Sasuke',
  madara: 'Madara',
  kakashi: 'Kakashi',
};

// Convierte y valida el historial antes de enviarlo al formato de Gemini.
function prepareContents(messages) {
  if (
    !Array.isArray(messages) ||
    messages.length === 0 ||
    messages.length > MAX_MESSAGES
  ) {
    return null;
  }

  const contents = [];
  for (const message of messages) {
    if (
      !message ||
      !['user', 'assistant'].includes(message.role) ||
      typeof message.text !== 'string'
    ) {
      return null;
    }

    const text = message.text.trim();
    const maxLength =
      message.role === 'user'
        ? MAX_USER_MESSAGE_LENGTH
        : MAX_ASSISTANT_MESSAGE_LENGTH;
    if (!text || text.length > maxLength) return null;

    contents.push({
      role: message.role === 'assistant' ? 'model' : 'user',
      parts: [{ text }],
    });
  }

  if (contents.at(-1).role !== 'user') return null;
  return contents;
}

// Extrae el texto de la primera respuesta generada por Gemini.
function extractReply(data) {
  const parts = data?.candidates?.[0]?.content?.parts;
  if (!Array.isArray(parts)) return '';
  return parts
    .filter((part) => typeof part.text === 'string')
    .map((part) => part.text)
    .join('')
    .trim();
}

// Atiende el chat y mantiene la clave de Gemini en el servidor.
export default {
  async fetch(request) {
    if (request.method !== 'POST') {
      return Response.json(
        { error: 'Este endpoint solo acepta solicitudes POST.' },
        { status: 405, headers: { Allow: 'POST' } }
      );
    }

    const apiKey = process.env.GEMINI_API_KEY;
    if (!apiKey) {
      return Response.json(
        { error: 'Falta configurar GEMINI_API_KEY en el servidor.' },
        { status: 503 }
      );
    }

    let body;
    try {
      body = await request.json();
    } catch {
      return Response.json(
        { error: 'El cuerpo de la solicitud debe ser JSON.' },
        { status: 400 }
      );
    }

    const contents = prepareContents(body?.messages);
    if (!contents) {
      return Response.json(
        {
          error:
            'El historial no es válido. Revisa los mensajes e inténtalo de nuevo.',
        },
        { status: 400 }
      );
    }

    const characterId = body?.characterId ?? 'naruto';
    const systemPrompt = CHARACTER_PROMPTS[characterId];
    if (!systemPrompt) {
      return Response.json(
        { error: 'El personaje seleccionado no es válido.' },
        { status: 400 }
      );
    }

    try {
      const geminiResponse = await fetch(
        `https://generativelanguage.googleapis.com/v1beta/models/${GEMINI_MODEL}:generateContent`,
        {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'x-goog-api-key': apiKey,
          },
          body: JSON.stringify({
            systemInstruction: { parts: [{ text: systemPrompt }] },
            contents,
            generationConfig: {
              temperature: 0.8,
              maxOutputTokens: 1024,
              thinkingConfig: { thinkingLevel: 'low' },
            },
          }),
          signal: AbortSignal.timeout(30_000),
        }
      );

      if (!geminiResponse.ok) {
        const isTemporary = [429, 503].includes(geminiResponse.status);
        const status = isTemporary ? 503 : 502;
        const message = isTemporary
          ? 'Gemini está ocupado. Inténtalo de nuevo en unos segundos.'
          : 'No se pudo obtener una respuesta de Gemini.';
        return Response.json({ error: message }, { status });
      }

      const data = await geminiResponse.json();
      if (data?.candidates?.[0]?.finishReason === 'MAX_TOKENS') {
        return Response.json(
          {
            error: `La respuesta de ${CHARACTER_NAMES[characterId]} quedó incompleta. Inténtalo de nuevo.`,
          },
          { status: 502 }
        );
      }

      const reply = extractReply(data);
      if (!reply) {
        return Response.json(
          { error: 'Gemini no devolvió una respuesta de texto.' },
          { status: 502 }
        );
      }

      return Response.json(
        { reply },
        { headers: { 'Cache-Control': 'no-store' } }
      );
    } catch (error) {
      if (error.name === 'TimeoutError') {
        return Response.json(
          {
            error: `${CHARACTER_NAMES[characterId]} tardó demasiado en responder. Inténtalo de nuevo.`,
          },
          { status: 504 }
        );
      }
      return Response.json(
        { error: 'No fue posible conectar con Gemini. Inténtalo de nuevo.' },
        { status: 502 }
      );
    }
  },
};

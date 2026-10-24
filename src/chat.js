let messages = [];
let isSending = false;

const greeting = {
  role: "assistant",
  text: "¡Hola! Soy Naruto Uzumaki. ¿Cuál es tu sueño? ¡Nunca te rindas!",
};

// Dibuja el historial del chat y desplaza la lista al último mensaje.
function renderMessages(list) {
  list.replaceChildren();

  [greeting, ...messages].forEach(({ role, text }) => {
    const message = document.createElement("article");
    message.className = `message message--${role}`;

    const author = document.createElement("span");
    author.className = "message-author";
    author.textContent = role === "user" ? "Tú" : "Naruto";

    const body = document.createElement("p");
    body.className = "message-text";
    body.textContent = text;

    message.append(author, body);
    list.append(message);
  });

  list.scrollTop = list.scrollHeight;
}

// Conecta el formulario del chat con la ruta del servidor /api/chat.
export function setupChat(root) {
  const list = root.querySelector("[data-chat-messages]");
  const form = root.querySelector("[data-chat-form]");
  const input = form.elements.message;
  const sendButton = root.querySelector("[data-send-button]");
  const status = root.querySelector("[data-chat-status]");
  const error = root.querySelector("[data-chat-error]");

  renderMessages(list);

  // Envía el mensaje, actualiza los estados y muestra la respuesta o el error.
  form.addEventListener("submit", async (event) => {
    event.preventDefault();
    const text = input.value.trim();
    if (!text || isSending) return;

    messages.push({ role: "user", text });
    renderMessages(list);
    form.reset();
    error.hidden = true;
    error.textContent = "";
    isSending = true;
    input.disabled = true;
    sendButton.disabled = true;
    status.textContent = "Naruto está pensando...";

    try {
      const response = await fetch("/api/chat", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ messages }),
      });
      let data;
      try {
        data = await response.json();
      } catch {
        throw new Error("El servidor de chat no devolvió JSON. Revisa que la app esté ejecutándose con Vercel.");
      }

      if (!response.ok) {
        throw new Error(data.error || "No se pudo obtener una respuesta.");
      }
      if (typeof data.reply !== "string" || !data.reply.trim()) {
        throw new Error("La respuesta del servidor llegó vacía o con un formato inesperado.");
      }

      messages.push({ role: "assistant", text: data.reply.trim() });
      renderMessages(list);
    } catch (requestError) {
      error.textContent = requestError.message || "Ocurrió un error al enviar el mensaje.";
      error.hidden = false;
    } finally {
      isSending = false;
      input.disabled = false;
      sendButton.disabled = false;
      status.textContent = "";
      input.focus();
    }
  });
}

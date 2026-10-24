let messages = [];
let isSending = false;

const greeting = {
  role: "assistant",
  text: "¡Hola! Soy Naruto Uzumaki. ¿Cuál es tu sueño? ¡Nunca te rindas!",
};

// Dibuja el historial del chat y desplaza la lista al último mensaje.
function renderMessages(list) {
  const typing = list.querySelector("[data-chat-typing]");
  list.replaceChildren();

  [greeting, ...messages].forEach(({ role, text }) => {
    const row = document.createElement("div");
    row.className = `message-row message-row--${role}`;

    if (role === "assistant") row.append(createNarutoAvatar());

    const message = document.createElement("article");
    message.className = `message message--${role}`;

    const author = document.createElement("span");
    author.className = "message-author";
    author.textContent = role === "user" ? "Tú" : "Naruto";

    const body = document.createElement("p");
    body.className = "message-text";
    body.textContent = text;

    message.append(author, body);
    row.append(message);
    list.append(row);
  });

  if (typing) list.append(typing);
  list.scrollTop = list.scrollHeight;
}

// Crea el avatar decorativo que identifica los mensajes de Naruto.
function createNarutoAvatar() {
  const avatar = document.createElement("img");
  avatar.className = "chat-avatar";
  avatar.src = "/assets/naruto-avatar.jpg";
  avatar.alt = "";
  avatar.setAttribute("aria-hidden", "true");
  return avatar;
}

// Conecta el formulario del chat con la ruta del servidor /api/chat.
export function setupChat(root) {
  const list = root.querySelector("[data-chat-messages]");
  const form = root.querySelector("[data-chat-form]");
  const input = form.elements.message;
  const sendButton = root.querySelector("[data-send-button]");
  const typing = root.querySelector("[data-chat-typing]");
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
    typing.hidden = false;
    list.scrollTop = list.scrollHeight;

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
      typing.hidden = true;
      input.focus();
    }
  });
}

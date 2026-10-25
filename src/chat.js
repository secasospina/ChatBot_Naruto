let messages = [];
let isSending = false;
let isHistorySaved = false;
let hasStorageError = false;
const CHAT_STORAGE_KEY = "hokage-chat-history-v1";
const MAX_CONTEXT_MESSAGES = 20;
const MAX_MESSAGE_LENGTH = 500;

const greeting = {
  role: "assistant",
  text: "¡Hola! Soy Naruto Uzumaki. ¿Cuál es tu sueño? ¡Nunca te rindas!",
};

// Elimina solo el historial de esta aplicación del almacenamiento del navegador.
function removeSavedMessages() {
  try {
    localStorage.removeItem(CHAT_STORAGE_KEY);
    return true;
  } catch {
    return false;
  }
}

// Recupera el historial guardado y descarta datos que no tengan el formato esperado.
function loadMessages() {
  let savedMessages;
  try {
    savedMessages = localStorage.getItem(CHAT_STORAGE_KEY);
  } catch {
    hasStorageError = true;
    isHistorySaved = false;
    return [];
  }

  if (!savedMessages) {
    hasStorageError = false;
    isHistorySaved = false;
    return [];
  }

  let parsedMessages;
  try {
    parsedMessages = JSON.parse(savedMessages);
  } catch {
    hasStorageError = !removeSavedMessages();
    isHistorySaved = false;
    return [];
  }

  if (!Array.isArray(parsedMessages)) {
    hasStorageError = !removeSavedMessages();
    isHistorySaved = false;
    return [];
  }

  const validMessages = parsedMessages
    .filter((message) =>
      message &&
      ["user", "assistant"].includes(message.role) &&
      typeof message.text === "string" &&
      message.text.trim().length > 0 &&
      message.text.trim().length <= MAX_MESSAGE_LENGTH,
    )
    .map(({ role, text, timestamp }) => ({
      role,
      text: text.trim(),
      timestamp: typeof timestamp === "string" && !Number.isNaN(Date.parse(timestamp))
        ? timestamp
        : null,
    }));

  hasStorageError = false;
  isHistorySaved = validMessages.length > 0;
  return validMessages;
}

// Guarda el historial localmente sin interrumpir el chat si el navegador lo bloquea.
function saveMessages(history = messages) {
  try {
    localStorage.setItem(CHAT_STORAGE_KEY, JSON.stringify(history));
    isHistorySaved = history.length > 0;
    hasStorageError = false;
    return true;
  } catch {
    // El chat puede continuar aunque el almacenamiento local no esté disponible.
    isHistorySaved = false;
    hasStorageError = true;
    return false;
  }
}

// Actualiza el indicador visible y activa el botón solo cuando hay mensajes.
function updateHistoryStatus(status, statusText, clearButton) {
  if (hasStorageError) {
    status.dataset.state = "error";
    statusText.textContent = "No se pudo guardar o borrar el historial";
  } else if (isHistorySaved) {
    status.dataset.state = "saved";
    statusText.textContent = "Historial guardado en este navegador";
  } else {
    status.dataset.state = "empty";
    statusText.textContent = "Aún no hay historial guardado";
  }

  clearButton.disabled = messages.length === 0;
}

// Envía a Gemini como máximo los últimos 20 mensajes aceptados por el endpoint.
function getGeminiContext() {
  const context = messages.slice(-MAX_CONTEXT_MESSAGES);
  return context[0]?.role === "assistant" ? context.slice(1) : context;
}

// Formatea la hora local del mensaje para mostrarla de forma breve.
function formatMessageTime(timestamp) {
  if (!timestamp) return "";
  return new Intl.DateTimeFormat("es-CO", {
    hour: "2-digit",
    minute: "2-digit",
  }).format(new Date(timestamp));
}

// Dibuja el historial del chat y desplaza la lista al último mensaje.
function renderMessages(list) {
  const typing = list.querySelector("[data-chat-typing]");
  list.replaceChildren();

  [greeting, ...messages].forEach(({ role, text, timestamp }) => {
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
    const messageTime = formatMessageTime(timestamp);
    if (messageTime) {
      const time = document.createElement("time");
      time.className = "message-time";
      time.dateTime = timestamp;
      time.textContent = messageTime;
      message.append(time);
    }
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
  const historyStatus = root.querySelector("[data-history-status]");
  const historyStatusText = root.querySelector("[data-history-status-text]");
  const clearHistoryButton = root.querySelector("[data-clear-history]");

  messages = loadMessages();
  updateHistoryStatus(historyStatus, historyStatusText, clearHistoryButton);
  renderMessages(list);

  // Borra el historial guardado solo después de confirmar la acción.
  clearHistoryButton.addEventListener("click", () => {
    if (!messages.length) return;
    const confirmed = window.confirm(
      "¿Quieres borrar el historial de esta conversación? Esta acción no se puede deshacer.",
    );
    if (!confirmed) return;
    if (!removeSavedMessages()) {
      hasStorageError = true;
      isHistorySaved = false;
      updateHistoryStatus(historyStatus, historyStatusText, clearHistoryButton);
      return;
    }

    messages = [];
    isHistorySaved = false;
    hasStorageError = false;
    error.hidden = true;
    error.textContent = "";
    updateHistoryStatus(historyStatus, historyStatusText, clearHistoryButton);
    renderMessages(list);
  });

  // Envía el mensaje, actualiza los estados y muestra la respuesta o el error.
  form.addEventListener("submit", async (event) => {
    event.preventDefault();
    const text = input.value.trim();
    if (!text || isSending) return;

    messages.push({ role: "user", text, timestamp: new Date().toISOString() });
    saveMessages();
    updateHistoryStatus(historyStatus, historyStatusText, clearHistoryButton);
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
        body: JSON.stringify({
          messages: getGeminiContext().map(({ role, text }) => ({ role, text })),
        }),
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

      messages.push({
        role: "assistant",
        text: data.reply.trim(),
        timestamp: new Date().toISOString(),
      });
      saveMessages();
      updateHistoryStatus(historyStatus, historyStatusText, clearHistoryButton);
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

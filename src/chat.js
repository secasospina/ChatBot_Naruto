const MAX_CONTEXT_MESSAGES = 20;
const MAX_MESSAGE_LENGTH = 500;
const STORAGE_KEY_PREFIX = "hokage-chat-history-v1";

// Recupera el historial de un personaje y valida cada mensaje antes de mostrarlo.
function loadMessages(storageKey) {
  let savedMessages;
  try {
    savedMessages = localStorage.getItem(storageKey);
  } catch {
    return { messages: [], isSaved: false, hasStorageError: true };
  }

  if (!savedMessages) return { messages: [], isSaved: false, hasStorageError: false };

  let parsedMessages;
  try {
    parsedMessages = JSON.parse(savedMessages);
  } catch {
    try {
      localStorage.removeItem(storageKey);
      return { messages: [], isSaved: false, hasStorageError: false };
    } catch {
      return { messages: [], isSaved: false, hasStorageError: true };
    }
  }

  if (!Array.isArray(parsedMessages)) {
    try {
      localStorage.removeItem(storageKey);
      return { messages: [], isSaved: false, hasStorageError: false };
    } catch {
      return { messages: [], isSaved: false, hasStorageError: true };
    }
  }

  const messages = parsedMessages
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

  return { messages, isSaved: messages.length > 0, hasStorageError: false };
}

// Guarda el historial localmente sin interrumpir el chat si el navegador lo bloquea.
function saveMessages(messages, storageKey) {
  try {
    localStorage.setItem(storageKey, JSON.stringify(messages));
    return { isSaved: messages.length > 0, hasStorageError: false };
  } catch {
    // El chat puede continuar aunque el almacenamiento local no esté disponible.
    return { isSaved: false, hasStorageError: true };
  }
}

// Actualiza el indicador y habilita el borrado solo cuando hay historial y no hay una petición activa.
function updateHistoryStatus(status, statusText, clearButton, messages, isSaved, hasStorageError, isSending) {
  if (hasStorageError) {
    status.dataset.state = "error";
    statusText.textContent = "No se pudo guardar o borrar el historial";
  } else if (isSaved) {
    status.dataset.state = "saved";
    statusText.textContent = "Historial guardado en este navegador";
  } else {
    status.dataset.state = "empty";
    statusText.textContent = "Aún no hay historial guardado";
  }

  clearButton.disabled = messages.length === 0 || isSending;
}

// Envía a Gemini como máximo los últimos 20 mensajes, comenzando con el usuario.
function getGeminiContext(messages) {
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

// Dibuja los mensajes del personaje y conserva visible el indicador de escritura.
function renderMessages(list, messages, character) {
  const typing = list.querySelector("[data-chat-typing]");
  list.replaceChildren();

  [{ role: "assistant", text: character.greeting }, ...messages]
    .forEach(({ role, text, timestamp }, index) => {
      const row = document.createElement("div");
      row.className = `message-row message-row--${role}`;

      if (role === "assistant") row.append(createCharacterAvatar(character));

      const message = document.createElement("article");
      message.className = `message message--${role}`;

      const author = document.createElement("span");
      author.className = "message-author";
      author.textContent = role === "user" ? "Tú" : character.name;

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

      if (role === "assistant" && index > 0) {
        const copyButton = document.createElement("button");
        copyButton.className = "message-copy-button";
        copyButton.type = "button";
        copyButton.dataset.copyMessage = String(index - 1);
        copyButton.setAttribute("aria-label", `Copiar respuesta de ${character.name}`);
        copyButton.textContent = "Copiar";
        message.append(copyButton);
      }

      row.append(message);
      list.append(row);
    });

  if (typing) list.append(typing);
  list.scrollTop = list.scrollHeight;
}

// Crea el avatar que identifica las respuestas del personaje en el chat.
function createCharacterAvatar(character) {
  const avatar = document.createElement("img");
  avatar.className = "chat-avatar";
  avatar.src = character.chatAvatar;
  avatar.alt = "";
  avatar.setAttribute("aria-hidden", "true");
  return avatar;
}

// Conecta el formulario con Gemini y mantiene el historial aislado por personaje.
export function setupChat(root, character) {
  const list = root.querySelector("[data-chat-messages]");
  const form = root.querySelector("[data-chat-form]");
  const input = form.elements.message;
  const sendButton = root.querySelector("[data-send-button]");
  const typing = root.querySelector("[data-chat-typing]");
  const error = root.querySelector("[data-chat-error]");
  const copyStatus = root.querySelector("[data-copy-status]");
  const historyStatus = root.querySelector("[data-history-status]");
  const historyStatusText = root.querySelector("[data-history-status-text]");
  const clearHistoryButton = root.querySelector("[data-clear-history]");
  const storageKey = character.id === "naruto"
    ? STORAGE_KEY_PREFIX
    : `${STORAGE_KEY_PREFIX}:${character.id}`;

  let { messages, isSaved, hasStorageError } = loadMessages(storageKey);
  let isSending = false;
  updateHistoryStatus(
    historyStatus, historyStatusText, clearHistoryButton, messages, isSaved, hasStorageError, isSending,
  );
  renderMessages(list, messages, character);

  // Copia una respuesta del personaje y anuncia el resultado para accesibilidad.
  list.addEventListener("click", async (event) => {
    const button = event.target.closest("[data-copy-message]");
    if (!button) return;

    const message = messages[Number(button.dataset.copyMessage)];
    if (!message || message.role !== "assistant") return;

    try {
      await navigator.clipboard.writeText(message.text);
      button.textContent = "Copiado";
      copyStatus.textContent = `Respuesta de ${character.name} copiada al portapapeles.`;
      window.setTimeout(() => {
        if (button.isConnected) button.textContent = "Copiar";
      }, 1600);
    } catch {
      copyStatus.textContent = "No se pudo copiar la respuesta. Revisa los permisos del navegador.";
    }
  });

  // Borra únicamente la conversación del personaje después de confirmar.
  clearHistoryButton.addEventListener("click", () => {
    if (!messages.length || isSending) return;
    const confirmed = window.confirm(
      `¿Quieres borrar el historial de ${character.name}? Esta acción no se puede deshacer.`,
    );
    if (!confirmed) return;

    try {
      localStorage.removeItem(storageKey);
      messages = [];
      isSaved = false;
      hasStorageError = false;
      error.hidden = true;
      error.textContent = "";
      updateHistoryStatus(
        historyStatus, historyStatusText, clearHistoryButton, messages, isSaved, hasStorageError, isSending,
      );
      renderMessages(list, messages, character);
    } catch {
      hasStorageError = true;
      isSaved = false;
      updateHistoryStatus(
        historyStatus, historyStatusText, clearHistoryButton, messages, isSaved, hasStorageError, isSending,
      );
    }
  });

  // Envía el mensaje, actualiza el estado y muestra la respuesta o el error.
  form.addEventListener("submit", async (event) => {
    event.preventDefault();
    const text = input.value.trim();
    if (!text || isSending) return;

    messages.push({ role: "user", text, timestamp: new Date().toISOString() });
    ({ isSaved, hasStorageError } = saveMessages(messages, storageKey));
    isSending = true;
    updateHistoryStatus(
      historyStatus, historyStatusText, clearHistoryButton, messages, isSaved, hasStorageError, isSending,
    );
    renderMessages(list, messages, character);
    form.reset();
    error.hidden = true;
    error.textContent = "";
    input.disabled = true;
    sendButton.disabled = true;
    typing.hidden = false;
    list.scrollTop = list.scrollHeight;

    try {
      const response = await fetch("/api/chat", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          characterId: character.id,
          messages: getGeminiContext(messages).map(({ role, text }) => ({ role, text })),
        }),
      });
      let data;
      try {
        data = await response.json();
      } catch {
        throw new Error("El servidor de chat no devolvió JSON. Revisa que la app esté ejecutándose con Vercel.");
      }

      if (!response.ok) throw new Error(data.error || "No se pudo obtener una respuesta.");
      if (typeof data.reply !== "string" || !data.reply.trim()) {
        throw new Error("La respuesta del servidor llegó vacía o con un formato inesperado.");
      }

      messages.push({ role: "assistant", text: data.reply.trim(), timestamp: new Date().toISOString() });
      ({ isSaved, hasStorageError } = saveMessages(messages, storageKey));
      renderMessages(list, messages, character);
    } catch (requestError) {
      error.textContent = requestError.message || "Ocurrió un error al enviar el mensaje.";
      error.hidden = false;
    } finally {
      isSending = false;
      input.disabled = false;
      sendButton.disabled = false;
      typing.hidden = true;
      updateHistoryStatus(
        historyStatus, historyStatusText, clearHistoryButton, messages, isSaved, hasStorageError, isSending,
      );
      input.focus();
    }
  });
}

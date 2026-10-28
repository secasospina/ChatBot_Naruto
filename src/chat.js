import { requestCharacterReply } from './api.js';
import {
  CONVERSATION_STORAGE_PREFIX,
  LEGACY_STORAGE_PREFIX,
  loadConversations,
  saveConversations,
} from './storage.js';
import { formatMessageTime, makeId, makeTitle } from './utils.js';

// Construye el avatar del personaje para sus mensajes.
function createCharacterAvatar(character) {
  const avatar = document.createElement('img');
  avatar.className = 'chat-avatar';
  avatar.src = character.chatAvatar;
  avatar.alt = '';
  avatar.setAttribute('aria-hidden', 'true');
  return avatar;
}

// Dibuja el saludo, los mensajes, sus horas y el control para copiar respuestas.
function renderMessages(list, messages, character) {
  const typing = list.querySelector('[data-chat-typing]');
  list.replaceChildren();
  [{ role: 'assistant', text: character.greeting }, ...messages].forEach(
    ({ role, text, timestamp }, index) => {
      const row = document.createElement('div');
      row.className = `message-row message-row--${role}`;
      if (role === 'assistant') row.append(createCharacterAvatar(character));
      const article = document.createElement('article');
      article.className = `message message--${role}`;
      const author = document.createElement('span');
      author.className = 'message-author';
      author.textContent = role === 'user' ? 'Tú' : character.name;
      const body = document.createElement('p');
      body.className = 'message-text';
      body.textContent = text;
      article.append(author, body);
      const timeText = formatMessageTime(timestamp);
      if (timeText) {
        const time = document.createElement('time');
        time.className = 'message-time';
        time.dateTime = timestamp;
        time.textContent = timeText;
        article.append(time);
      }
      if (role === 'assistant' && index > 0) {
        const copy = document.createElement('button');
        copy.className = 'message-copy-button';
        copy.type = 'button';
        copy.dataset.copyMessage = String(index - 1);
        copy.setAttribute(
          'aria-label',
          `Copiar respuesta de ${character.name}`
        );
        copy.textContent = 'Copiar';
        article.append(copy);
      }
      row.append(article);
      list.append(row);
    }
  );
  if (typing) list.append(typing);
  list.scrollTop = list.scrollHeight;
}

// Conecta el chat del personaje con el historial local de varias conversaciones.
export function setupChat(root, character) {
  const list = root.querySelector('[data-chat-messages]');
  const form = root.querySelector('[data-chat-form]');
  const input = form.elements.message;
  const sendButton = root.querySelector('[data-send-button]');
  const typing = root.querySelector('[data-chat-typing]');
  const error = root.querySelector('[data-chat-error]');
  const copyStatus = root.querySelector('[data-copy-status]');
  const historyStatus = root.querySelector('[data-history-status]');
  const historyStatusText = root.querySelector('[data-history-status-text]');
  const clearButton = root.querySelector('[data-clear-history]');
  const conversationList = root.querySelector('[data-conversation-list]');
  const newButton = root.querySelector('[data-new-conversation]');
  const currentTitle = root.querySelector('[data-current-conversation-title]');
  const storageKey = `${CONVERSATION_STORAGE_PREFIX}:${character.id}`;
  const legacyKey =
    character.id === 'naruto'
      ? LEGACY_STORAGE_PREFIX
      : `${LEGACY_STORAGE_PREFIX}:${character.id}`;
  const state = loadConversations(storageKey, legacyKey);
  let hasStorageError = state.hasStorageError;
  let isSending = false;

  function activeConversation() {
    return (
      state.conversations.find(
        (conversation) => conversation.id === state.activeConversationId
      ) ?? null
    );
  }

  function persist() {
    hasStorageError = saveConversations(
      storageKey,
      state.conversations,
      state.activeConversationId
    );
  }

  function renderStatus() {
    const active = activeConversation();
    if (hasStorageError) {
      historyStatus.dataset.state = 'error';
      historyStatusText.textContent =
        'No se pudo guardar el historial en este navegador';
    } else if (active) {
      historyStatus.dataset.state = 'saved';
      historyStatusText.textContent = 'Conversación guardada en este navegador';
    } else {
      historyStatus.dataset.state = 'empty';
      historyStatusText.textContent =
        'Chat nuevo; se guardará al enviar un mensaje';
    }
    currentTitle.textContent = active?.title ?? 'Nueva conversación';
    clearButton.disabled = state.conversations.length === 0 || isSending;
    newButton.disabled = isSending;
  }

  function renderConversationList() {
    conversationList.replaceChildren();
    if (!state.conversations.length) {
      const empty = document.createElement('p');
      empty.className = 'conversation-list-empty';
      empty.textContent = 'Tus chats guardados aparecerán aquí.';
      conversationList.append(empty);
    }
    state.conversations.forEach((conversation) => {
      const row = document.createElement('div');
      row.className = 'conversation-item';
      if (conversation.id === state.activeConversationId)
        row.dataset.active = 'true';
      const open = document.createElement('button');
      open.className = 'conversation-open-button';
      open.type = 'button';
      open.dataset.openConversation = conversation.id;
      open.textContent = conversation.title;
      if (conversation.id === state.activeConversationId)
        open.setAttribute('aria-current', 'true');
      open.disabled = isSending;
      const remove = document.createElement('button');
      remove.className = 'conversation-delete-button';
      remove.type = 'button';
      remove.dataset.deleteConversation = conversation.id;
      remove.setAttribute(
        'aria-label',
        `Borrar conversación: ${conversation.title}`
      );
      remove.textContent = '×';
      remove.disabled = isSending;
      row.append(open, remove);
      conversationList.append(row);
    });
    renderStatus();
  }

  function renderCurrentConversation() {
    renderMessages(list, activeConversation()?.messages ?? [], character);
    renderStatus();
  }

  function setSending(value) {
    isSending = value;
    input.disabled = value;
    sendButton.disabled = value;
    typing.hidden = !value;
    renderConversationList();
  }

  renderConversationList();
  renderCurrentConversation();

  list.addEventListener('click', async (event) => {
    const button = event.target.closest('[data-copy-message]');
    if (!button) return;
    const message =
      activeConversation()?.messages[Number(button.dataset.copyMessage)];
    if (!message || message.role !== 'assistant') return;
    try {
      await navigator.clipboard.writeText(message.text);
      button.textContent = 'Copiado';
      copyStatus.textContent = `Respuesta de ${character.name} copiada al portapapeles.`;
      window.setTimeout(() => {
        if (button.isConnected) button.textContent = 'Copiar';
      }, 1600);
    } catch {
      copyStatus.textContent =
        'No se pudo copiar la respuesta. Revisa los permisos del navegador.';
    }
  });

  newButton.addEventListener('click', () => {
    if (isSending) return;
    state.activeConversationId = null;
    persist();
    error.hidden = true;
    error.textContent = '';
    renderConversationList();
    renderCurrentConversation();
    input.focus();
  });

  conversationList.addEventListener('click', (event) => {
    const remove = event.target.closest('[data-delete-conversation]');
    if (remove) {
      if (isSending) return;
      const conversation = state.conversations.find(
        (item) => item.id === remove.dataset.deleteConversation
      );
      if (
        !conversation ||
        !window.confirm(
          `¿Borrar “${conversation.title}”? Esta acción no se puede deshacer.`
        )
      )
        return;
      state.conversations = state.conversations.filter(
        (item) => item.id !== conversation.id
      );
      if (state.activeConversationId === conversation.id) {
        state.activeConversationId = state.conversations[0]?.id ?? null;
      }
      persist();
      renderConversationList();
      renderCurrentConversation();
      return;
    }
    const open = event.target.closest('[data-open-conversation]');
    if (!open || isSending) return;
    state.activeConversationId = open.dataset.openConversation;
    persist();
    error.hidden = true;
    error.textContent = '';
    renderConversationList();
    renderCurrentConversation();
  });

  clearButton.addEventListener('click', () => {
    if (!state.conversations.length || isSending) return;
    if (
      !window.confirm(
        `¿Vaciar todas las conversaciones de ${character.name}? Esta acción no se puede deshacer.`
      )
    )
      return;
    state.conversations = [];
    state.activeConversationId = null;
    persist();
    try {
      localStorage.removeItem(legacyKey);
    } catch {
      hasStorageError = true;
    }
    error.hidden = true;
    error.textContent = '';
    renderConversationList();
    renderCurrentConversation();
  });

  form.addEventListener('submit', async (event) => {
    event.preventDefault();
    const text = input.value.trim();
    if (!text || isSending) return;

    const now = new Date().toISOString();
    let conversation = activeConversation();
    if (!conversation) {
      conversation = {
        id: makeId(),
        title: makeTitle(text),
        createdAt: now,
        updatedAt: now,
        messages: [],
      };
      state.conversations.unshift(conversation);
      state.activeConversationId = conversation.id;
    }
    conversation.messages.push({ role: 'user', text, timestamp: now });
    conversation.updatedAt = now;
    persist();
    state.conversations.sort(
      (a, b) => Date.parse(b.updatedAt) - Date.parse(a.updatedAt)
    );
    renderConversationList();
    renderCurrentConversation();
    form.reset();
    error.hidden = true;
    error.textContent = '';
    setSending(true);

    try {
      const reply = await requestCharacterReply(
        character.id,
        conversation.messages
      );
      conversation.messages.push({
        role: 'assistant',
        text: reply,
        timestamp: new Date().toISOString(),
      });
      conversation.updatedAt = new Date().toISOString();
      persist();
      state.conversations.sort(
        (a, b) => Date.parse(b.updatedAt) - Date.parse(a.updatedAt)
      );
      renderConversationList();
      renderCurrentConversation();
    } catch (requestError) {
      error.textContent =
        requestError.message || 'Ocurrió un error al enviar el mensaje.';
      error.hidden = false;
    } finally {
      setSending(false);
      input.focus();
    }
  });
}

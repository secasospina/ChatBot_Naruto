import { setupChat } from "./chat.js";
import { characterList, characters } from "./characters.js";

const app = document.querySelector("#app");
const THEME_STORAGE_KEY = "hokage-chat-theme-v1";

// Aplica y guarda la preferencia visual del usuario en este navegador.
function setupThemeToggle() {
  const button = document.querySelector("[data-theme-toggle]");
  const label = button.querySelector("[data-theme-label]");
  const themeColor = document.querySelector('meta[name="theme-color"]');
  let theme = "light";

  try {
    const savedTheme = localStorage.getItem(THEME_STORAGE_KEY);
    if (["light", "dark"].includes(savedTheme)) theme = savedTheme;
  } catch {
    // El selector sigue funcionando aunque el navegador bloquee localStorage.
  }

  // Mantiene el atributo accesible, el texto del botón y el color del navegador sincronizados.
  function applyTheme() {
    document.documentElement.dataset.theme = theme;
    button.setAttribute("aria-pressed", String(theme === "dark"));
    label.textContent = theme === "dark" ? "Modo claro" : "Modo oscuro";
    button.setAttribute("aria-label", `Cambiar a ${theme === "dark" ? "modo claro" : "modo oscuro"}`);
    themeColor.content = theme === "dark" ? "#24201d" : "#f26722";
  }

  button.addEventListener("click", () => {
    theme = theme === "dark" ? "light" : "dark";
    applyTheme();
    try {
      localStorage.setItem(THEME_STORAGE_KEY, theme);
    } catch {
      // El cambio visual permanece activo aunque no se pueda guardar.
    }
  });

  applyTheme();
}

// Genera tarjetas accesibles que llevan a la página personal de cada personaje.
function renderGallery() {
  const cards = characterList.map((character) => `
    <a class="character-card character-card--${character.id} character-theme character-theme--${character.id}"
      href="/${character.id}/home" data-link aria-label="${character.cardLabel}">
      <div class="character-card-art">
        <img src="${character.cardImage}" alt="" loading="lazy" />
        <span class="character-card-art-label">Conoce a ${character.name}</span>
      </div>
      <div class="character-card-copy">
        <h2>${character.name}<span aria-hidden="true">↗</span></h2>
        <p>${character.title}</p>
      </div>
    </a>
  `).join("");

  return `
    <section class="gallery-page">
      <div class="gallery-content page-shell">
        <div class="gallery-heading">
          <p class="eyebrow">Aldea Oculta de la Hoja</p>
          <h1>Naruto <span>Chatbot</span></h1>
          <p class="gallery-description">Conversa con tus ninjas favoritos, descubre sus historias y encuentra una nueva perspectiva para tus metas.</p>
          <p class="gallery-invitation">Elige tu personaje favorito</p>
        </div>
        <div class="character-gallery" aria-label="Galería de personajes">${cards}</div>
        <p class="gallery-footnote">Cada camino ninja tiene una historia distinta. ¿Con quién quieres hablar hoy?</p>
      </div>
    </section>
  `;
}

// Añade una ruta de regreso para no dejar al usuario dentro de una sección aislada.
function renderBackLink() {
  return '<a class="button button-back" href="/home" data-link>← Volver al menú principal</a>';
}

// Conserva la portada original de Naruto en su nueva ruta personal.
function renderNarutoHome(character) {
  return `
    <section class="page-shell character-page character-theme character-theme--naruto" data-character="naruto">
      ${renderBackLink()}
      <div class="hero hero-home">
        <div class="hero-copy-group">
          <p class="eyebrow">Tu próximo entrenamiento ninja</p>
          <h1>¡Habla con <span>Naruto Uzumaki</span>!</h1>
          <p class="hero-copy">
            Comparte tus preguntas, habla de tus metas y conoce la historia del ninja
            que nunca se rinde.
          </p>
          <a class="button button-primary" href="/naruto/chat" data-link>Empezar a chatear</a>
          <p class="hero-note">Una experiencia de práctica con inteligencia artificial.</p>
        </div>
        <figure class="hokage-art hokage-art--home">
          <img src="${character.homeImage}" alt="Naruto sonríe con el atuendo y el sombrero del Séptimo Hokage" />
          <figcaption>El sueño de convertirse en Hokage</figcaption>
        </figure>
      </div>
    </section>
  `;
}

// Presenta el personaje elegido y ofrece enlaces a su historia y conversación.
function renderCharacterHome(character) {
  if (character.id === "naruto") return renderNarutoHome(character);

  return `
    <section class="page-shell character-page character-theme character-theme--${character.id}" data-character="${character.id}">
      ${renderBackLink()}
      <div class="character-home-layout">
        <div class="character-home-copy">
          <p class="eyebrow">Aldea Oculta de la Hoja · Perfil ninja</p>
          <h1>${character.fullName}</h1>
          <p class="character-home-title">${character.title}</p>
          <p class="hero-copy">${character.description}</p>
          <div class="character-actions">
            <a class="button button-primary" href="/${character.id}/chat" data-link>Hablar con ${character.name}</a>
            <a class="button button-secondary" href="/${character.id}/about" data-link>Conocer su historia</a>
          </div>
          <p class="hero-note">Una conversación con inteligencia artificial inspirada en su personalidad.</p>
        </div>
        <figure class="character-home-art character-home-art--${character.id}">
          <img src="${character.homeImage}" alt="Ilustración de ${character.fullName}" />
          <figcaption>${character.fullName}</figcaption>
        </figure>
      </div>
    </section>
  `;
}

// Muestra la historia del personaje sin reemplazar el contenido actual de Naruto.
function renderAbout(character) {
  const isNaruto = character.id === "naruto";
  const image = isNaruto ? "/assets/naruto-legacy.jpg" : character.aboutImage;
  const imageAlt = isNaruto
    ? "Naruto desde niño hasta convertirse en el Séptimo Hokage"
    : `Ilustración de ${character.fullName}`;

  return `
    <section class="page-shell about-page character-page character-theme character-theme--${character.id}" data-character="${character.id}">
      ${renderBackLink()}
      <div class="about-layout">
        <div class="about-copy">
          <p class="eyebrow">${isNaruto ? "Sobre este proyecto" : `Sobre ${character.name}`}</p>
          <h1>${character.aboutTitle}</h1>
          <p>${character.aboutText}</p>
          <a class="button button-primary" href="/${character.id}/chat" data-link>Hablar con ${character.name}</a>
        </div>
        <div class="about-art">
          <figure class="hokage-art hokage-art--about">
            <img src="${image}" alt="${imageAlt}" />
            <figcaption>${character.aboutCaption}</figcaption>
          </figure>
          ${isNaruto ? `
            <figure class="hokage-detail">
              <img src="/assets/naruto-hokage-portrait.jpg" alt="Naruto inclina su sombrero de Hokage" />
              <figcaption>El reconocimiento que se ganó de veras.</figcaption>
            </figure>
          ` : ""}
        </div>
      </div>
    </section>
  `;
}

// Crea la interfaz del chat con el nombre y las imágenes del personaje seleccionado.
function renderChat(character) {
  return `
    <section class="page-shell chat-page character-page character-theme character-theme--${character.id}" data-character="${character.id}">
      ${renderBackLink()}
      <div class="page-heading page-heading--with-art">
        <div>
          <p class="eyebrow">Aldea Oculta de la Hoja</p>
          <h1>Chat con ${character.name}</h1>
          <p>${character.description}</p>
        </div>
        <img class="heading-art" src="${character.homeImage}" alt="${character.fullName}" />
      </div>
      <div class="chat-workspace">
        <aside class="conversation-sidebar" aria-label="Conversaciones de ${character.name}">
          <div class="conversation-sidebar-heading">
            <h2>Mis chats</h2>
            <button class="button button-new-chat" type="button" data-new-conversation>+ Nuevo chat</button>
          </div>
          <div class="conversation-list" data-conversation-list aria-label="Chats guardados"></div>
          <button class="button chat-clear-button" type="button" data-clear-history disabled>Vaciar todos</button>
        </aside>
        <div class="chat-panel">
          <div class="chat-toolbar">
            <p class="chat-history-status" data-history-status data-state="empty" role="status">
              <span data-history-status-text>Chat nuevo; se guardará al enviar un mensaje</span>
            </p>
            <span class="chat-current-title" data-current-conversation-title>Nueva conversación</span>
          </div>
          <span class="visually-hidden" data-copy-status role="status" aria-live="polite"></span>
          <div class="chat-messages" data-chat-messages aria-live="polite" aria-relevant="additions">
            <div class="chat-typing" data-chat-typing role="status" hidden>
              <img class="chat-avatar" src="${character.chatAvatar}" alt="" aria-hidden="true" />
              <div class="chat-typing-bubble">
                <span>${character.name} está escribiendo</span>
                <span class="typing-dots" aria-hidden="true"><i></i><i></i><i></i></span>
              </div>
            </div>
          </div>
          <p class="chat-error" data-chat-error role="alert" hidden></p>
          <form class="chat-form" data-chat-form>
            <label class="visually-hidden" for="chat-input">Escribe tu mensaje para ${character.name}</label>
            <input id="chat-input" name="message" type="text" maxlength="500" placeholder="Escribe tu mensaje..." autocomplete="off" required />
            <button class="button button-primary" type="submit" data-send-button>Enviar</button>
          </form>
          <p class="chat-hint">Máximo 500 caracteres. Presiona Enter para enviar. Tus conversaciones se guardan en este navegador.</p>
        </div>
      </div>
    </section>
  `;
}

// Vista para rutas que no existen.
function renderNotFound() {
  return `
    <section class="page-shell not-found">
      <h1>404</h1>
      <p>Esta página no existe.</p>
      <a class="button button-primary" href="/home" data-link>Volver a los personajes</a>
    </section>
  `;
}

// Resuelve las rutas antiguas de Naruto y valida las rutas de cada personaje.
function resolveRoute(path) {
  if (path === "/" || path === "/home") return { path: "/home", page: "gallery" };
  if (path === "/chat") return { path: "/naruto/chat", page: "chat", character: characters.naruto };
  if (path === "/about") return { path: "/naruto/about", page: "about", character: characters.naruto };

  const match = path.match(/^\/(naruto|sasuke|madara|kakashi)\/(home|about|chat)$/);
  if (!match) return { path, page: "notfound" };
  return { path, page: match[2], character: characters[match[1]] };
}

// Actualiza los enlaces globales según la sección y el personaje activos.
function renderNavigation(route) {
  const nav = document.querySelector(".main-nav");
  const links = route.character
    ? [
        ["Personajes", "/home"],
        ["Inicio", `/${route.character.id}/home`],
        ["Chat", `/${route.character.id}/chat`],
        ["Acerca de", `/${route.character.id}/about`],
      ]
    : [["Personajes", "/home"]];

  nav.innerHTML = links.map(([label, href]) =>
    `<a href="${href}" data-link>${label}</a>`,
  ).join("");

  nav.querySelectorAll("[data-link]").forEach((link) => {
    link.toggleAttribute("aria-current", link.pathname === route.path);
  });
}

// Renderiza la ruta solicitada y conecta el chat si hace falta.
function renderRoute() {
  const route = resolveRoute(window.location.pathname);
  if (route.path !== window.location.pathname) {
    window.history.replaceState({}, "", route.path);
  }

  if (route.page === "gallery") app.innerHTML = renderGallery();
  if (route.page === "home") app.innerHTML = renderCharacterHome(route.character);
  if (route.page === "about") app.innerHTML = renderAbout(route.character);
  if (route.page === "chat") app.innerHTML = renderChat(route.character);
  if (route.page === "notfound") app.innerHTML = renderNotFound();

  document.title = route.character
    ? `${route.character.fullName} | Hokage Chat`
    : route.page === "notfound"
      ? "404 | Hokage Chat"
      : "Naruto Chatbot | Elige tu personaje";

  renderNavigation(route);
  document.querySelectorAll("a[data-link]").forEach((link) => {
    if (link.closest(".main-nav")) return;
    link.toggleAttribute("aria-current", link.pathname === route.path);
  });
  if (route.page === "chat") setupChat(app, route.character);
}

// Intercepta enlaces internos para navegar sin recargar la página.
document.addEventListener("click", (event) => {
  const link = event.target.closest("a[data-link]");
  if (!link || event.metaKey || event.ctrlKey || event.shiftKey || event.altKey) return;
  event.preventDefault();
  window.history.pushState({}, "", link.pathname);
  renderRoute();
  window.requestAnimationFrame(() => window.scrollTo(0, 0));
});

window.addEventListener("popstate", renderRoute);
setupThemeToggle();
renderRoute();

import { setupChat } from "./chat.js";

const app = document.querySelector("#app");

const views = {
  "/home": `
    <section class="hero page-shell hero-home">
      <div class="hero-copy-group">
        <p class="eyebrow">Tu próximo entrenamiento ninja</p>
        <h1>¡Habla con <span>Naruto Uzumaki</span>!</h1>
        <p class="hero-copy">
          Comparte tus preguntas, habla de tus metas y conoce la historia del ninja
          que nunca se rinde.
        </p>
        <a class="button button-primary" href="/chat" data-link>Empezar a chatear</a>
        <p class="hero-note">Una experiencia de práctica con inteligencia artificial.</p>
      </div>
      <figure class="hokage-art hokage-art--home">
        <img src="/assets/naruto-hokage-chibi.jpg" alt="Naruto sonríe con el atuendo y el sombrero del Séptimo Hokage" />
        <figcaption>El sueño de convertirse en Hokage</figcaption>
      </figure>
    </section>
  `,
  "/chat": `
    <section class="page-shell chat-page">
      <div class="page-heading page-heading--with-art">
        <div>
          <p class="eyebrow">Aldea Oculta de la Hoja</p>
          <h1>Chat con Naruto</h1>
          <p>Comparte tus metas y tus preguntas con Naruto.</p>
        </div>
        <img class="heading-art" src="/assets/naruto-greeting.jpg" alt="Naruto sonríe con su sombrero de Hokage" />
      </div>
      <div class="chat-panel">
        <div class="chat-toolbar">
          <p class="chat-history-status" data-history-status data-state="empty" role="status">
            <span data-history-status-text>Aún no hay historial guardado</span>
          </p>
          <button class="button chat-clear-button" type="button" data-clear-history disabled>
            Borrar historial
          </button>
        </div>
        <div class="chat-messages" data-chat-messages aria-live="polite" aria-relevant="additions">
          <div class="chat-typing" data-chat-typing role="status" hidden>
            <img class="chat-avatar" src="/assets/naruto-avatar.jpg" alt="" aria-hidden="true" />
            <div class="chat-typing-bubble">
              <span>Naruto está escribiendo</span>
              <span class="typing-dots" aria-hidden="true"><i></i><i></i><i></i></span>
            </div>
          </div>
        </div>
        <p class="chat-error" data-chat-error role="alert" hidden></p>
        <form class="chat-form" data-chat-form>
          <label class="visually-hidden" for="chat-input">Escribe tu mensaje para Naruto</label>
          <input
            id="chat-input"
            name="message"
            type="text"
            maxlength="500"
            placeholder="Escribe tu mensaje..."
            autocomplete="off"
            required
          />
          <button class="button button-primary" type="submit" data-send-button>Enviar</button>
        </form>
        <p class="chat-hint">Máximo 500 caracteres. El historial se guarda aquí y puedes borrarlo cuando quieras.</p>
      </div>
    </section>
  `,
  "/about": `
    <section class="page-shell about-page">
      <div class="about-layout">
        <div class="about-copy">
          <p class="eyebrow">Sobre este proyecto</p>
          <h1>Un ninja con un gran sueño</h1>
          <p>
            Desde niño, Naruto soñó con ganarse el reconocimiento de su aldea y
            convertirse en Hokage. Con perseverancia, hizo amigos, superó grandes
            retos y llegó a ser el ninja que siempre quiso ser. Su historia inspira
            esta experiencia de chat con inteligencia artificial.
          </p>
        </div>
        <div class="about-art">
          <figure class="hokage-art hokage-art--about">
            <img src="/assets/naruto-legacy.jpg" alt="Naruto desde niño hasta convertirse en el Séptimo Hokage" />
            <figcaption>De niño soñador a Séptimo Hokage</figcaption>
          </figure>
          <figure class="hokage-detail">
            <img src="/assets/naruto-hokage-portrait.jpg" alt="Naruto inclina su sombrero de Hokage" />
            <figcaption>El reconocimiento que se ganó de veras.</figcaption>
          </figure>
        </div>
      </div>
    </section>
  `,
};

// Devuelve una ruta válida y usa /home si la ruta no existe.
function normalizePath(path) {
  if (path === "/") return "/home";
  return views[path] ? path : "/home";
}

// Renderiza la vista de la URL actual y actualiza la navegación.
function renderRoute() {
  const path = normalizePath(window.location.pathname);
  if (path !== window.location.pathname) {
    window.history.replaceState({}, "", path);
  }
  app.innerHTML = views[path];
  document.querySelectorAll("[data-link]").forEach((link) => {
    link.toggleAttribute("aria-current", link.pathname === path);
  });
  if (path === "/chat") setupChat(app);
}

// Intercepta enlaces internos para navegar sin recargar la página.
document.addEventListener("click", (event) => {
  const link = event.target.closest("a[data-link]");
  if (!link || event.metaKey || event.ctrlKey || event.shiftKey || event.altKey) return;
  event.preventDefault();
  window.history.pushState({}, "", link.pathname);
  renderRoute();
});

window.addEventListener("popstate", renderRoute);
renderRoute();

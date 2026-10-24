import { setupChat } from "./chat.js";

const app = document.querySelector("#app");

const views = {
  "/home": `
    <section class="hero page-shell">
      <p class="eyebrow">Tu próximo entrenamiento ninja</p>
      <h1>¡Habla con <span>Naruto Uzumaki</span>!</h1>
      <p class="hero-copy">
        Comparte tus preguntas, habla de tus metas y conoce la historia del ninja
        que nunca se rinde.
      </p>
      <a class="button button-primary" href="/chat" data-link>Empezar a chatear</a>
      <p class="hero-note">Una experiencia de práctica con inteligencia artificial.</p>
    </section>
  `,
  "/chat": `
    <section class="page-shell chat-page">
      <div class="page-heading">
        <p class="eyebrow">Aldea Oculta de la Hoja</p>
        <h1>Chat con Naruto</h1>
        <p>Comparte tus metas y tus preguntas con Naruto.</p>
      </div>
      <div class="chat-panel">
        <div class="chat-messages" data-chat-messages aria-live="polite" aria-relevant="additions"></div>
        <p class="chat-status" data-chat-status aria-live="polite"></p>
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
        <p class="chat-hint">Máximo 500 caracteres. Tus mensajes se mantienen mientras esta página siga abierta.</p>
      </div>
    </section>
  `,
  "/about": `
    <section class="page-shell about-page">
      <p class="eyebrow">Sobre este proyecto</p>
      <h1>Un ninja con un gran sueño</h1>
      <p>
        Naruto Uzumaki es un personaje ficticio conocido por su perseverancia,
        energía y deseo de proteger a sus amigos. Esta aplicación explora cómo
        crear una experiencia de chat con IA de forma segura.
      </p>
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

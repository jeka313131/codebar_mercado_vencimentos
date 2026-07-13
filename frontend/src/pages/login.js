import { loginWithEmail, loginWithGoogle, registerWithEmail } from "../utils/firebase/auth.js";

const EYE_OPEN = `<svg viewBox="0 0 24 24" aria-hidden="true"><path fill="currentColor" d="M12 4.5C7 4.5 2.7 7.6 1 12c1.7 4.4 6 7.5 11 7.5s9.3-3.1 11-7.5c-1.7-4.4-6-7.5-11-7.5zM12 17c-2.8 0-5-2.2-5-5s2.2-5 5-5 5 2.2 5 5-2.2 5-5 5zm0-8c-1.7 0-3 1.3-3 3s1.3 3 3 3 3-1.3 3-3-1.3-3-3-3z"/></svg>`;
const EYE_OFF = `<svg viewBox="0 0 24 24" aria-hidden="true"><path fill="currentColor" d="M12 7c2.8 0 5 2.2 5 5 0 .7-.1 1.3-.4 1.9l2.9 2.9c1.5-1.3 2.7-3 3.5-4.8-1.7-4.4-6-7.5-11-7.5-1.4 0-2.8.3-4 .7l2.2 2.2C10.7 7.1 11.3 7 12 7zM2 4.3l2.3 2.3.5.5C3.6 8.3 2.2 10 1 12c1.7 4.4 6 7.5 11 7.5 1.6 0 3.1-.3 4.5-.9l.6.6 3.6 3.6 1.3-1.3L3.3 3 2 4.3zM12 17c-2.8 0-5-2.2-5-5 0-.7.2-1.4.5-2l1.5 1.5c-.1.2-.1.3-.1.5 0 1.7 1.3 3 3 3 .2 0 .3 0 .5-.1l1.5 1.5c-.6.3-1.3.5-2 .5zm2.9-5.1-3.8-3.8c.2 0 .3-.1.5-.1 1.7 0 3 1.3 3 3 0 .2 0 .3-.1.5l.4.4z"/></svg>`;

export async function renderLogin(container) {
  container.className = "page page-auth";
  container.innerHTML = `
    <div class="auth-card">
      <img src="/logos/venceu/venceu-06-underline.svg" alt="Venceu" class="auth-logo" />
      <h1 class="auth-title">Entrar</h1>
      <p class="auth-subtitle">Controle de validade do seu mercado</p>

      <button type="button" class="btn btn-google" id="btn-google">
        <svg viewBox="0 0 24 24" aria-hidden="true" class="btn-google-icon">
          <path fill="#4285F4" d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"/>
          <path fill="#34A853" d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"/>
          <path fill="#FBBC05" d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z"/>
          <path fill="#EA4335" d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z"/>
        </svg>
        Continuar com Google
      </button>

      <div class="auth-divider"><span>ou e-mail</span></div>

      <form id="auth-form" class="auth-form">
        <div class="field">
          <label for="auth-email">E-mail</label>
          <input id="auth-email" type="email" autocomplete="email" required placeholder="seu@email.com" />
        </div>
        <div class="field">
          <label for="auth-password">Senha</label>
          <div class="password-field">
            <input id="auth-password" type="password" autocomplete="current-password" required minlength="6" placeholder="Mínimo 6 caracteres" />
            <button type="button" class="btn-password-toggle" id="btn-toggle-password" aria-label="Mostrar senha" aria-pressed="false">
              ${EYE_OPEN}
            </button>
          </div>
        </div>
        <button type="submit" class="btn btn-primary" id="btn-email-submit">Entrar</button>
      </form>

      <button type="button" class="btn-link" id="btn-toggle-mode">Criar conta</button>
      <p id="auth-feedback" class="feedback" hidden></p>
    </div>
  `;

  let isRegister = false;
  const form = container.querySelector("#auth-form");
  const feedback = container.querySelector("#auth-feedback");
  const btnSubmit = container.querySelector("#btn-email-submit");
  const btnToggle = container.querySelector("#btn-toggle-mode");
  const passwordInput = container.querySelector("#auth-password");
  const btnTogglePassword = container.querySelector("#btn-toggle-password");

  function showFeedback(message, type = "error") {
    feedback.textContent = message;
    feedback.className = `feedback feedback--${type}`;
    feedback.hidden = false;
  }

  btnTogglePassword.addEventListener("click", () => {
    const showing = passwordInput.type === "text";
    passwordInput.type = showing ? "password" : "text";
    btnTogglePassword.setAttribute("aria-pressed", showing ? "false" : "true");
    btnTogglePassword.setAttribute("aria-label", showing ? "Mostrar senha" : "Ocultar senha");
    btnTogglePassword.innerHTML = showing ? EYE_OPEN : EYE_OFF;
  });

  btnToggle.addEventListener("click", () => {
    isRegister = !isRegister;
    btnSubmit.textContent = isRegister ? "Criar conta" : "Entrar";
    btnToggle.textContent = isRegister ? "Já tenho conta" : "Criar conta";
    passwordInput.autocomplete = isRegister ? "new-password" : "current-password";
    feedback.hidden = true;
  });

  container.querySelector("#btn-google").addEventListener("click", async () => {
    feedback.hidden = true;
    try {
      await loginWithGoogle();
    } catch (error) {
      showFeedback(error.message || "Não foi possível entrar com Google.");
    }
  });

  form.addEventListener("submit", async (event) => {
    event.preventDefault();
    feedback.hidden = true;

    const email = container.querySelector("#auth-email").value;
    const password = passwordInput.value;

    btnSubmit.disabled = true;

    try {
      if (isRegister) {
        await registerWithEmail(email, password);
      } else {
        await loginWithEmail(email, password);
      }
    } catch (error) {
      const msg =
        error.code === "auth/invalid-credential"
          ? "E-mail ou senha incorretos."
          : error.code === "auth/email-already-in-use"
            ? "Este e-mail já está cadastrado."
            : error.message;
      showFeedback(msg, "error");
    } finally {
      btnSubmit.disabled = false;
    }
  });
}

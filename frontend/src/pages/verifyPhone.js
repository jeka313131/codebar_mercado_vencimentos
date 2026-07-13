import { savePhone } from "../api/authApi.js";
import { reloadAuthProfile } from "../auth/guard.js";
import { logout } from "../utils/firebase/auth.js";

function maskPhoneInput(raw) {
  const digits = raw.replace(/\D/g, "").slice(0, 11);
  if (digits.length <= 2) return digits;
  if (digits.length <= 7) return `(${digits.slice(0, 2)}) ${digits.slice(2)}`;
  return `(${digits.slice(0, 2)}) ${digits.slice(2, 7)}-${digits.slice(7)}`;
}

/** Aceita só celular BR com 11 dígitos (DDD + 9 + 8). Retorna com prefixo 55. */
function phoneToWaId(masked) {
  const digits = masked.replace(/\D/g, "");
  if (digits.length !== 11) return null;
  return `55${digits}`;
}

export async function renderVerifyPhone(container) {
  container.className = "page page-auth";
  container.innerHTML = `
    <div class="auth-card">
      <h1 class="auth-title">Seu WhatsApp</h1>
      <p class="auth-subtitle">Informe o número com DDD (11 dígitos)</p>

      <div class="field">
        <label for="phone-input">WhatsApp</label>
        <input
          id="phone-input"
          type="tel"
          inputmode="numeric"
          placeholder="(11) 99999-9999"
          autocomplete="tel"
        />
      </div>

      <button type="button" class="btn btn-primary" id="btn-save-phone">Continuar</button>

      <p id="verify-feedback" class="feedback" hidden></p>
      <button type="button" class="btn-link" id="btn-logout">Sair da conta</button>
    </div>
  `;

  const phoneInput = container.querySelector("#phone-input");
  const feedback = container.querySelector("#verify-feedback");
  const btnSave = container.querySelector("#btn-save-phone");

  function showFeedback(message, type = "error") {
    feedback.textContent = message;
    feedback.className = `feedback feedback--${type}`;
    feedback.hidden = false;
  }

  phoneInput.addEventListener("input", () => {
    const masked = maskPhoneInput(phoneInput.value);
    if (masked !== phoneInput.value) phoneInput.value = masked;
  });

  btnSave.addEventListener("click", async () => {
    feedback.hidden = true;
    const waId = phoneToWaId(phoneInput.value);
    if (!waId) {
      showFeedback("Informe um WhatsApp com 11 dígitos (DDD + número).");
      return;
    }

    btnSave.disabled = true;

    try {
      await savePhone(waId);
      await reloadAuthProfile();
    } catch (error) {
      showFeedback(error.message);
      btnSave.disabled = false;
    }
  });

  container.querySelector("#btn-logout").addEventListener("click", async () => {
    await logout();
  });
}

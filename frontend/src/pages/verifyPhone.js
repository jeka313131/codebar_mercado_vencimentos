import { sendPhoneCode, verifyPhoneCode } from "../api/authApi.js";
import { reloadAuthProfile } from "../auth/guard.js";
import { logout } from "../utils/firebase/auth.js";

function maskPhoneInput(raw) {
  const digits = raw.replace(/\D/g, "").slice(0, 11);
  if (digits.length <= 2) return digits;
  if (digits.length <= 7) return `(${digits.slice(0, 2)}) ${digits.slice(2)}`;
  return `(${digits.slice(0, 2)}) ${digits.slice(2, 7)}-${digits.slice(7)}`;
}

function phoneToWaId(masked) {
  const digits = masked.replace(/\D/g, "");
  if (digits.length < 10) return null;
  const withCountry = digits.startsWith("55") ? digits : `55${digits}`;
  return withCountry;
}

export async function renderVerifyPhone(container) {
  container.className = "page page-auth";
  container.innerHTML = `
    <div class="auth-card">
      <h1 class="auth-title">Confirme seu WhatsApp</h1>
      <p class="auth-subtitle">Enviaremos um código para validar seu número</p>

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

      <button type="button" class="btn btn-primary" id="btn-send-code">Enviar código</button>

      <div class="field auth-code-field" id="code-section" hidden>
        <label for="code-input">Código de 6 dígitos</label>
        <input
          id="code-input"
          type="text"
          inputmode="numeric"
          maxlength="6"
          placeholder="000000"
          autocomplete="one-time-code"
        />
        <button type="button" class="btn btn-primary" id="btn-verify-code">Confirmar</button>
      </div>

      <p id="verify-feedback" class="feedback" hidden></p>
      <button type="button" class="btn-link" id="btn-logout">Sair da conta</button>
    </div>
  `;

  const phoneInput = container.querySelector("#phone-input");
  const codeSection = container.querySelector("#code-section");
  const codeInput = container.querySelector("#code-input");
  const feedback = container.querySelector("#verify-feedback");
  const btnSend = container.querySelector("#btn-send-code");
  const btnVerify = container.querySelector("#btn-verify-code");

  function showFeedback(message, type = "error") {
    feedback.textContent = message;
    feedback.className = `feedback feedback--${type}`;
    feedback.hidden = false;
  }

  phoneInput.addEventListener("input", () => {
    const masked = maskPhoneInput(phoneInput.value);
    if (masked !== phoneInput.value) phoneInput.value = masked;
  });

  btnSend.addEventListener("click", async () => {
    feedback.hidden = true;
    const waId = phoneToWaId(phoneInput.value);
    if (!waId) {
      showFeedback("Informe um WhatsApp válido com DDD.");
      return;
    }

    btnSend.disabled = true;

    try {
      const result = await sendPhoneCode(waId);
      codeSection.hidden = false;
      codeInput.focus();
      showFeedback(
        result.devCode
          ? `Modo dev: código ${result.devCode}`
          : "Código enviado no seu WhatsApp.",
        "success",
      );
    } catch (error) {
      showFeedback(error.message);
    } finally {
      btnSend.disabled = false;
    }
  });

  btnVerify.addEventListener("click", async () => {
    feedback.hidden = true;
    const waId = phoneToWaId(phoneInput.value);
    const code = codeInput.value.trim();

    if (!waId || code.length !== 6) {
      showFeedback("Informe o WhatsApp e o código de 6 dígitos.");
      return;
    }

    btnVerify.disabled = true;

    try {
      await verifyPhoneCode(waId, code);
      await reloadAuthProfile();
    } catch (error) {
      showFeedback(error.message);
      btnVerify.disabled = false;
    }
  });

  container.querySelector("#btn-logout").addEventListener("click", async () => {
    await logout();
  });
}

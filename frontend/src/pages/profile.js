import { fetchProfile, savePhone } from "../api/authApi.js";
import { getAuthUser } from "../auth/guard.js";
import { renderBottomNav, initBottomNav } from "../components/bottomNav.js";
import { navigate } from "../router.js";
import { logout } from "../utils/firebase/auth.js";
import { escapeHtml } from "../utils/html.js";

function maskPhoneInput(raw) {
  const digits = raw.replace(/\D/g, "").slice(0, 11);
  if (digits.length <= 2) return digits;
  if (digits.length <= 7) return `(${digits.slice(0, 2)}) ${digits.slice(2)}`;
  return `(${digits.slice(0, 2)}) ${digits.slice(2, 7)}-${digits.slice(7)}`;
}

function formatPhoneFromStored(waPhone) {
  const digits = String(waPhone || "").replace(/\D/g, "");
  const local = digits.startsWith("55") ? digits.slice(2) : digits;
  if (local.length !== 11) return local;
  return maskPhoneInput(local);
}

function phoneToWaId(masked) {
  const digits = masked.replace(/\D/g, "");
  if (digits.length !== 11) return null;
  return `55${digits}`;
}

export async function renderProfile(container) {
  container.className = "page page-profile";

  let profile;
  try {
    profile = await fetchProfile();
  } catch {
    profile = null;
  }

  const authUser = getAuthUser();
  const email = profile?.email || authUser?.email || "";
  const phoneDisplay = formatPhoneFromStored(profile?.phone);

  container.innerHTML = `
    <div class="profile-card">
      <h1 class="profile-title">Perfil</h1>
      <p class="profile-subtitle">Dados da sua conta</p>

      <div class="field">
        <label for="profile-email">E-mail</label>
        <div class="profile-email-row">
          <input id="profile-email" type="email" readonly value="${escapeHtml(email)}" />
          <button type="button" class="btn-copy" id="btn-copy-email" aria-label="Copiar e-mail">
            <svg viewBox="0 0 24 24" aria-hidden="true"><path fill="currentColor" d="M16 1H4c-1.1 0-2 .9-2 2v14h2V3h12V1zm3 4H8c-1.1 0-2 .9-2 2v14c0 1.1.9 2 2 2h11c1.1 0 2-.9 2-2V7c0-1.1-.9-2-2-2zm0 16H8V7h11v14z"/></svg>
          </button>
        </div>
      </div>

      <div class="field">
        <label for="profile-phone">Celular (WhatsApp)</label>
        <input
          id="profile-phone"
          type="tel"
          inputmode="numeric"
          placeholder="(11) 99999-9999"
          value="${escapeHtml(phoneDisplay)}"
        />
      </div>

      <button type="button" class="btn btn-primary" id="btn-save-profile">Salvar celular</button>
      <button type="button" class="btn btn-secondary" id="btn-logout">Sair da conta</button>

      <p id="profile-feedback" class="feedback" hidden></p>
    </div>
    ${renderBottomNav()}
  `;

  initBottomNav(container, { navigate });

  const phoneInput = container.querySelector("#profile-phone");
  const feedback = container.querySelector("#profile-feedback");
  const btnSave = container.querySelector("#btn-save-profile");

  function showFeedback(message, type = "error") {
    feedback.textContent = message;
    feedback.className = `feedback feedback--${type}`;
    feedback.hidden = false;
  }

  phoneInput.addEventListener("input", () => {
    const masked = maskPhoneInput(phoneInput.value);
    if (masked !== phoneInput.value) phoneInput.value = masked;
  });

  container.querySelector("#btn-copy-email").addEventListener("click", async () => {
    if (!email) return;
    try {
      await navigator.clipboard.writeText(email);
      showFeedback("E-mail copiado.", "success");
    } catch {
      showFeedback("Não foi possível copiar o e-mail.");
    }
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
      showFeedback("Celular atualizado.", "success");
    } catch (error) {
      showFeedback(error.message);
    } finally {
      btnSave.disabled = false;
    }
  });

  container.querySelector("#btn-logout").addEventListener("click", async () => {
    await logout();
  });
}

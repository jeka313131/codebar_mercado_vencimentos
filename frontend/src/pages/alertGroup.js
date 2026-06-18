import {
  fetchWhatsappGroups,
  fetchWhatsappInstance,
  sendWhatsappGroupTest,
  verifyWhatsappGroup,
} from "../api/whatsappApi.js";
import { fetchProfile, saveWhatsappGroup } from "../api/authApi.js";
import { reloadAuthProfile } from "../auth/guard.js";
import { renderBottomNav, initBottomNav } from "../components/bottomNav.js";
import { navigate } from "../router.js";
import { escapeHtml } from "../utils/html.js";

function renderHourOptions(selected = 8) {
  return Array.from({ length: 24 }, (_, hour) => {
    const label = `${String(hour).padStart(2, "0")}:00`;
    const sel = hour === selected ? " selected" : "";
    return `<option value="${hour}"${sel}>${label}</option>`;
  }).join("");
}

export async function renderAlertGroup(container) {
  container.className = "page page-alert-group";
  container.innerHTML = `
    <div class="alert-group-card">
      <h1 class="alert-group-title">Grupo de alertas</h1>
      <p class="alert-group-subtitle">Receba vencimentos no Whatsapp</p>

      <p class="alert-group-label">Adicione esse número no grupo:</p>
      <div class="alert-group-phone-row">
        <input
          type="text"
          id="evolution-phone"
          class="alert-group-phone"
          readonly
          value="Carregando…"
        />
        <button type="button" class="btn-copy" id="btn-copy-phone" aria-label="Copiar número">
          <svg viewBox="0 0 24 24" aria-hidden="true"><path fill="currentColor" d="M16 1H4c-1.1 0-2 .9-2 2v14h2V3h12V1zm3 4H8c-1.1 0-2 .9-2 2v14c0 1.1.9 2 2 2h11c1.1 0 2-.9 2-2V7c0-1.1-.9-2-2-2zm0 16H8V7h11v14z"/></svg>
        </button>
      </div>

      <p class="alert-group-label">Selecione o grupo:</p>
      <select id="group-select" class="alert-group-select" disabled>
        <option value="">Carregando grupos…</option>
      </select>

      <div class="alert-group-status" id="group-status">
        <span class="status-dot status-dot--off" id="status-dot"></span>
        <span id="status-text">Desconectado</span>
      </div>

      <button type="button" class="btn btn-test" id="btn-test" disabled>Enviar teste</button>

      <p class="alert-group-label">Hora de início</p>
      <select id="alert-start-hour" class="alert-group-select">
        ${renderHourOptions()}
      </select>
      <p class="alert-group-hint">Horário de Brasília. Alertas enviados diariamente nesta hora.</p>

      <div class="alert-group-actions">
        <button type="button" class="btn btn-cancel" id="btn-cancel">Cancelar</button>
        <button type="button" class="btn btn-save" id="btn-save" disabled>Salvar</button>
      </div>

      <p id="alert-feedback" class="feedback" hidden></p>
    </div>
    ${renderBottomNav()}
  `;

  initBottomNav(container, { navigate });

  const phoneInput = container.querySelector("#evolution-phone");
  const groupSelect = container.querySelector("#group-select");
  const hourSelect = container.querySelector("#alert-start-hour");
  const statusDot = container.querySelector("#status-dot");
  const statusText = container.querySelector("#status-text");
  const btnTest = container.querySelector("#btn-test");
  const btnSave = container.querySelector("#btn-save");
  const feedback = container.querySelector("#alert-feedback");

  let testSent = false;
  let groupConnected = false;

  function showFeedback(message, type = "error") {
    feedback.textContent = message;
    feedback.className = `feedback feedback--${type}`;
    feedback.hidden = false;
  }

  function setStatus(connected, text) {
    groupConnected = connected;
    statusDot.className = `status-dot ${connected ? "status-dot--on" : "status-dot--off"}`;
    statusText.textContent = text ?? (connected ? "Conectado" : "Desconectado");
    updateButtons();
  }

  function updateButtons() {
    btnTest.disabled = !groupSelect.value || !groupConnected;
    btnSave.disabled = !groupSelect.value || !groupConnected || !testSent;
  }

  async function loadInstance() {
    try {
      const info = await fetchWhatsappInstance();
      phoneInput.value = info.phoneFormatted || info.phone || "Não disponível";
      if (!info.connected && !info.dev) {
        showFeedback("Instância Evolution desconectada. Conecte no Manager.");
      }
    } catch (error) {
      phoneInput.value = "Erro ao carregar";
      showFeedback(error.message);
    }
  }

  async function loadGroups(savedGroupId) {
    try {
      const groups = await fetchWhatsappGroups();
      if (!groups.length) {
        groupSelect.innerHTML = `<option value="">Nenhum grupo encontrado</option>`;
        groupSelect.disabled = true;
        setStatus(false, "Desconectado");
        showFeedback("Adicione o número da Evolution no grupo e tente novamente.");
        return;
      }

      groupSelect.innerHTML =
        `<option value="">Selecione o grupo</option>` +
        groups.map((g) => `<option value="${escapeHtml(g.id)}">${escapeHtml(g.name)}</option>`).join("");
      groupSelect.disabled = false;

      if (savedGroupId && groups.some((g) => g.id === savedGroupId)) {
        groupSelect.value = savedGroupId;
        await checkSelectedGroup();
      }
    } catch (error) {
      groupSelect.innerHTML = `<option value="">Erro ao carregar</option>`;
      showFeedback(error.message);
    }
  }

  async function checkSelectedGroup() {
    const groupJid = groupSelect.value;
    testSent = false;

    if (!groupJid) {
      setStatus(false, "Desconectado");
      return;
    }

    try {
      const result = await verifyWhatsappGroup(groupJid);
      setStatus(result.connected, result.connected ? "Conectado" : "Desconectado");
      if (!result.connected && result.reason) {
        showFeedback(result.reason);
      } else {
        feedback.hidden = true;
      }
    } catch (error) {
      setStatus(false, "Desconectado");
      showFeedback(error.message);
    }
  }

  container.querySelector("#btn-copy-phone").addEventListener("click", async () => {
    try {
      await navigator.clipboard.writeText(phoneInput.value);
      showFeedback("Número copiado!", "success");
    } catch {
      showFeedback("Não foi possível copiar.");
    }
  });

  groupSelect.addEventListener("change", () => {
    checkSelectedGroup();
  });

  btnTest.addEventListener("click", async () => {
    btnTest.disabled = true;
    feedback.hidden = true;

    try {
      await sendWhatsappGroupTest(groupSelect.value);
      testSent = true;
      showFeedback("Teste enviado! Confira o grupo no WhatsApp.", "success");
      updateButtons();
    } catch (error) {
      showFeedback(error.message);
    } finally {
      btnTest.disabled = false;
      updateButtons();
    }
  });

  btnSave.addEventListener("click", async () => {
    btnSave.disabled = true;
    feedback.hidden = true;

    try {
      const alertStartHour = Number(hourSelect.value);
      await saveWhatsappGroup(groupSelect.value, true, alertStartHour);
      await reloadAuthProfile();
      showFeedback("Grupo salvo com sucesso!", "success");
      setTimeout(() => navigate("/"), 1200);
    } catch (error) {
      showFeedback(error.message);
      btnSave.disabled = false;
      updateButtons();
    }
  });

  container.querySelector("#btn-cancel").addEventListener("click", () => {
    navigate("/");
  });

  let profile = null;
  try {
    profile = await fetchProfile();
    if (profile?.alertStartHour !== undefined) {
      hourSelect.value = String(profile.alertStartHour);
    }
  } catch {
    // perfil opcional na carga inicial
  }

  await loadInstance();
  await loadGroups(profile?.whatsappGroupId ?? null);
}

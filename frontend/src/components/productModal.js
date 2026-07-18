import {
  deleteProduct,
  getPlaceholderImage,
  updateProduct,
  uploadProductImage,
} from "../api.js";
import { startPhotoCapture } from "../photoCapture.js";
import { isoToDateBrFull, maskDateBrInput, parseDateBrToIso } from "../utils/dates.js";
import { escapeHtml } from "../utils/html.js";

function closeModal(overlay) {
  overlay.remove();
  document.body.classList.remove("modal-open");
}

export function openProductModal(product, { onUpdated, onDeleted } = {}) {
  document.getElementById("product-modal")?.remove();

  const overlay = document.createElement("div");
  overlay.id = "product-modal";
  overlay.className = "modal-overlay";
  overlay.innerHTML = `
    <div class="modal-card" role="dialog" aria-modal="true" aria-labelledby="modal-title">
      <header class="modal-header">
        <h2 id="modal-title" class="modal-title">Editar produto</h2>
        <button type="button" class="modal-close" aria-label="Fechar">×</button>
      </header>
      <div class="modal-body">
        <div class="field">
          <label for="modal-photo-preview">Foto</label>
          <img id="modal-photo-preview" class="photo-preview" src="${escapeHtml(product.imageUrl)}" alt="" />
          <button type="button" class="btn btn-secondary btn--compact" id="modal-take-photo">Tirar foto</button>
        </div>
        <div class="field">
          <label for="modal-barcode">Código de barras</label>
          <input id="modal-barcode" type="text" value="${escapeHtml(product.barcode)}" />
        </div>
        <div class="field">
          <label for="modal-name">Descrição</label>
          <input id="modal-name" type="text" value="${escapeHtml(product.name)}" />
        </div>
        <div class="field">
          <label for="modal-quantity">Quantidade</label>
          <input id="modal-quantity" type="number" min="1" value="${product.quantity}" />
        </div>
        <div class="field">
          <label for="modal-expiry">Data de vencimento</label>
          <div class="date-field-row">
            <input
              id="modal-expiry"
              type="text"
              inputmode="numeric"
              placeholder="DD/MM/AAAA"
              maxlength="10"
              value="${escapeHtml(isoToDateBrFull(product.expiryDate))}"
            />
            <button type="button" class="btn-date-pick" id="modal-date-pick" title="Abrir calendário" aria-label="Abrir calendário">
              <svg class="btn-date-pick-icon" viewBox="0 0 24 24" aria-hidden="true">
                <rect x="3" y="4" width="18" height="18" rx="2" fill="none" stroke="currentColor" stroke-width="2"/>
                <path d="M16 2v4M8 2v4M3 10h18" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round"/>
              </svg>
            </button>
            <input id="modal-expiry-native" type="date" class="date-input-native-hidden" value="${escapeHtml(product.expiryDate)}" tabindex="-1" aria-hidden="true" />
          </div>
        </div>
        <p id="modal-feedback" class="feedback" hidden></p>
      </div>
      <footer class="modal-footer">
        <button type="button" class="btn btn-danger" id="modal-delete">Excluir</button>
        <button type="button" class="btn btn-secondary" id="modal-cancel">Cancelar</button>
        <button type="button" class="btn btn-primary" id="modal-save">Salvar</button>
      </footer>
    </div>
  `;

  document.body.appendChild(overlay);
  document.body.classList.add("modal-open");

  const feedback = overlay.querySelector("#modal-feedback");
  const btnSave = overlay.querySelector("#modal-save");
  const btnDelete = overlay.querySelector("#modal-delete");
  const expiryText = overlay.querySelector("#modal-expiry");
  const expiryNative = overlay.querySelector("#modal-expiry-native");
  const photoPreview = overlay.querySelector("#modal-photo-preview");

  let selectedPhoto = null;
  let imageUrl = product.imageUrl !== getPlaceholderImage() ? product.imageUrl : null;

  function showFeedback(message, type = "error") {
    feedback.textContent = message;
    feedback.className = `feedback feedback--${type}`;
    feedback.hidden = false;
  }

  function getExpiryIso() {
    return parseDateBrToIso(expiryText.value) || expiryNative.value || null;
  }

  overlay.querySelector(".modal-close").addEventListener("click", () => closeModal(overlay));
  overlay.querySelector("#modal-cancel").addEventListener("click", () => closeModal(overlay));
  overlay.addEventListener("click", (event) => {
    if (event.target === overlay) closeModal(overlay);
  });

  overlay.querySelector("#modal-take-photo").addEventListener("click", () => {
    startPhotoCapture({
      onCapture: (file) => {
        selectedPhoto = file;
        photoPreview.src = URL.createObjectURL(file);
      },
    });
  });

  expiryText.addEventListener("input", () => {
    const masked = maskDateBrInput(expiryText.value);
    if (masked !== expiryText.value) expiryText.value = masked;
    const iso = parseDateBrToIso(expiryText.value);
    if (iso) expiryNative.value = iso;
  });

  expiryNative.addEventListener("change", () => {
    if (expiryNative.value) expiryText.value = isoToDateBrFull(expiryNative.value);
  });

  overlay.querySelector("#modal-date-pick").addEventListener("click", () => {
    if (typeof expiryNative.showPicker === "function") {
      expiryNative.showPicker();
      return;
    }
    expiryNative.click();
  });

  btnDelete.addEventListener("click", async () => {
    if (!confirm(`Excluir "${product.name}"?`)) return;
    btnDelete.disabled = true;
    try {
      await deleteProduct(product.id);
      closeModal(overlay);
      onDeleted?.();
    } catch (error) {
      showFeedback(error.message, "error");
      btnDelete.disabled = false;
    }
  });

  btnSave.addEventListener("click", async () => {
    feedback.hidden = true;

    const barcode = overlay.querySelector("#modal-barcode").value.trim();
    const name = overlay.querySelector("#modal-name").value.trim();
    const quantity = overlay.querySelector("#modal-quantity").value.trim();
    const expiryDate = getExpiryIso();

    if (!barcode || !name) {
      showFeedback("Preencha código e descrição.", "error");
      return;
    }
    if (!expiryDate) {
      showFeedback("Informe a data no formato DD/MM/AAAA.", "error");
      return;
    }
    if (!quantity || Number(quantity) < 1) {
      showFeedback("Informe a quantidade.", "error");
      return;
    }

    btnSave.disabled = true;

    try {
      if (selectedPhoto) {
        imageUrl = await uploadProductImage(selectedPhoto);
      }

      await updateProduct(product.id, { barcode, name, expiryDate, quantity, imageUrl });
      closeModal(overlay);
      onUpdated?.();
    } catch (error) {
      showFeedback(error.message, "error");
      btnSave.disabled = false;
    }
  });
}

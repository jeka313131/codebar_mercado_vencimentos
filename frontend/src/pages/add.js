import {
  fetchProductCatalog,
  getPlaceholderImage,
  saveProduct,
  uploadProductImage,
} from "../api.js";
import { renderBottomNav, initBottomNav } from "../components/bottomNav.js";
import { navigate } from "../router.js";
import { startScanner } from "../scanner.js";
import { debounce, findByBarcode, searchByName } from "../utils/catalog.js";
import { isoToDateBrFull, maskDateBrInput, parseDateBrToIso } from "../utils/dates.js";
import { escapeHtml } from "../utils/html.js";

const DRAFT_KEY = "addProductDraft";
const SCAN_ONCE_KEY = "openScanOnce";

function readDraft() {
  try {
    const raw = sessionStorage.getItem(DRAFT_KEY);
    return raw ? JSON.parse(raw) : null;
  } catch {
    return null;
  }
}

function writeDraft(data) {
  try {
    sessionStorage.setItem(DRAFT_KEY, JSON.stringify(data));
  } catch {
    // ignore
  }
}

function clearDraft() {
  try {
    sessionStorage.removeItem(DRAFT_KEY);
  } catch {
    // ignore
  }
}

function consumeScanOnce() {
  try {
    if (sessionStorage.getItem(SCAN_ONCE_KEY) === "1") {
      sessionStorage.removeItem(SCAN_ONCE_KEY);
      return true;
    }
  } catch {
    // ignore
  }
  return false;
}

export async function renderAdd(container) {
  container.className = "page page-add";
  container.innerHTML = `
    <header class="page-top">
      <button type="button" class="btn-back" id="btn-back">← Voltar</button>
      <h1 class="page-title">Novo produto</h1>
    </header>

    <main class="form-card">
      <div class="field">
        <label for="product-photo">Foto do produto</label>
        <div class="photo-picker">
          <img id="photo-preview" class="photo-preview" src="${getPlaceholderImage()}" alt="Prévia da foto" />
          <input
            id="product-photo"
            type="file"
            accept="image/*"
            class="photo-input"
          />
          <label for="product-photo" class="btn btn-secondary">Tirar / escolher foto</label>
        </div>
      </div>

      <div class="field">
        <label for="barcode">Código de barras</label>
        <div class="barcode-row">
          <input id="barcode" type="text" inputmode="numeric" placeholder="Escaneie ou digite" autocomplete="off" />
          <button type="button" id="btn-scan" class="btn btn-scan">📷 Ler</button>
        </div>
      </div>

      <div class="field combobox-field">
        <label for="product-name">Descrição</label>
        <div class="combobox" id="name-combobox">
          <input
            id="product-name"
            type="text"
            placeholder="Busque pelo nome ou digite"
            autocomplete="off"
            role="combobox"
            aria-expanded="false"
            aria-controls="product-name-list"
          />
          <ul id="product-name-list" class="combobox-dropdown" role="listbox" hidden></ul>
        </div>
      </div>

      <div class="field">
        <label for="quantity">Quantidade</label>
        <input id="quantity" type="number" min="1" inputmode="numeric" placeholder="Ex.: 5" />
      </div>

      <div class="field">
        <label for="expiry-date-text">Data de vencimento</label>
        <div class="date-field-row">
          <input
            id="expiry-date-text"
            type="text"
            inputmode="numeric"
            placeholder="DD/MM/AAAA"
            autocomplete="off"
            maxlength="10"
          />
          <button type="button" class="btn-date-pick" id="btn-date-pick" title="Abrir calendário" aria-label="Abrir calendário">
            <svg class="btn-date-pick-icon" viewBox="0 0 24 24" aria-hidden="true">
              <rect x="3" y="4" width="18" height="18" rx="2" fill="none" stroke="currentColor" stroke-width="2"/>
              <path d="M16 2v4M8 2v4M3 10h18" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round"/>
            </svg>
          </button>
          <input id="expiry-date-native" type="date" class="date-input-native-hidden" tabindex="-1" aria-hidden="true" />
        </div>
      </div>

      <button type="button" id="btn-save" class="btn btn-primary">Salvar produto</button>
      <p id="feedback" class="feedback" hidden></p>
    </main>
    ${renderBottomNav()}
  `;

  initBottomNav(container, { navigate });

  const barcodeInput = container.querySelector("#barcode");
  const nameInput = container.querySelector("#product-name");
  const nameList = container.querySelector("#product-name-list");
  const quantityInput = container.querySelector("#quantity");
  const expiryText = container.querySelector("#expiry-date-text");
  const expiryNative = container.querySelector("#expiry-date-native");
  const photoInput = container.querySelector("#product-photo");
  const photoPreview = container.querySelector("#photo-preview");
  const feedback = container.querySelector("#feedback");
  const btnSave = container.querySelector("#btn-save");

  let selectedPhoto = null;
  let catalogImageUrl = null;
  let catalog = [];

  try {
    catalog = await fetchProductCatalog();
  } catch {
    catalog = [];
  }

  function showFeedback(message, type = "success") {
    feedback.textContent = message;
    feedback.className = `feedback feedback--${type}`;
    feedback.hidden = false;
  }

  function getExpiryIso() {
    return parseDateBrToIso(expiryText.value) || expiryNative.value || null;
  }

  function saveFormDraft() {
    writeDraft({
      barcode: barcodeInput.value,
      name: nameInput.value,
      quantity: quantityInput.value,
      expiryText: expiryText.value,
      expiryNative: expiryNative.value,
      catalogImageUrl,
    });
  }

  function restoreFormDraft() {
    const draft = readDraft();
    if (!draft) return;
    barcodeInput.value = draft.barcode || "";
    nameInput.value = draft.name || "";
    quantityInput.value = draft.quantity || "";
    expiryText.value = draft.expiryText || "";
    expiryNative.value = draft.expiryNative || "";
    if (draft.catalogImageUrl) {
      catalogImageUrl = draft.catalogImageUrl;
      photoPreview.src = draft.catalogImageUrl;
    }
  }

  function applyCatalogEntry(entry) {
    if (!entry) return;
    barcodeInput.value = entry.barcode;
    nameInput.value = entry.name;
    photoPreview.src = entry.imageUrl;
    catalogImageUrl = entry.imageUrl !== getPlaceholderImage() ? entry.imageUrl : null;
    selectedPhoto = null;
    photoInput.value = "";
    hideNameDropdown();
    saveFormDraft();
  }

  function hideNameDropdown() {
    nameList.hidden = true;
    nameInput.setAttribute("aria-expanded", "false");
  }

  function showNameDropdown(matches) {
    if (!matches.length) {
      hideNameDropdown();
      return;
    }

    nameList.innerHTML = matches
      .map(
        (item) => `
          <li role="option" data-barcode="${escapeHtml(item.barcode)}">
            <span class="combobox-option-name">${escapeHtml(item.name)}</span>
            <span class="combobox-option-code">${escapeHtml(item.barcode)}</span>
          </li>
        `,
      )
      .join("");
    nameList.hidden = false;
    nameInput.setAttribute("aria-expanded", "true");
  }

  function handleBarcodeLookup() {
    const entry = findByBarcode(catalog, barcodeInput.value);
    if (entry) applyCatalogEntry(entry);
  }

  function openScanner() {
    startScanner({
      onScan: (code) => {
        barcodeInput.value = code;
        handleBarcodeLookup();
        saveFormDraft();
        if (!findByBarcode(catalog, code)) {
          quantityInput.focus();
        }
      },
    });
  }

  restoreFormDraft();

  container.querySelector("#btn-back").addEventListener("click", () => {
    clearDraft();
    navigate("/");
  });

  photoInput.addEventListener("click", () => {
    saveFormDraft();
  });

  photoInput.addEventListener("change", () => {
    const file = photoInput.files?.[0];
    if (!file) return;
    selectedPhoto = file;
    catalogImageUrl = null;
    photoPreview.src = URL.createObjectURL(file);
    saveFormDraft();
  });

  container.querySelector("#btn-scan").addEventListener("click", openScanner);

  barcodeInput.addEventListener("input", debounce(() => {
    handleBarcodeLookup();
    saveFormDraft();
  }, 200));

  nameInput.addEventListener("input", debounce(() => {
    showNameDropdown(searchByName(catalog, nameInput.value));
    saveFormDraft();
  }, 120));

  nameList.addEventListener("click", (event) => {
    const option = event.target.closest("[data-barcode]");
    if (!option) return;
    const entry = findByBarcode(catalog, option.dataset.barcode);
    if (entry) applyCatalogEntry(entry);
  });

  container.addEventListener("click", (event) => {
    if (!event.target.closest("#name-combobox")) hideNameDropdown();
  });

  quantityInput.addEventListener("input", () => saveFormDraft());

  expiryText.addEventListener("input", () => {
    const masked = maskDateBrInput(expiryText.value);
    if (masked !== expiryText.value) {
      expiryText.value = masked;
    }
    const iso = parseDateBrToIso(expiryText.value);
    if (iso) expiryNative.value = iso;
    saveFormDraft();
  });

  expiryNative.addEventListener("change", () => {
    if (expiryNative.value) {
      expiryText.value = isoToDateBrFull(expiryNative.value);
    }
    saveFormDraft();
  });

  container.querySelector("#btn-date-pick").addEventListener("click", () => {
    if (typeof expiryNative.showPicker === "function") {
      expiryNative.showPicker();
      return;
    }
    expiryNative.click();
  });

  btnSave.addEventListener("click", async () => {
    feedback.hidden = true;

    const barcode = barcodeInput.value.trim();
    const name = nameInput.value.trim();
    const expiryDate = getExpiryIso();
    const quantity = quantityInput.value.trim();

    if (!barcode || !name) {
      showFeedback("Preencha código e descrição.", "error");
      return;
    }

    if (!expiryDate) {
      showFeedback("Informe a data no formato DD/MM/AAAA.", "error");
      expiryText.focus();
      return;
    }

    if (!quantity || Number(quantity) < 1) {
      showFeedback("Informe a quantidade.", "error");
      quantityInput.focus();
      return;
    }

    btnSave.disabled = true;

    try {
      let imageUrl = catalogImageUrl;
      if (selectedPhoto) {
        imageUrl = await uploadProductImage(selectedPhoto);
      }

      await saveProduct({ barcode, name, expiryDate, quantity, imageUrl });
      clearDraft();
      navigate("/");
    } catch (error) {
      showFeedback(error.message, "error");
    } finally {
      btnSave.disabled = false;
    }
  });

  if (consumeScanOnce()) {
    requestAnimationFrame(() => openScanner());
  }
}

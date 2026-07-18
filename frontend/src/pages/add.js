import {
  fetchProductCatalog,
  getPlaceholderImage,
  saveProduct,
  uploadProductImage,
} from "../api.js";
import { renderBottomNav, initBottomNav } from "../components/bottomNav.js";
import { navigate } from "../router.js";
import { startScanner, stopScanner } from "../scanner.js";
import { startPhotoCapture, stopPhotoCapture } from "../photoCapture.js";
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

function batchRowHtml(index, { quantity = "", expiryText = "", expiryNative = "" } = {}) {
  return `
    <div class="batch-row" data-batch-index="${index}">
      <div class="batch-row-header">
        <span class="batch-row-label">Lote ${index + 1}</span>
        <button type="button" class="btn-batch-remove" data-remove-batch aria-label="Remover lote" hidden>Remover</button>
      </div>
      <div class="batch-row-fields">
        <div class="field batch-qty-field">
          <label>Quantidade</label>
          <input
            type="number"
            min="1"
            inputmode="numeric"
            class="batch-quantity"
            placeholder="Ex.: 5"
            value="${escapeHtml(String(quantity))}"
          />
        </div>
        <div class="field batch-date-field">
          <label>Vencimento</label>
          <div class="date-field-row">
            <input
              type="text"
              inputmode="numeric"
              class="batch-expiry-text"
              placeholder="DD/MM/AAAA"
              autocomplete="off"
              maxlength="10"
              value="${escapeHtml(expiryText)}"
            />
            <button type="button" class="btn-date-pick" data-date-pick title="Abrir calendário" aria-label="Abrir calendário">
              <svg class="btn-date-pick-icon" viewBox="0 0 24 24" aria-hidden="true">
                <rect x="3" y="4" width="18" height="18" rx="2" fill="none" stroke="currentColor" stroke-width="2"/>
                <path d="M16 2v4M8 2v4M3 10h18" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round"/>
              </svg>
            </button>
            <input type="date" class="date-input-native-hidden batch-expiry-native" value="${escapeHtml(expiryNative)}" tabindex="-1" aria-hidden="true" />
          </div>
        </div>
      </div>
    </div>
  `;
}

function parseBatchRow(row) {
  const quantity = row.querySelector(".batch-quantity")?.value.trim() || "";
  const expiryText = row.querySelector(".batch-expiry-text")?.value.trim() || "";
  const expiryNative = row.querySelector(".batch-expiry-native")?.value || "";
  const expiryDate = parseDateBrToIso(expiryText) || expiryNative || null;
  const hasQty = Boolean(quantity);
  const hasDate = Boolean(expiryText || expiryNative);
  const qtyOk = hasQty && Number(quantity) >= 1;
  const dateOk = Boolean(expiryDate);
  const empty = !hasQty && !hasDate;
  const complete = qtyOk && dateOk;
  const incomplete = !empty && !complete;

  return { quantity, expiryText, expiryNative, expiryDate, empty, complete, incomplete };
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
        <label for="photo-preview">Foto do produto</label>
        <div class="photo-picker">
          <img id="photo-preview" class="photo-preview" src="${getPlaceholderImage()}" alt="Prévia da foto" />
          <button type="button" class="btn btn-secondary" id="btn-take-photo">Tirar foto</button>
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
        <label>Lotes (quantidade e vencimento)</label>
        <div id="batches-list" class="batches-list"></div>
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
  const batchesList = container.querySelector("#batches-list");
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

  function getBatchRows() {
    return [...batchesList.querySelectorAll(".batch-row")];
  }

  function saveFormDraft() {
    writeDraft({
      barcode: barcodeInput.value,
      name: nameInput.value,
      catalogImageUrl,
      batches: getBatchRows().map((row) => {
        const b = parseBatchRow(row);
        return {
          quantity: b.quantity,
          expiryText: b.expiryText,
          expiryNative: b.expiryNative,
        };
      }),
    });
  }

  function updateBatchUi() {
    const rows = getBatchRows();
    rows.forEach((row, index) => {
      row.dataset.batchIndex = String(index);
      const label = row.querySelector(".batch-row-label");
      if (label) label.textContent = `Lote ${index + 1}`;
      const removeBtn = row.querySelector("[data-remove-batch]");
      if (removeBtn) removeBtn.hidden = rows.length <= 1;
    });

    const last = rows[rows.length - 1];
    if (last && parseBatchRow(last).complete) {
      addBatchRow();
    }
  }

  function bindBatchRow(row) {
    const quantityInput = row.querySelector(".batch-quantity");
    const expiryText = row.querySelector(".batch-expiry-text");
    const expiryNative = row.querySelector(".batch-expiry-native");
    const datePick = row.querySelector("[data-date-pick]");
    const removeBtn = row.querySelector("[data-remove-batch]");

    quantityInput?.addEventListener("input", () => {
      updateBatchUi();
      saveFormDraft();
    });

    expiryText?.addEventListener("input", () => {
      const masked = maskDateBrInput(expiryText.value);
      if (masked !== expiryText.value) expiryText.value = masked;
      const iso = parseDateBrToIso(expiryText.value);
      if (iso) expiryNative.value = iso;
      updateBatchUi();
      saveFormDraft();
    });

    expiryNative?.addEventListener("change", () => {
      if (expiryNative.value) {
        expiryText.value = isoToDateBrFull(expiryNative.value);
      }
      updateBatchUi();
      saveFormDraft();
    });

    datePick?.addEventListener("click", () => {
      if (typeof expiryNative.showPicker === "function") {
        expiryNative.showPicker();
        return;
      }
      expiryNative.click();
    });

    removeBtn?.addEventListener("click", () => {
      if (getBatchRows().length <= 1) return;
      row.remove();
      updateBatchUi();
      saveFormDraft();
    });
  }

  function addBatchRow(data = {}) {
    const index = getBatchRows().length;
    batchesList.insertAdjacentHTML("beforeend", batchRowHtml(index, data));
    const row = batchesList.lastElementChild;
    if (row) bindBatchRow(row);
    updateBatchUi();
  }

  function collectBatchesForSave() {
    const rows = getBatchRows();
    const complete = [];
    let incompleteIndex = -1;

    for (let i = 0; i < rows.length; i += 1) {
      const batch = parseBatchRow(rows[i]);
      const isLast = i === rows.length - 1;

      if (batch.empty) {
        if (isLast) continue;
        incompleteIndex = i;
        break;
      }

      if (batch.incomplete) {
        incompleteIndex = i;
        break;
      }

      if (batch.complete) {
        complete.push(batch);
      }
    }

    return { complete, incompleteIndex };
  }

  function restoreFormDraft() {
    const draft = readDraft();
    if (!draft) {
      addBatchRow();
      return;
    }

    barcodeInput.value = draft.barcode || "";
    nameInput.value = draft.name || "";
    if (draft.catalogImageUrl) {
      catalogImageUrl = draft.catalogImageUrl;
      photoPreview.src = draft.catalogImageUrl;
    }

    const batches = Array.isArray(draft.batches) && draft.batches.length
      ? draft.batches
      : [
          {
            quantity: draft.quantity || "",
            expiryText: draft.expiryText || "",
            expiryNative: draft.expiryNative || "",
          },
        ];

    batches.forEach((batch) => addBatchRow(batch));
    updateBatchUi();
  }

  function applyCatalogEntry(entry) {
    if (!entry) return;
    barcodeInput.value = entry.barcode;
    nameInput.value = entry.name;
    photoPreview.src = entry.imageUrl;
    catalogImageUrl = entry.imageUrl !== getPlaceholderImage() ? entry.imageUrl : null;
    selectedPhoto = null;
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
    stopPhotoCapture();
    startScanner({
      onScan: (code) => {
        barcodeInput.value = code;
        handleBarcodeLookup();
        saveFormDraft();
        if (!findByBarcode(catalog, code)) {
          getBatchRows()[0]?.querySelector(".batch-quantity")?.focus();
        }
      },
    });
  }

  restoreFormDraft();

  container.querySelector("#btn-back").addEventListener("click", () => {
    clearDraft();
    navigate("/");
  });

  container.querySelector("#btn-take-photo").addEventListener("click", async () => {
    saveFormDraft();
    await stopScanner();
    startPhotoCapture({
      onCapture: (file) => {
        selectedPhoto = file;
        catalogImageUrl = null;
        photoPreview.src = URL.createObjectURL(file);
        saveFormDraft();
      },
    });
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

  btnSave.addEventListener("click", async () => {
    feedback.hidden = true;

    const barcode = barcodeInput.value.trim();
    const name = nameInput.value.trim();

    if (!barcode || !name) {
      showFeedback("Preencha código e descrição.", "error");
      return;
    }

    const { complete, incompleteIndex } = collectBatchesForSave();

    if (incompleteIndex >= 0) {
      showFeedback(
        `Lote ${incompleteIndex + 1} incompleto. Preencha quantidade e vencimento ou remova o lote.`,
        "error",
      );
      getBatchRows()[incompleteIndex]?.querySelector(".batch-quantity")?.focus();
      return;
    }

    if (!complete.length) {
      showFeedback("Informe pelo menos um lote com quantidade e vencimento.", "error");
      getBatchRows()[0]?.querySelector(".batch-quantity")?.focus();
      return;
    }

    btnSave.disabled = true;

    try {
      let imageUrl = catalogImageUrl;
      if (selectedPhoto) {
        imageUrl = await uploadProductImage(selectedPhoto);
      }

      for (const batch of complete) {
        await saveProduct({
          barcode,
          name,
          expiryDate: batch.expiryDate,
          quantity: batch.quantity,
          imageUrl,
        });
      }

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

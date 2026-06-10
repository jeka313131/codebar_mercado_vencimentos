import { getPlaceholderImage, saveProduct, uploadProductImage } from "../api.js";
import { navigate } from "../router.js";
import { initScanner, startScanner } from "../scanner.js";

function formatDateDisplay(isoDate) {
  if (!isoDate) return "Toque para escolher a data";
  const [year, month, day] = isoDate.split("-");
  return `${day}/${month}/${year}`;
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
            capture="environment"
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

      <div class="field">
        <label for="product-name">Descrição</label>
        <input id="product-name" type="text" placeholder="Ex.: Arroz Branco 1kg" autocomplete="off" />
      </div>

      <div class="field">
        <label for="quantity">Quantidade</label>
        <input id="quantity" type="number" min="1" value="1" inputmode="numeric" />
      </div>

      <div class="field">
        <span class="field-label">Data de vencimento</span>
        <div class="date-picker-wrap">
          <div id="expiry-display" class="date-picker-display is-empty">Toque para escolher a data</div>
          <input id="expiry-date" type="date" class="date-input-native" aria-label="Data de vencimento" />
        </div>
      </div>

      <button type="button" id="btn-save" class="btn btn-primary">Salvar produto</button>
      <p id="feedback" class="feedback" hidden></p>
    </main>
  `;

  const barcodeInput = container.querySelector("#barcode");
  const nameInput = container.querySelector("#product-name");
  const quantityInput = container.querySelector("#quantity");
  const expiryInput = container.querySelector("#expiry-date");
  const expiryDisplay = container.querySelector("#expiry-display");
  const photoInput = container.querySelector("#product-photo");
  const photoPreview = container.querySelector("#photo-preview");
  const feedback = container.querySelector("#feedback");
  const btnSave = container.querySelector("#btn-save");

  let selectedPhoto = null;

  function showFeedback(message, type = "success") {
    feedback.textContent = message;
    feedback.className = `feedback feedback--${type}`;
    feedback.hidden = false;
  }

  function updateExpiryDisplay() {
    if (expiryInput.value) {
      expiryDisplay.textContent = formatDateDisplay(expiryInput.value);
      expiryDisplay.classList.remove("is-empty");
    } else {
      expiryDisplay.textContent = "Toque para escolher a data";
      expiryDisplay.classList.add("is-empty");
    }
  }

  container.querySelector("#btn-back").addEventListener("click", () => {
    navigate("/");
  });

  photoInput.addEventListener("change", () => {
    const file = photoInput.files?.[0];
    if (!file) return;
    selectedPhoto = file;
    photoPreview.src = URL.createObjectURL(file);
  });

  container.querySelector("#btn-scan").addEventListener("click", () => {
    startScanner({
      onScan: (code) => {
        barcodeInput.value = code;
        nameInput.focus();
      },
    });
  });

  expiryInput.addEventListener("change", updateExpiryDisplay);
  expiryInput.addEventListener("input", updateExpiryDisplay);

  btnSave.addEventListener("click", async () => {
    feedback.hidden = true;

    const barcode = barcodeInput.value.trim();
    const name = nameInput.value.trim();
    const expiryDate = expiryInput.value;
    const quantity = quantityInput.value;

    if (!barcode || !name || !expiryDate) {
      showFeedback("Preencha código, descrição e vencimento.", "error");
      return;
    }

    btnSave.disabled = true;

    try {
      let imageUrl = null;
      if (selectedPhoto) {
        imageUrl = await uploadProductImage(selectedPhoto);
      }

      await saveProduct({ barcode, name, expiryDate, quantity, imageUrl });
      navigate("/");
    } catch (error) {
      showFeedback(error.message, "error");
    } finally {
      btnSave.disabled = false;
    }
  });

  updateExpiryDisplay();
}

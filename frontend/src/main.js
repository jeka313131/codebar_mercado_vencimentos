import "./style.css";
import { BrowserMultiFormatReader } from "@zxing/browser";
import { registerSW } from "virtual:pwa-register";
import { fetchProducts, saveProduct } from "./api.js";

registerSW({ immediate: true });

const barcodeInput = document.getElementById("barcode");
const productNameInput = document.getElementById("product-name");
const expiryDateInput = document.getElementById("expiry-date");
const expiryDisplay = document.getElementById("expiry-display");
const btnSave = document.getElementById("btn-save");
const btnScan = document.getElementById("btn-scan");
const btnCancelScanner = document.getElementById("btn-cancel-scanner");
const btnTorch = document.getElementById("btn-torch");
const feedback = document.getElementById("feedback");
const recentList = document.getElementById("recent-list");
const recentItems = document.getElementById("recent-items");
const scannerPanel = document.getElementById("scanner-panel");
const scannerStatus = document.getElementById("scanner-status");
const cameraVideo = document.getElementById("camera-video");

const reader = new BrowserMultiFormatReader();
let scanning = false;
let scanControls = null;
let torchOn = false;
let torchSupported = false;

function showFeedback(message, type = "success") {
  feedback.textContent = message;
  feedback.className = `feedback feedback--${type}`;
  feedback.hidden = false;
}

function clearFeedback() {
  feedback.hidden = true;
}

function formatDate(isoDate) {
  const [year, month, day] = isoDate.split("-");
  return `${day}/${month}/${year}`;
}

function updateExpiryDisplay() {
  if (expiryDateInput.value) {
    expiryDisplay.textContent = formatDate(expiryDateInput.value);
    expiryDisplay.classList.remove("is-empty");
    return;
  }

  expiryDisplay.textContent = "Toque para escolher a data";
  expiryDisplay.classList.add("is-empty");
}

function renderRecent(products) {
  if (!products.length) {
    recentList.hidden = true;
    return;
  }

  recentList.hidden = false;
  recentItems.innerHTML = products
    .map(
      (product) => `
        <li>
          <strong>${product.name}</strong>
          <span>${product.barcode}</span>
          <time>Vence em ${formatDate(product.expiryDate)}</time>
        </li>
      `,
    )
    .join("");
}

async function loadRecent() {
  try {
    const products = await fetchProducts();
    renderRecent(products);
  } catch {
    renderRecent([]);
  }
}

function resetScannerUi() {
  scannerStatus.textContent = "Iniciando câmera…";
  scannerStatus.classList.remove("is-error");
  scannerPanel.classList.remove("is-ready");
  torchOn = false;
  torchSupported = false;
  btnTorch.hidden = true;
  btnTorch.classList.remove("is-on");
  btnTorch.setAttribute("aria-pressed", "false");
  btnTorch.setAttribute("aria-label", "Ligar lanterna");
}

function getVideoTrack() {
  return cameraVideo.srcObject?.getVideoTracks?.()?.[0] ?? null;
}

function updateTorchAvailability() {
  const track = getVideoTrack();
  if (!track) {
    btnTorch.hidden = true;
    return;
  }

  const capabilities = track.getCapabilities?.() ?? {};
  torchSupported = Boolean(capabilities.torch);
  btnTorch.hidden = !torchSupported;
}

async function setTorch(enabled) {
  const track = getVideoTrack();
  if (!track || !torchSupported) return;

  try {
    await track.applyConstraints({ advanced: [{ torch: enabled }] });
    torchOn = enabled;
    btnTorch.classList.toggle("is-on", enabled);
    btnTorch.setAttribute("aria-pressed", String(enabled));
    btnTorch.setAttribute("aria-label", enabled ? "Desligar lanterna" : "Ligar lanterna");
  } catch {
    btnTorch.hidden = true;
    torchSupported = false;
  }
}

async function toggleTorch() {
  await setTorch(!torchOn);
}

function getCameraErrorMessage(error) {
  const message = error?.message?.toLowerCase() ?? "";

  if (!window.isSecureContext) {
    return "Câmera só funciona com HTTPS. No celular, acesse https://IP:8443 (aceite o aviso de segurança).";
  }

  if (message.includes("permission") || error?.name === "NotAllowedError") {
    return "Permita o acesso à câmera nas configurações do navegador.";
  }

  if (message.includes("notfound") || error?.name === "NotFoundError") {
    return "Nenhuma câmera encontrada neste aparelho.";
  }

  return error?.message || "Não foi possível abrir a câmera.";
}

async function stopScanner() {
  scanning = false;

  if (torchOn) {
    await setTorch(false);
  }

  if (scanControls) {
    scanControls.stop();
    scanControls = null;
  }

  reader.reset();
  scannerPanel.classList.remove("is-open");
  scannerPanel.setAttribute("aria-hidden", "true");
  document.body.classList.remove("scanner-open");
  resetScannerUi();

  if (cameraVideo.srcObject) {
    cameraVideo.srcObject.getTracks().forEach((track) => track.stop());
    cameraVideo.srcObject = null;
  }
}

async function waitForPanelPaint() {
  await new Promise((resolve) => {
    requestAnimationFrame(() => requestAnimationFrame(resolve));
  });
}

async function startScanner() {
  if (scanning) return;

  scanning = true;
  resetScannerUi();
  scannerPanel.classList.add("is-open");
  scannerPanel.setAttribute("aria-hidden", "false");
  document.body.classList.add("scanner-open");
  clearFeedback();

  await waitForPanelPaint();

  if (!window.isSecureContext) {
    scannerStatus.textContent = getCameraErrorMessage();
    scannerStatus.classList.add("is-error");
    scanning = false;
    return;
  }

  try {
    scanControls = await reader.decodeFromConstraints(
      {
        video: {
          facingMode: { ideal: "environment" },
          width: { ideal: 1280 },
          height: { ideal: 720 },
        },
      },
      cameraVideo,
      (result, error) => {
        if (result) {
          barcodeInput.value = result.getText();
          stopScanner();
          productNameInput.focus();
        }

        if (error && error.name !== "NotFoundException") {
          console.debug(error);
        }
      },
    );

    scannerPanel.classList.add("is-ready");
    cameraVideo.addEventListener("loadedmetadata", updateTorchAvailability, { once: true });
    updateTorchAvailability();
  } catch (error) {
    scannerStatus.textContent = getCameraErrorMessage(error);
    scannerStatus.classList.add("is-error");
    scanning = false;
  }
}

async function handleSave() {
  clearFeedback();

  const barcode = barcodeInput.value.trim();
  const name = productNameInput.value.trim();
  const expiryDate = expiryDateInput.value;

  if (!barcode || !name || !expiryDate) {
    showFeedback("Preencha código, nome e vencimento.", "error");
    return;
  }

  btnSave.disabled = true;

  try {
    await saveProduct({ barcode, name, expiryDate });
    showFeedback("Produto salvo com sucesso!");
    barcodeInput.value = "";
    productNameInput.value = "";
    expiryDateInput.value = "";
    updateExpiryDisplay();
    barcodeInput.focus();
    await loadRecent();
  } catch (error) {
    showFeedback(error.message, "error");
  } finally {
    btnSave.disabled = false;
  }
}

btnScan.addEventListener("click", startScanner);
btnCancelScanner.addEventListener("click", stopScanner);
btnTorch.addEventListener("click", toggleTorch);
btnSave.addEventListener("click", handleSave);
expiryDateInput.addEventListener("change", updateExpiryDisplay);
expiryDateInput.addEventListener("input", updateExpiryDisplay);

updateExpiryDisplay();
loadRecent();

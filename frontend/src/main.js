import "./style.css";
import { registerSW } from "virtual:pwa-register";
import { fetchProducts, saveProduct } from "./api.js";
import { captureAndDecode } from "./scanner/capture.js";
import {
  applyCameraEnhancements,
  getTorchCapabilities,
  setTorch,
  startCamera,
  stopCamera,
} from "./scanner/camera.js";
import { resetDecoder } from "./scanner/decode.js";

registerSW({ immediate: true });

const barcodeInput = document.getElementById("barcode");
const productNameInput = document.getElementById("product-name");
const expiryDateInput = document.getElementById("expiry-date");
const expiryDisplay = document.getElementById("expiry-display");
const btnSave = document.getElementById("btn-save");
const btnScan = document.getElementById("btn-scan");
const btnCancelScanner = document.getElementById("btn-cancel-scanner");
const btnCaptureScanner = document.getElementById("btn-capture-scanner");
const btnTypeBarcode = document.getElementById("btn-type-barcode");
const btnTorch = document.getElementById("btn-torch");
const feedback = document.getElementById("feedback");
const recentList = document.getElementById("recent-list");
const recentItems = document.getElementById("recent-items");
const scannerPanel = document.getElementById("scanner-panel");
const scannerStatus = document.getElementById("scanner-status");
const scanFrame = document.getElementById("scan-frame");
const cameraVideo = document.getElementById("camera-video");
const scanCanvas = document.getElementById("scan-canvas");

let scanning = false;
let torchOn = false;
let torchSupported = false;
let lastScannedCode = "";

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

function playScanBeep() {
  try {
    const context = new AudioContext();
    const oscillator = context.createOscillator();
    const gain = context.createGain();

    oscillator.type = "sine";
    oscillator.frequency.value = 920;
    gain.gain.value = 0.12;
    oscillator.connect(gain);
    gain.connect(context.destination);
    oscillator.start();
    oscillator.stop(context.currentTime + 0.1);
    oscillator.onended = () => context.close();
  } catch {
    // ignore
  }
}

function vibrateSuccess() {
  navigator.vibrate?.(80);
}

function flashScanSuccess() {
  scanFrame.classList.add("is-success");
  window.setTimeout(() => scanFrame.classList.remove("is-success"), 450);
}

function setCaptureEnabled(enabled) {
  btnCaptureScanner.disabled = !enabled;
}

function resetScannerUi() {
  scannerStatus.textContent = "Iniciando câmera…";
  scannerStatus.classList.remove("is-error");
  scannerPanel.classList.remove("is-ready");
  scanFrame.classList.remove("is-success");
  torchOn = false;
  torchSupported = false;
  btnTorch.hidden = true;
  btnTorch.classList.remove("is-on");
  btnTorch.setAttribute("aria-pressed", "false");
  btnTorch.setAttribute("aria-label", "Ligar lanterna");
  setCaptureEnabled(false);
}

function updateTorchAvailability() {
  const { supported } = getTorchCapabilities(cameraVideo);
  torchSupported = supported;
  btnTorch.hidden = !torchSupported;
}

async function toggleTorch() {
  if (!torchSupported) return;

  const next = !torchOn;
  const ok = await setTorch(cameraVideo, next);
  if (!ok) {
    btnTorch.hidden = true;
    torchSupported = false;
    return;
  }

  torchOn = next;
  btnTorch.classList.toggle("is-on", next);
  btnTorch.setAttribute("aria-pressed", String(next));
  btnTorch.setAttribute("aria-label", next ? "Desligar lanterna" : "Ligar lanterna");
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

function handleScanResult(text) {
  const code = text.trim();
  if (!code || code === lastScannedCode) return;

  lastScannedCode = code;
  barcodeInput.value = code;
  flashScanSuccess();
  playScanBeep();
  vibrateSuccess();

  window.setTimeout(async () => {
    await stopScanner();
    productNameInput.focus();
  }, 180);
}

async function stopScanner() {
  scanning = false;

  try {
    if (torchOn) {
      await setTorch(cameraVideo, false);
    }
    resetDecoder();
  } catch (error) {
    console.debug(error);
  }

  stopCamera(cameraVideo);
  scannerPanel.classList.remove("is-open");
  scannerPanel.setAttribute("aria-hidden", "true");
  document.body.classList.remove("scanner-open");
  resetScannerUi();
  window.scrollTo(0, 0);
}

async function handleTypeBarcode() {
  await stopScanner();
  barcodeInput.focus();
}

async function handleCapture() {
  if (!scanning || btnCaptureScanner.disabled) return;

  setCaptureEnabled(false);
  scannerStatus.textContent = "Lendo código…";

  try {
    const code = await captureAndDecode(cameraVideo, scanFrame, scanCanvas);

    if (code) {
      handleScanResult(code);
      return;
    }

    scannerStatus.textContent = "Não leu. Aproxime, ilumine e toque Capturar de novo.";
  } catch {
    scannerStatus.textContent = "Erro ao capturar. Tente novamente.";
  }

  setCaptureEnabled(true);
}

async function waitForPanelPaint() {
  await new Promise((resolve) => {
    requestAnimationFrame(() => requestAnimationFrame(resolve));
  });
}

async function startScanner() {
  if (scanning) return;

  scanning = true;
  lastScannedCode = "";
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
    await startCamera(cameraVideo);
    scannerPanel.classList.add("is-ready");
    scannerStatus.textContent = "Centralize o código e toque Capturar";

    const onCameraReady = async () => {
      await applyCameraEnhancements(cameraVideo);
      updateTorchAvailability();
      setCaptureEnabled(true);
    };

    cameraVideo.addEventListener("loadedmetadata", onCameraReady, { once: true });
    if (cameraVideo.readyState >= 1) {
      await onCameraReady();
    }
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
btnCaptureScanner.addEventListener("click", handleCapture);
btnTypeBarcode.addEventListener("click", handleTypeBarcode);
btnTorch.addEventListener("click", toggleTorch);
btnSave.addEventListener("click", handleSave);
expiryDateInput.addEventListener("change", updateExpiryDisplay);
expiryDateInput.addEventListener("input", updateExpiryDisplay);

updateExpiryDisplay();
loadRecent();

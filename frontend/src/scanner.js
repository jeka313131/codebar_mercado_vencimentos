import { BrowserMultiFormatReader } from "@zxing/browser";
import { BarcodeFormat, DecodeHintType } from "@zxing/library";

const scanHints = new Map();
scanHints.set(DecodeHintType.POSSIBLE_FORMATS, [
  BarcodeFormat.EAN_13,
  BarcodeFormat.EAN_8,
  BarcodeFormat.UPC_A,
  BarcodeFormat.UPC_E,
]);
scanHints.set(DecodeHintType.TRY_HARDER, true);

const reader = new BrowserMultiFormatReader(scanHints, 300);
const cameraConstraints = {
  video: {
    facingMode: { ideal: "environment" },
    width: { min: 1280, ideal: 1920, max: 4096 },
    height: { min: 720, ideal: 1080, max: 2160 },
    aspectRatio: { ideal: 1.7777777778 },
    focusMode: { ideal: "continuous" },
  },
};

let scanning = false;
let scanControls = null;
let torchOn = false;
let torchSupported = false;
let lastScannedCode = "";
let onScanCallback = null;
let onCloseCallback = null;

const scannerPanel = () => document.getElementById("scanner-panel");
const scannerStatus = () => document.getElementById("scanner-status");
const scanFrame = () => document.getElementById("scan-frame");
const cameraVideo = () => document.getElementById("camera-video");
const btnCancel = () => document.getElementById("btn-cancel-scanner");
const btnType = () => document.getElementById("btn-type-barcode");
const btnTorch = () => document.getElementById("btn-torch");

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

function resetScannerUi() {
  const status = scannerStatus();
  const frame = scanFrame();
  const torch = btnTorch();
  const panel = scannerPanel();

  if (status) {
    status.textContent = "Iniciando câmera…";
    status.classList.remove("is-error");
  }
  panel?.classList.remove("is-ready");
  frame?.classList.remove("is-success");
  torchOn = false;
  torchSupported = false;
  if (torch) {
    torch.hidden = true;
    torch.classList.remove("is-on");
    torch.setAttribute("aria-pressed", "false");
    torch.setAttribute("aria-label", "Ligar lanterna");
  }
}

function getVideoTrack() {
  return cameraVideo()?.srcObject?.getVideoTracks?.()?.[0] ?? null;
}

async function applyCameraEnhancements() {
  const track = getVideoTrack();
  if (!track) return;

  const capabilities = track.getCapabilities?.() ?? {};
  const advanced = [];

  if (capabilities.focusMode?.includes?.("continuous")) {
    advanced.push({ focusMode: "continuous" });
  }
  if (capabilities.exposureMode?.includes?.("continuous")) {
    advanced.push({ exposureMode: "continuous" });
  }
  if (capabilities.whiteBalanceMode?.includes?.("continuous")) {
    advanced.push({ whiteBalanceMode: "continuous" });
  }
  if (capabilities.zoom?.max > 1) {
    advanced.push({ zoom: Math.min(1.4, capabilities.zoom.max) });
  }

  if (!advanced.length) return;

  try {
    await track.applyConstraints({ advanced });
  } catch {
    // ignore
  }
}

function updateTorchAvailability() {
  const track = getVideoTrack();
  const torch = btnTorch();
  if (!track || !torch) return;

  torchSupported = Boolean(track.getCapabilities?.()?.torch);
  torch.hidden = !torchSupported;
}

async function setTorch(enabled) {
  const track = getVideoTrack();
  const torch = btnTorch();
  if (!track || !torchSupported || !torch) return;

  try {
    await track.applyConstraints({ advanced: [{ torch: enabled }] });
    torchOn = enabled;
    torch.classList.toggle("is-on", enabled);
    torch.setAttribute("aria-pressed", String(enabled));
    torch.setAttribute(
      "aria-label",
      enabled ? "Desligar lanterna" : "Ligar lanterna",
    );
  } catch {
    torch.hidden = true;
    torchSupported = false;
  }
}

function getCameraErrorMessage(error) {
  const message = error?.message?.toLowerCase() ?? "";
  if (!window.isSecureContext) {
    return "Câmera só funciona com HTTPS.";
  }
  if (message.includes("permission") || error?.name === "NotAllowedError") {
    return "Permita o acesso à câmera.";
  }
  if (message.includes("notfound") || error?.name === "NotFoundError") {
    return "Nenhuma câmera encontrada.";
  }
  return error?.message || "Não foi possível abrir a câmera.";
}

export async function stopScanner() {
  scanning = false;

  try {
    if (torchOn) await setTorch(false);
    if (scanControls) {
      scanControls.stop();
      scanControls = null;
    }
    reader.reset();
  } catch (error) {
    console.debug(error);
  }

  const panel = scannerPanel();
  const video = cameraVideo();

  panel?.classList.remove("is-open");
  panel?.setAttribute("aria-hidden", "true");
  document.body.classList.remove("scanner-open");
  resetScannerUi();

  if (video?.srcObject) {
    video.srcObject.getTracks().forEach((track) => track.stop());
    video.srcObject = null;
  }

  video?.removeAttribute("src");
  video?.load();

  onCloseCallback?.();
}

function handleScanResult(text) {
  const code = text.trim();
  if (!code || code === lastScannedCode) return;

  lastScannedCode = code;
  scanFrame()?.classList.add("is-success");
  playScanBeep();

  window.setTimeout(async () => {
    await stopScanner();
    onScanCallback?.(code);
  }, 180);
}

export async function startScanner({ onScan, onClose } = {}) {
  if (scanning) return;

  onScanCallback = onScan ?? null;
  onCloseCallback = onClose ?? null;
  scanning = true;
  lastScannedCode = "";
  resetScannerUi();

  const panel = scannerPanel();
  const status = scannerStatus();
  const video = cameraVideo();

  panel?.classList.add("is-open");
  panel?.setAttribute("aria-hidden", "false");
  document.body.classList.add("scanner-open");

  await new Promise((resolve) => {
    requestAnimationFrame(() => requestAnimationFrame(resolve));
  });

  if (!window.isSecureContext) {
    status.textContent = getCameraErrorMessage();
    status.classList.add("is-error");
    scanning = false;
    return;
  }

  try {
    scanControls = await reader.decodeFromConstraints(
      cameraConstraints,
      video,
      (result, error) => {
        if (result) handleScanResult(result.getText());
        if (error && error.name !== "NotFoundException") {
          console.debug(error);
        }
      },
    );

    panel?.classList.add("is-ready");
    status.textContent = "Centralize o código no quadro branco";

    const onReady = async () => {
      await applyCameraEnhancements();
      updateTorchAvailability();
    };

    video?.addEventListener("loadedmetadata", onReady, { once: true });
    if (video && video.readyState >= 1) await onReady();
  } catch (error) {
    status.textContent = getCameraErrorMessage(error);
    status.classList.add("is-error");
    scanning = false;
  }
}

let initialized = false;

export function initScanner() {
  if (initialized) return;
  initialized = true;

  btnCancel()?.addEventListener("click", stopScanner);
  btnType()?.addEventListener("click", stopScanner);
  btnTorch()?.addEventListener("click", () => setTorch(!torchOn));
}

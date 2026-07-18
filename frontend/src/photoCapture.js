let stream = null;
let onCaptureCallback = null;
let initialized = false;

const panel = () => document.getElementById("photo-capture-panel");
const video = () => document.getElementById("photo-capture-video");
const statusEl = () => document.getElementById("photo-capture-status");
const btnCancel = () => document.getElementById("btn-cancel-photo-capture");
const btnShutter = () => document.getElementById("btn-photo-shutter");
const btnGallery = () => document.getElementById("btn-photo-gallery");
const galleryInput = () => document.getElementById("photo-capture-gallery");

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

function resetUi() {
  const status = statusEl();
  if (status) {
    status.textContent = "Iniciando câmera…";
    status.classList.remove("is-error");
    status.hidden = false;
  }
  panel()?.classList.remove("is-ready");
}

function stopTracks() {
  if (!stream) return;
  stream.getTracks().forEach((track) => track.stop());
  stream = null;
  const el = video();
  if (el) el.srcObject = null;
}

export async function stopPhotoCapture() {
  stopTracks();
  const el = panel();
  el?.classList.remove("is-open");
  el?.setAttribute("aria-hidden", "true");
  document.body.classList.remove("photo-capture-open");
  resetUi();
  onCaptureCallback = null;
}

async function emitFile(file) {
  const callback = onCaptureCallback;
  await stopPhotoCapture();
  if (file && callback) callback(file);
}

async function captureFrame() {
  const el = video();
  if (!el || !el.videoWidth) return;

  const canvas = document.createElement("canvas");
  canvas.width = el.videoWidth;
  canvas.height = el.videoHeight;
  const ctx = canvas.getContext("2d");
  if (!ctx) return;

  ctx.drawImage(el, 0, 0, canvas.width, canvas.height);

  const blob = await new Promise((resolve) => {
    canvas.toBlob(resolve, "image/jpeg", 0.88);
  });
  if (!blob) return;

  const file = new File([blob], `produto-${Date.now()}.jpg`, { type: "image/jpeg" });
  await emitFile(file);
}

export async function startPhotoCapture({ onCapture } = {}) {
  await stopPhotoCapture();

  onCaptureCallback = onCapture ?? null;
  resetUi();

  const el = panel();
  const status = statusEl();
  const videoEl = video();

  el?.classList.add("is-open");
  el?.setAttribute("aria-hidden", "false");
  document.body.classList.add("photo-capture-open");

  if (!window.isSecureContext) {
    if (status) {
      status.textContent = getCameraErrorMessage();
      status.classList.add("is-error");
    }
    return;
  }

  try {
    stream = await navigator.mediaDevices.getUserMedia({
      audio: false,
      video: {
        facingMode: { ideal: "environment" },
        width: { ideal: 1920 },
        height: { ideal: 1080 },
      },
    });

    if (!videoEl) {
      stopTracks();
      return;
    }

    videoEl.srcObject = stream;
    await videoEl.play().catch(() => {});

    el?.classList.add("is-ready");
    if (status) status.hidden = true;
  } catch (error) {
    if (status) {
      status.textContent = getCameraErrorMessage(error);
      status.classList.add("is-error");
      status.hidden = false;
    }
  }
}

export function initPhotoCapture() {
  if (initialized) return;
  initialized = true;

  btnCancel()?.addEventListener("click", () => stopPhotoCapture());
  btnShutter()?.addEventListener("click", () => captureFrame());
  btnGallery()?.addEventListener("click", () => galleryInput()?.click());

  galleryInput()?.addEventListener("change", async () => {
    const file = galleryInput()?.files?.[0];
    if (galleryInput()) galleryInput().value = "";
    if (!file) return;
    await emitFile(file);
  });
}

export const cameraConstraints = {
  video: {
    facingMode: { ideal: "environment" },
    width: { min: 1280, ideal: 1920, max: 4096 },
    height: { min: 720, ideal: 1080, max: 2160 },
    aspectRatio: { ideal: 1.7777777778 },
    focusMode: { ideal: "continuous" },
  },
};

export async function startCamera(videoEl) {
  const stream = await navigator.mediaDevices.getUserMedia(cameraConstraints);
  videoEl.srcObject = stream;
  await videoEl.play();
  return stream;
}

export function stopCamera(videoEl) {
  if (videoEl.srcObject) {
    videoEl.srcObject.getTracks().forEach((track) => track.stop());
    videoEl.srcObject = null;
  }

  videoEl.removeAttribute("src");
  videoEl.load();
}

export async function applyCameraEnhancements(videoEl) {
  const track = videoEl.srcObject?.getVideoTracks?.()?.[0];
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
    advanced.push({ zoom: Math.min(1.3, capabilities.zoom.max) });
  }

  if (!advanced.length) return;

  try {
    await track.applyConstraints({ advanced });
  } catch {
    // ignored
  }
}

export function getTorchCapabilities(videoEl) {
  const track = videoEl.srcObject?.getVideoTracks?.()?.[0];
  if (!track) return { supported: false };

  const capabilities = track.getCapabilities?.() ?? {};
  return { supported: Boolean(capabilities.torch), track };
}

export async function setTorch(videoEl, enabled) {
  const { supported, track } = getTorchCapabilities(videoEl);
  if (!supported || !track) return false;

  try {
    await track.applyConstraints({ advanced: [{ torch: enabled }] });
    return true;
  } catch {
    return false;
  }
}

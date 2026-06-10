export function getScanCropRegion(video, frameEl) {
  const vw = video.videoWidth;
  const vh = video.videoHeight;

  if (!vw || !vh) {
    return null;
  }

  const displayW = video.clientWidth;
  const displayH = video.clientHeight;
  const videoRatio = vw / vh;
  const displayRatio = displayW / displayH;

  let visibleX = 0;
  let visibleY = 0;
  let visibleW = vw;
  let visibleH = vh;

  if (videoRatio > displayRatio) {
    visibleW = vh * displayRatio;
    visibleX = (vw - visibleW) / 2;
  } else {
    visibleH = vw / displayRatio;
    visibleY = (vh - visibleH) / 2;
  }

  const frameRect = frameEl.getBoundingClientRect();
  const videoRect = video.getBoundingClientRect();

  const relX = (frameRect.left - videoRect.left) / displayW;
  const relY = (frameRect.top - videoRect.top) / displayH;
  const relW = frameRect.width / displayW;
  const relH = frameRect.height / displayH;

  const padding = 0.08;

  return {
    x: Math.max(0, Math.round(visibleX + relX * visibleW - relW * visibleW * padding)),
    y: Math.max(0, Math.round(visibleY + relY * visibleH - relH * visibleH * padding)),
    width: Math.min(vw, Math.round(relW * visibleW * (1 + padding * 2))),
    height: Math.min(vh, Math.round(relH * visibleH * (1 + padding * 2))),
  };
}

export function cropToCanvas(source, region, targetCanvas) {
  const ctx = targetCanvas.getContext("2d", { willReadFrequently: true });
  targetCanvas.width = region.width;
  targetCanvas.height = region.height;
  ctx.drawImage(
    source,
    region.x,
    region.y,
    region.width,
    region.height,
    0,
    0,
    region.width,
    region.height,
  );
  return targetCanvas;
}

function cloneCanvas(source) {
  const canvas = document.createElement("canvas");
  canvas.width = source.width;
  canvas.height = source.height;
  const ctx = canvas.getContext("2d", { willReadFrequently: true });
  ctx.drawImage(source, 0, 0);
  return canvas;
}

function applyGrayscaleContrast(canvas, contrast = 1.5) {
  const ctx = canvas.getContext("2d", { willReadFrequently: true });
  const { width, height } = canvas;
  const imageData = ctx.getImageData(0, 0, width, height);
  const { data } = imageData;

  for (let i = 0; i < data.length; i += 4) {
    let gray = data[i] * 0.299 + data[i + 1] * 0.587 + data[i + 2] * 0.114;
    gray = ((gray / 255 - 0.5) * contrast + 0.5) * 255;
    gray = Math.max(0, Math.min(255, gray));
    data[i] = gray;
    data[i + 1] = gray;
    data[i + 2] = gray;
  }

  ctx.putImageData(imageData, 0, 0);
  return canvas;
}

function applyBinary(canvas, threshold = 140) {
  const ctx = canvas.getContext("2d", { willReadFrequently: true });
  const { width, height } = canvas;
  const imageData = ctx.getImageData(0, 0, width, height);
  const { data } = imageData;

  for (let i = 0; i < data.length; i += 4) {
    const gray = data[i] * 0.299 + data[i + 1] * 0.587 + data[i + 2] * 0.114;
    const value = gray >= threshold ? 255 : 0;
    data[i] = value;
    data[i + 1] = value;
    data[i + 2] = value;
  }

  ctx.putImageData(imageData, 0, 0);
  return canvas;
}

export function buildDecodeVariants(baseCanvas) {
  const original = cloneCanvas(baseCanvas);
  const gray = applyGrayscaleContrast(cloneCanvas(baseCanvas), 1.6);
  const binary = applyBinary(applyGrayscaleContrast(cloneCanvas(baseCanvas), 1.3), 130);
  const binaryHigh = applyBinary(cloneCanvas(baseCanvas), 155);

  return [original, gray, binary, binaryHigh];
}

function getSourceSize(source) {
  return {
    width: source.videoWidth || source.width,
    height: source.videoHeight || source.height,
  };
}

export function cropCenter(source, targetCanvas, widthRatio = 0.92, heightRatio = 0.38) {
  const { width: sourceWidth, height: sourceHeight } = getSourceSize(source);
  const cropWidth = Math.round(sourceWidth * widthRatio);
  const cropHeight = Math.round(sourceHeight * heightRatio);
  const cropX = Math.round((sourceWidth - cropWidth) / 2);
  const cropY = Math.round((sourceHeight - cropHeight) / 2);

  targetCanvas.width = cropWidth;
  targetCanvas.height = cropHeight;
  const ctx = targetCanvas.getContext("2d", { willReadFrequently: true });
  ctx.drawImage(
    source,
    cropX,
    cropY,
    cropWidth,
    cropHeight,
    0,
    0,
    cropWidth,
    cropHeight,
  );
  return targetCanvas;
}

export function drawSourceToCanvas(source, targetCanvas) {
  const { width, height } = getSourceSize(source);
  targetCanvas.width = width;
  targetCanvas.height = height;
  const ctx = targetCanvas.getContext("2d", { willReadFrequently: true });
  ctx.drawImage(source, 0, 0, width, height);
  return targetCanvas;
}

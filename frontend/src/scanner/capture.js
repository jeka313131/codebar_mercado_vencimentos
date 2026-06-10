import { decodeFromVariants } from "./decode.js";
import {
  buildDecodeVariants,
  cropCenter,
  cropToCanvas,
  drawSourceToCanvas,
  getScanCropRegion,
} from "./preprocess.js";

export async function captureAndDecode(videoEl, frameEl, workCanvas) {
  const attempts = [];

  const track = videoEl.srcObject?.getVideoTracks?.()?.[0];
  if (track && "ImageCapture" in window) {
    try {
      const capture = new ImageCapture(track);
      const blob = await capture.takePhoto();
      const bitmap = await createImageBitmap(blob);

      drawSourceToCanvas(bitmap, workCanvas);
      attempts.push(buildDecodeVariants(workCanvas));

      const centerCanvas = document.createElement("canvas");
      cropCenter(bitmap, centerCanvas);
      attempts.push(buildDecodeVariants(centerCanvas));

      bitmap.close?.();
    } catch {
      // segue para captura do vídeo
    }
  }

  const region = getScanCropRegion(videoEl, frameEl);
  if (region?.width > 0 && region?.height > 0) {
    cropToCanvas(videoEl, region, workCanvas);
    attempts.push(buildDecodeVariants(workCanvas));
  }

  drawSourceToCanvas(videoEl, workCanvas);
  attempts.push(buildDecodeVariants(workCanvas));

  cropCenter(videoEl, workCanvas);
  attempts.push(buildDecodeVariants(workCanvas));

  for (const variants of attempts) {
    const code = await decodeFromVariants(variants);
    if (code) return code;
  }

  return null;
}

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

const zxingReader = new BrowserMultiFormatReader(scanHints);

const NATIVE_FORMATS = ["ean_13", "ean_8", "upc_a", "upc_e"];
let barcodeDetector = null;

async function initBarcodeDetector() {
  if (!("BarcodeDetector" in window)) {
    return null;
  }

  try {
    const supported = await BarcodeDetector.getSupportedFormats();
    const formats = NATIVE_FORMATS.filter((format) => supported.includes(format));
    if (!formats.length) return null;
    return new BarcodeDetector({ formats });
  } catch {
    return null;
  }
}

const detectorPromise = initBarcodeDetector();

async function decodeWithNative(canvas) {
  const detector = barcodeDetector ?? (barcodeDetector = await detectorPromise);
  if (!detector) return null;

  try {
    const results = await detector.detect(canvas);
    return results[0]?.rawValue?.trim() || null;
  } catch {
    return null;
  }
}

async function decodeWithZxing(canvas) {
  try {
    const result = await zxingReader.decodeFromCanvas(canvas);
    return result?.getText?.()?.trim() || null;
  } catch {
    return null;
  }
}

export async function decodeFromCanvas(canvas) {
  const native = await decodeWithNative(canvas);
  if (native) return native;

  return decodeWithZxing(canvas);
}

export async function decodeFromVariants(canvases) {
  for (const canvas of canvases) {
    const native = await decodeWithNative(canvas);
    if (native) return native;
  }

  for (const canvas of canvases) {
    const zxing = await decodeWithZxing(canvas);
    if (zxing) return zxing;
  }

  return null;
}

export function resetDecoder() {
  zxingReader.reset();
}

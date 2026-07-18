import sharp from "sharp";

const MAX_EDGE = 800;
const JPEG_QUALITY = 75;

/**
 * Redimensiona e comprime a imagem para JPEG (max 800px no maior lado).
 * GIF animado vira frame estático.
 */
export async function compressProductImage(buffer) {
  const image = sharp(buffer, { failOn: "none" }).rotate();
  const meta = await image.metadata();

  const width = meta.width || 0;
  const height = meta.height || 0;
  const needsResize = width > MAX_EDGE || height > MAX_EDGE;

  let pipeline = image;
  if (needsResize) {
    pipeline = pipeline.resize({
      width: MAX_EDGE,
      height: MAX_EDGE,
      fit: "inside",
      withoutEnlargement: true,
    });
  }

  const output = await pipeline
    .jpeg({ quality: JPEG_QUALITY, mozjpeg: true })
    .toBuffer();

  return {
    buffer: output,
    ext: "jpg",
    contentType: "image/jpeg",
  };
}

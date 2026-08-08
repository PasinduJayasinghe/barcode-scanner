import type { CapturedImage } from "./types";

export const MAX_EDGE_PX = 1024;
export const JPEG_QUALITY = 0.8;

/**
 * Phone cameras hand back 4000px, 6MB JPEGs. Downscaling to 1024px on the long
 * edge before upload keeps us inside request limits and cuts round-trip time,
 * and costs nothing in accuracy — packaging text is still legible at that size.
 */
export async function processImageFile(
  file: File,
  maxEdge = MAX_EDGE_PX,
  quality = JPEG_QUALITY,
): Promise<CapturedImage> {
  const source = await decode(file);
  const scale = Math.min(1, maxEdge / Math.max(source.width, source.height));
  const width = Math.max(1, Math.round(source.width * scale));
  const height = Math.max(1, Math.round(source.height * scale));

  const canvas = document.createElement("canvas");
  canvas.width = width;
  canvas.height = height;

  const ctx = canvas.getContext("2d");
  if (!ctx) throw new Error("Could not prepare the photo on this device.");

  ctx.imageSmoothingQuality = "high";
  ctx.drawImage(source.image, 0, 0, width, height);

  if ("close" in source.image) source.image.close();
  if (source.revoke) source.revoke();

  const dataUrl = canvas.toDataURL("image/jpeg", quality);
  const base64 = dataUrl.slice(dataUrl.indexOf(",") + 1);

  return {
    dataUrl,
    base64,
    mimeType: "image/jpeg",
    width,
    height,
    // base64 encodes 3 bytes as 4 chars; subtract padding for the real size.
    bytes: Math.round((base64.length * 3) / 4),
  };
}

interface DecodedImage {
  image: ImageBitmap | HTMLImageElement;
  width: number;
  height: number;
  revoke?: () => void;
}

async function decode(file: File): Promise<DecodedImage> {
  // `from-image` applies the EXIF rotation, so photos taken in portrait don't
  // reach the model sideways.
  if (typeof createImageBitmap === "function") {
    try {
      const bitmap = await createImageBitmap(file, { imageOrientation: "from-image" });
      return { image: bitmap, width: bitmap.width, height: bitmap.height };
    } catch {
      // Older Safari rejects the options bag — fall through to the <img> path.
    }
  }

  const url = URL.createObjectURL(file);
  try {
    const image = await loadImageElement(url);
    return {
      image,
      width: image.naturalWidth,
      height: image.naturalHeight,
      revoke: () => URL.revokeObjectURL(url),
    };
  } catch (error) {
    URL.revokeObjectURL(url);
    throw error;
  }
}

function loadImageElement(url: string): Promise<HTMLImageElement> {
  return new Promise((resolve, reject) => {
    const image = new Image();
    image.onload = () => resolve(image);
    image.onerror = () => reject(new Error("That file could not be read as an image."));
    image.src = url;
  });
}

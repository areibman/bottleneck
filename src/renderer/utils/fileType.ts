const IMAGE_MIME_TYPES: Record<string, string> = {
  png: "image/png",
  jpg: "image/jpeg",
  jpeg: "image/jpeg",
  gif: "image/gif",
  webp: "image/webp",
  bmp: "image/bmp",
  tiff: "image/tiff",
  tif: "image/tiff",
  avif: "image/avif",
  ico: "image/x-icon",
};

export function getImageMimeType(filename: string): string | null {
  const extension = filename.split(".").pop()?.toLowerCase() ?? "";
  return IMAGE_MIME_TYPES[extension] ?? null;
}

export function isImageFile(filename: string): boolean {
  return getImageMimeType(filename) !== null;
}

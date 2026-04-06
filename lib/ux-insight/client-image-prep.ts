/**
 * 브라우저 전용 — 업로드 전 해상도 상한으로 리사이즈(데이터 최소화).
 */
const DEFAULT_MAX = 1920;

export async function resizeImageFileForUxInsight(
  file: File,
  maxDimension: number = DEFAULT_MAX
): Promise<File> {
  if (typeof window === "undefined" || !file.type.startsWith("image/")) {
    return file;
  }

  let bitmap: ImageBitmap;
  try {
    bitmap = await createImageBitmap(file);
  } catch {
    return file;
  }

  let { width, height } = bitmap;
  if (width <= maxDimension && height <= maxDimension) {
    bitmap.close();
    return file;
  }

  const scale = maxDimension / Math.max(width, height);
  const w = Math.max(1, Math.round(width * scale));
  const h = Math.max(1, Math.round(height * scale));

  const canvas = document.createElement("canvas");
  canvas.width = w;
  canvas.height = h;
  const ctx = canvas.getContext("2d");
  if (!ctx) {
    bitmap.close();
    return file;
  }
  ctx.drawImage(bitmap, 0, 0, w, h);
  bitmap.close();

  const mime = file.type.includes("png") ? "image/png" : "image/jpeg";
  const quality = mime === "image/png" ? undefined : 0.88;
  const blob = await new Promise<Blob | null>((resolve) =>
    canvas.toBlob(resolve, mime, quality as number | undefined)
  );
  if (!blob) return file;

  const ext = mime === "image/png" ? "png" : "jpg";
  const base = file.name.replace(/\.[^.]+$/, "") || "screen";
  return new File([blob], `${base}.${ext}`, {
    type: blob.type,
    lastModified: Date.now(),
  });
}

export async function resizeImageFilesForUxInsight(
  files: File[],
  maxDimension?: number
): Promise<File[]> {
  return Promise.all(
    files.map((f) => resizeImageFileForUxInsight(f, maxDimension))
  );
}

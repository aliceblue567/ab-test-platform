/**
 * 브라우저 전용 — API 업로드 전 해상도·용량 상한 (HTTP 413 방지).
 * Vercel Serverless 요청 본문 한도(≈4.5MB)를 고려해 플로우는 장수만큼 나눠 예산을 둡니다.
 */

const DEFAULT_MAX_DIMENSION = 1920;

/** 단일 화면 분석 API 1파일 상한 (멀티파트 여유 포함) */
export const SINGLE_IMAGE_API_BUDGET_BYTES = 4_000_000;

function baseName(file: File): string {
  return file.name.replace(/\.[^.]+$/, "") || "screen";
}

async function bitmapFromFile(file: File): Promise<ImageBitmap | null> {
  try {
    return await createImageBitmap(file);
  } catch {
    return null;
  }
}

async function encodeJpegFromBitmap(
  bitmap: ImageBitmap,
  maxSide: number,
  quality: number
): Promise<File | null> {
  const w0 = bitmap.width;
  const h0 = bitmap.height;
  const scale = Math.min(1, maxSide / Math.max(w0, h0));
  const w = Math.max(1, Math.round(w0 * scale));
  const h = Math.max(1, Math.round(h0 * scale));

  const canvas = document.createElement("canvas");
  canvas.width = w;
  canvas.height = h;
  const ctx = canvas.getContext("2d");
  if (!ctx) return null;
  ctx.drawImage(bitmap, 0, 0, w, h);

  const blob = await new Promise<Blob | null>((resolve) =>
    canvas.toBlob(resolve, "image/jpeg", quality)
  );
  if (!blob) return null;

  return new File([blob], "ux-encoded.jpg", {
    type: "image/jpeg",
    lastModified: Date.now(),
  });
}

function withBudgetName(file: File, out: File): File {
  return new File([out], `${baseName(file)}.jpg`, {
    type: "image/jpeg",
    lastModified: Date.now(),
  });
}

/**
 * 플로우 분석 시 이미지 한 장당 권장 최대 바이트 (전체 요청이 4.5MB 아래로 가도록).
 */
export function budgetBytesPerFlowImage(imageCount: number): number {
  const overhead = 280_000;
  const total = 4_000_000;
  const n = Math.max(1, imageCount);
  return Math.max(260_000, Math.floor((total - overhead) / n));
}

export type PrepareImageForApiOptions = {
  maxBytes: number;
  /** 시도할 긴 변 상한(px), 큰 값부터 낮춥니다. */
  maxDimensionCeiling?: number;
  minDimensionFloor?: number;
};

/**
 * API multipart 업로드용 — JPEG로 재인코딩하고 maxBytes 이하가 될 때까지 해상도·품질을 낮춤.
 */
export async function prepareImageFileForUxInsightApi(
  file: File,
  options: PrepareImageForApiOptions
): Promise<File> {
  if (typeof window === "undefined" || !file.type.startsWith("image/")) {
    return file;
  }

  const maxBytes = options.maxBytes;
  const ceiling = options.maxDimensionCeiling ?? 1680;
  const floor = options.minDimensionFloor ?? 560;

  const bitmap = await bitmapFromFile(file);
  if (!bitmap) return file;

  const dimensions: number[] = [];
  for (let d = ceiling; d >= floor; d = Math.round(d * 0.88)) {
    dimensions.push(d);
    if (d <= floor) break;
  }
  if (dimensions[dimensions.length - 1] !== floor) {
    dimensions.push(floor);
  }

  const qualities = [0.84, 0.72, 0.62, 0.52, 0.42, 0.34];

  try {
    for (const dim of dimensions) {
      for (const q of qualities) {
        const out = await encodeJpegFromBitmap(bitmap, dim, q);
        if (out && out.size <= maxBytes) {
          return withBudgetName(file, out);
        }
      }
    }

    const last = await encodeJpegFromBitmap(bitmap, floor, 0.32);
    if (last) return withBudgetName(file, last);
  } finally {
    bitmap.close();
  }

  return file;
}

/**
 * @deprecated 새 코드는 prepareImageFileForUxInsightApi 사용 (413 방지).
 * 해상도만 제한; PNG는 그대로 둘 수 있어 용량이 클 수 있음.
 */
export async function resizeImageFileForUxInsight(
  file: File,
  maxDimension: number = DEFAULT_MAX_DIMENSION
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

/**
 * @deprecated prepareImageFileForUxInsightApi + budgetBytesPerFlowImage 권장.
 */
export async function resizeImageFilesForUxInsight(
  files: File[],
  maxDimension?: number
): Promise<File[]> {
  return Promise.all(
    files.map((f) => resizeImageFileForUxInsight(f, maxDimension))
  );
}

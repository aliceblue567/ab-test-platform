/**
 * 브라우저에서 업로드 직후 저해상도 스캔으로 고변동 영역(글자·숫자 블록 추정)에 블러를 가해
 * API 전송 데이터를 줄이는 용도. 완전한 PII 제거를 보장하지 않습니다.
 */

/** gray 0..255, w*h length */
function localVarianceMap(
  gray: Uint8ClampedArray,
  w: number,
  h: number,
  win: number
): Float32Array {
  const vMap = new Float32Array(w * h);
  const r = Math.floor(win / 2);
  for (let y = 0; y < h; y++) {
    for (let x = 0; x < w; x++) {
      let sum = 0;
      let sumSq = 0;
      let n = 0;
      for (let dy = -r; dy <= r; dy++) {
        const yy = y + dy;
        if (yy < 0 || yy >= h) continue;
        for (let dx = -r; dx <= r; dx++) {
          const xx = x + dx;
          if (xx < 0 || xx >= w) continue;
          const g = gray[yy * w + xx];
          sum += g;
          sumSq += g * g;
          n++;
        }
      }
      if (n > 0) {
        const mean = sum / n;
        vMap[y * w + x] = sumSq / n - mean * mean;
      }
    }
  }
  return vMap;
}

export async function applyPrivacyMaskToImageFile(file: File): Promise<File> {
  if (typeof window === "undefined" || !file.type.startsWith("image/")) {
    return file;
  }

  let bitmap: ImageBitmap;
  try {
    bitmap = await createImageBitmap(file);
  } catch {
    return file;
  }

  const maxScan = 640;
  let w = bitmap.width;
  let h = bitmap.height;
  const scale = Math.min(1, maxScan / Math.max(w, h));
  const sw = Math.max(1, Math.round(w * scale));
  const sh = Math.max(1, Math.round(h * scale));

  const scan = document.createElement("canvas");
  scan.width = sw;
  scan.height = sh;
  const sctx = scan.getContext("2d");
  if (!sctx) {
    bitmap.close();
    return file;
  }
  sctx.drawImage(bitmap, 0, 0, sw, sh);
  const imgData = sctx.getImageData(0, 0, sw, sh);
  const data = imgData.data;
  const gray = new Uint8ClampedArray(sw * sh);
  for (let i = 0, j = 0; i < data.length; i += 4, j++) {
    gray[j] = Math.round(
      0.299 * data[i] + 0.587 * data[i + 1] + 0.114 * data[i + 2]
    );
  }

  const varMap = localVarianceMap(gray, sw, sh, 5);
  let maxV = 0;
  for (let i = 0; i < varMap.length; i++) {
    if (varMap[i] > maxV) maxV = varMap[i];
  }
  const thr = maxV > 0 ? maxV * 0.35 : 800;
  const mask = new Uint8Array(sw * sh);
  for (let i = 0; i < varMap.length; i++) {
    if (varMap[i] >= thr) mask[i] = 1;
  }

  const outCanvas = document.createElement("canvas");
  outCanvas.width = w;
  outCanvas.height = h;
  const octx = outCanvas.getContext("2d");
  if (!octx) {
    bitmap.close();
    return file;
  }
  octx.drawImage(bitmap, 0, 0);
  bitmap.close();

  const blurLayer = document.createElement("canvas");
  blurLayer.width = w;
  blurLayer.height = h;
  const bctx = blurLayer.getContext("2d");
  if (!bctx) return file;
  bctx.filter = "blur(14px)";
  bctx.drawImage(outCanvas, 0, 0);
  bctx.filter = "none";

  const blurredData = bctx.getImageData(0, 0, w, h);
  const origData = octx.getImageData(0, 0, w, h);
  const oPix = origData.data;
  const bPix = blurredData.data;

  const sxStep = w / sw;
  const syStep = h / sh;
  for (let y = 0; y < h; y++) {
    for (let x = 0; x < w; x++) {
      const si = Math.min(sw - 1, Math.floor(x / sxStep));
      const sj = Math.min(sh - 1, Math.floor(y / syStep));
      if (mask[sj * sw + si]) {
        const idx = (y * w + x) * 4;
        oPix[idx] = bPix[idx];
        oPix[idx + 1] = bPix[idx + 1];
        oPix[idx + 2] = bPix[idx + 2];
      }
    }
  }
  octx.putImageData(origData, 0, 0);

  const mime = file.type.includes("png") ? "image/png" : "image/jpeg";
  const quality = mime === "image/png" ? undefined : 0.85;
  const blob = await new Promise<Blob | null>((resolve) =>
    outCanvas.toBlob(resolve, mime, quality as number | undefined)
  );
  if (!blob) return file;

  const ext = mime === "image/png" ? "png" : "jpg";
  const base = file.name.replace(/\.[^.]+$/, "") || "screen";
  return new File([blob], `${base}_masked.${ext}`, {
    type: blob.type,
    lastModified: Date.now(),
  });
}

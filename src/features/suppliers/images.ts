import { supplierCopy as copy } from "./texts";
export type Crop = {
  zoom: number;
  x: number;
  y: number;
};
export async function readImage(file: File, maxMb = 5) {
  if (!["image/jpeg", "image/png", "image/webp"].includes(file.type))
    throw new Error(copy.use_uma_imagem_jpg_png_ou_webp);
  if (file.size > maxMb * 1024 * 1024)
    throw new Error(`A imagem deve ter até ${maxMb} MB.`);
  const bitmap = await createImageBitmap(file, {
    imageOrientation: "from-image",
  });
  if (bitmap.width * bitmap.height > 40000000) {
    bitmap.close();
    throw new Error(copy.imagem_muito_grande_para_processar_use_ate);
  }
  return bitmap;
}
export function checkDimensions(
  width: number,
  height: number,
  kind: "logo" | "cover" | "photo",
) {
  const minW = kind === "cover" ? 1600 : kind === "logo" ? 400 : 200;
  const minH = kind === "cover" ? 900 : kind === "logo" ? 400 : 200;
  if (width < minW || height < minH)
    throw new Error(`Use uma imagem de pelo menos ${minW} × ${minH} px.`);
}
export function cropRectangle(w: number, h: number, ratio: number, crop: Crop) {
  const zoom = Math.min(3, Math.max(1, crop.zoom));
  const cw = Math.min(w, h * ratio) / zoom,
    ch = cw / ratio;
  return {
    sx: ((w - cw) * Math.min(100, Math.max(0, crop.x))) / 100,
    sy: ((h - ch) * Math.min(100, Math.max(0, crop.y))) / 100,
    sw: cw,
    sh: ch,
  };
}
export async function processImage(
  bitmap: ImageBitmap,
  kind: "logo" | "cover" | "photo",
  crop: Crop,
) {
  const ratio = kind === "logo" ? 1 : 16 / 9;
  const width = kind === "logo" ? 800 : 1600,
    height = width / ratio;
  const rect = cropRectangle(bitmap.width, bitmap.height, ratio, crop);
  async function render(w: number, h: number) {
    const canvas = document.createElement("canvas");
    canvas.width = w;
    canvas.height = h;
    const ctx = canvas.getContext("2d");
    if (!ctx)
      throw new Error(copy.este_navegador_nao_permite_processar_imagens);
    ctx.drawImage(bitmap, rect.sx, rect.sy, rect.sw, rect.sh, 0, 0, w, h);
    return new Promise<Blob>((resolve, reject) =>
      canvas.toBlob(
        (b) =>
          b ? resolve(b) : reject(new Error(copy.falha_ao_otimizar_imagem)),
        "image/webp",
        0.86,
      ),
    );
  }
  return {
    blob: await render(width, height),
    thumbnail: await render(
      kind === "logo" ? 160 : 400,
      (kind === "logo" ? 160 : 400) / ratio,
    ),
  };
}

import { supplierCopy as copy } from "./texts";
import { useEffect, useRef, useState } from "react";
import { ImagePlus, Upload, Loader2 } from "lucide-react";
import { supplierTexts as t } from "./texts";
import {
  checkDimensions,
  cropRectangle,
  processImage,
  readImage,
  type Crop,
} from "./images";
import { uploadSupplierImage, type SupplierMode } from "./api";
export function ImagePicker({
  value,
  label,
  kind = "photo",
  mode,
  supplierId,
  onChange,
  disabled = false,
  maxMb = 5,
}: {
  value: string;
  label: string;
  kind?: "logo" | "cover" | "photo";
  mode: SupplierMode;
  supplierId: string;
  onChange: (url: string, thumbnail: string) => void;
  disabled?: boolean;
  maxMb?: number;
}) {
  const [image, setImage] = useState<ImageBitmap | null>(null),
    [crop, setCrop] = useState<Crop>({ zoom: 1, x: 50, y: 50 }),
    [error, setError] = useState(""),
    [busy, setBusy] = useState(false);
  const dialog = useRef<HTMLDialogElement>(null),
    canvas = useRef<HTMLCanvasElement>(null);
  useEffect(() => {
    if (image) {
      dialog.current?.showModal();
      return () => image.close();
    }
  }, [image]);
  useEffect(() => {
    if (!image || !canvas.current) return;
    const c = canvas.current,
      ctx = c.getContext("2d");
    if (!ctx) return;
    const r = cropRectangle(
      image.width,
      image.height,
      kind === "logo" ? 1 : 16 / 9,
      crop,
    );
    ctx.clearRect(0, 0, c.width, c.height);
    ctx.drawImage(image, r.sx, r.sy, r.sw, r.sh, 0, 0, c.width, c.height);
  }, [image, crop, kind]);
  function close() {
    dialog.current?.close();
    setImage(null);
  }
  async function choose(file: File) {
    setError("");
    setBusy(true);
    try {
      const bitmap = await readImage(file, maxMb);
      try {
        checkDimensions(bitmap.width, bitmap.height, kind);
      } catch (e) {
        bitmap.close();
        throw e;
      }
      setCrop({ zoom: 1, x: 50, y: 50 });
      setImage(bitmap);
    } catch (e) {
      setError(e instanceof Error ? e.message : t.cropError);
    } finally {
      setBusy(false);
    }
  }
  async function apply() {
    if (!image) return;
    setBusy(true);
    setError("");
    try {
      const processed = await processImage(image, kind, crop);
      const asset = await uploadSupplierImage(
        mode,
        supplierId,
        processed,
        kind,
      );
      onChange(asset.url, asset.thumbnail);
      close();
    } catch (e) {
      setError(e instanceof Error ? e.message : t.cropError);
    } finally {
      setBusy(false);
    }
  }
  return (
    <div className={`image-picker image-${kind}`}>
      <span className="field-title">{label}</span>
      <label className={`image-drop ${value ? "has-image" : ""}`}>
        {value ? (
          <img src={value} alt={label} />
        ) : (
          <div>
            <ImagePlus size={29} strokeWidth={1.4} />
            <strong>
              {busy ? copy.processando_imagem : copy.selecionar_imagem}
            </strong>
            <small>
              {kind === "logo"
                ? t.logoHint
                : kind === "cover"
                  ? t.coverHint
                  : copy.jpg_png_ou_webp}
            </small>
          </div>
        )}
        <input
          type="file"
          accept="image/jpeg,image/png,image/webp"
          aria-label={`Selecionar ${label}`}
          disabled={disabled || busy}
          onChange={(e) => {
            const f = e.currentTarget.files?.[0];
            if (f) void choose(f);
            e.currentTarget.value = "";
          }}
        />
        {value && !disabled && (
          <span className="image-change">
            <Upload size={13} />
            {copy.trocar_imagem}
          </span>
        )}
      </label>
      {error && (
        <p className="field-error" role="alert">
          {error}
        </p>
      )}
      <dialog
        ref={dialog}
        className="supplier-modal"
        onCancel={(e) => {
          if (busy) e.preventDefault();
          else close();
        }}
      >
        <h2>{t.crop}</h2>
        <p>{copy.escolha_o_enquadramento_que_melhor_apresenta_sua}</p>
        <canvas
          ref={canvas}
          width={kind === "logo" ? 360 : 640}
          height={360}
          aria-label={copy.previa_do_recorte}
        />
        {(["zoom", "x", "y"] as const).map((key) => (
          <label key={key}>
            {key === "zoom" ? t.zoom : key === "x" ? t.horizontal : t.vertical}
            <input
              type="range"
              min={key === "zoom" ? 1 : 0}
              max={key === "zoom" ? 3 : 100}
              step={key === "zoom" ? 0.05 : 1}
              value={crop[key]}
              onChange={(e) =>
                setCrop({ ...crop, [key]: Number(e.target.value) })
              }
            />
          </label>
        ))}
        {error && (
          <p className="field-error" role="alert">
            {error}
          </p>
        )}
        <div className="modal-actions">
          <button
            type="button"
            className="btn outline"
            disabled={busy}
            onClick={close}
          >
            {t.cancel}
          </button>
          <button
            type="button"
            className="btn"
            disabled={busy}
            onClick={() => void apply()}
          >
            {busy ? (
              <Loader2 className="spin" size={16} />
            ) : (
              <Upload size={16} />
            )}{" "}
            {t.apply}
          </button>
        </div>
      </dialog>
    </div>
  );
}

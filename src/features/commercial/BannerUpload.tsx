import { useId, useState } from "react";
import { uploadBanner } from "../shared/api";
export function BannerUpload({
  mobile,
  demo,
  onUploaded,
}: {
  mobile: boolean;
  demo: boolean;
  onUploaded: (url: string) => void;
}) {
  const id = useId(),
    [message, setMessage] = useState(""),
    [busy, setBusy] = useState(false);
  async function upload(file: File) {
    setBusy(true);
    try {
      if (
        !["image/jpeg", "image/png", "image/webp", "image/gif"].includes(
          file.type,
        ) ||
        file.size > 5 * 1024 * 1024
      )
        throw Error("Use JPG, PNG, WebP ou GIF de até 5 MB.");
      if (demo) {
        throw Error(
          "Na prévia, use uma URL pública de imagem. O envio de arquivos fica disponível no painel conectado.",
        );
      }
      let blob: Blob = file,
        ext = "gif";
      if (file.type !== "image/gif") {
        const bitmap = await createImageBitmap(file),
          scale = Math.min(1, (mobile ? 900 : 1800) / bitmap.width),
          canvas = document.createElement("canvas");
        canvas.width = Math.round(bitmap.width * scale);
        canvas.height = Math.round(bitmap.height * scale);
        canvas
          .getContext("2d")!
          .drawImage(bitmap, 0, 0, canvas.width, canvas.height);
        bitmap.close();
        blob = await new Promise<Blob>((resolve, reject) =>
          canvas.toBlob(
            (b) => (b ? resolve(b) : reject(Error("Imagem inválida"))),
            "image/webp",
            0.85,
          ),
        );
        ext = "webp";
      }
      const path = `${crypto.randomUUID()}.${ext}`;
      onUploaded(await uploadBanner(path, blob));
      setMessage("Imagem enviada. Salve a campanha para aplicar.");
    } catch (e) {
      setMessage((e as Error).message);
    } finally {
      setBusy(false);
    }
  }
  return (
    <div>
      <label htmlFor={id}>Enviar imagem {mobile ? "mobile" : "desktop"}</label>
      <input
        id={id}
        disabled={busy}
        type="file"
        accept="image/jpeg,image/png,image/webp,image/gif"
        onChange={(e) => {
          const f = e.target.files?.[0];
          if (f) void upload(f);
          e.target.value = "";
        }}
      />
      <small role="status">
        {busy ? "Enviando…" : message || "JPG, PNG, WebP ou GIF · até 5 MB"}
      </small>
    </div>
  );
}

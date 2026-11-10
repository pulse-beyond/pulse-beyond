"use client";

import { useRef, useState } from "react";
import { ImageIcon, Loader2, CheckCircle2, AlertCircle } from "lucide-react";
import { Button } from "@/components/ui/button";
import { uploadNewsletterScreenshot } from "@/lib/actions/analytics";


// Vercel rejects request bodies over 4.5MB and the vision API rejects images over ~5MB
// in base64 (~3.75MB raw). Keep uploads safely under both.
const MAX_UPLOAD_BYTES = 3 * 1024 * 1024;

function canvasToBlob(canvas: HTMLCanvasElement, quality: number): Promise<Blob | null> {
  return new Promise((resolve) => canvas.toBlob(resolve, "image/jpeg", quality));
}

/** Returns the file unchanged if small enough; otherwise re-encodes as JPEG, shrinking until < MAX_UPLOAD_BYTES. */
async function shrinkImage(file: File): Promise<File> {
  if (file.size <= MAX_UPLOAD_BYTES) return file;

  const bitmap = await createImageBitmap(file);
  try {
    let maxDim = 2400;
    for (let attempt = 0; attempt < 6; attempt++) {
      const scale = Math.min(1, maxDim / Math.max(bitmap.width, bitmap.height));
      const canvas = document.createElement("canvas");
      canvas.width = Math.round(bitmap.width * scale);
      canvas.height = Math.round(bitmap.height * scale);
      const ctx = canvas.getContext("2d");
      if (!ctx) throw new Error("Canvas indisponível neste navegador.");
      ctx.fillStyle = "#ffffff"; // JPEG has no alpha — avoid black background on transparent PNGs
      ctx.fillRect(0, 0, canvas.width, canvas.height);
      ctx.drawImage(bitmap, 0, 0, canvas.width, canvas.height);
      const blob = await canvasToBlob(canvas, 0.85);
      if (blob && blob.size <= MAX_UPLOAD_BYTES) {
        const base = file.name.replace(/\.[^.]+$/, "") || "screenshot";
        return new File([blob], `${base}.jpg`, { type: "image/jpeg" });
      }
      maxDim = Math.round(maxDim * 0.75);
    }
  } finally {
    bitmap.close();
  }
  throw new Error("Não foi possível reduzir a imagem para menos de 3MB. Recorte o screenshot só na área dos números e tente de novo.");
}

export function NewsletterUploadButton() {
  const inputRef = useRef<HTMLInputElement>(null);
  const [loading, setLoading] = useState(false);
  const [status, setStatus] = useState<"idle" | "success" | "error">("idle");
  const [errorMsg, setErrorMsg] = useState<string | null>(null);

  async function handleFileChange(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file) return;

    setLoading(true);
    setStatus("idle");
    setErrorMsg(null);

    try {
      let toSend: File;
      try {
        toSend = await shrinkImage(file);
      } catch (err) {
        setStatus("error");
        setErrorMsg(err instanceof Error ? err.message : "Não foi possível processar a imagem.");
        return;
      }

      const formData = new FormData();
      formData.append("image", toSend);
      const result = await uploadNewsletterScreenshot(formData);

      if (result?.error) {
        setStatus("error");
        setErrorMsg(result.error);
      } else {
        setStatus("success");
        setTimeout(() => setStatus("idle"), 4000);
      }
    } catch {
      setStatus("error");
      setErrorMsg("Falha no envio (imagem grande demais, sessão expirada ou erro de rede). Recarregue a página e tente novamente.");
    } finally {
      setLoading(false);
      if (inputRef.current) inputRef.current.value = "";
    }
  }

  return (
    <div className="flex flex-col items-end gap-1">
      <input
        ref={inputRef}
        type="file"
        accept="image/png,image/jpeg,image/jpg,image/webp"
        className="hidden"
        onChange={handleFileChange}
      />
      <Button
        variant="outline"
        size="sm"
        onClick={() => inputRef.current?.click()}
        disabled={loading}
        className="gap-2"
      >
        {loading ? (
          <Loader2 className="h-4 w-4 animate-spin" />
        ) : status === "success" ? (
          <CheckCircle2 className="h-4 w-4 text-green-600" />
        ) : (
          <ImageIcon className="h-4 w-4" />
        )}
        {loading
          ? "Extraindo dados..."
          : status === "success"
          ? "Dados extraídos!"
          : "Importar screenshot da newsletter"}
      </Button>
      {status === "error" && errorMsg && (
        <p className="flex items-center gap-1 text-xs text-red-600">
          <AlertCircle className="h-3.5 w-3.5" />
          {errorMsg}
        </p>
      )}
      {status === "idle" && !loading && (
        <p className="text-xs text-muted-foreground">
          Claude Vision extrai os números automaticamente
        </p>
      )}
    </div>
  );
}

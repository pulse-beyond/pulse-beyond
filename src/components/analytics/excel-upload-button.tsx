"use client";

import { useRef, useState } from "react";
import { Upload, Loader2, CheckCircle2, AlertCircle } from "lucide-react";
import { Button } from "@/components/ui/button";
import { uploadLinkedInExcel } from "@/lib/actions/analytics";

export function ExcelUploadButton() {
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
      const formData = new FormData();
      formData.append("file", file);
      const result = await uploadLinkedInExcel(formData);

      if (result?.error) {
        setStatus("error");
        setErrorMsg(result.error);
      } else {
        setStatus("success");
        setTimeout(() => setStatus("idle"), 4000);
      }
    } catch {
      setStatus("error");
      setErrorMsg("Erro inesperado. Tente novamente.");
    } finally {
      setLoading(false);
      // Reset input so same file can be re-uploaded
      if (inputRef.current) inputRef.current.value = "";
    }
  }

  return (
    <div className="flex flex-col items-end gap-1">
      <input
        ref={inputRef}
        type="file"
        accept=".xlsx,.xls"
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
          <Upload className="h-4 w-4" />
        )}
        {loading
          ? "Importando..."
          : status === "success"
          ? "Importado!"
          : "Importar Excel do LinkedIn"}
      </Button>
      {status === "error" && errorMsg && (
        <p className="flex items-center gap-1 text-xs text-red-600">
          <AlertCircle className="h-3.5 w-3.5" />
          {errorMsg}
        </p>
      )}
    </div>
  );
}

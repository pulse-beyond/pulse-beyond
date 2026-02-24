"use client";

import { useRef } from "react";
import { Upload } from "lucide-react";
import { Button } from "@/components/ui/button";

export function CsvUploadButton() {
  const inputRef = useRef<HTMLInputElement>(null);

  function handleClick() {
    inputRef.current?.click();
  }

  function handleFileChange(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file) return;
    // MVP: placeholder — real CSV parsing will be added later
    alert(`"${file.name}" recebido! O upload de CSV estará disponível em breve.`);
    e.target.value = "";
  }

  return (
    <>
      <input
        ref={inputRef}
        type="file"
        accept=".csv"
        className="hidden"
        onChange={handleFileChange}
      />
      <Button variant="outline" size="sm" onClick={handleClick}>
        <Upload className="mr-2 h-4 w-4" />
        Upload CSV
      </Button>
    </>
  );
}

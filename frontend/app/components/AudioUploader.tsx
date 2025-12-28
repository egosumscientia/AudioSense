"use client";
import { useState } from "react";

export default function AudioUploader({ onResult }: any) {
  const [loading, setLoading] = useState(false);
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [error, setError] = useState<string | null>(null);

  const validateFile = (file: File) => {
    if (!file.type?.startsWith("audio/")) {
      setError("Sube solo archivos de audio (wav, mp3, etc).");
      return false;
    }
    const maxSizeMb = 20;
    if (file.size > maxSizeMb * 1024 * 1024) {
      setError(`Archivo demasiado grande. Máximo ${maxSizeMb} MB.`);
      return false;
    }
    return true;
  };

  const analyzeFile = async (file: File) => {
    if (!validateFile(file)) return;
    const formData = new FormData();
    formData.append("file", file);
    setLoading(true);
    setError(null);

    try {
      const res = await fetch(
        `${process.env.NEXT_PUBLIC_API_URL || "http://localhost:8000"}/analyze`,
        {
          method: "POST",
          body: formData,
        }
      );

      if (!res.ok) {
        const maybeJson = await res.json().catch(() => null);
        const message =
          maybeJson?.error ||
          maybeJson?.detail ||
          `Error ${res.status}: ${res.statusText}`;
        throw new Error(message);
      }

      const data = await res.json();
      onResult(data);
    } catch (err) {
      console.error("Error al analizar el archivo:", err);
      const message = err instanceof Error ? err.message : "Error desconocido";
      setError(message);
    } finally {
      setLoading(false);
    }
  };

  const handleFile = async (e: any) => {
    const file = e.target.files[0];
    if (!file) return;
    if (!validateFile(file)) return;
    setSelectedFile(file);
    await analyzeFile(file);
  };

  const handleAnalyzeClick = async () => {
    if (selectedFile) {
      await analyzeFile(selectedFile);
    }
  };

  return (
  <div className="w-full max-w-md mx-auto mb-6">
    <label
      htmlFor="fileInput"
      className={`flex flex-col items-center justify-center w-full h-40 rounded-2xl border-2 border-dashed cursor-pointer transition 
        ${
          loading
            ? "border-emerald-500 bg-emerald-500/10 animate-pulse"
            : "border-slate-600 hover:border-cyan-400 hover:bg-slate-800/40"
        }`}
      title="Haz clic o suelta un archivo de audio aquí"
      onDragOver={(e) => e.preventDefault()}
      onDrop={(e) => {
        e.preventDefault();
        const file = e.dataTransfer.files[0];
        if (!file) return;
        if (!validateFile(file)) return;
        setSelectedFile(file);
        analyzeFile(file);
      }}
    >
      <input
        id="fileInput"
        type="file"
        accept="audio/*"
        onChange={handleFile}
        className="hidden"
      />

      <svg
        xmlns="http://www.w3.org/2000/svg"
        className="h-10 w-10 text-cyan-400 mb-2"
        fill="none"
        viewBox="0 0 24 24"
        stroke="currentColor"
      >
        <path
          strokeLinecap="round"
          strokeLinejoin="round"
          strokeWidth={2}
          d="M12 4v16m8-8H4"
        />
      </svg>

      <span className="text-slate-200 font-medium">
        {selectedFile ? selectedFile.name : "Suelta tu archivo .wav aquí"}
      </span>
      <span className="text-slate-400 text-sm mt-1">
        o haz clic para seleccionarlo
      </span>
    </label>

    <button
      onClick={handleAnalyzeClick}
      disabled={!selectedFile || loading}
      className={`w-full mt-4 px-4 py-2 rounded-xl font-semibold transition-all duration-200 
        ${
          loading
            ? "bg-emerald-500/60 text-white animate-pulse"
            : selectedFile
            ? "bg-cyan-500 hover:bg-cyan-600 text-white"
            : "bg-slate-600 text-slate-300 cursor-not-allowed"
        }`}
    >
      {loading ? "Analizando..." : "Analizar"}
    </button>

    {error && (
      <p className="mt-3 text-sm text-rose-300 text-center">{error}</p>
    )}

    {selectedFile && !loading && (
          <p className="text-xs text-slate-400 mt-2 text-center italic">
            Archivo actual: {selectedFile.name}
          </p>
        )}
      </div>
    );
}

"use client";
import * as React from "react";

type Props = {
  data: {
    rms_db?: number;
    dominant_freq_hz?: number;
    confidence_percent?: number; // 0..100
    status?: string; // "Normal" | "Anómalo"
    mensaje?: string;
    snr_db?: number;
    flatness?: number;
    crest_factor?: number;
    filename?: string;
  };
};

export default function ResultCard({ data }: Props) {
  const {
    rms_db = 0,
    dominant_freq_hz = 0,
    confidence_percent = 0,
    status = "",
    mensaje = "",
    snr_db = 0,
    flatness = 0,
    crest_factor = 0,
    filename = "",
  } = data || {};

  const isAnomaly = status.toLowerCase().includes("anóm");
  const badgeTone = isAnomaly
    ? "bg-amber-400/10 text-amber-300 border-amber-400/30"
    : "bg-emerald-400/10 text-emerald-300 border-emerald-400/30";

  return (
    // ⬇️ centra el card y limita ancho
    <section
      className="mx-auto mt-8 w-full max-w-3xl"
      aria-label="Resultados del análisis de audio"
    >
      <div className="rounded-2xl border border-slate-700/70 bg-slate-800/50 backdrop-blur-sm shadow-xl">
        {/* Encabezado */}
        <div className="flex items-center justify-between px-5 py-4 border-b border-slate-700/60">
          <h3 className="text-lg font-semibold text-slate-200">Diagnóstico IA</h3>
          <span
            className={`inline-flex items-center gap-2 rounded-xl border px-3 py-1 text-sm ${badgeTone}`}
            title={mensaje || status}
          >
            <span
              className={`inline-block h-2.5 w-2.5 rounded-full ${
                isAnomaly ? "bg-amber-300" : "bg-emerald-300"
              }`}
            />
            {status || "—"}
          </span>
        </div>

        {/* Contenido */}
        <div className="px-5 py-5">
          {/* Archivo */}
          {filename ? (
            <p className="text-xs text-slate-400 italic mb-4">
              Archivo analizado: <span className="text-slate-300">{filename}</span>
            </p>
          ) : null}

          {/* Métricas en grid */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <Metric label="Nivel RMS" value={`${rms_db.toFixed(2)} dB`} />
            <Metric label="Frecuencia dominante" value={`${dominant_freq_hz.toLocaleString()} Hz`} />
            <Metric label="Relación SNR" value={`${snr_db.toFixed(2)} dB`} />
            <Metric label="Flatness" value={flatness.toFixed(3)} />
            <Metric label="Crest Factor" value={crest_factor.toFixed(2)} />
            <Metric label="Confianza IA" value={`${confidence_percent.toFixed(0)}%`} />
          </div>

          {/* Barra de confianza */}
          <div className="mt-4">
            <div className="flex justify-between text-xs text-slate-400 mb-1">
              <span>Confianza del diagnóstico</span>
              <span className="text-slate-300 font-medium">{confidence_percent.toFixed(0)}%</span>
            </div>
            <div className="h-2 w-full rounded-full bg-slate-700 overflow-hidden">
              <div
                className={`h-full ${
                  isAnomaly ? "bg-amber-400" : "bg-emerald-400"
                }`}
                style={{ width: `${Math.max(0, Math.min(100, confidence_percent))}%` }}
              />
            </div>
          </div>

          {/* Mensaje */}
          {mensaje ? (
            <div
              className={`mt-5 rounded-xl border px-4 py-3 text-sm ${
                isAnomaly
                  ? "border-amber-400/30 bg-amber-400/10 text-amber-200"
                  : "border-emerald-400/30 bg-emerald-400/10 text-emerald-200"
                }`}
            >
              {mensaje}
            </div>
          ) : null}
        </div>
      </div>
    </section>
  );
}

function Metric({ label, value }: { label: string; value: React.ReactNode }) {
  return (
    <div className="flex items-center justify-between rounded-lg border border-slate-700/60 bg-slate-900/40 px-4 py-2">
      <span className="text-slate-400 text-sm">{label}</span>
      <span className="text-slate-100 font-semibold">{value}</span>
    </div>
  );
}

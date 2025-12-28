"use client";
import { useEffect, useState } from "react";

type ModelStatusProps = {
  api: string;
  refreshSignal?: number;
  onThreshold?: (value: number | null) => void;
};

type AnomalyResponse = {
  status?: string;
  anomaly_score?: number;
  threshold?: number;
  window_size?: number;
  detail?: string | null;
};

export default function ModelStatus({ api, refreshSignal, onThreshold }: ModelStatusProps) {
  const [data, setData] = useState<AnomalyResponse | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [lastUpdated, setLastUpdated] = useState<string | null>(null);

  const fetchStatus = async () => {
    setLoading(true);
    setError(null);
    try {
      const res = await fetch(`${api}/anomaly/stream?_t=${Date.now()}`, { cache: "no-store" });
      if (!res.ok) {
        throw new Error(`HTTP ${res.status}`);
      }
      const json = await res.json();
      setData(json);
      if (typeof json?.threshold === "number" && onThreshold) {
        onThreshold(json.threshold);
      }
      setLastUpdated(new Date().toLocaleTimeString());
    } catch (err) {
      const msg = err instanceof Error ? err.message : "Error desconocido";
      setError(msg);
      if (onThreshold) onThreshold(null);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchStatus();
    const id = setInterval(fetchStatus, 60000);
    return () => clearInterval(id);
  }, []);

  useEffect(() => {
    if (typeof refreshSignal === "number") {
      fetchStatus();
    }
  }, [refreshSignal]);

  const badgeTone =
    data?.status?.toLowerCase().includes("anom") ? "bg-amber-500/20 text-amber-200 border-amber-500/40" : "bg-emerald-500/15 text-emerald-200 border-emerald-500/30";

  return (
    <section className="w-full mb-6 rounded-2xl border border-slate-700/60 bg-slate-900/50 p-4 shadow-lg">
      <div className="flex items-center justify-between gap-3 flex-wrap">
        <div className="space-y-1">
          <p className="text-sm text-slate-300 font-semibold">Estado del modelo (IsolationForest)</p>
          <p className="text-xs text-slate-400">
            Ventana: {data?.window_size ?? "?"} muestras · Umbral: {data?.threshold?.toFixed(4) ?? "N/D"}
            {lastUpdated ? ` · Última consulta: ${lastUpdated}` : ""}
          </p>
        </div>
        <div className="flex items-center gap-2">
          <span className={`inline-flex items-center gap-2 rounded-xl border px-3 py-1 text-sm ${badgeTone}`}>
            <span className={`inline-block h-2.5 w-2.5 rounded-full ${badgeTone.includes("amber") ? "bg-amber-300" : "bg-emerald-300"}`} />
            {data?.status ?? "N/D"}
          </span>
        </div>
      </div>

      {error && <p className="mt-2 text-xs text-rose-300">Error: {error}</p>}
      {data?.detail && <p className="mt-2 text-xs text-amber-200">Detalle: {data.detail}</p>}

      {typeof data?.anomaly_score === "number" && (
        <div className="mt-3">
          <div className="flex justify-between text-xs text-slate-400 mb-1">
            <span>Puntaje de anomalía</span>
            <span className="text-slate-200 font-semibold">{data.anomaly_score.toFixed(4)}</span>
          </div>
          <div className="h-2 w-full rounded-full bg-slate-800 overflow-hidden">
            {(() => {
              const score = data.anomaly_score ?? 0;
              const threshold = data.threshold ?? 0;
              const normalized = Math.max(0, Math.min(1, 0.5 + (threshold - score)));
              const color = score < threshold ? "bg-amber-400" : "bg-emerald-400";
              return <div className={`h-full ${color}`} style={{ width: `${normalized * 100}%` }} />;
            })()}
          </div>
        </div>
      )}
    </section>
  );
}

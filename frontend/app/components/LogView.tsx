"use client";
import { useEffect, useRef, useState } from "react";

type LogEntry = {
  timestamp?: string;
  value?: number;
  frequency?: number;
  status?: string;
};

type Props = {
  api?: string;
  pollMs?: number;
};

export default function LogView({ api, pollMs = 5000 }: Props) {
  const [logs, setLogs] = useState<LogEntry[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const containerRef = useRef<HTMLDivElement>(null);
  const endpoint = `${api || "http://localhost:8000"}/analyses/logs`;

  const fetchLogs = async () => {
    setLoading(true);
    setError(null);
    try {
      const res = await fetch(`${endpoint}?limit=300&_t=${Date.now()}`, { cache: "no-store" });
      if (!res.ok) {
        throw new Error(`HTTP ${res.status}`);
      }
      const json = await res.json();
      if (Array.isArray(json)) {
        setLogs(json);
        // Scroll a top (porque vienen descendentes). Para sentir "tiempo real", nos quedamos al inicio.
        containerRef.current?.scrollTo({ top: 0 });
      }
    } catch (err) {
      const msg = err instanceof Error ? err.message : "Error desconocido";
      setError(msg);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchLogs();
    const id = setInterval(fetchLogs, pollMs);
    return () => clearInterval(id);
  }, [pollMs]);

  const formatTs = (ts?: string) => {
    if (!ts) return "";
    const date = new Date(ts);
    if (isNaN(date.getTime())) return ts;
    return date.toLocaleTimeString();
  };

  return (
    <section className="w-full rounded-2xl border border-slate-700/60 bg-slate-900/50 p-4 shadow-lg">
      <div className="flex items-center justify-between mb-3">
        <div>
          <h2 className="text-lg font-semibold text-cyan-300">Log en vivo</h2>
          <p className="text-xs text-slate-400">ùltimas inserciones en measurements (auto-refresh)</p>
        </div>
        <button
          onClick={fetchLogs}
          disabled={loading}
          className={`px-3 py-1 rounded-lg text-sm font-semibold transition ${
            loading ? "bg-slate-700 text-slate-300" : "bg-cyan-600 hover:bg-cyan-700 text-white"
          }`}
        >
          {loading ? "Actualizando..." : "Refrescar"}
        </button>
      </div>

      {error && <p className="text-xs text-rose-300 mb-2">Error: {error}</p>}

      <div
        ref={containerRef}
        className="h-80 overflow-auto rounded-xl border border-slate-800 bg-slate-950/60 p-3 text-xs font-mono text-slate-200"
      >
        {logs.length === 0 && !loading ? (
          <p className="text-slate-500">Sin datos.</p>
        ) : (
          logs.map((entry, idx) => {
            const status = entry.status || "";
            const tone = status.toLowerCase().includes("anom") ? "text-amber-300" : "text-emerald-300";
            return (
              <div key={idx} className="flex items-center justify-between py-1 border-b border-slate-800/60 last:border-b-0">
                <span className="text-slate-400">{formatTs(entry.timestamp)}</span>
                <span className={`px-2 py-1 rounded-md border border-slate-700 bg-slate-800/60`}>
                  <span className={tone}>{status || "?"}</span>
                  <span className="text-slate-400 ml-2">value={entry.value?.toFixed?.(4) ?? entry.value ?? "-"}</span>
                  <span className="text-slate-400 ml-2">freq={entry.frequency ?? "-"} Hz</span>
                </span>
              </div>
            );
          })
        )}
      </div>
    </section>
  );
}

"use client";
import { useEffect, useState } from "react";

type Event = {
  timestamp?: string;
  value?: number;
  frequency?: number;
  status?: string;
  score?: number | null;
  margin?: number | null;
  threshold?: number | null;
};

type Props = {
  api: string;
};

const formatTs = (ts?: string) => {
  if (!ts) return "N/D";
  const d = new Date(ts);
  if (Number.isNaN(d.getTime())) return ts;
  return d.toLocaleString();
};

export default function EventTable({ api }: Props) {
  const [rows, setRows] = useState<Event[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const fetchEvents = async () => {
    setLoading(true);
    setError(null);
    try {
      const res = await fetch(`${api}/analyses/events?_t=${Date.now()}`, { cache: "no-store" });
      if (!res.ok) throw new Error(`HTTP ${res.status}`);
      const json = await res.json();
      if (Array.isArray(json)) setRows(json);
    } catch (err) {
      const msg = err instanceof Error ? err.message : "Error desconocido";
      setError(msg);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchEvents();
    const id = setInterval(fetchEvents, 10000);
    return () => clearInterval(id);
  }, []);

  return (
    <section className="w-full rounded-2xl border border-slate-700/60 bg-slate-900/50 p-4 shadow-lg">
      <div className="flex items-center justify-between mb-3">
        <div>
          <h3 className="text-lg font-semibold text-cyan-300">Últimas anomalías</h3>
          <p className="text-xs text-slate-400">Lista cronológica (máx 20)</p>
        </div>
        <button
          onClick={fetchEvents}
          disabled={loading}
          className={`px-3 py-1 rounded-lg text-sm font-semibold transition ${
            loading ? "bg-slate-700 text-slate-300" : "bg-cyan-600 hover:bg-cyan-700 text-white"
          }`}
        >
          {loading ? "Actualizando..." : "Refrescar"}
        </button>
      </div>

      {error && <p className="text-xs text-rose-300 mb-2">Error: {error}</p>}

      <div className="overflow-x-auto">
        <table className="w-full text-sm text-slate-200">
          <thead className="text-xs uppercase text-slate-400 border-b border-slate-700/60">
            <tr>
              <th className="py-2 text-left">Timestamp</th>
              <th className="py-2 text-left">Status</th>
              <th className="py-2 text-right">Value</th>
              <th className="py-2 text-right">Freq (Hz)</th>
              <th className="py-2 text-right">Score</th>
              <th className="py-2 text-right">Margen</th>
            </tr>
          </thead>
          <tbody>
            {rows.length === 0 ? (
              <tr>
                <td colSpan={6} className="py-6 text-center text-slate-500">
                  {loading ? "Cargando..." : "Sin anomalías registradas."}
                </td>
              </tr>
            ) : (
              rows.map((row, idx) => {
                const badgeTone = (row.status || "").toLowerCase().includes("anom")
                  ? "bg-amber-500/20 text-amber-200 border-amber-500/40"
                  : "bg-emerald-500/15 text-emerald-200 border-emerald-500/30";
                const badgeDot = badgeTone.includes("amber") ? "bg-amber-300" : "bg-emerald-300";
                return (
                  <tr key={idx} className="border-b border-slate-800/50 last:border-0">
                    <td className="py-2 text-slate-300">{formatTs(row.timestamp)}</td>
                    <td className="py-2">
                      <span className={`inline-flex items-center gap-2 rounded-lg border px-2 py-1 text-xs ${badgeTone}`}>
                        <span className={`h-2 w-2 rounded-full ${badgeDot}`} />
                        {row.status ?? "Anomalía"}
                      </span>
                    </td>
                    <td className="py-2 text-right">{row.value?.toFixed?.(4) ?? "-"}</td>
                    <td className="py-2 text-right">{row.frequency ?? "-"}</td>
                    <td className="py-2 text-right">
                      {row.score != null ? row.score.toFixed(4) : "N/D"}
                    </td>
                    <td className="py-2 text-right">
                      {row.margin != null ? row.margin.toFixed(4) : "N/D"}
                    </td>
                  </tr>
                );
              })
            )}
          </tbody>
        </table>
      </div>
    </section>
  );
}

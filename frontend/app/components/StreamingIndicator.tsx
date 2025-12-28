"use client";
import { useEffect, useState } from "react";

type Props = {
  api: string;
  staleAfterSeconds?: number;
};

export default function StreamingIndicator({ api, staleAfterSeconds = 15 }: Props) {
  const [status, setStatus] = useState<"live" | "stale" | "unknown">("unknown");
  const [lastTs, setLastTs] = useState<string | null>(null);

  const fetchKpis = async () => {
    try {
      const res = await fetch(`${api}/analyses/kpis?_t=${Date.now()}`, { cache: "no-store" });
      if (!res.ok) throw new Error(`HTTP ${res.status}`);
      const json = await res.json();
      const ts = json?.last_timestamp as string | undefined;
      setLastTs(ts ?? null);
      if (ts) {
        const diff = (Date.now() - new Date(ts).getTime()) / 1000;
        setStatus(diff <= staleAfterSeconds ? "live" : "stale");
      } else {
        setStatus("stale");
      }
    } catch {
      setStatus("unknown");
    }
  };

  useEffect(() => {
    fetchKpis();
    const id = setInterval(fetchKpis, 5000);
    return () => clearInterval(id);
  }, []);

  const label =
    status === "live"
      ? "Recibiendo datos..."
      : status === "stale"
      ? "Sin datos recientes"
      : "Estado desconocido";

  const tone =
    status === "live"
      ? "bg-emerald-500/15 text-emerald-200 border-emerald-500/40"
      : status === "stale"
      ? "bg-amber-500/15 text-amber-200 border-amber-500/40"
      : "bg-slate-700/50 text-slate-200 border-slate-600";

  const dot =
    status === "live"
      ? "bg-emerald-300 animate-pulse"
      : status === "stale"
      ? "bg-amber-300"
      : "bg-slate-300";

  return (
    <div className="w-full flex items-center justify-end">
      <span className={`inline-flex items-center gap-2 rounded-full border px-3 py-1 text-xs font-semibold ${tone}`}>
        <span className={`h-2.5 w-2.5 rounded-full ${dot}`} />
        {label}
        {lastTs ? <span className="text-slate-400 ml-2">último: {new Date(lastTs).toLocaleTimeString()}</span> : null}
      </span>
    </div>
  );
}

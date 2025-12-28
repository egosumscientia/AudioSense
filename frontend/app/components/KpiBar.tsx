"use client";
import { useEffect, useState } from "react";

type Kpis = {
  last_timestamp?: string;
  last_value?: number;
  last_frequency?: number;
  last_status?: string;
  anomalies_percent_window?: number;
  total_measurements?: number;
  ingest_rate_per_min?: number;
  window_minutes?: number;
  last_anomaly_ts?: string;
};

type Props = {
  api: string;
};

const formatTime = (ts?: string) => {
  if (!ts) return "N/D";
  const d = new Date(ts);
  if (Number.isNaN(d.getTime())) return ts;
  return d.toLocaleTimeString();
};

export default function KpiBar({ api }: Props) {
  const [data, setData] = useState<Kpis | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const fetchKpis = async () => {
    setLoading(true);
    setError(null);
    try {
      const res = await fetch(`${api}/analyses/kpis?_t=${Date.now()}`, { cache: "no-store" });
      if (!res.ok) throw new Error(`HTTP ${res.status}`);
      const json = await res.json();
      setData(json);
    } catch (err) {
      const msg = err instanceof Error ? err.message : "Error desconocido";
      setError(msg);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchKpis();
    const id = setInterval(fetchKpis, 5000);
    return () => clearInterval(id);
  }, []);

  const cards = [
    {
      title: "Última medición",
      value: data?.last_value != null ? data.last_value.toFixed(4) : "N/D",
      subtitle:
        data?.last_frequency != null
          ? `${data.last_frequency} Hz · ${data?.last_status ?? "-"}`
          : data?.last_status ?? "-",
      foot: `Hora: ${formatTime(data?.last_timestamp)}`,
      tooltip: "Valor/frecuencia de la última muestra registrada.",
    },
    {
      title: "Anomalías",
      value:
        data?.anomalies_percent_window != null
          ? `${data.anomalies_percent_window.toFixed(1)}%`
          : "N/D",
      subtitle: data?.last_anomaly_ts ? `Última anom: ${formatTime(data.last_anomaly_ts)}` : "",
      foot: `Porcentaje últimos ${data?.window_minutes ?? 60} min`,
      tooltip: "Porcentaje de muestras marcadas como anómalas en la ventana reciente.",
    },
    {
      title: "Muestras totales",
      value:
        data?.total_measurements != null
          ? data.total_measurements.toLocaleString()
          : "N/D",
      subtitle: "",
      foot: "En la base de datos",
      tooltip: "Cantidad total de filas en measurements.",
    },
    {
      title: "Tasa de ingesta",
      value:
        data?.ingest_rate_per_min != null
          ? `${data.ingest_rate_per_min.toFixed(1)} / min`
          : "N/D",
      subtitle: "",
      foot: `Calculada últimos ${data?.window_minutes ?? 5} min`,
      tooltip: "Muestras por minuto estimadas en la ventana reciente.",
    },
  ];

  return (
    <section className="w-full mb-6">
      {error && <p className="text-xs text-rose-300 mb-2">Error KPIs: {error}</p>}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-3">
        {cards.map((card) => (
          <div
            key={card.title}
            className="rounded-xl border border-slate-700/60 bg-slate-900/50 p-4 shadow-md relative group"
          >
            <p className="flex items-center gap-2 text-xs uppercase tracking-wide text-slate-400">
              {card.title}
              <span className="relative inline-flex items-center justify-center h-4 w-4 rounded-full bg-slate-800 text-cyan-200 text-[10px] font-bold">
                i
                <span className="absolute left-1/2 -translate-x-1/2 top-5 opacity-0 group-hover:opacity-100 transition-opacity duration-200 pointer-events-none z-10">
                  <span className="block max-w-xs rounded-lg bg-slate-900 text-slate-100 border border-cyan-500/40 px-3 py-2 text-[11px] shadow-lg">
                    {card.tooltip}
                  </span>
                </span>
              </span>
            </p>
            <p className="text-2xl font-bold text-cyan-300 mt-1">
              {loading && !data ? "..." : card.value}
            </p>
            {card.subtitle ? (
              <p className="text-sm text-slate-300 mt-1">{card.subtitle}</p>
            ) : null}
            <p className="text-xs text-slate-500 mt-2">{card.foot}</p>
          </div>
        ))}
      </div>
    </section>
  );
}

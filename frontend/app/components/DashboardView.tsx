"use client";
import { useEffect, useState, forwardRef, useImperativeHandle } from "react";
import {
  LineChart,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  ReferenceLine,
} from "recharts";

type DashboardProps = {
  threshold?: number;
};

const DashboardView = forwardRef(({ threshold }: DashboardProps, ref) => {
  const [data, setData] = useState<any[]>([]);
  const [loading, setLoading] = useState(false);
  const [selectedMetrics, setSelectedMetrics] = useState<string[]>([]);
  const [metricsOpen, setMetricsOpen] = useState(false);
  const api = process.env.NEXT_PUBLIC_API_URL || "http://localhost:8000";

  const fetchData = async (limit?: number) => {
    setLoading(true);
    try {
      const qLimit = typeof limit === "number" ? limit : 300;
      const res = await fetch(
        `${api}/analyses?skip=0&limit=${qLimit}&_t=${Date.now()}`,
        { cache: "no-store" }
      );
      const json = await res.json();
      if (Array.isArray(json)) {
        setData(json);
        const keys =
          json.length > 0
            ? Object.keys(json[0]).filter(
              (k) => typeof json[0][k] === "number" && k !== "id"
            )
            : [];
        if (selectedMetrics.length === 0 && keys.length > 0) {
          setSelectedMetrics(keys);
        }
      }
    } catch (err) {
      console.error("Error al cargar datos:", err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchData();
    const id = setInterval(() => fetchData(), 5000); // auto refresh cada 5s
    return () => clearInterval(id);
  }, []);

  useImperativeHandle(ref, () => ({
    refetch: fetchData,
  }));

  const formatTs = (ts?: string) => {
    if (!ts) return "";
    const d = new Date(ts);
    if (Number.isNaN(d.getTime())) return ts;
    return d.toLocaleTimeString();
  };

  const numericKeys =
    data.length > 0
      ? Object.keys(data[0]).filter(
        (k) => typeof data[0][k] === "number" && k !== "id"
      )
      : [];

  const metricsToShow =
    selectedMetrics.length > 0
      ? selectedMetrics.filter((k) => numericKeys.includes(k))
      : numericKeys;

  const displayData = data.slice(-100);

  return (
    <section className="mx-auto w-full max-w-5xl mb-12 rounded-2xl border border-slate-700/60 bg-slate-900/40 p-6">
      <div className="flex items-center justify-between mb-6 flex-wrap gap-3">
        <h2 className="text-xl font-semibold text-cyan-300">Dashboard histórico</h2>
        <div className="flex items-center gap-3 flex-wrap">
          <div className="relative">
            <button
              onClick={() => setMetricsOpen((v) => !v)}
              className="px-3 py-2 rounded-md text-xs font-semibold border border-slate-700 bg-slate-800/60 text-slate-200 hover:border-cyan-500/60"
            >
              Métricas ({metricsToShow.length || numericKeys.length})
            </button>
            {metricsOpen && (
              <div className="absolute right-0 mt-2 w-48 rounded-lg border border-slate-700 bg-slate-900 shadow-lg z-10">
                <div className="max-h-64 overflow-auto p-2 space-y-1">
                  {numericKeys.length === 0 ? (
                    <p className="text-xs text-slate-500 px-2 py-1">Sin datos</p>
                  ) : (
                    numericKeys.map((k) => {
                      const checked = metricsToShow.includes(k);
                      return (
                        <label
                          key={k}
                          className="flex items-center gap-2 text-sm text-slate-200 px-2 py-1 rounded hover:bg-slate-800/70 cursor-pointer"
                        >
                          <input
                            type="checkbox"
                            checked={checked}
                            onChange={() => {
                              setSelectedMetrics((prev) =>
                                checked ? prev.filter((p) => p !== k) : [...prev, k]
                              );
                            }}
                            className="accent-cyan-500"
                          />
                          <span>{k}</span>
                        </label>
                      );
                    })
                  )}
                </div>
              </div>
            )}
          </div>
        </div>
      </div>

      {data.length === 0 ? (
        <p className="text-slate-400 text-sm italic">Sin datos disponibles</p>
      ) : (
        <div className="space-y-10">
          {metricsToShow.map((key) => (
            <div key={key}>
              <h3 className="mb-2 text-sm text-slate-400">{key} vs timestamp</h3>
              <div className="h-64 rounded-xl border border-slate-700/50 bg-slate-800/40 p-4">
                <ResponsiveContainer width="100%" height="100%">
                  <LineChart data={displayData}>
                    <CartesianGrid strokeOpacity={0.15} vertical={false} />
                    <XAxis
                      dataKey="timestamp"
                      tick={{ fill: "#cbd5e1", fontSize: 10 }}
                      tickFormatter={formatTs}
                    />
                    <YAxis tick={{ fill: "#cbd5e1", fontSize: 12 }} />
                    <Tooltip
                      contentStyle={{
                        background: "#0f172a",
                        border: "1px solid #334155",
                        color: "#e2e8f0",
                      }}
                      labelFormatter={(v) => `timestamp: ${formatTs(String(v))}`}
                      formatter={(value, name, props) => [
                        (value as number).toFixed(2),
                        props?.payload?.status ? `${key} (${props.payload.status})` : key,
                      ]}
                    />
                    <Line
                      type="monotone"
                      dataKey={key}
                      stroke="#22d3ee"
                      strokeWidth={2}
                      dot={(props) => {
                        const isAnomaly = (props.payload?.status || "").toLowerCase().includes("anom");
                        return (
                          <circle
                            key={`dot-${key}-${props.index}`}
                            cx={props.cx}
                            cy={props.cy}
                            r={isAnomaly ? 3.5 : 2}
                            fill={isAnomaly ? "#f59e0b" : "#22d3ee"}
                            stroke="none"
                          />
                        );
                      }}
                    />
                    {/* Umbral eliminado a pedido del usuario */}
                  </LineChart>
                </ResponsiveContainer>
              </div>
            </div>
          ))}
        </div>
      )}
    </section>
  );
});

export default DashboardView;

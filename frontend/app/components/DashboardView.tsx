"use client";
import { useEffect, useState, forwardRef, useImperativeHandle } from "react";
import {
  LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer
} from "recharts";

const DashboardView = forwardRef((props, ref) => {
  const [data, setData] = useState<any[]>([]);
  const [loading, setLoading] = useState(false);
  const [showAll, setShowAll] = useState(false);
  const api = process.env.NEXT_PUBLIC_API_URL || "http://localhost:8000";

  const fetchData = async (limit?: number) => {
    setLoading(true);
    try {
      const qLimit = typeof limit === "number" ? limit : showAll ? 100000 : 100;
      const res = await fetch(`${api}/analyses?skip=0&limit=${qLimit}&_t=${Date.now()}`, { cache: "no-store" });
      const json = await res.json();
      if (Array.isArray(json)) {
        setData(Array.isArray(json) ? json : []);
      }
    } catch (err) {
      console.error("Error al cargar datos:", err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { fetchData(); }, []);

  useImperativeHandle(ref, () => ({
    refetch: fetchData,
  }));

  const numericKeys =
    data.length > 0
      ? Object.keys(data[0]).filter(
          (k) => typeof data[0][k] === "number" && k !== "id"
        )
      : [];

  const displayData = showAll ? data : data.slice(-100);

  return (
    <section className="mx-auto w-full max-w-5xl mb-12 rounded-2xl border border-slate-700/60 bg-slate-900/40 p-6">
      <div className="flex items-center justify-between mb-6">
        <h2 className="text-xl font-semibold text-cyan-300">Dashboard histórico</h2>
        <div className="flex gap-3">
          <button
            onClick={async () => {
              const next = !showAll;
              setShowAll(next);
              await fetchData(next ? 100000 : 100);
            }}
            className="px-3 py-1 rounded-lg border border-slate-600 text-sm text-slate-300 hover:border-cyan-400 hover:text-cyan-300"
          >
            {showAll ? "Ver últimos 100" : "Ver todos"}
          </button>
          <button
            onClick={() => fetchData()}
            disabled={loading}
            className={`px-3 py-1 rounded-lg text-sm ${
                loading
                ? "bg-cyan-600/50 text-white animate-pulse"
                : "bg-cyan-600 hover:bg-cyan-700 text-white"
            }`}
            >
            {loading ? "Actualizando..." : "Actualizar"}
            </button>
        </div>
      </div>

      {data.length === 0 ? (
        <p className="text-slate-400 text-sm italic">Sin datos disponibles</p>
      ) : (
        <div className="space-y-10">
          {numericKeys.map((key) => (
            <div key={key}>
              <h3 className="mb-2 text-sm text-slate-400">{key} vs timestamp</h3>
              <div className="h-64 rounded-xl border border-slate-700/50 bg-slate-800/40 p-4">
                <ResponsiveContainer width="100%" height="100%">
                  <LineChart data={displayData}>
                    <CartesianGrid strokeOpacity={0.15} vertical={false} />
                    <XAxis dataKey="timestamp" tick={{ fill: "#cbd5e1", fontSize: 10 }} />
                    <YAxis tick={{ fill: "#cbd5e1", fontSize: 12 }} />
                    <Tooltip
                      contentStyle={{
                        background: "#0f172a",
                        border: "1px solid #334155",
                        color: "#e2e8f0",
                      }}
                      labelFormatter={(v) => `timestamp: ${v}`}
                      formatter={(value) => [(value as number).toFixed(2), key]}
                    />
                    <Line
                      type="monotone"
                      dataKey={key}
                      stroke="#22d3ee"
                      strokeWidth={2}
                      dot={false}
                    />
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

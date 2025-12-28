"use client";

import { BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer, CartesianGrid } from "recharts";

type ChartViewProps = {
  /** Niveles por banda en dB provenientes del backend:
   * bands = [0–500, 500–1k, 1–4k, 4–8k, 8–12k]
   */
  levels?: number[];
};

const BANDS = ["0–500 Hz", "500–1k Hz", "1–4k Hz", "4–8k Hz", "8–12k Hz"];

export default function ChartView({ levels = [] }: ChartViewProps) {
  // Mapear niveles reales del backend a la forma que espera Recharts
  const data =
    levels.length > 0
      ? levels.map((v, i) => ({
          name: BANDS[i] ?? `Banda ${i + 1}`,
          nivel: Number.isFinite(v) ? v : -120,
        }))
      : [];

  // Si no hay datos válidos, no renderizamos nada (no rompe layout)
  if (data.length === 0) return null;

  // Para alinear con ResultCard (max-w-3xl centrado)
  return (
    <section className="mx-auto mt-8 w-full max-w-3xl" aria-label="Distribución espectral (energía por banda)">
      <h3 className="mb-3 text-sm text-slate-400">Distribución espectral (energía por banda)</h3>

      <div className="h-64 rounded-2xl border border-slate-700/60 bg-slate-900/40 p-4">
        <ResponsiveContainer width="100%" height="100%">
          <BarChart data={data} margin={{ top: 8, right: 8, bottom: 8, left: 8 }}>
            <CartesianGrid strokeOpacity={0.15} vertical={false} />
            <XAxis dataKey="name" tick={{ fill: "#cbd5e1", fontSize: 12 }} tickLine={false} axisLine={{ stroke: "#475569" }} />
            <YAxis
              tick={{ fill: "#cbd5e1", fontSize: 12 }}
              tickLine={false}
              axisLine={{ stroke: "#475569" }}
              // Dominio automático, útil si hay dB negativos
              domain={["dataMin - 5", "dataMax + 5"]}
            />
            <Tooltip
              contentStyle={{ background: "#0f172a", border: "1px solid #334155", color: "#e2e8f0" }}
              cursor={{ fill: "#94a3b8", opacity: 0.08 }}
              formatter={(value) => [`${(value as number).toFixed(1)} dB`, "Nivel"]}
              labelFormatter={(label) => `Banda: ${label}`}
            />
            {/* Color único y sobrio; si quieres intensidad, puedo hacerlo dinámico */}
            <Bar dataKey="nivel" radius={[8, 8, 0, 0]} fill="#22d3ee" />
          </BarChart>
        </ResponsiveContainer>
      </div>
    </section>
  );
} 
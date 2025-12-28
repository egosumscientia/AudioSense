"use client";

import { BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer, CartesianGrid } from "recharts";

type ChartViewProps = {
  /** Niveles por banda en dB provenientes del backend:
   * bands = [0-500, 500-1k, 1-4k, 4-8k, 8-12k]
   */
  levels?: number[];
  /** (Opcional) niveles de referencia para comparar baseline vs actual */
  baselineLevels?: number[];
};

const BANDS = ["0-500 Hz", "500-1k Hz", "1-4k Hz", "4-8k Hz", "8-12k Hz"];

export default function ChartView({ levels = [], baselineLevels }: ChartViewProps) {
  const data =
    levels.length > 0
      ? levels.map((v, i) => ({
          name: BANDS[i] ?? `Banda ${i + 1}`,
          nivel: Number.isFinite(v) ? v : -120,
        }))
      : [];

  if (data.length === 0) return null;

  const dominantIdx = data.reduce((maxIdx, curr, idx, arr) => (curr.nivel > arr[maxIdx].nivel ? idx : maxIdx), 0);
  const dominantBand = data[dominantIdx];
  const showBaselineNote = Array.isArray(baselineLevels) && baselineLevels.length === data.length;

  return (
    <section className="mx-auto mt-8 w-full max-w-3xl" aria-label="Distribución espectral (energía por banda)">
      <div className="flex items-center justify-between mb-3">
        <h3 className="text-sm text-slate-400">Distribución espectral (energía por banda)</h3>
        {dominantBand ? (
          <span className="text-xs text-cyan-200">
            Banda dominante: {dominantBand.name} ({dominantBand.nivel.toFixed(1)} dB)
          </span>
        ) : null}
      </div>

      <div className="h-64 rounded-2xl border border-slate-700/60 bg-slate-900/40 p-4">
        <ResponsiveContainer width="100%" height="100%">
          <BarChart data={data} margin={{ top: 8, right: 8, bottom: 8, left: 8 }}>
            <CartesianGrid strokeOpacity={0.15} vertical={false} />
            <XAxis dataKey="name" tick={{ fill: "#cbd5e1", fontSize: 12 }} tickLine={false} axisLine={{ stroke: "#475569" }} />
            <YAxis
              tick={{ fill: "#cbd5e1", fontSize: 12 }}
              tickLine={false}
              axisLine={{ stroke: "#475569" }}
              domain={["dataMin - 5", "dataMax + 5"]}
            />
            <Tooltip
              contentStyle={{ background: "#0f172a", border: "1px solid #334155", color: "#e2e8f0" }}
              cursor={{ fill: "#94a3b8", opacity: 0.08 }}
              formatter={(value) => {
                const val = value as number;
                const isDominant = dominantBand && val === dominantBand.nivel;
                return [`${val.toFixed(1)} dB${isDominant ? " (dominante)" : ""}`, "Nivel"];
              }}
              labelFormatter={(label) => `Banda: ${label}`}
            />
            <Bar dataKey="nivel" radius={[8, 8, 0, 0]} fill="#22d3ee" />
          </BarChart>
        </ResponsiveContainer>
      </div>
      {showBaselineNote ? (
        <p className="text-xs text-slate-400 mt-2">
          Baseline vs actual: se muestra la distribución actual; baseline histórico disponible para referencia.
        </p>
      ) : null}
    </section>
  );
}

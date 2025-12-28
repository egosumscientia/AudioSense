"use client";
import { useState, useRef } from "react";
import AudioUploader from "./components/AudioUploader";
import ResultCard from "./components/ResultCard";
import ChartView from "./components/ChartView";
import DashboardView from "./components/DashboardView";
import ModelStatus from "./components/ModelStatus";
import LogView from "./components/LogView";
import KpiBar from "./components/KpiBar";
import EventTable from "./components/EventTable";

export default function HomePage() {
  const [data, setData] = useState<any>(null);
  const [devMode, setDevMode] = useState(false);
  const [activeTab, setActiveTab] = useState<"dashboard" | "log" | "events">("dashboard");
  const [toast, setToast] = useState<{ text: string; type?: "info" | "error" } | null>(null);
  const toastTimer = useRef<NodeJS.Timeout | null>(null);
  const [modelRefresh, setModelRefresh] = useState(0);
  const [windowSize, setWindowSize] = useState<number>(300);
  const [thresholdPct, setThresholdPct] = useState<number>(5);
  const [modelThreshold, setModelThreshold] = useState<number | null>(null);
  const dashboardRef = useRef<any>(null);

  const api = process.env.NEXT_PUBLIC_API_URL || "http://localhost:8000";

  const showToast = (text: string, type: "info" | "error" = "info") => {
    setToast({ text, type });
    if (toastTimer.current) clearTimeout(toastTimer.current);
    toastTimer.current = setTimeout(() => setToast(null), 4000);
  };

  const handlePopulate = async () => {
    const res = await fetch(`${api}/v2/generate`, { method: "POST" });
    const data = await res.json();
    showToast(data.message || "OK", "info");
    dashboardRef.current?.refetch();
  };

  const handleTrain = async () => {
    const size = Number.isFinite(windowSize) && windowSize > 0 ? Math.floor(windowSize) : 300;
    const pct = Number.isFinite(thresholdPct) && thresholdPct > 0 ? thresholdPct : 5;
    const res = await fetch(`${api}/anomaly/train?window_size=${size}&threshold_pct=${pct}`, { method: "POST" });
    let data: any = null;
    try {
      data = await res.json();
    } catch (_) {
      // cuerpo no JSON
    }
    const success = data?.success !== false;
    const msg = success
      ? `Modelo entrenado y guardado`
      : data?.error || "Error al entrenar";
    showToast(msg, success ? "info" : "error");
    if (success) {
      setModelRefresh((v) => v + 1);
    }
  };

  const handleClear = async () => {
    const res = await fetch(`${api}/v2/clear`, { method: "POST" });
    const data = await res.json();
    showToast(data.message || "OK", "info");
    dashboardRef.current?.refetch();
  };

  return (
    <main className="min-h-screen bg-gradient-to-b from-slate-950 to-slate-900 text-slate-100">
      <section className="mx-auto max-w-5xl px-4 py-12 text-center">
        <h1 className="text-4xl md:text-5xl font-extrabold tracking-tight text-cyan-300">
          Demos de Inteligencia Artificial
        </h1>
        <h2 className="text-2xl md:text-3xl text-cyan-400 mt-2 font-semibold">
          AI-AudioSense
        </h2>
        <p className="mt-4 text-slate-400 max-w-2xl mx-auto">
          Analiza sonidos industriales para detectar patrones anómalos en motores,
          compresores o líneas de producción.
        </p>
      </section>

      <div className="text-center mb-6">
        <label className="inline-flex items-center space-x-2">
          <input
            type="checkbox"
            checked={devMode}
            onChange={() => setDevMode(!devMode)}
            className="accent-cyan-500"
          />
          <span className="text-slate-300 text-sm">Modo desarrollador</span>
        </label>
      </div>

      {devMode && (
        <div className="flex flex-wrap justify-center gap-3 mb-8 items-center">
          <button onClick={handlePopulate} className="bg-cyan-600 hover:bg-cyan-700 px-4 py-2 rounded-lg text-white">Poblar 10k</button>
          <div className="flex items-center gap-2 bg-slate-800/60 px-3 py-2 rounded-lg border border-slate-700">
            <label className="text-xs text-slate-300">Ventana (muestras)</label>
            <input
              type="number"
              min={10}
              max={10000}
              value={windowSize}
              onChange={(e) => setWindowSize(parseInt(e.target.value || "0", 10))}
              className="w-20 rounded-md bg-slate-900 border border-slate-600 text-slate-100 px-2 py-1 text-sm focus:outline-none focus:border-cyan-500"
            />
          </div>
          <div className="flex items-center gap-2 bg-slate-800/60 px-3 py-2 rounded-lg border border-slate-700">
            <label className="text-xs text-slate-300">Sensibilidad (percentil)</label>
            <input
              type="number"
              min={1}
              max={20}
              step={1}
              value={thresholdPct}
              onChange={(e) => setThresholdPct(parseFloat(e.target.value || "5"))}
              className="w-20 rounded-md bg-slate-900 border border-slate-600 text-slate-100 px-2 py-1 text-sm focus:outline-none focus:border-cyan-500"
            />
          </div>
          <button onClick={handleTrain} className="bg-emerald-600 hover:bg-emerald-700 px-4 py-2 rounded-lg text-white">Entrenar</button>
          <button onClick={handleClear} className="bg-rose-600 hover:bg-rose-700 px-4 py-2 rounded-lg text-white">Borrar</button>
        </div>
      )}

      {toast && (
        <div
          className={`fixed top-6 left-1/2 -translate-x-1/2 rounded-full px-4 py-2 text-sm shadow-lg border ${
            toast.type === "error"
              ? "bg-rose-900/80 border-rose-500/40 text-rose-100"
              : "bg-slate-800/80 border-cyan-500/40 text-cyan-100"
          }`}
        >
          {toast.text}
        </div>
      )}

      <div className="mx-auto max-w-5xl px-4">
        <KpiBar api={api} />
      </div>

      <div className="mx-auto max-w-5xl px-4">
        <ModelStatus api={api} refreshSignal={modelRefresh} onThreshold={setModelThreshold} />
      </div>

      <section className="mx-auto max-w-5xl px-4 pb-16 space-y-8">
        <div className="flex gap-2">
          {[
            { id: "dashboard", label: "Dashboard" },
            { id: "log", label: "Log en vivo" },
            { id: "events", label: "Eventos" },
          ].map((tab) => (
            <button
              key={tab.id}
              onClick={() => setActiveTab(tab.id as "dashboard" | "log" | "events")}
              className={`px-4 py-2 rounded-xl text-sm font-semibold border transition ${
                activeTab === tab.id
                  ? "bg-cyan-600 border-cyan-500 text-white"
                  : "bg-slate-800 border-slate-700 text-slate-200 hover:border-cyan-500/60"
              }`}
            >
              {tab.label}
            </button>
          ))}
        </div>

        <div className="space-y-6">
          {activeTab === "dashboard" ? (
            <DashboardView ref={dashboardRef} threshold={modelThreshold ?? undefined} />
          ) : activeTab === "log" ? (
            <LogView api={api} />
          ) : (
            <EventTable api={api} />
          )}

          <AudioUploader onResult={setData} />
        </div>

        {data && (
          <div className="mt-10 space-y-8">
            <ChartView levels={data.band_levels} />
            <ResultCard data={data} />
          </div>
        )}
      </section>
    </main>
  );
}

"use client";
import { useState, useRef } from "react"; // ← agrega useRef
import AudioUploader from "./components/AudioUploader";
import ResultCard from "./components/ResultCard";
import ChartView from "./components/ChartView";
import DashboardView from "./components/DashboardView";

export default function HomePage() {
  const [data, setData] = useState<any>(null);
  const [devMode, setDevMode] = useState(false);
  const [message, setMessage] = useState("");
  const dashboardRef = useRef<any>(null); // ← nueva referencia

  const api = process.env.NEXT_PUBLIC_API_URL || "http://localhost:8000";

  const handleGenerate = async () => {
    const res = await fetch(`${api}/v2/generate`, { method: "POST" });
    const data = await res.json();
    setMessage(data.message || "OK");
    dashboardRef.current?.refetch(); // 🔁 refresca dashboard
  };

  const handleTrain = async () => {
    const res = await fetch(`${api}/v2/train`, { method: "POST" });
    const data = await res.json();
    setMessage(data.message || "OK");
    dashboardRef.current?.refetch(); // 🔁 refresca dashboard
  };

  const handleUpdate = async () => {
    const res = await fetch(`${api}/v2/update`, { method: "POST" });
    const data = await res.json();
    setMessage(data.message || "OK");
    dashboardRef.current?.refetch(); // 🔁 refresca dashboard
  };

  const handleClear = async () => {
    const res = await fetch(`${api}/v2/clear`, { method: "POST" });
    const data = await res.json();
    setMessage(data.message || "OK");
    dashboardRef.current?.refetch(); // 🔁 refresca dashboard
  };

  return (
    <main className="min-h-screen bg-gradient-to-b from-slate-950 to-slate-900 text-slate-100">
      <section className="mx-auto max-w-4xl px-4 py-12 text-center">
        <h1 className="text-4xl md:text-5xl font-extrabold tracking-tight text-cyan-300">
          Demos de Inteligencia Artificial
        </h1>
        <h2 className="text-2xl md:text-3xl text-cyan-400 mt-2 font-semibold">
          AI–AudioSense
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
        <div className="flex flex-wrap justify-center gap-3 mb-8">
          <button onClick={handleGenerate} className="bg-cyan-600 hover:bg-cyan-700 px-4 py-2 rounded-lg text-white">Generar</button>
          <button onClick={handleTrain} className="bg-emerald-600 hover:bg-emerald-700 px-4 py-2 rounded-lg text-white">Entrenar</button>
          <button onClick={handleUpdate} className="bg-amber-600 hover:bg-amber-700 px-4 py-2 rounded-lg text-white">Actualizar</button>
          <button onClick={handleClear} className="bg-rose-600 hover:bg-rose-700 px-4 py-2 rounded-lg text-white">Borrar</button>
        </div>
      )}

      {message && (
        <p className="text-sm text-cyan-400 text-center mt-2">{message}</p>
      )}

      <section className="mx-auto max-w-3xl px-4 pb-16">
        <DashboardView ref={dashboardRef} /> {/* ← referencia conectada */}
        <AudioUploader onResult={setData} />

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

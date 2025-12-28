# AI-AudioSense

Demo/MVP para analisis rapido de audio industrial con IA. Incluye backend FastAPI con procesamiento (librosa/NumPy) y frontend Next.js 14 con graficos en Recharts. Corre sobre PostgreSQL (aiaudiosense / audiouser / audiopwd) y puede orquestarse con Docker cuando haga falta.

## Stack
- Backend: Python 3.10, FastAPI, SQLAlchemy, librosa, NumPy.
- Base de datos: Postgres (via `DATABASE_URL`), BD `aiaudiosense` usuario `audiouser` pwd `audiopwd`.
- Frontend: Next.js 14 (React 18), TailwindCSS, Recharts.
- Contenedores opcionales: Docker/Docker Compose (backend, frontend, Postgres).

## Estructura
- `backend/app/main.py`: entry FastAPI, CORS, routers.
- `backend/app/utils/audio_processing.py`: ingestion y metricas (RMS, SNR, flatness, bandas, crest, frecuencia dominante, flag de anomalia).
- `backend/app/utils/data_generator.py`: datos sinteticos para mediciones y analisis.
- `backend/app/routers/analysis.py`: `GET /analyses` (dashboard de mediciones).
- `backend/app/routers/developer.py`: `/v2/generate|train|update|clear` para poblar/entrenar/testear.
- `backend/app/models.py`: tablas `Analysis`, `Measurement`, `Model`, `Machine`.
- `frontend/app/page.tsx`: landing + toggle modo dev, dashboard, charts, cards.
- `frontend/app/components/*`: `DashboardView`, `ChartView`, `ResultCard`.
- `docker-compose.yml`: orquesta backend, frontend (3001->3000) y Postgres.

## Como correr en local (sin Docker)
### Backend
```bash
cd backend
python -m venv .venv
source .venv/bin/activate  # en Windows PowerShell: .\.venv\Scripts\Activate.ps1
pip install -r requirements.txt
# configura tu Postgres local:
echo DATABASE_URL=postgresql+psycopg://audiouser:audiopwd@localhost:5432/aiaudiosense > .env
uvicorn app.main:app --reload --port 8000
```

### Frontend
```bash
cd frontend
npm install
# en bash: export NEXT_PUBLIC_API_URL=http://localhost:8000
# en PowerShell: $env:NEXT_PUBLIC_API_URL="http://localhost:8000"
npm run dev  # http://localhost:3000
```

## Como correr con Docker (opcional)
```bash
docker-compose up --build
# backend: http://localhost:8000
# frontend: http://localhost:3001
```

## Simulador de datos en tiempo real
- Corre un generador de mediciones cada 5 s (cupo 10 000 filas, luego limpia y reinicia):
```bash
cd backend
# activa el entorno virtual si no lo hiciste:
#   PowerShell: .\.venv\Scripts\Activate.ps1
#   bash: source .venv/bin/activate
# instala deps si falta psycopg: pip install -r requirements.txt
python -m app.utils.realtime_simulator
```
- Variables opcionales: `SIM_INTERVAL_SECONDS` (segundos entre muestras), `SIM_ANOMALY_RATE` (0-1). Ejemplo: `SIM_INTERVAL_SECONDS=2 SIM_ANOMALY_RATE=0.1 python -m app.utils.realtime_simulator`.
- El dashboard ahora se refresca solo cada 5 s; basta con dejarlo abierto para ver los datos llegar.

## Endpoints principales
- `GET /analyses`  
  - Query: `skip`, `limit` (por defecto 0/10000).  
  - Devuelve filas de `measurements` para el dashboard (timestamp, rms_db, dominant_freq_hz, status).

- Modo desarrollador (`/v2/*`)  
  - `POST /v2/generate`: inserta 10k mediciones sintéticas.  
  - `POST /v2/train`: entrena y guarda IsolationForest (modelo único).  
  - `POST /v2/update`: compat, responde que uses `/anomaly/stream`.  
  - `POST /v2/clear`: limpia `measurements`/`models` y borra `model_if.pkl`.

- Modelado de anomalías (`/anomaly/*`)  
  - `POST /anomaly/train`: entrena IsolationForest con ventana/percentil opcionales.  
  - `GET /anomaly/stream`: puntúa la última ventana y entrega estado/score/umbral.

## Notas de datos/modelo
- Procesamiento actual: FFT basica, normalizacion, calculo de RMS/SNR/flatness/crest y energia por bandas 0–12 kHz.  
- Heuristica de anomalia: `dominant_freq_hz > 8500` o `flatness > 0.3`. Ajustar segun dominio real.  
- Generador sintetico: `populate_measurements` produce valores 0–1 (value) y 100–5000 Hz (frequency); status "Anomalo" cuando value > 0.8 o desvio tras update.

## UI rapida
- Toggle "Modo desarrollador": dispara generate/train/update/clear y refresca dashboard.  
- Dashboard: grafica todas las claves numericas de `GET /analyses`.  
- Sin uploader: el dashboard consume solo `measurements` generadas/simuladas.

## Entornos
- Desarrollo y produccion: Postgres (local o contenedor) con `DATABASE_URL=postgresql+psycopg://audiouser:audiopwd@localhost:5432/aiaudiosense` (ajusta host si usas Docker).

## Proximos pasos sugeridos
- Mejorar textos/UX y agregar validaciones de formato de audio.  
- Tests basicos de integracion (flujo `/v2/*` y consultas del dashboard), y pipelines de CI simples.

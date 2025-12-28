# AI-AudioSense

Demo/MVP para analisis rapido de audio industrial con IA. Incluye backend FastAPI con procesamiento (librosa/NumPy) y frontend Next.js 14 con graficos en Recharts. Corre sobre PostgreSQL (aiaudiosense / audiouser / audiopwd) y puede orquestarse con Docker cuando haga falta.

## Stack
- Backend: Python 3.10, FastAPI, SQLAlchemy, librosa, NumPy.
- Base de datos: Postgres (via `DATABASE_URL`), BD `aiaudiosense` usuario `audiouser` pwd `audiopwd`.
- Frontend: Next.js 14 (React 18), TailwindCSS, Recharts.
- Contenedores opcionales: Docker/Docker Compose (backend, frontend, Postgres).

## Estructura
- `backend/app/main.py`: entry FastAPI (`/analyze`), CORS, routers.
- `backend/app/utils/audio_processing.py`: ingestion y metricas (RMS, SNR, flatness, bandas, crest, frecuencia dominante, flag de anomalia).
- `backend/app/utils/data_generator.py`: datos sinteticos para mediciones y analisis.
- `backend/app/routers/analysis.py`: `GET /analyses` (dashboard de mediciones).
- `backend/app/routers/developer.py`: `/v2/generate|train|update|clear` para poblar/entrenar/testear.
- `backend/app/models.py`: tablas `Analysis`, `Measurement`, `Model`, `Machine`.
- `frontend/app/page.tsx`: landing + toggle modo dev, dashboard, uploader, charts, result card.
- `frontend/app/components/*`: `AudioUploader`, `DashboardView`, `ChartView`, `ResultCard`.
- `docker-compose.yml`: orquesta backend, frontend (3001->3000) y Postgres.

## Como correr en local (sin Docker)
### Backend
```bash
cd backend
python -m venv .venv
source .venv/bin/activate  # en Windows: .\.venv\Scripts\activate
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

## Endpoints principales
- `POST /analyze`  
  - Body: multipart `file` (audio).  
  - Respuesta: `{rms_db, dominant_freq_hz, confidence_percent, status ("Normal"/"Anomalo"), mensaje, snr_db, flatness, crest_factor, band_levels[], filename}`.

- `GET /analyses`  
  - Query: `skip`, `limit` (por defecto 0/10000).  
  - Devuelve filas de `measurements` para el dashboard (timestamp, rms_db, dominant_freq_hz, status).

- Modo desarrollador (`/v2/*`)  
  - `POST /v2/generate`: inserta 10k mediciones sintéticas.  
  - `POST /v2/train`: modelo promedio con medias de valor/frecuencia.  
  - `POST /v2/update`: marca `status` "OK"/"Anomalo" segun desvio del promedio.  
  - `POST /v2/clear`: limpia `measurements` y `models`.

## Notas de datos/modelo
- Procesamiento actual: FFT basica, normalizacion, calculo de RMS/SNR/flatness/crest y energia por bandas 0–12 kHz.  
- Heuristica de anomalia: `dominant_freq_hz > 8500` o `flatness > 0.3`. Ajustar segun dominio real.  
- Generador sintetico: `populate_measurements` produce valores 0–1 (value) y 100–5000 Hz (frequency); status "Anomalo" cuando value > 0.8 o desvio tras update.

## UI rapida
- Toggle “Modo desarrollador”: dispara generate/train/update/clear y refresca dashboard.  
- Dashboard: grafica todas las claves numericas de `GET /analyses`.  
- Uploader: envia audio al backend y muestra metricas + grafico de bandas.  
- Alinea el endpoint del uploader con `POST /analyze` (ajusta `AudioUploader` si es necesario).

## Entornos
- Desarrollo y produccion: Postgres (local o contenedor) con `DATABASE_URL=postgresql+psycopg://audiouser:audiopwd@localhost:5432/aiaudiosense` (ajusta host si usas Docker).

## Proximos pasos sugeridos
- Ajustar `AudioUploader` para apuntar a `/analyze` (o exponer `/analyses/analyze`).  
- Mejorar textos/UX y agregar validaciones de formato de audio.  
- Tests basicos de integracion (upload y flujo `/v2/*`), y pipelines de CI simples.

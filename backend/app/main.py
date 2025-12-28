from fastapi import FastAPI, UploadFile, File
from fastapi.middleware.cors import CORSMiddleware
from starlette.middleware.base import BaseHTTPMiddleware
from app.routers import analysis, developer
import uvicorn

app = FastAPI(title="AI-AudioSense API")

origins = ["http://localhost:3000", "http://127.0.0.1:3000"]
app.add_middleware(
    CORSMiddleware,
    allow_origin_regex=".*",
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

app.include_router(analysis.router)
app.include_router(developer.router)

@app.post("/analyze")
async def analyze(file: UploadFile = File(...)):
    try:
        from app.utils.audio_processing import analyze_audio
        result = await analyze_audio(file)
        result["filename"] = file.filename
        return result
    except Exception as e:
        import traceback
        print("🔥 Error en /analyze:", e)
        traceback.print_exc()
        return {"error": str(e)}

if __name__ == "__main__":
    uvicorn.run("app.main:app", host="0.0.0.0", port=8000, reload=True)

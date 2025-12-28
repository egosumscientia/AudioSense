from fastapi import APIRouter, Depends
from sqlalchemy.orm import Session
from sqlalchemy import text
from datetime import datetime, timedelta
import math
from app.db import get_db
from app.utils import model_loader
from app.utils.features import compute_window_features, ensure_feature_vector

router = APIRouter(prefix="/analyses", tags=["Analyses"])

@router.get("/")
def read_measurements(skip: int = 0, limit: int = 10000, minutes: int | None = None, db: Session = Depends(get_db)):
    """
    Devuelve los datos reales de la tabla measurements para el dashboard.
    Obtiene los ùltimos registros y los reordena cronol¢gicamente.
    """
    params = {"skip": skip, "limit": limit}
    where_clause = ""
    if minutes and minutes > 0:
        since = datetime.utcnow() - timedelta(minutes=minutes)
        params["since"] = since
        where_clause = "WHERE timestamp >= :since"

    query = db.execute(
        text(
            f"""
            SELECT
                id,
                timestamp,
                value AS rms_db,
                frequency AS dominant_freq_hz,
                status
            FROM measurements
            {where_clause}
            ORDER BY timestamp DESC
            OFFSET :skip LIMIT :limit
            """
        ),
        params,
    )

    # Devuelve cronol¢gico ascendente para el chart
    rows = [dict(row._mapping) for row in query][::-1]

    # Métricas derivadas: snr_db, flatness (ventana de 10), banda dominante y score/margen si hay modelo
    # Prepara modelo si está cargado
    model_bundle = model_loader.get_model()
    have_model = bool(model_bundle and model_bundle.get("model") and model_bundle.get("scaler"))
    window_size = int(model_bundle.get("window_size", 0)) if have_model else 0
    feature_names = model_bundle.get("feature_names", []) if have_model else []
    scaler = model_bundle.get("scaler") if have_model else None
    model = model_bundle.get("model") if have_model else None
    threshold = float(model_bundle.get("threshold", 0.0)) if have_model else None

    def geom_mean(vals: list[float]) -> float:
        vals = [v for v in vals if v > 0]
        if not vals:
            return 0.0
        return float(math.exp(sum(math.log(v) for v in vals) / len(vals)))

    values_seen: list[float] = []
    for idx, row in enumerate(rows):
        val = float(row.get("rms_db") or 0.0)
        values_seen.append(max(val, 1e-6))
        snr = 20 * math.log10(max(val, 1e-6))
        window_vals = values_seen[max(0, len(values_seen) - 10) :]
        flat = 0.0
        if window_vals:
            amean = sum(window_vals) / len(window_vals)
            gmean = geom_mean(window_vals)
            flat = gmean / amean if amean > 0 else 0.0
        
        row["snr_db"] = round(snr, 2)
        row["flatness"] = round(flat, 3)

        # Banda simple (5 bandas)
        freq = float(row.get("dominant_freq_hz") or 0.0)
        bands = [0, 500, 1000, 4000, 8000, 12000]
        levels = []
        for i in range(len(bands) - 1):
            if bands[i] <= freq < bands[i + 1]:
                energy = val + 1e-3
                levels.append(round(20 * math.log10(energy), 1))
            else:
                levels.append(-120.0)
        row["band_levels"] = levels

        # Score/margen usando IsolationForest si hay datos suficientes
        if have_model and scaler is not None and model is not None and threshold is not None and idx + 1 >= window_size:
            window_records = rows[idx + 1 - window_size : idx + 1]
            feats = compute_window_features(window_records)
            fv = ensure_feature_vector(feats, feature_names)
            X = scaler.transform(fv)
            score = float(model.score_samples(X)[0])
            row["model_score"] = score
            row["model_margin"] = score - threshold
            row["model_threshold"] = threshold
        else:
            row["model_score"] = None
            row["model_margin"] = None
            row["model_threshold"] = threshold if have_model else None

    return rows


@router.get("/logs")
def stream_logs(limit: int = 200, db: Session = Depends(get_db)):
    """
    Devuelve las ùltimas filas de measurements en orden descendente (log en vivo).
    """
    query = db.execute(
        text(
            """
            SELECT
                timestamp,
                value,
                frequency,
                status
            FROM measurements
            ORDER BY timestamp DESC
            LIMIT :limit
            """
        ),
        {"limit": limit},
    )
    rows = [dict(row._mapping) for row in query]
    return rows


@router.get("/kpis")
def kpis(db: Session = Depends(get_db)):
    """
    KPIs r pidos para cabecera del dashboard.
    - última medici¢n (value/frequency/status/timestamp)
    - % anomalias en ventana reciente (60 min)
    - total de muestras en BD
    - tasa de ingesta (muestras/min en ventana reciente)
    """
    # Obtenemos la hora de referencia (la última medición o ahora si está vacío)
    ref_query = db.execute(text("SELECT MAX(timestamp) FROM measurements")).scalar()
    reference_time = ref_query if ref_query else datetime.utcnow()
    
    window_minutes = 60
    t_window = reference_time - timedelta(minutes=window_minutes)

    last_row = db.execute(
        text(
            """
            SELECT timestamp, value, frequency, status
            FROM measurements
            ORDER BY timestamp DESC
            LIMIT 1
            """
        )
    ).mappings().first()

    total_count = db.execute(text("SELECT COUNT(*) FROM measurements")).scalar() or 0
    count_window = db.execute(
        text("SELECT COUNT(*) FROM measurements WHERE timestamp >= :t_window"),
        {"t_window": t_window},
    ).scalar() or 0
    anomalies_window = db.execute(
        text("SELECT COUNT(*) FROM measurements WHERE timestamp >= :t_window AND LOWER(status) LIKE 'anom%'"),
        {"t_window": t_window},
    ).scalar() or 0

    last_anomaly = db.execute(
        text("SELECT timestamp FROM measurements WHERE LOWER(status) LIKE 'anom%' ORDER BY timestamp DESC LIMIT 1")
    ).scalar()

    anomalies_percent = (anomalies_window / count_window * 100) if count_window else 0.0
    ingest_rate = count_window / window_minutes if window_minutes else 0.0

    return {
        "last_timestamp": last_row.get("timestamp") if last_row else None,
        "last_value": last_row.get("value") if last_row else None,
        "last_frequency": last_row.get("frequency") if last_row else None,
        "last_status": last_row.get("status") if last_row else None,
        "anomalies_percent_window": anomalies_percent,
        "total_measurements": total_count,
        "ingest_rate_per_min": ingest_rate,
        "window_minutes": window_minutes,
        "last_anomaly_ts": last_anomaly,
    }


@router.get("/events")
def recent_anomalies(
    limit: int | None = None,
    minutes: int = 1440,
    page: int = 1,
    per_page: int = 15,
    db: Session = Depends(get_db),
):
    """
    Lista cronol·gica de anomalªas con puntaje del modelo (si existe).
    Por defecto trae las ỳltimas 24h (1440 min). Usa limit opcional para acotar.
    """
    model_bundle = model_loader.get_model()

    params = {"minutes": minutes, "limit": limit or per_page, "offset": max(page - 1, 0) * per_page}
    where_clause = "WHERE LOWER(status) LIKE 'anom%' AND timestamp >= (NOW() - (:minutes || ' minutes')::interval)"
    limit_clause = "LIMIT :limit OFFSET :offset"

    total = db.execute(
        text(f"SELECT COUNT(*) FROM measurements {where_clause}"),
        {"minutes": minutes},
    ).scalar() or 0

    raw_rows = (
        db.execute(
            text(
                f"""
                SELECT timestamp, value, frequency, status
                FROM measurements
                {where_clause}
                ORDER BY timestamp DESC
                {limit_clause}
                """
            ),
            params,
        )
        .mappings()
        .all()
    )

    # Si no hay modelo cargado, devolvemos lo b sico
    if not model_bundle:
        return [dict(r) | {"score": None, "threshold": None, "margin": None} for r in raw_rows]

    feature_names = model_bundle.get("feature_names", [])
    scaler = model_bundle.get("scaler")
    model = model_bundle.get("model")
    threshold = float(model_bundle.get("threshold", 0.0))
    window_size = int(model_bundle.get("window_size", 0))

    # Preparamos respuesta
    events = []
    for r in raw_rows:
        ts = r["timestamp"]
        # obtenemos ventana previa a cada timestamp
        window_rows = (
            db.execute(
                text(
                    """
                    SELECT value, frequency, status
                    FROM measurements
                    WHERE timestamp <= :ts
                    ORDER BY timestamp DESC
                    LIMIT :w
                    """
                ),
                {"ts": ts, "w": window_size},
            )
            .mappings()
            .all()
        )
        window_records = list(reversed([dict(x) for x in window_rows]))
        score = None
        margin = None
        if len(window_records) == window_size and scaler is not None and model is not None:
            feats = compute_window_features(window_records)
            fv = ensure_feature_vector(feats, feature_names)
            X = scaler.transform(fv)
            score = float(model.score_samples(X)[0])
            margin = score - threshold

        events.append(
            {
                "timestamp": ts,
                "value": r.get("value"),
                "frequency": r.get("frequency"),
                "status": r.get("status"),
                "score": score,
                "threshold": threshold if score is not None else None,
                "margin": margin,
            }
        )

    return {
        "items": events,  # ordenadas desc por timestamp
        "page": page,
        "per_page": per_page,
        "total": total,
    }

import math
import os
from typing import Dict, Iterable, List

import numpy as np

# Window por defecto (muestras) configurable via entorno
DEFAULT_WINDOW_SIZE = int(os.getenv("MODEL_WINDOW_SIZE", "60"))


def _slope(values: np.ndarray) -> float:
    """Pendiente lineal simple; devuelve 0.0 si no hay varianza o puntos suficientes."""
    if values.size < 2 or np.allclose(values, values[0]):
        return 0.0
    x = np.arange(values.size, dtype=float)
    coef, _ = np.polyfit(x, values, 1)
    return float(coef)


def compute_window_features(records: List[Dict]) -> Dict[str, float]:
    """
    Calcula estadisticas para una ventana de mediciones (value, frequency, status).
    Devuelve solo tipos nativos para serializar/guardar.
    """
    if not records:
        return {}

    values = np.asarray([float(r.get("value", 0.0)) for r in records], dtype=float)
    freqs = np.asarray([float(r.get("frequency", 0.0)) for r in records], dtype=float)
    statuses = [str(r.get("status", "") or "").lower() for r in records]

    def stats(arr: np.ndarray, name: str) -> Dict[str, float]:
        if arr.size == 0:
            return {f"{name}_{k}": 0.0 for k in ["mean", "std", "median", "iqr", "min", "max", "slope"]}
        median = float(np.median(arr))
        q75, q25 = float(np.percentile(arr, 75)), float(np.percentile(arr, 25))
        return {
            f"{name}_mean": float(arr.mean()),
            f"{name}_std": float(arr.std()),
            f"{name}_median": median,
            f"{name}_iqr": q75 - q25,
            f"{name}_min": float(arr.min()),
            f"{name}_max": float(arr.max()),
            f"{name}_slope": _slope(arr),
        }

    feats = {}
    feats.update(stats(values, "value"))
    feats.update(stats(freqs, "frequency"))

    # Correlacion value/frequency
    if values.size > 1 and freqs.size > 1 and not np.allclose(values, values[0]) and not np.allclose(freqs, freqs[0]):
        feats["corr_value_frequency"] = float(np.corrcoef(values, freqs)[0, 1])
    else:
        feats["corr_value_frequency"] = 0.0

    # Tasa de anomalías en la ventana (segun status simulado)
    anomalous = sum(1 for s in statuses if s.startswith("anom"))
    feats["anom_rate"] = anomalous / len(statuses) if statuses else 0.0

    return feats


def build_feature_matrix(records: List[Dict], window_size: int = DEFAULT_WINDOW_SIZE, include_anom_rate: bool = True) -> List[Dict[str, float]]:
    """
    Genera features para todas las ventanas deslizantes de tamaño window_size.
    """
    if len(records) < window_size:
        return []

    out: List[Dict[str, float]] = []
    for i in range(0, len(records) - window_size + 1):
        window = records[i : i + window_size]
        feats = compute_window_features(window)
        if not include_anom_rate and "anom_rate" in feats:
            feats = {k: v for k, v in feats.items() if k != "anom_rate"}
        out.append(feats)
    return out


def ensure_feature_vector(features: Dict[str, float], feature_names: Iterable[str]) -> np.ndarray:
    """
    Reordena y rellena features segun la lista usada en entrenamiento.
    """
    return np.asarray([float(features.get(name, 0.0)) for name in feature_names], dtype=float).reshape(1, -1)

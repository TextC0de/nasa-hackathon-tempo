#!/usr/bin/env python3
"""
API HTTP para servir predicciones del modelo XGBoost

Deploy to Railway:
    railway login
    railway init
    railway up

Deploy to Fly.io:
    fly launch
    fly deploy
"""

from fastapi import FastAPI, HTTPException
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel
import xgboost as xgb
import numpy as np
import json
from pathlib import Path
from typing import Dict, Any
import os

# Paths (ajustados para estructura de deploy)
BASE_DIR = Path(__file__).parent
MODEL_PATH = BASE_DIR / "models" / "no2_xgboost.json"
FEATURE_NAMES_PATH = BASE_DIR / "models" / "feature_names.json"

print(f"🔍 Buscando modelo en: {MODEL_PATH}")
print(f"🔍 Buscando features en: {FEATURE_NAMES_PATH}")

# Cargar modelo y feature names al inicio
try:
    model = xgb.XGBRegressor()
    model.load_model(str(MODEL_PATH))
    print(f"✅ Modelo cargado correctamente")
except Exception as e:
    print(f"❌ Error cargando modelo: {e}")
    raise

try:
    with open(FEATURE_NAMES_PATH, 'r') as f:
        FEATURE_NAMES = json.load(f)
    print(f"✅ Feature names cargados: {len(FEATURE_NAMES)} features")
except Exception as e:
    print(f"❌ Error cargando feature names: {e}")
    raise

# FastAPI app
app = FastAPI(
    title="NO2 Prediction API",
    version="1.0.0",
    description="XGBoost model for NO2 surface concentration prediction"
)

# CORS (permitir requests desde Cloudflare Workers)
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],  # En producción, especificar dominios
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

class PredictionRequest(BaseModel):
    features: Dict[str, float]

    class Config:
        json_schema_extra = {
            "example": {
                "features": {
                    "no2_column_center": 1.5e16,
                    "urban_proximity_index": 5.2,
                    "distance_to_nearest_city_km": 10.5,
                    "no2_avg_5km": 1.2e16,
                    "wind_speed": 3.5,
                    "temperature": 20.0,
                    # ... etc
                }
            }
        }

class PredictionResponse(BaseModel):
    predicted_no2: float
    model_version: str
    timestamp: str

@app.get("/")
def root():
    return {
        "service": "NO2 Prediction API",
        "model": "XGBoost",
        "features_count": len(FEATURE_NAMES),
        "health": "ok",
        "version": "1.0.0"
    }

@app.get("/health")
def health():
    return {"status": "healthy", "model_loaded": True}

@app.post("/predict", response_model=PredictionResponse)
def predict(request: PredictionRequest):
    """
    Predice NO2 surface concentration dado un set de features

    Request body example:
    {
        "features": {
            "no2_column_center": 1.5e16,
            "urban_proximity_index": 5.2,
            "wind_speed": 3.5,
            ...
        }
    }
    """
    try:
        # Validar que todas las features estén presentes
        missing_features = set(FEATURE_NAMES) - set(request.features.keys())
        if missing_features:
            raise HTTPException(
                status_code=400,
                detail=f"Missing features: {sorted(list(missing_features))[:10]}... (total: {len(missing_features)})"
            )

        # Ordenar features según el orden del modelo
        feature_values = [request.features[name] for name in FEATURE_NAMES]

        # Convertir a numpy array (shape: [1, n_features])
        X = np.array([feature_values])

        # Predecir
        prediction = model.predict(X)[0]

        # Timestamp
        from datetime import datetime
        timestamp = datetime.utcnow().isoformat() + 'Z'

        return PredictionResponse(
            predicted_no2=float(prediction),
            model_version="v1.0",
            timestamp=timestamp
        )

    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

@app.get("/features")
def get_features():
    """Retorna la lista de features requeridas"""
    return {
        "features": FEATURE_NAMES,
        "count": len(FEATURE_NAMES)
    }

@app.get("/info")
def get_info():
    """Retorna información sobre el modelo"""
    return {
        "model_type": "XGBoost",
        "model_file": str(MODEL_PATH),
        "feature_count": len(FEATURE_NAMES),
        "environment": os.getenv("RAILWAY_ENVIRONMENT", "development"),
    }

if __name__ == "__main__":
    import uvicorn
    port = int(os.getenv("PORT", 8001))
    uvicorn.run(app, host="0.0.0.0", port=port)

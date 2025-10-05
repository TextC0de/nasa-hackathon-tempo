#!/usr/bin/env python3
"""
API HTTP para servir predicciones del modelo XGBoost

Deploy options:
- Railway: railway up
- Fly.io: flyctl launch
- AWS Lambda con mangum
- Digital Ocean App Platform

Run locally:
    uvicorn ml-api-server:app --reload --port 8001
"""

from fastapi import FastAPI, HTTPException
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel
import xgboost as xgb
import numpy as np
import json
from pathlib import Path
from typing import Dict, Any

# Paths
MODEL_PATH = Path("models/no2_xgboost.json")
FEATURE_NAMES_PATH = Path("models/feature_names.json")

# Cargar modelo y feature names al inicio
model = xgb.XGBRegressor()
model.load_model(str(MODEL_PATH))

with open(FEATURE_NAMES_PATH, 'r') as f:
    FEATURE_NAMES = json.load(f)

# FastAPI app
app = FastAPI(title="NO2 Prediction API", version="1.0.0")

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

class PredictionResponse(BaseModel):
    predicted_no2: float
    model_version: str

@app.get("/")
def root():
    return {
        "service": "NO2 Prediction API",
        "model": "XGBoost",
        "features_count": len(FEATURE_NAMES),
        "health": "ok"
    }

@app.get("/health")
def health():
    return {"status": "healthy"}

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
                detail=f"Missing features: {list(missing_features)}"
            )

        # Ordenar features según el orden del modelo
        feature_values = [request.features[name] for name in FEATURE_NAMES]

        # Convertir a numpy array (shape: [1, n_features])
        X = np.array([feature_values])

        # Predecir
        prediction = model.predict(X)[0]

        return PredictionResponse(
            predicted_no2=float(prediction),
            model_version="v1.0"
        )

    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

@app.get("/features")
def get_features():
    """Retorna la lista de features requeridas"""
    return {"features": FEATURE_NAMES}

if __name__ == "__main__":
    import uvicorn
    uvicorn.run(app, host="0.0.0.0", port=8001)

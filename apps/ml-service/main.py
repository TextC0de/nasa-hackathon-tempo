"""
ML Service - XGBoost NO2 Prediction API
Serves predictions using the trained XGBoost model from scripts/models/
"""

from fastapi import FastAPI, HTTPException
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel, Field
import xgboost as xgb
import json
import numpy as np
from pathlib import Path
from typing import Optional

app = FastAPI(
    title="Atmos ML Service",
    description="XGBoost-based NO2 surface concentration prediction from TEMPO satellite data",
    version="1.0.0"
)

# Enable CORS
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Global model and feature names
MODEL = None
FEATURE_NAMES = None
MODEL_PATH = Path(__file__).parent.parent.parent / "scripts" / "models" / "no2_xgboost.json"
FEATURES_PATH = Path(__file__).parent.parent.parent / "scripts" / "models" / "feature_names.json"


class NO2PredictionRequest(BaseModel):
    """
    Request schema for NO2 prediction

    All 64 features required by the XGBoost model.
    See scripts/train-ml-model.py extract_features() for details.
    """
    # Center
    no2_column_center: float

    # Geographic
    urban_proximity_index: float
    distance_to_nearest_city_km: float

    # Spatial neighbors (5km, 10km, 20km)
    no2_avg_5km: float
    no2_max_5km: float
    no2_min_5km: float
    no2_std_5km: float

    no2_avg_10km: float
    no2_max_10km: float
    no2_min_10km: float
    no2_std_10km: float

    no2_avg_20km: float
    no2_max_20km: float
    no2_min_20km: float
    no2_std_20km: float

    # Upwind
    no2_upwind_10km_avg: float
    no2_upwind_10km_max: float
    no2_upwind_10km_std: float

    no2_upwind_20km_avg: float
    no2_upwind_20km_max: float
    no2_upwind_20km_std: float

    no2_upwind_30km_avg: float
    no2_upwind_30km_max: float
    no2_upwind_30km_std: float

    # Downwind
    no2_downwind_10km_avg: float
    no2_downwind_10km_max: float
    no2_downwind_10km_std: float

    # Cardinal directions
    no2_north_10km: float
    no2_north_std_10km: float
    no2_east_10km: float
    no2_east_std_10km: float
    no2_south_10km: float
    no2_south_std_10km: float
    no2_west_10km: float
    no2_west_std_10km: float

    # Gradients
    gradient_NS: float
    gradient_EW: float
    gradient_upwind_downwind: float
    gradient_center_avg: float

    # Meteorology
    wind_speed: float
    wind_direction: float
    wind_u: float
    wind_v: float
    pbl_height: float
    temperature: float
    precipitation: float
    pbl_normalized: float

    # Temporal
    hour: int
    day_of_week: int
    month: int
    hour_sin: float
    hour_cos: float
    day_sin: float
    day_cos: float

    # Physics prediction
    physics_prediction: float

    # Historical (optional - default to 0 if not available)
    no2_avg_24h: float = 0
    no2_avg_7d: float = 0
    no2_trend_24h: float = 0

    # Interactions
    wind_speed_x_upwind_no2: float
    hour_x_urban: float
    pbl_x_center_no2: float

    # Advanced temporal
    day_of_year: int
    month_sin: float
    month_cos: float


class NO2PredictionResponse(BaseModel):
    """Response schema for NO2 prediction"""
    predicted_no2_ppb: float = Field(..., description="Predicted NO2 surface concentration in ppb")
    confidence_interval_lower: Optional[float] = Field(None, description="Lower bound (not implemented yet)")
    confidence_interval_upper: Optional[float] = Field(None, description="Upper bound (not implemented yet)")
    model_version: str = Field(..., description="Model version/metadata")


@app.on_event("startup")
async def load_model():
    """Load XGBoost model and feature names on startup"""
    global MODEL, FEATURE_NAMES

    print(f"🤖 Loading XGBoost model from {MODEL_PATH}...")

    if not MODEL_PATH.exists():
        raise RuntimeError(f"Model file not found at {MODEL_PATH}")

    if not FEATURES_PATH.exists():
        raise RuntimeError(f"Feature names file not found at {FEATURES_PATH}")

    # Load model
    MODEL = xgb.XGBRegressor()
    MODEL.load_model(str(MODEL_PATH))

    # Load feature names
    with open(FEATURES_PATH, 'r') as f:
        FEATURE_NAMES = json.load(f)

    print(f"✅ Model loaded successfully!")
    print(f"   Features: {len(FEATURE_NAMES)}")
    print(f"   Model type: XGBoost Regressor")


@app.get("/")
async def root():
    """Health check endpoint"""
    return {
        "status": "ok",
        "service": "Atmos ML Service",
        "model_loaded": MODEL is not None,
        "version": "1.0.0"
    }


@app.get("/health")
async def health():
    """Detailed health check"""
    return {
        "status": "healthy" if MODEL is not None else "unhealthy",
        "model_loaded": MODEL is not None,
        "features_loaded": FEATURE_NAMES is not None,
        "feature_count": len(FEATURE_NAMES) if FEATURE_NAMES else 0,
    }


@app.post("/predict", response_model=NO2PredictionResponse)
async def predict_no2(request: NO2PredictionRequest):
    """
    Predict NO2 surface concentration from TEMPO column data and features

    Args:
        request: NO2PredictionRequest with all 64 required features

    Returns:
        NO2PredictionResponse with predicted surface concentration in ppb
    """
    if MODEL is None or FEATURE_NAMES is None:
        raise HTTPException(status_code=503, detail="Model not loaded")

    try:
        # Convert request to feature vector (must match training order)
        feature_dict = request.dict()
        features = [feature_dict[name] for name in FEATURE_NAMES]

        # Reshape for prediction (1 sample, 64 features)
        X = np.array(features).reshape(1, -1)

        # Predict
        prediction = MODEL.predict(X)[0]

        # Load metadata for version info
        metadata_path = MODEL_PATH.parent / "model_metadata.json"
        model_version = "unknown"
        if metadata_path.exists():
            with open(metadata_path, 'r') as f:
                metadata = json.load(f)
                model_version = f"trained_{metadata.get('train_date', 'unknown')}"

        return NO2PredictionResponse(
            predicted_no2_ppb=float(prediction),
            model_version=model_version
        )

    except Exception as e:
        raise HTTPException(
            status_code=500,
            detail=f"Prediction failed: {str(e)}"
        )


@app.get("/model/info")
async def model_info():
    """Get model metadata and training information"""
    metadata_path = MODEL_PATH.parent / "model_metadata.json"

    if not metadata_path.exists():
        return {"error": "Metadata not found"}

    with open(metadata_path, 'r') as f:
        metadata = json.load(f)

    return metadata


if __name__ == "__main__":
    import uvicorn
    uvicorn.run(app, host="0.0.0.0", port=8000)

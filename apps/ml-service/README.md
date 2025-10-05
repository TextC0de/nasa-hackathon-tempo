# ML Service - XGBoost NO2 Prediction API

FastAPI service that serves predictions from the trained XGBoost model for NO2 surface concentration.

## Features

- **Model**: XGBoost Regressor trained on TEMPO satellite + EPA ground truth data
- **Input**: 64 features (spatial, meteorological, temporal, historical)
- **Output**: Predicted NO2 surface concentration in ppb
- **Performance**: R² = 0.404, MAE = 3.03 ppb (31% improvement over physics-only)

## Quick Start

### 1. Setup (First Time Only)

```bash
# From project root
pnpm ml:setup
```

This will:
- Create Python virtual environment (`venv/`)
- Install all dependencies from `requirements.txt`

### 2. Run the Service

```bash
# From project root
pnpm dev:ml
```

Or directly:

```bash
cd apps/ml-service
source venv/bin/activate
python main.py

# Or with uvicorn (auto-reload)
uvicorn main:app --reload --port 8000
```

Server runs at: http://localhost:8000

API Docs (Swagger): http://localhost:8000/docs

### 3. Check Status

```bash
# From project root
pnpm ml:health    # Health check
pnpm ml:info      # Model metadata
```

### Test the API

```bash
# Health check
curl http://localhost:8000/health

# Model info
curl http://localhost:8000/model/info

# Prediction (example)
curl -X POST http://localhost:8000/predict \
  -H "Content-Type: application/json" \
  -d @example_request.json
```

## API Endpoints

### `GET /`
Health check

### `GET /health`
Detailed health status

### `GET /model/info`
Model metadata and training information

### `POST /predict`
Make NO2 prediction

**Request Body** (64 features):
```json
{
  "no2_column_center": 1.5e16,
  "urban_proximity_index": 5.2,
  "distance_to_nearest_city_km": 10.5,
  ...
}
```

**Response**:
```json
{
  "predicted_no2_ppb": 15.3,
  "confidence_interval_lower": null,
  "confidence_interval_upper": null,
  "model_version": "trained_2025-10-05T12:58:23"
}
```

## Model Details

- **Training data**: 59,239 samples (300 TEMPO files, 38 days, Jan-Jul 2024)
- **Features**: 64 (spatial: 40, geographic: 2, meteo: 8, temporal: 8, historical: 3, interactions: 3)
- **Top features**:
  1. `no2_upwind_30km_avg` (9.5%)
  2. `no2_upwind_30km_max` (6.9%)
  3. `distance_to_nearest_city_km` (4.7%)

- **Test metrics**:
  - R²: 0.404
  - MAE: 3.03 ppb
  - RMSE: 4.77 ppb
  - Improvement over physics baseline: 31%

## Deployment

### Docker

```bash
# Build
docker build -t atmos-ml-service .

# Run
docker run -p 8000:8000 atmos-ml-service
```

### Cloudflare Workers (Python)

```bash
# TODO: Deploy Python Workers when available
# For now, deploy to Cloud Run, Railway, Fly.io, etc.
```

## Development

Model files location: `../../scripts/models/`
- `no2_xgboost.json` - XGBoost model (2.1 MB)
- `feature_names.json` - Feature order (1.3 KB)
- `model_metadata.json` - Training metadata (1.2 KB)

## License

MIT

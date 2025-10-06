# Atmos - NASA Hackathon TEMPO

Platform for visualizing and analyzing air quality and atmospheric pollution data, combining NASA satellite data (TEMPO, TROPOMI, FIRMS) with ground-based EPA data (AirNow).

🌐 **Live Demo**: [https://atmos-web.ignacio658mg.workers.dev](https://atmos-web.ignacio658mg.workers.dev)

## Table of Contents

- [Prerequisites](#prerequisites)
- [Project Structure](#project-structure)
- [Technology Stack](#technology-stack)
- [Machine Learning Model](#machine-learning-model)
- [Installation](#installation)
- [Development](#development)
- [Environment Variables](#environment-variables)
- [Deployment](#deployment)
- [Scripts](#scripts)

## Prerequisites

### Node.js and pnpm

- **Node.js** >= 18
- **pnpm** >= 8

#### Install pnpm

```bash
# Using npm
npm install -g pnpm

# Or using corepack (included with Node.js 16+)
corepack enable
corepack prepare pnpm@latest --activate
```

### Python (Optional - for ML model)

- **Python** >= 3.8
- Required if you want to use the XGBoost prediction model

## Project Structure

```
atmos/
├── apps/
│   ├── web/          # Next.js 15 + tRPC Client
│   └── api/          # Cloudflare Workers + Hono + tRPC Server
├── packages/
│   ├── airnow-client/                 # AirNow API Client (EPA)
│   ├── earthdata-imageserver-client/  # NASA Earthdata Client (TEMPO, TROPOMI)
│   └── firms-client/                  # NASA FIRMS Client
├── scripts/
│   ├── ml-api-server.py              # FastAPI ML prediction service
│   ├── train-ml-model.py             # XGBoost model training script
│   └── models/                       # Trained ML models
│       ├── no2_xgboost.json         # XGBoost model (200 trees)
│       ├── feature_names.json       # Model feature names
│       └── model_metadata.json      # Model performance metrics
└── turbo.json
```

## Technology Stack

### Why a monorepo?

A **monorepo** is a single repository containing multiple applications and libraries. Instead of having 3 separate repos (web, api, clients), everything lives in one place.

**Benefits for the hackathon:**
- Easily share code between apps
- A single `pnpm install` installs everything
- Changes to a client are instantly reflected in the app
- No need to publish packages to npm to test them

### Why these technologies?

**Turborepo**: When you run `pnpm build`, it only recompiles what changed. Uses smart caching to avoid wasting time rebuilding everything.

**pnpm**: Faster than npm and takes up less space. Installs dependencies once and shares them across all packages.

**Next.js 15**: React framework for building web applications. Everything included: routing, image optimization, server components.

**Cloudflare Workers**: Runs your API close to the user and it's Cloud-based.

**tRPC**: TypeScript types from the backend are automatically shared with the frontend. If you change an API, TypeScript warns you in the frontend before running the code.

**Hono**: Simple and lightweight web framework for creating APIs. Very similar to Express but optimized for Cloudflare Workers.

### Full Stack

**Frontend** (`apps/web`)
- Next.js 15, React 19, Tailwind CSS v4, shadcn/ui, tRPC Client, React Query

**Backend** (`apps/api`)
- Cloudflare Workers, Hono, tRPC Server, Zod

**Clients** (`packages/`)
- AirNow (EPA) - Ground-based air quality
- NASA Earthdata - TEMPO and TROPOMI satellite data
- NASA FIRMS - Active fires and thermal anomalies

## Machine Learning Model

### XGBoost NO2 Surface Prediction

The project includes a trained **XGBoost** machine learning model that predicts ground-level NO2 concentrations from satellite column measurements and meteorological data.

**Location**: `scripts/models/`

**Model Performance** (trained on 44,434 samples, tested on 14,805 samples):
- **R² Score**: 0.404 (40.4% variance explained)
- **MAE**: 3.03 ppb (31% improvement over physics-only baseline)
- **RMSE**: 4.77 ppb
- **Features**: 64 engineered features including:
  - NO2 column density from satellite
  - Spatial gradients (upwind/downwind, N/S/E/W)
  - Urban proximity indices
  - Meteorological data (wind speed/direction, PBL height, temperature)
  - Temporal features (hour, day of year, seasonal patterns)

**Top Contributing Features**:
1. `no2_upwind_30km_avg` (9.5% importance) - Upwind NO2 average
2. `no2_upwind_30km_max` (6.9% importance) - Upwind NO2 maximum
3. `distance_to_nearest_city_km` (4.7% importance) - Urban proximity
4. `no2_upwind_30km_std` (4.4% importance) - Upwind NO2 variability
5. `wind_speed_x_upwind_no2` (4.0% importance) - Wind-NO2 interaction

### ML Service Integration

The API (`apps/api`) can optionally use the ML model for predictions. This is controlled by environment variables:

**Enable/Disable ML predictions**:
```bash
# In apps/api/.dev.vars
ML_ENABLED="true"          # Set to "false" to use physics-only baseline
ML_SERVICE_URL="http://localhost:8000"
```

When `ML_ENABLED=true`, the API will send requests to the ML service running at `ML_SERVICE_URL`. When disabled, the API falls back to a physics-based calculation using meteorological dispersion models.

### Running the ML Service

```bash
# 1. Install Python dependencies
cd scripts
pip install -r requirements.txt

# 2. Start the ML API server
uvicorn ml-api-server:app --reload --port 8000

# 3. Test the service
curl http://localhost:8000/health
```

The ML service provides:
- `/predict` - POST endpoint for NO2 predictions
- `/features` - GET endpoint listing required features
- `/health` - Health check endpoint

## Installation

```bash
# 1. Clone repository
git clone <repo-url>
cd atmos

# 2. Install dependencies
pnpm install

# 3. Configure environment variables
# Frontend
cd apps/web
echo "NEXT_PUBLIC_API_URL=http://localhost:8787/trpc" > .env.local

# Backend
cd ../api
cp .dev.vars.example .dev.vars
# Edit .dev.vars with your API keys (NASA_EARTHDATA_TOKEN, AIRNOW_API_KEY, FIRMS_API_KEY)
# Optionally enable ML predictions (ML_ENABLED="true")
```

## Development

```bash
# Start everything (web + api)
pnpm dev

# Or individual apps
pnpm dev:web      # Frontend only → http://localhost:3000
pnpm dev:api      # API only → http://localhost:8787
pnpm dev:packages # Packages only (watch mode)

# Optional: Start ML service (if ML_ENABLED=true)
cd scripts
uvicorn ml-api-server:app --reload --port 8000
```

### tRPC Demo

Visit http://localhost:3000/example to see:
- Queries with React Query + Skeleton loading states
- Mutations with optimistic updates
- End-to-end type-safety
- Error handling

### Other commands

```bash
# Typecheck
pnpm typecheck

# Build
pnpm build

# Lint
pnpm lint

# Format
pnpm format
```

## Environment Variables

### Frontend (`apps/web/.env.local`)

```bash
NEXT_PUBLIC_API_URL=http://localhost:8787/trpc  # Dev
# NEXT_PUBLIC_API_URL=https://api.workers.dev/trpc  # Prod
```

### Backend (`apps/api/.dev.vars`)

```bash
# Required API Keys
NASA_EARTHDATA_TOKEN=your_token_here
AIRNOW_API_KEY=your_key_here
FIRMS_API_KEY=your_key_here

# Database (PostgreSQL)
DATABASE_URL=postgresql://user:pass@host:5432/db_name

# ML Service Configuration (Optional)
ML_ENABLED="true"                    # Set to "false" to disable ML predictions
ML_SERVICE_URL="http://localhost:8000"  # ML service endpoint
```

See `apps/api/.dev.vars.example` for more details.

## Deployment

```bash
# Frontend (Vercel)
cd apps/web && vercel

# API (Cloudflare Workers)
cd apps/api && pnpm deploy

# ML Service (Railway, Fly.io, AWS Lambda, etc.)
cd scripts
# Follow your deployment platform's instructions
```

## Scripts

```bash
pnpm dev              # Everything (web + api)
pnpm dev:web          # Frontend only
pnpm dev:api          # API only
pnpm dev:packages     # Packages only

pnpm build            # Build everything
pnpm typecheck        # Typecheck everything
pnpm lint             # Lint everything
pnpm format           # Format with Prettier
```

### ML Model Scripts

```bash
# Train new model
python scripts/train-ml-model.py

# Validate model
python scripts/validate-model.py

# Start ML API server
uvicorn scripts.ml-api-server:app --reload --port 8000
```

## License

MIT

---

Built for NASA Space Apps Challenge 2024 🚀

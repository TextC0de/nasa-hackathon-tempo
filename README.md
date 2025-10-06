# Atmos - NASA Hackathon TEMPO

Platform for visualizing and analyzing air quality and atmospheric pollution data, combining NASA satellite data (TEMPO, TROPOMI, FIRMS) with ground-based EPA data (AirNow).

🌐 **Live Demo**: [https://atmos-web.ignacio658mg.workers.dev](https://atmos-web.ignacio658mg.workers.dev)

## Table of Contents

- [Prerequisites](#prerequisites)
- [Project Structure](#project-structure)
- [User Roles and Features](#user-roles-and-features)
- [Technology Stack](#technology-stack)
- [Machine Learning Model](#machine-learning-model)
- [AI Assistant (GPT-4)](#ai-assistant-gpt-4)
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

## User Roles and Features

### Citizens (General Users)

The application provides citizens with:
- **Real-time Air Quality Information**: AQI at their current location with health recommendations
- **Health Alerts**: Personalized recommendations for people with asthma or respiratory conditions
- **Interactive Map**: Visualization of the nearest monitoring stations with customizable layers (topographic, hybrid, physical)
- **Pollution Reporting**: Generate and submit pollution reports that alert health administrators
- **Station Data**: View detailed information from the closest ground-based monitoring station

### Administrators (Public Health Agents)

Health administrators have access to:
- **Advanced Dashboard**: Comprehensive view of all ground stations and active fires
- **HCHO Hotspots**: Detection of formaldehyde hotspots from TEMPO satellite data
- **Environmental Parameters**: Real-time monitoring of temperature, humidity, wind, and atmospheric pressure
- **Alert System**: Issue public health alerts based on air quality conditions
- **Population Analysis**: Assess affected population in areas with poor air quality
- **Data Export**: Export historical and real-time data for further analysis
- **Historical Analysis**: View AQI evolution over defined time intervals with customizable filters
- **AI Assistant**: GPT-4-powered chat that analyzes filtered historical data and provides insights and recommendations

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

**AI & Machine Learning**
- OpenAI GPT-4 - AI analysis assistant
- XGBoost - NO2 surface prediction model
- FastAPI - ML service endpoint

**Data Sources** (`packages/`)
- AirNow (EPA) - Ground-based air quality
- NASA Earthdata - TEMPO and TROPOMI satellite data
- NASA FIRMS - Active fires and thermal anomalies
- Open-Meteo - Weather and meteorological data

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

## AI Assistant (GPT-4)

### Overview

The application includes an **AI-powered analysis assistant** built with GPT-4, designed to help administrators interpret air quality data and make informed decisions.

### Features

- **Contextual Analysis**: The AI assistant has access to the filtered historical AQI data currently being viewed
- **Interactive Chat**: Natural language interface for asking questions about trends, patterns, and health implications
- **Suggested Questions**: Pre-configured prompts to guide users through data interpretation
- **Real-time Insights**: Provides recommendations based on current and historical air quality conditions

### Example Queries

The AI assistant can answer questions such as:
- "What is the general AQI trend in this period?"
- "Which pollutant is the most problematic?"
- "When was the worst day of the period?"
- "Are there seasonal patterns in the data?"
- "What health recommendations should I give based on these results?"

### Integration

The AI assistant is available in the **Historical Analysis** view (`/estado/history`) for administrators. It automatically receives context about:
- Selected time range and grouping interval
- AQI statistics (average, minimum, maximum)
- Active pollutants and their concentrations
- Environmental conditions (temperature, wind, precipitation)
- Affected population data

### Configuration

To enable the AI assistant, configure your OpenAI API key:

```bash
# In apps/web/.dev.vars
OPENAI_API_KEY=your_openai_api_key_here
```

The assistant uses **GPT-4** for advanced analysis and contextual understanding of environmental data patterns.

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
OPENAI_API_KEY=your_openai_api_key_here  # Required for GPT-4 AI assistant
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

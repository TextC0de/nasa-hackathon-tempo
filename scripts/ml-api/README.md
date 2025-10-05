# NO2 ML Prediction API

API HTTP para servir predicciones del modelo XGBoost de NO2.

## 🚀 Deploy a Railway (Recomendado)

### 1. Instalar Railway CLI

```bash
npm install -g @railway/cli
# o con brew:
brew install railway
```

### 2. Login a Railway

```bash
railway login
```

Se abrirá tu browser para autenticarte.

### 3. Preparar archivos

```bash
# Copiar modelo a la carpeta ml-api
mkdir -p models
cp ../models/no2_xgboost.json models/
cp ../models/feature_names.json models/
cp ../models/model_metadata.json models/
```

### 4. Deploy

```bash
# Inicializar proyecto Railway
railway init

# Deploy
railway up

# Ver logs
railway logs
```

Railway te dará una URL tipo: `https://your-app.railway.app`

### 5. Test

```bash
curl https://your-app.railway.app/health
```

---

## 🐳 Deploy a Fly.io (Alternativa)

### 1. Instalar Fly CLI

```bash
curl -L https://fly.io/install.sh | sh
```

### 2. Login

```bash
fly auth login
```

### 3. Launch

```bash
# Preparar archivos (igual que Railway)
mkdir -p models
cp ../models/*.json models/

# Deploy
fly launch  # Sigue el wizard
fly deploy
```

---

## 🖥️ Run Local

```bash
# Instalar dependencias
pip install -r requirements.txt

# Copiar modelos
mkdir -p models
cp ../models/*.json models/

# Run
python app.py

# O con uvicorn:
uvicorn app:app --reload --port 8001
```

Abre http://localhost:8001/docs para ver la documentación interactiva.

---

## 📝 Uso desde Cloudflare Workers

```typescript
const ML_API_URL = 'https://your-app.railway.app'

const response = await fetch(`${ML_API_URL}/predict`, {
  method: 'POST',
  headers: { 'Content-Type': 'application/json' },
  body: JSON.stringify({
    features: {
      no2_column_center: 1.5e16,
      urban_proximity_index: 5.2,
      // ... resto de features
    }
  })
})

const { predicted_no2 } = await response.json()
console.log(`Predicted NO2: ${predicted_no2} ppb`)
```

---

## 📊 Endpoints

- `GET /` - Info del servicio
- `GET /health` - Health check
- `GET /features` - Lista de features requeridas
- `POST /predict` - Hacer predicción
- `GET /docs` - Documentación interactiva (Swagger)

---

## 💰 Costos

### Railway
- **Free tier**: $5 USD de crédito/mes
- Suficiente para ~500 horas/mes de un servicio pequeño
- Auto-sleep después de inactividad

### Fly.io
- **Free tier**: 3 máquinas pequeñas gratis
- 160GB bandwidth/mes gratis

Ambos son **GRATIS** para tu caso de uso.

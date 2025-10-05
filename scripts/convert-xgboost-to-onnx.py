#!/usr/bin/env python3
"""
Convierte el modelo XGBoost a ONNX para uso en JavaScript/Cloudflare Workers

Instalar dependencias:
    pip install onnxmltools skl2onnx onnx xgboost
"""

import xgboost as xgb
import onnxmltools
from onnxmltools.convert import convert_xgboost
from skl2onnx.common.data_types import FloatTensorType
import json
from pathlib import Path

# Paths
MODEL_PATH = Path("scripts/models/no2_xgboost.json")
FEATURE_NAMES_PATH = Path("scripts/models/feature_names.json")
ONNX_OUTPUT_PATH = Path("scripts/models/no2_xgboost.onnx")

def main():
    print("🔄 Convirtiendo XGBoost a ONNX...")

    # 1. Cargar modelo XGBoost
    print(f"   📂 Cargando modelo desde {MODEL_PATH}...")
    model = xgb.XGBRegressor()
    model.load_model(str(MODEL_PATH))

    # 2. Cargar feature names para definir input shape
    with open(FEATURE_NAMES_PATH, 'r') as f:
        feature_names = json.load(f)

    n_features = len(feature_names)
    print(f"   📊 Features: {n_features}")

    # 3. Definir el tipo de input (float tensor con n_features)
    initial_type = [('float_input', FloatTensorType([None, n_features]))]

    # 4. Convertir a ONNX
    print("   🔄 Convirtiendo a ONNX...")
    onnx_model = convert_xgboost(
        model,
        initial_types=initial_type,
        target_opset=12  # ONNX opset version (compatible con onnxruntime-web)
    )

    # 5. Guardar modelo ONNX
    print(f"   💾 Guardando modelo ONNX en {ONNX_OUTPUT_PATH}...")
    with open(ONNX_OUTPUT_PATH, "wb") as f:
        f.write(onnx_model.SerializeToString())

    # 6. Verificar tamaño
    size_mb = ONNX_OUTPUT_PATH.stat().st_size / (1024 * 1024)
    print(f"   ✅ Modelo ONNX guardado: {size_mb:.2f} MB")

    if size_mb > 1:
        print(f"\n   ⚠️  ADVERTENCIA: El modelo pesa {size_mb:.2f} MB")
        print("   Cloudflare Workers tiene límites de bundle size.")
        print("   Considera usar Workers AI o un servicio externo.")

    print("\n✅ Conversión completa!")
    print(f"\n📋 Siguiente paso:")
    print(f"   Usar onnxruntime-web en tu API:")
    print(f"   npm install onnxruntime-web")

if __name__ == "__main__":
    main()

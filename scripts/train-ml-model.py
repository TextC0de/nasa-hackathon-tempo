#!/usr/bin/env python3
"""
Entrenamiento de modelo ML para forecasting de NO2

Este script:
1. Lee archivos TEMPO (NetCDF) usando el extractor existente
2. Carga datos EPA (ground truth)
3. Extrae features espaciales de los grids (~65 features)
4. Entrena XGBoost
5. Evalúa y muestra feature importance

Approach: ML post-processing del modelo físico de advección
"""

import sys
import json
import subprocess
import pandas as pd
import numpy as np
from pathlib import Path
from datetime import datetime, timedelta
import xgboost as xgb
from sklearn.model_selection import train_test_split
from sklearn.metrics import mean_absolute_error, mean_squared_error, r2_score
import matplotlib.pyplot as plt
import seaborn as sns

# ============================================================================
# CONFIGURACIÓN
# ============================================================================

TEMPO_DIR = Path("scripts/data/tempo/california/cropped")
EPA_FILE = Path("scripts/downloads-uncompressed/epa/2024-full/no2.csv")
PYTHON_SCRIPT = Path("scripts/extract-tempo-grid-h5py.py")

LA_LOCATION = {"latitude": 34.0522, "longitude": -118.2437}
RADIUS_KM = 50
PBL_REF = 800  # meters

# Factores calibrados
NO2_FACTOR = 1.8749  # Through-origin calibrado
BASE_FACTOR = 2e-16

# ============================================================================
# FUNCIONES AUXILIARES
# ============================================================================

def haversine_distance(lat1, lon1, lat2, lon2):
    """Calcula distancia haversine en km"""
    R = 6371  # Radio Tierra en km
    dlat = np.radians(lat2 - lat1)
    dlon = np.radians(lon2 - lon1)

    a = (np.sin(dlat/2)**2 +
         np.cos(np.radians(lat1)) * np.cos(np.radians(lat2)) * np.sin(dlon/2)**2)
    c = 2 * np.arctan2(np.sqrt(a), np.sqrt(1-a))

    return R * c

def get_cells_in_radius(cells, center_lat, center_lon, radius_km):
    """Obtiene celdas dentro de un radio"""
    result = []
    for cell in cells:
        dist = haversine_distance(center_lat, center_lon,
                                  cell['latitude'], cell['longitude'])
        if dist <= radius_km:
            result.append(cell)
    return result

def move_location(lat, lon, bearing, distance_km):
    """Mueve una ubicación en una dirección"""
    R = 6371
    bearing_rad = np.radians(bearing)
    lat_rad = np.radians(lat)
    lon_rad = np.radians(lon)

    lat2 = np.arcsin(
        np.sin(lat_rad) * np.cos(distance_km/R) +
        np.cos(lat_rad) * np.sin(distance_km/R) * np.cos(bearing_rad)
    )

    lon2 = lon_rad + np.arctan2(
        np.sin(bearing_rad) * np.sin(distance_km/R) * np.cos(lat_rad),
        np.cos(distance_km/R) - np.sin(lat_rad) * np.sin(lat2)
    )

    return np.degrees(lat2), np.degrees(lon2)

def get_upwind_cells(cells, center_lat, center_lon, wind_direction, distance_km, search_radius_km):
    """Obtiene celdas upwind (de donde viene el viento)"""
    upwind_lat, upwind_lon = move_location(center_lat, center_lon, wind_direction, distance_km)
    return get_cells_in_radius(cells, upwind_lat, upwind_lon, search_radius_km)

def get_downwind_cells(cells, center_lat, center_lon, wind_direction, distance_km, search_radius_km):
    """Obtiene celdas downwind (hacia donde va el viento)"""
    downwind_direction = (wind_direction + 180) % 360
    downwind_lat, downwind_lon = move_location(center_lat, center_lon, downwind_direction, distance_km)
    return get_cells_in_radius(cells, downwind_lat, downwind_lon, search_radius_km)

def get_cells_in_direction(cells, center_lat, center_lon, bearing, distance_km, search_radius_km):
    """Obtiene celdas en dirección cardinal"""
    target_lat, target_lon = move_location(center_lat, center_lon, bearing, distance_km)
    return get_cells_in_radius(cells, target_lat, target_lon, search_radius_km)

def extract_no2_values(cells):
    """Extrae valores de NO2 column de celdas"""
    return [c['no2_column'] for c in cells if c.get('no2_column') and c['no2_column'] > 0]

def safe_avg(values):
    return np.mean(values) if len(values) > 0 else 0

def safe_max(values):
    return np.max(values) if len(values) > 0 else 0

def safe_min(values):
    return np.min(values) if len(values) > 0 else 0

def safe_std(values):
    return np.std(values) if len(values) > 0 else 0

def find_nearest_cell(cells, lat, lon):
    """Encuentra celda más cercana"""
    min_dist = float('inf')
    nearest = None

    for cell in cells:
        dist = haversine_distance(lat, lon, cell['latitude'], cell['longitude'])
        if dist < min_dist:
            min_dist = dist
            nearest = cell

    return nearest

def convert_no2_to_surface(no2_column, pbl_height):
    """Convierte NO2 column a surface usando física calibrada"""
    if not no2_column or no2_column <= 0:
        return 0

    # Conversión base
    no2_surface = no2_column * BASE_FACTOR * NO2_FACTOR

    # Ajuste por PBL (raíz cuadrada, no lineal)
    pbl_factor = np.sqrt(PBL_REF / max(pbl_height, 300))
    no2_surface *= pbl_factor

    return no2_surface

# ============================================================================
# EXTRACCIÓN DE FEATURES
# ============================================================================

def extract_features(cells, epa_lat, epa_lon, wind_speed, wind_dir, pbl_height,
                     temp, precip, hour, day_of_week, month):
    """
    Extrae ~65 features espaciales de un grid TEMPO

    Returns:
        dict con todas las features
    """
    # 1. Celda central
    center_cell = find_nearest_cell(cells, epa_lat, epa_lon)
    if not center_cell:
        return None

    # 2. Vecindarios
    neighbors_5km = get_cells_in_radius(cells, epa_lat, epa_lon, 5)
    neighbors_10km = get_cells_in_radius(cells, epa_lat, epa_lon, 10)
    neighbors_20km = get_cells_in_radius(cells, epa_lat, epa_lon, 20)

    # 3. Upwind
    upwind_10km = get_upwind_cells(cells, epa_lat, epa_lon, wind_dir, 10, 5)
    upwind_20km = get_upwind_cells(cells, epa_lat, epa_lon, wind_dir, 20, 5)
    upwind_30km = get_upwind_cells(cells, epa_lat, epa_lon, wind_dir, 30, 5)

    # 4. Downwind
    downwind_10km = get_downwind_cells(cells, epa_lat, epa_lon, wind_dir, 10, 5)

    # 5. Direcciones cardinales
    north_10km = get_cells_in_direction(cells, epa_lat, epa_lon, 0, 10, 5)
    east_10km = get_cells_in_direction(cells, epa_lat, epa_lon, 90, 10, 5)
    south_10km = get_cells_in_direction(cells, epa_lat, epa_lon, 180, 10, 5)
    west_10km = get_cells_in_direction(cells, epa_lat, epa_lon, 270, 10, 5)

    # Extraer valores NO2
    no2_5km = extract_no2_values(neighbors_5km)
    no2_10km = extract_no2_values(neighbors_10km)
    no2_20km = extract_no2_values(neighbors_20km)

    no2_upwind_10 = extract_no2_values(upwind_10km)
    no2_upwind_20 = extract_no2_values(upwind_20km)
    no2_upwind_30 = extract_no2_values(upwind_30km)

    no2_downwind = extract_no2_values(downwind_10km)

    no2_north = extract_no2_values(north_10km)
    no2_east = extract_no2_values(east_10km)
    no2_south = extract_no2_values(south_10km)
    no2_west = extract_no2_values(west_10km)

    # Predicción física del modelo de advección
    physics_pred = convert_no2_to_surface(center_cell.get('no2_column', 0), pbl_height)

    # Ciclo diurno
    local_hour = (hour - 8) % 24  # UTC-8 para LA
    if 6 <= local_hour < 10:
        diurnal_factor = 1.15
    elif 10 <= local_hour < 16:
        diurnal_factor = 0.85
    elif 16 <= local_hour < 20:
        diurnal_factor = 1.1
    else:
        diurnal_factor = 1.0

    physics_pred *= diurnal_factor

    # Construir feature dict
    features = {
        # Centro
        'no2_column_center': center_cell.get('no2_column', 0),
        'lat': epa_lat,
        'lon': epa_lon,

        # Vecindarios
        'no2_avg_5km': safe_avg(no2_5km),
        'no2_max_5km': safe_max(no2_5km),
        'no2_min_5km': safe_min(no2_5km),
        'no2_std_5km': safe_std(no2_5km),

        'no2_avg_10km': safe_avg(no2_10km),
        'no2_max_10km': safe_max(no2_10km),
        'no2_min_10km': safe_min(no2_10km),
        'no2_std_10km': safe_std(no2_10km),

        'no2_avg_20km': safe_avg(no2_20km),
        'no2_max_20km': safe_max(no2_20km),
        'no2_min_20km': safe_min(no2_20km),
        'no2_std_20km': safe_std(no2_20km),

        # Upwind
        'no2_upwind_10km_avg': safe_avg(no2_upwind_10),
        'no2_upwind_10km_max': safe_max(no2_upwind_10),
        'no2_upwind_10km_std': safe_std(no2_upwind_10),

        'no2_upwind_20km_avg': safe_avg(no2_upwind_20),
        'no2_upwind_20km_max': safe_max(no2_upwind_20),
        'no2_upwind_20km_std': safe_std(no2_upwind_20),

        'no2_upwind_30km_avg': safe_avg(no2_upwind_30),
        'no2_upwind_30km_max': safe_max(no2_upwind_30),
        'no2_upwind_30km_std': safe_std(no2_upwind_30),

        # Downwind
        'no2_downwind_10km_avg': safe_avg(no2_downwind),
        'no2_downwind_10km_max': safe_max(no2_downwind),
        'no2_downwind_10km_std': safe_std(no2_downwind),

        # Direcciones cardinales
        'no2_north_10km': safe_avg(no2_north),
        'no2_north_std_10km': safe_std(no2_north),
        'no2_east_10km': safe_avg(no2_east),
        'no2_east_std_10km': safe_std(no2_east),
        'no2_south_10km': safe_avg(no2_south),
        'no2_south_std_10km': safe_std(no2_south),
        'no2_west_10km': safe_avg(no2_west),
        'no2_west_std_10km': safe_std(no2_west),

        # Gradientes espaciales
        'gradient_NS': (safe_avg(no2_north) - safe_avg(no2_south)) / 20000,
        'gradient_EW': (safe_avg(no2_east) - safe_avg(no2_west)) / 20000,
        'gradient_upwind_downwind': (safe_avg(no2_upwind_10) - safe_avg(no2_downwind)) / 20000,
        'gradient_center_avg': (center_cell.get('no2_column', 0) - safe_avg(no2_10km)) / 10000,

        # Meteorología
        'wind_speed': wind_speed,
        'wind_direction': wind_dir,
        'wind_u': wind_speed * np.cos(np.radians(wind_dir)),
        'wind_v': wind_speed * np.sin(np.radians(wind_dir)),
        'pbl_height': pbl_height,
        'temperature': temp,
        'precipitation': precip,
        'pbl_normalized': pbl_height / 800,

        # Temporal
        'hour': local_hour,
        'day_of_week': day_of_week,
        'is_weekend': 1 if day_of_week >= 5 else 0,
        'is_rush_hour': 1 if (6 <= local_hour <= 9) or (16 <= local_hour <= 19) else 0,
        'month': month,

        # Predicción física (MUY IMPORTANTE)
        'physics_prediction': physics_pred,
    }

    return features

# ============================================================================
# MAIN
# ============================================================================

def main():
    print("🤖 Entrenamiento de modelo ML para forecasting de NO2\n")

    # 1. Listar archivos TEMPO
    print("📂 Listando archivos TEMPO...")
    tempo_files = sorted([f for f in TEMPO_DIR.glob("*.nc")])
    print(f"   ✓ {len(tempo_files)} archivos encontrados\n")

    # 2. Cargar datos EPA
    print("📡 Cargando datos EPA...")
    epa_df = pd.read_csv(EPA_FILE, low_memory=False)
    epa_df['timestamp'] = pd.to_datetime(epa_df['Date Local'] + ' ' + epa_df['Time Local'])
    epa_df = epa_df[epa_df['Parameter Name'] == 'Nitrogen dioxide (NO2)']
    epa_df = epa_df.rename(columns={
        'Latitude': 'latitude',
        'Longitude': 'longitude',
        'Sample Measurement': 'value',
        'Parameter Name': 'parameter'
    })
    print(f"   ✓ {len(epa_df)} mediciones EPA\n")

    # 3. Tomar muestra de archivos (para acelerar)
    sample_files = tempo_files[::10][:30]  # Cada 10º archivo, máximo 30
    print(f"📊 Procesando muestra de {len(sample_files)} archivos...\n")

    # 4. Extraer features
    samples = []

    for i, filepath in enumerate(sample_files):
        if i % 10 == 0:
            print(f"   Progreso: {i}/{len(sample_files)} ({len(samples)} samples)")

        try:
            # Extraer timestamp del nombre
            filename = filepath.name
            match = filename.split('_')
            if len(match) < 5:
                continue

            time_str = match[4]  # "20240110T141610Z"
            timestamp = datetime.strptime(time_str, "%Y%m%dT%H%M%SZ")

            # Extraer grid TEMPO usando Python
            cmd = [
                "python3", str(PYTHON_SCRIPT),
                str(filepath),
                str(LA_LOCATION['latitude']),
                str(LA_LOCATION['longitude']),
                str(RADIUS_KM)
            ]

            result = subprocess.run(cmd, capture_output=True, text=True)
            if result.returncode != 0:
                continue

            grid_data = json.loads(result.stdout)
            cells = grid_data.get('grid', {}).get('cells', [])

            if len(cells) == 0:
                continue

            # Buscar mediciones EPA cercanas en tiempo (±2 horas)
            time_window = timedelta(hours=2)
            matching_epa = epa_df[
                (epa_df['timestamp'] >= timestamp - time_window) &
                (epa_df['timestamp'] <= timestamp + time_window)
            ]

            if len(matching_epa) == 0:
                continue

            # Para cada medición EPA, extraer features
            for _, epa_row in matching_epa.iterrows():
                # Meteorología simple (usaríamos OpenMeteo en producción)
                wind_speed = 5.0  # Default
                wind_dir = 270  # Default W
                pbl_height = PBL_REF  # Default
                temp = 20.0  # Default
                precip = 0.0  # Default

                features = extract_features(
                    cells,
                    epa_row['latitude'],
                    epa_row['longitude'],
                    wind_speed,
                    wind_dir,
                    pbl_height,
                    temp,
                    precip,
                    timestamp.hour,
                    timestamp.weekday(),
                    timestamp.month
                )

                if features is None:
                    continue

                # Validar datos
                if not np.isfinite(features['no2_column_center']) or features['no2_column_center'] <= 0:
                    continue
                if not np.isfinite(epa_row['value']) or epa_row['value'] < 0:
                    continue

                # Agregar target
                features['target'] = epa_row['value']
                samples.append(features)

        except Exception as e:
            continue

    print(f"\n   ✓ {len(samples)} samples extraídos\n")

    if len(samples) < 50:
        print(f"❌ Insuficientes samples ({len(samples)}/50 mínimo)")
        return

    # 5. Convertir a DataFrame
    df = pd.DataFrame(samples)

    # Separar features y target
    feature_cols = [c for c in df.columns if c != 'target']
    X = df[feature_cols]
    y = df['target']

    # 6. Train/test split
    X_train, X_test, y_train, y_test = train_test_split(
        X, y, test_size=0.2, random_state=42
    )

    print(f"📊 Dataset:")
    print(f"   Train: {len(X_train)} samples")
    print(f"   Test:  {len(X_test)} samples")
    print(f"   Features: {len(feature_cols)}\n")

    # 7. Entrenar XGBoost
    print("🚀 Entrenando XGBoost...\n")

    model = xgb.XGBRegressor(
        n_estimators=100,
        max_depth=6,
        learning_rate=0.1,
        random_state=42,
        n_jobs=-1
    )

    model.fit(X_train, y_train)

    # 8. Evaluar
    print("📈 Evaluando modelo...\n")

    # Predicciones
    y_pred_train = model.predict(X_train)
    y_pred_test = model.predict(X_test)

    # Métricas train
    mae_train = mean_absolute_error(y_train, y_pred_train)
    rmse_train = np.sqrt(mean_squared_error(y_train, y_pred_train))
    r2_train = r2_score(y_train, y_pred_train)

    # Métricas test
    mae_test = mean_absolute_error(y_test, y_pred_test)
    rmse_test = np.sqrt(mean_squared_error(y_test, y_pred_test))
    r2_test = r2_score(y_test, y_pred_test)

    # Métricas del modelo físico solo
    physics_pred_test = X_test['physics_prediction'].values
    mae_physics = mean_absolute_error(y_test, physics_pred_test)

    print("   ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━")
    print("   RESULTADOS")
    print("   ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━")
    print(f"\n   TRAIN:")
    print(f"   MAE:  {mae_train:.2f} ppb")
    print(f"   RMSE: {rmse_train:.2f} ppb")
    print(f"   R²:   {r2_train:.4f}")

    print(f"\n   TEST:")
    print(f"   MAE:  {mae_test:.2f} ppb")
    print(f"   RMSE: {rmse_test:.2f} ppb")
    print(f"   R²:   {r2_test:.4f}")

    print(f"\n   COMPARACIÓN:")
    print(f"   Modelo físico solo:  MAE = {mae_physics:.2f} ppb")
    print(f"   Modelo físico + ML:  MAE = {mae_test:.2f} ppb")
    print(f"   Mejora:              {((mae_physics - mae_test) / mae_physics * 100):.1f}%")
    print("   ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n")

    # 9. Feature importance
    print("📊 Feature Importance (top 15):\n")

    importance = model.feature_importances_
    feature_importance = pd.DataFrame({
        'feature': feature_cols,
        'importance': importance
    }).sort_values('importance', ascending=False)

    print(feature_importance.head(15).to_string(index=False))
    print("\n✅ Entrenamiento completo!\n")

if __name__ == "__main__":
    main()

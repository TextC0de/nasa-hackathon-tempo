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

# Importar el índice espacial de meteorología
from meteo_spatial_index import MeteoSpatialIndex
import seaborn as sns

# ============================================================================
# CONFIGURACIÓN
# ============================================================================

TEMPO_DIR = Path("scripts/data/tempo/california/cropped")
EPA_FILE = Path("scripts/downloads-uncompressed/epa/2024-full/no2.csv")
OPENMETEO_DIR = Path("scripts/data/openmeteo")
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

def get_geographic_features(lat, lon):
    """
    Calcula features geográficas usando SOLO datos reales disponibles

    Usa las 25 ciudades de OpenMeteo como proxies de:
    - Población/densidad urbana (distancia a ciudades grandes)
    - Complejidad topográfica (varianza de presión atmosférica en las ciudades cercanas)
    - Patrón de vientos dominantes (de los datos meteorológicos)

    Esto evita inventar datos de elevación o costa que no tenemos.
    """
    # Las 25 ciudades de California con sus poblaciones (2020)
    # Esto sí es data real que podemos usar como proxy de densidad urbana
    MAJOR_CITIES = {
        'Los_Angeles': (34.06, -118.24, 3_900_000),
        'San_Diego': (32.72, -117.14, 1_400_000),
        'San_Jose': (37.36, -121.91, 1_000_000),
        'San_Francisco': (37.79, -122.41, 875_000),
        'Fresno': (36.73, -119.76, 542_000),
        'Sacramento': (38.56, -121.55, 525_000),
        'Long_Beach': (33.78, -118.21, 466_000),
        'Oakland': (37.79, -122.41, 440_000),
        'Bakersfield': (35.40, -119.04, 403_000),
        'Anaheim': (33.85, -117.91, 346_000),
    }

    # Calcular distancia ponderada por población (proxy de exposición a emisiones urbanas)
    weighted_urban_distance = 0
    total_weight = 0

    for city_name, (city_lat, city_lon, population) in MAJOR_CITIES.items():
        dist = haversine_distance(lat, lon, city_lat, city_lon)
        # Peso = población / distancia (más cerca y más grande = más influencia)
        weight = population / max(dist, 1.0)  # Evitar división por 0
        weighted_urban_distance += dist * weight
        total_weight += weight

    # Normalizar
    urban_proximity_index = total_weight / 1_000_000  # Normalizar a ~0-10

    # Feature simple: distancia a ciudad más cercana
    min_dist_to_city = min(
        haversine_distance(lat, lon, city_lat, city_lon)
        for _, (city_lat, city_lon, _) in MAJOR_CITIES.items()
    )

    return {
        'urban_proximity_index': urban_proximity_index,
        'distance_to_nearest_city_km': min_dist_to_city,
    }

def load_openmeteo_data():
    """Carga datos meteorológicos usando el índice espacial"""
    if not OPENMETEO_DIR.exists():
        print("   ⚠️  Directorio OpenMeteo no encontrado, usando valores por defecto")
        return None

    # Cargar el índice espacial (carga las 25 ciudades)
    meteo_index = MeteoSpatialIndex(OPENMETEO_DIR)

    if not meteo_index.cities_data:
        print("   ⚠️  No se pudieron cargar datos meteorológicos")
        return None

    return meteo_index

def get_meteo_for_time(meteo_index, timestamp, lat, lon):
    """
    Obtiene meteorología interpolada para una ubicación y timestamp

    Args:
        meteo_index: MeteoSpatialIndex instance (o None)
        timestamp: datetime object
        lat, lon: Coordenadas del punto

    Returns:
        Dict con variables meteorológicas
    """
    if meteo_index is None:
        return {
            'wind_speed': 5.0,
            'wind_direction': 270,
            'temperature': 20.0,
            'precipitation': 0.0,
            'pbl_height': PBL_REF,
        }

    # Formatear timestamp como string (YYYY-MM-DD HH:MM)
    timestamp_str = timestamp.strftime('%Y-%m-%d %H:%M')

    # Interpolar usando k-NN
    meteo_data = meteo_index.interpolate_meteo(lat, lon, timestamp_str, k=3)

    # Asegurar que pbl_height esté presente
    if 'pbl_height' not in meteo_data:
        meteo_data['pbl_height'] = PBL_REF

    return meteo_data

def calculate_epa_historical_features(epa_df):
    """
    Pre-calcula features históricas de NO2 por estación EPA

    Calcula rolling averages y tendencias para cada estación, que se usarán
    como features en el modelo ML.

    Args:
        epa_df: DataFrame con datos EPA (debe tener: State Code, County Code, Site Num, timestamp, value)

    Returns:
        dict: {station_id: {timestamp_str: {'no2_avg_24h': X, 'no2_avg_7d': Y, 'no2_trend_24h': Z}}}
    """
    print("📊 Calculando features históricas de NO2 por estación...")

    # Crear ID único de estación: State_County_SiteNum
    epa_df = epa_df.copy()
    epa_df['station_id'] = (
        epa_df['State Code'].astype(str) + '_' +
        epa_df['County Code'].astype(str).str.zfill(3) + '_' +  # Pad con ceros
        epa_df['Site Num'].astype(str).str.zfill(4)
    )

    historical_cache = {}
    unique_stations = epa_df['station_id'].unique()

    for i, station_id in enumerate(unique_stations):
        if i % 50 == 0:
            print(f"   Procesando estación {i+1}/{len(unique_stations)}...", end='\r')

        # Filtrar y ordenar por timestamp
        station_data = epa_df[epa_df['station_id'] == station_id].copy()
        station_data = station_data.sort_values('timestamp')

        # Asegurar que timestamp es el índice
        station_data = station_data.set_index('timestamp')

        # Calcular rolling windows
        # rolling('24H') usa ventana de tiempo real (no N observaciones)
        station_data['no2_avg_24h'] = station_data['value'].rolling('24H', min_periods=1).mean()
        station_data['no2_avg_7d'] = station_data['value'].rolling('7D', min_periods=1).mean()

        # Calcular tendencia (cambio porcentual en 24h)
        # Usar shift con freq para desplazamiento temporal real (no por filas)
        value_24h_ago = station_data['value'].shift(freq=pd.Timedelta(hours=24))
        station_data['no2_trend_24h'] = (
            (station_data['value'] - value_24h_ago) /
            (value_24h_ago.abs() + 0.1)  # +0.1 para evitar división por 0
        ).fillna(0)

        # Convertir a diccionario: {timestamp_str: {features}}
        station_dict = {}
        for ts, row in station_data.iterrows():
            timestamp_str = ts.strftime('%Y-%m-%d %H:%M:%S')
            station_dict[timestamp_str] = {
                'no2_avg_24h': row['no2_avg_24h'] if pd.notna(row['no2_avg_24h']) else 0,
                'no2_avg_7d': row['no2_avg_7d'] if pd.notna(row['no2_avg_7d']) else 0,
                'no2_trend_24h': row['no2_trend_24h'] if pd.notna(row['no2_trend_24h']) else 0,
            }

        historical_cache[station_id] = station_dict

    print(f"\n   ✓ {len(historical_cache)} estaciones con histórico calculado")
    total_points = sum(len(v) for v in historical_cache.values())
    print(f"   ✓ {total_points:,} puntos históricos totales\n")

    return historical_cache

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
                     temp, precip, hour, day_of_week, month, meteo=None,
                     station_id=None, timestamp=None, epa_historical=None):
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

    # Features geográficas usando SOLO datos reales (no inventados)
    geo_features = get_geographic_features(epa_lat, epa_lon)

    # Construir feature dict
    features = {
        # Centro
        'no2_column_center': center_cell.get('no2_column', 0),

        # Features geográficas reales (reemplazan lat/lon crudos)
        'urban_proximity_index': geo_features['urban_proximity_index'],
        'distance_to_nearest_city_km': geo_features['distance_to_nearest_city_km'],

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

        # Temporal (valores continuos + codificación cíclica)
        'hour': local_hour,
        'day_of_week': day_of_week,
        'month': month,
        # Codificación cíclica de hora (23 está cerca de 0)
        'hour_sin': np.sin(2 * np.pi * local_hour / 24),
        'hour_cos': np.cos(2 * np.pi * local_hour / 24),
        # Codificación cíclica de día de semana (domingo=6 está cerca de lunes=0)
        'day_sin': np.sin(2 * np.pi * day_of_week / 7),
        'day_cos': np.cos(2 * np.pi * day_of_week / 7),

        # Predicción física (MUY IMPORTANTE)
        'physics_prediction': physics_pred,
    }

    # ====== FEATURES HISTÓRICAS (NO2 de las últimas 24h y 7 días) ======
    timestamp_str = timestamp.strftime('%Y-%m-%d %H:%M:%S') if timestamp else None
    historical = {}
    if epa_historical and station_id and timestamp_str:
        historical = epa_historical.get(station_id, {}).get(timestamp_str, {})

    features['no2_avg_24h'] = historical.get('no2_avg_24h', 0)
    features['no2_avg_7d'] = historical.get('no2_avg_7d', 0)
    features['no2_trend_24h'] = historical.get('no2_trend_24h', 0)

    # ====== FEATURES DE INTERACCIÓN ======
    features['wind_speed_x_upwind_no2'] = wind_speed * safe_avg(no2_upwind_30)
    features['hour_x_urban'] = local_hour * geo_features['urban_proximity_index']  # Tráfico urbano varía por hora
    features['pbl_x_center_no2'] = pbl_height * center_cell.get('no2_column', 0)

    # ====== FEATURES TEMPORALES AVANZADAS ======
    if timestamp:
        # Estacionalidad (continua)
        features['day_of_year'] = timestamp.timetuple().tm_yday
        # Codificación cíclica de mes para capturar estacionalidad
        features['month_sin'] = np.sin(2 * np.pi * month / 12)
        features['month_cos'] = np.cos(2 * np.pi * month / 12)
    else:
        features['day_of_year'] = 0
        features['month_sin'] = 0
        features['month_cos'] = 0

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

    # 2.5. Cargar datos meteorológicos
    print("🌤️  Cargando datos meteorológicos...")
    meteo_cache = load_openmeteo_data()

    # 2.6. Calcular features históricas de NO2
    epa_historical = calculate_epa_historical_features(epa_df)

    # 3. Usar TODOS los archivos TEMPO disponibles (o limitar con argumento)
    max_files = int(sys.argv[1]) if len(sys.argv) > 1 else len(tempo_files)
    sample_files = tempo_files[:max_files]
    print(f"📊 Procesando {len(sample_files)} archivos TEMPO (de {len(tempo_files)} disponibles)...\n")
    print(f"   💡 Tip: python3 {sys.argv[0]} <max_files> para limitar cantidad\n")

    # 4. Extraer features
    samples = []
    debug_mode = len(sample_files) <= 10  # Debug si procesamos pocos archivos

    # Para calcular ETA
    import time
    start_time = time.time()
    file_times = []

    for i, filepath in enumerate(sample_files):
        file_start = time.time()

        # Calcular ETA
        if i > 0:
            avg_time_per_file = (time.time() - start_time) / i
            remaining_files = len(sample_files) - i
            eta_seconds = avg_time_per_file * remaining_files
            eta_minutes = int(eta_seconds / 60)
            eta_seconds_remaining = int(eta_seconds % 60)
            eta_str = f"ETA: {eta_minutes}m {eta_seconds_remaining}s"

            # Velocidad
            samples_per_min = (len(samples) / (time.time() - start_time)) * 60
            speed_str = f"{samples_per_min:.0f} samples/min"
        else:
            eta_str = "Calculando..."
            speed_str = ""

        # Mostrar progreso siempre (cada archivo)
        progress_pct = int((i / len(sample_files)) * 100)
        print(f"   [{i+1}/{len(sample_files)} {progress_pct}%] {filepath.name[:30]}... → {len(samples)} samples | {eta_str} | {speed_str}     ", end='\r', flush=True)

        if i % 10 == 0 and i > 0:
            elapsed = time.time() - start_time
            print(f"\n   ✓ Checkpoint {i}/{len(sample_files)}: {len(samples)} samples | Tiempo: {int(elapsed/60)}m {int(elapsed%60)}s | {eta_str}")

        try:
            # Extraer timestamp del nombre
            filename = filepath.name
            match = filename.split('_')
            if len(match) < 5:
                if debug_mode:
                    print(f"\n   ⚠️  Skipped {filename}: formato inesperado")
                continue

            time_str = match[4]  # "20240110T141610Z"
            timestamp = datetime.strptime(time_str, "%Y%m%dT%H%M%SZ")

            if debug_mode:
                print(f"\n   📅 Procesando: {filename}")
                print(f"      Timestamp TEMPO: {timestamp}")

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
                if debug_mode:
                    print(f"      ⚠️  No cells en grid")
                continue

            # Buscar mediciones EPA cercanas en tiempo (±2 horas)
            time_window = timedelta(hours=2)
            matching_epa = epa_df[
                (epa_df['timestamp'] >= timestamp - time_window) &
                (epa_df['timestamp'] <= timestamp + time_window)
            ]

            if debug_mode:
                print(f"      🔍 Buscando EPA entre {timestamp - time_window} y {timestamp + time_window}")
                print(f"      ✓ {len(matching_epa)} mediciones EPA encontradas")

            if len(matching_epa) == 0:
                if debug_mode:
                    print(f"      ❌ No hay mediciones EPA en ventana de tiempo")
                continue

            # Limitar a máximo 200 estaciones EPA por archivo (aumentado para mejor cobertura)
            # Tomar muestra aleatoria si hay muchas
            if len(matching_epa) > 200:
                matching_epa = matching_epa.sample(n=200, random_state=42)
                if debug_mode:
                    print(f"      📉 Limitado a 200 samples aleatorios")

            # Para cada medición EPA, extraer features
            for idx_epa, epa_row in enumerate(matching_epa.iterrows()):
                _, epa_row = epa_row  # Desempaquetar
                # Obtener meteorología interpolada para esta ubicación y tiempo
                meteo = get_meteo_for_time(meteo_cache, timestamp, epa_row['latitude'], epa_row['longitude'])

                # Crear station_id para lookup de features históricas
                station_id = (
                    str(epa_row['State Code']) + '_' +
                    str(epa_row['County Code']).zfill(3) + '_' +
                    str(epa_row['Site Num']).zfill(4)
                )

                features = extract_features(
                    cells,
                    epa_row['latitude'],
                    epa_row['longitude'],
                    meteo['wind_speed'],
                    meteo['wind_direction'],
                    meteo['pbl_height'],
                    meteo['temperature'],
                    meteo['precipitation'],
                    timestamp.hour,
                    timestamp.weekday(),
                    timestamp.month,
                    meteo,  # Pasar diccionario completo
                    station_id,  # Para lookup de features históricas
                    timestamp,  # Para calcular day_of_year, etc
                    epa_historical  # Cache de features históricas
                )

                if features is None:
                    continue

                # Validar datos
                if not np.isfinite(features['no2_column_center']) or features['no2_column_center'] <= 0:
                    if debug_mode:
                        print(f"         ⚠️  Invalid NO2 column: {features['no2_column_center']}")
                    continue
                if not np.isfinite(epa_row['value']) or epa_row['value'] < 0:
                    if debug_mode:
                        print(f"         ⚠️  Invalid EPA value: {epa_row['value']}")
                    continue

                # Agregar target y timestamp (para split temporal)
                features['target'] = epa_row['value']
                features['timestamp'] = timestamp  # Para split temporal
                samples.append(features)

                if debug_mode:
                    print(f"         ✅ Sample extraído (total: {len(samples)})")

        except Exception as e:
            if debug_mode:
                print(f"      ❌ Error: {e}")
            continue

    # Resumen final
    total_time = time.time() - start_time
    print(f"\n\n   ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━")
    print(f"   ✅ EXTRACCIÓN COMPLETADA")
    print(f"   ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━")
    print(f"   📁 Archivos procesados: {len(sample_files)}")
    print(f"   📊 Samples extraídos: {len(samples)}")
    print(f"   ⏱️  Tiempo total: {int(total_time/60)}m {int(total_time%60)}s")
    print(f"   🚀 Velocidad promedio: {(len(samples) / total_time * 60):.0f} samples/min")
    print(f"   ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n")

    if len(samples) < 50:
        print(f"❌ Insuficientes samples ({len(samples)}/50 mínimo)")
        return

    # 5. Convertir a DataFrame
    df = pd.DataFrame(samples)

    # Separar features y target (excluir timestamp de features)
    feature_cols = [c for c in df.columns if c not in ['target', 'timestamp']]
    X = df[feature_cols]
    y = df['target']
    timestamps = df['timestamp']

    # 6. Split temporal (train: ene-mar, test: mar-abr)
    # Esto evita data leakage y valida la capacidad de predicción futura
    print(f"📊 Implementando split temporal...")

    # Encontrar el corte temporal (75% para train, 25% para test)
    sorted_times = sorted(timestamps.unique())
    split_idx = int(len(sorted_times) * 0.75)
    split_date = sorted_times[split_idx]

    train_mask = timestamps < split_date
    test_mask = timestamps >= split_date

    X_train = X[train_mask]
    y_train = y[train_mask]
    X_test = X[test_mask]
    y_test = y[test_mask]

    print(f"   Fecha de corte: {split_date.strftime('%Y-%m-%d %H:%M')}")
    print(f"   Train: {len(X_train)} samples (antes de {split_date.strftime('%Y-%m-%d')})")
    print(f"   Test:  {len(X_test)} samples (desde {split_date.strftime('%Y-%m-%d')})")
    print(f"   Features: {len(feature_cols)}\n")

    # 7. Entrenar XGBoost
    print("🚀 Entrenando XGBoost...\n")

    # Detectar si hay GPU disponible (Metal en M1/M2/M3)
    try:
        metal_check = subprocess.run(['sysctl', '-n', 'machdep.cpu.brand_string'],
                                    capture_output=True, text=True)
        has_apple_silicon = 'Apple' in metal_check.stdout

        if has_apple_silicon:
            print("   🚀 Detectado Apple Silicon (M1/M2/M3)")
            print("   💡 Usando aceleración de hardware (multi-core optimizado)")
            tree_method = 'hist'  # Optimizado para Apple Silicon
            device = 'cpu'  # XGBoost en macOS usa CPU optimizada, no Metal directo
        else:
            tree_method = 'auto'
            device = 'cpu'
    except:
        tree_method = 'auto'
        device = 'cpu'

    model = xgb.XGBRegressor(
        n_estimators=200,       # Más árboles para capturar patrones temporales
        max_depth=7,            # Aumentado para capturar interacciones complejas
        learning_rate=0.05,     # Menor para aprender más despacio y evitar overfitting
        random_state=42,
        n_jobs=-1,  # Usa todos los cores
        tree_method=tree_method,
        device=device,
        # Regularización más agresiva con features históricas
        reg_alpha=1.0,          # L1 regularization aumentado
        reg_lambda=3.0,         # L2 regularization aumentado
        colsample_bytree=0.75,  # Reduce features por árbol (más diversidad)
        subsample=0.8,          # Mantener 80% de samples
        min_child_weight=5,     # Aumentado para evitar splits en nodos pequeños
        gamma=0.1               # Minimum loss reduction para split (nuevo)
    )

    print(f"   Tree method: {tree_method}")
    print(f"   Device: {device}")
    print(f"   Cores: {model.n_jobs}\n")

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

    # 10. Guardar modelo
    model_path = Path("scripts/models/no2_xgboost.json")
    model_path.parent.mkdir(parents=True, exist_ok=True)
    model.save_model(str(model_path))
    print(f"\n💾 Modelo guardado en: {model_path}")

    # 11. Guardar feature names
    feature_names_path = Path("scripts/models/feature_names.json")
    with open(feature_names_path, 'w') as f:
        json.dump(feature_cols, f, indent=2)
    print(f"💾 Feature names guardados en: {feature_names_path}")

    # 12. Guardar metadata del modelo
    metadata = {
        'train_date': datetime.now().isoformat(),
        'n_samples_train': len(X_train),
        'n_samples_test': len(X_test),
        'n_features': len(feature_cols),
        'mae_test': float(mae_test),
        'rmse_test': float(rmse_test),
        'r2_test': float(r2_test),
        'mae_physics_baseline': float(mae_physics),
        'improvement_pct': float((mae_physics - mae_test) / mae_physics * 100),
        'top_features': feature_importance.head(10).to_dict('records'),
    }

    metadata_path = Path("scripts/models/model_metadata.json")
    with open(metadata_path, 'w') as f:
        json.dump(metadata, f, indent=2)
    print(f"💾 Metadata guardada en: {metadata_path}")

    print("\n✅ Entrenamiento completo!\n")
    print(f"🎯 Para usar el modelo en producción:")
    print(f"   1. Cargar modelo: xgb.XGBRegressor().load_model('{model_path}')")
    print(f"   2. Preparar features usando extract_features()")
    print(f"   3. Predecir: model.predict(X)")
    print()

if __name__ == "__main__":
    main()

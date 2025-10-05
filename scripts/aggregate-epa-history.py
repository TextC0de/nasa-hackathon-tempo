#!/usr/bin/env python3
"""
Agrega datos históricos de EPA en formato listo para cargar en BD

Este script:
1. Lee CSV de EPA (NO2, O3, PM2.5)
2. Filtra solo California (32-42°N, -125 a -114°W)
3. Agrega por ubicación (0.1° ≈ 11km) y hora
4. Calcula estadísticas (avg, min, max)
5. Genera JSON con datos agregados

Output: scripts/data/aqi-history-aggregated.json

Uso:
    python3 scripts/aggregate-epa-history.py
    python3 scripts/aggregate-epa-history.py --days 30  # Solo últimos 30 días
"""

import pandas as pd
import numpy as np
from pathlib import Path
from datetime import datetime, timedelta
import json
import sys
import argparse

# ============================================================================
# CONFIGURACIÓN
# ============================================================================

EPA_DIR = Path("scripts/downloads-uncompressed/epa")
OUTPUT_FILE = Path("scripts/data/aqi-history-aggregated.json")

# Bounding box de California
CA_BOUNDS = {
    'lat_min': 32.0,
    'lat_max': 42.0,
    'lng_min': -125.0,
    'lng_max': -114.0
}

# Redondeo de coordenadas (0.1° ≈ 11km)
# Esto agrupa estaciones cercanas
COORD_PRECISION = 1  # 1 decimal = 0.1°

# ============================================================================
# FUNCIONES DE CONVERSIÓN AQI
# ============================================================================

def calculate_aqi_no2(ppb):
    """Calcula AQI para NO2 (ppb)"""
    # NO2 AQI breakpoints (ppb)
    if ppb < 0:
        return 0
    elif ppb <= 53:
        return (ppb / 53) * 50
    elif ppb <= 100:
        return 50 + ((ppb - 53) / (100 - 53)) * 50
    elif ppb <= 360:
        return 100 + ((ppb - 100) / (360 - 100)) * 50
    elif ppb <= 649:
        return 150 + ((ppb - 360) / (649 - 360)) * 50
    elif ppb <= 1249:
        return 200 + ((ppb - 649) / (1249 - 649)) * 100
    else:
        return 300 + ((ppb - 1249) / (1249 - 649)) * 100

def calculate_aqi_o3(ppb):
    """Calcula AQI para O3 (ppb)"""
    if ppb < 0:
        return 0
    elif ppb <= 54:
        return (ppb / 54) * 50
    elif ppb <= 70:
        return 50 + ((ppb - 54) / (70 - 54)) * 50
    elif ppb <= 85:
        return 100 + ((ppb - 70) / (85 - 70)) * 50
    elif ppb <= 105:
        return 150 + ((ppb - 85) / (105 - 85)) * 50
    elif ppb <= 200:
        return 200 + ((ppb - 105) / (200 - 105)) * 100
    else:
        return 300 + ((ppb - 200) / (200 - 105)) * 100

def calculate_aqi_pm25(ugm3):
    """Calcula AQI para PM2.5 (μg/m³)"""
    if ugm3 < 0:
        return 0
    elif ugm3 <= 12.0:
        return (ugm3 / 12.0) * 50
    elif ugm3 <= 35.4:
        return 50 + ((ugm3 - 12.0) / (35.4 - 12.0)) * 50
    elif ugm3 <= 55.4:
        return 100 + ((ugm3 - 35.4) / (55.4 - 35.4)) * 50
    elif ugm3 <= 150.4:
        return 150 + ((ugm3 - 55.4) / (150.4 - 55.4)) * 50
    elif ugm3 <= 250.4:
        return 200 + ((ugm3 - 150.4) / (250.4 - 150.4)) * 100
    else:
        return 300 + ((ugm3 - 250.4) / (250.4 - 150.4)) * 100

# ============================================================================
# PROCESAMIENTO
# ============================================================================

def process_csv(filepath, pollutant, days_limit=None):
    """
    Procesa un CSV de EPA y devuelve datos agregados

    Args:
        filepath: Path al CSV
        pollutant: 'NO2', 'O3', o 'PM25'
        days_limit: Número de días a procesar (None = todos)

    Returns:
        DataFrame con datos agregados por (lat, lng, hour)
    """
    print(f"\n📂 Procesando {pollutant} desde {filepath.name}...")

    # Leer CSV en chunks para no saturar RAM
    chunk_size = 100000
    chunks = []

    cutoff_date = None
    if days_limit:
        cutoff_date = datetime.now() - timedelta(days=days_limit)
        print(f"   📅 Filtrando desde: {cutoff_date.strftime('%Y-%m-%d')}")

    for chunk in pd.read_csv(filepath, chunksize=chunk_size):
        # Filtrar solo California
        mask_ca = (
            (chunk['Latitude'] >= CA_BOUNDS['lat_min']) &
            (chunk['Latitude'] <= CA_BOUNDS['lat_max']) &
            (chunk['Longitude'] >= CA_BOUNDS['lng_min']) &
            (chunk['Longitude'] <= CA_BOUNDS['lng_max'])
        )
        chunk_ca = chunk[mask_ca]

        if len(chunk_ca) == 0:
            continue

        # Filtrar por fecha si se especificó
        if cutoff_date:
            chunk_ca['Date GMT'] = pd.to_datetime(chunk_ca['Date GMT'])
            chunk_ca = chunk_ca[chunk_ca['Date GMT'] >= cutoff_date]

        if len(chunk_ca) == 0:
            continue

        chunks.append(chunk_ca)
        print(f"   ✓ Chunk procesado: {len(chunk_ca):,} registros de California")

    if not chunks:
        print(f"   ❌ No se encontraron datos de California en {filepath.name}")
        return None

    # Combinar todos los chunks
    df = pd.concat(chunks, ignore_index=True)
    print(f"   ✓ Total California: {len(df):,} registros")

    # Redondear coordenadas para agrupar ubicaciones cercanas
    df['lat_round'] = df['Latitude'].round(COORD_PRECISION)
    df['lng_round'] = df['Longitude'].round(COORD_PRECISION)

    # Crear timestamp combinando Date GMT + Time GMT
    df['timestamp'] = pd.to_datetime(
        df['Date GMT'] + ' ' + df['Time GMT'].astype(str).str.zfill(4),
        format='%Y-%m-%d %H%M'
    )

    # Truncar a hora completa (sin minutos)
    df['hour'] = df['timestamp'].dt.floor('h')

    # Calcular AQI según el contaminante
    if pollutant == 'NO2':
        df['aqi'] = df['Sample Measurement'].apply(calculate_aqi_no2)
    elif pollutant == 'O3':
        df['aqi'] = df['Sample Measurement'].apply(calculate_aqi_o3)
    elif pollutant == 'PM25':
        df['aqi'] = df['Sample Measurement'].apply(calculate_aqi_pm25)

    # Agregar por (lat_round, lng_round, hour)
    print(f"   🔄 Agregando por ubicación y hora...")

    agg_data = df.groupby(['lat_round', 'lng_round', 'hour']).agg({
        'Sample Measurement': ['mean', 'min', 'max', 'count'],
        'aqi': ['mean', 'min', 'max']
    }).reset_index()

    # Aplanar columnas multi-nivel
    agg_data.columns = ['lat', 'lng', 'timestamp',
                        f'{pollutant.lower()}_avg', f'{pollutant.lower()}_min', f'{pollutant.lower()}_max', 'samples_count',
                        'aqi_avg', 'aqi_min', 'aqi_max']

    print(f"   ✓ Agregado a {len(agg_data):,} registros únicos")

    return agg_data

def merge_pollutants(no2_df, o3_df, pm25_df):
    """Combina datos de los 3 contaminantes en un solo DataFrame"""
    print(f"\n🔀 Combinando datos de contaminantes...")

    # Empezar con el dataframe que tenga más registros como base
    dfs = []
    if no2_df is not None:
        dfs.append(('NO2', no2_df))
    if o3_df is not None:
        dfs.append(('O3', o3_df))
    if pm25_df is not None:
        dfs.append(('PM25', pm25_df))

    if not dfs:
        raise ValueError("No hay datos para procesar")

    # Usar outer join para tener todas las ubicaciones y horas
    result = None
    for name, df in dfs:
        if result is None:
            result = df
        else:
            result = result.merge(
                df,
                on=['lat', 'lng', 'timestamp'],
                how='outer',
                suffixes=('', f'_{name}')
            )

    # Calcular AQI general (el peor de los 3)
    aqi_cols = []
    if 'aqi_avg' in result.columns:
        aqi_cols.append('aqi_avg')
    if 'aqi_avg_O3' in result.columns:
        aqi_cols.append('aqi_avg_O3')
    if 'aqi_avg_PM25' in result.columns:
        aqi_cols.append('aqi_avg_PM25')

    if aqi_cols:
        result['aqi_general_avg'] = result[aqi_cols].max(axis=1)
        result['aqi_general_min'] = result[[c.replace('avg', 'min') for c in aqi_cols]].min(axis=1)
        result['aqi_general_max'] = result[[c.replace('avg', 'max') for c in aqi_cols]].max(axis=1)

    # Determinar contaminante dominante
    def get_dominant_pollutant(row):
        max_aqi = row['aqi_general_avg']
        if pd.isna(max_aqi):
            return None

        if 'aqi_avg' in row and row['aqi_avg'] == max_aqi:
            return 'NO2'
        elif 'aqi_avg_O3' in row and row['aqi_avg_O3'] == max_aqi:
            return 'O3'
        elif 'aqi_avg_PM25' in row and row['aqi_avg_PM25'] == max_aqi:
            return 'PM25'
        return None

    result['dominant_pollutant'] = result.apply(get_dominant_pollutant, axis=1)

    print(f"   ✓ Combinado: {len(result):,} registros totales")

    return result

def aggregate_to_daily(hourly_df):
    """Agrega datos horarios a diarios"""
    print(f"\n📅 Agregando a datos diarios...")

    hourly_df['date'] = pd.to_datetime(hourly_df['timestamp']).dt.date

    # Definir función para categorizar horas por AQI
    def categorize_hours(group):
        aqi_avg = group['aqi_general_avg']
        return pd.Series({
            'good_hours': (aqi_avg <= 50).sum(),
            'moderate_hours': ((aqi_avg > 50) & (aqi_avg <= 100)).sum(),
            'unhealthy_sensitive_hours': ((aqi_avg > 100) & (aqi_avg <= 150)).sum(),
            'unhealthy_hours': ((aqi_avg > 150) & (aqi_avg <= 200)).sum(),
            'very_unhealthy_hours': ((aqi_avg > 200) & (aqi_avg <= 300)).sum(),
            'hazardous_hours': (aqi_avg > 300).sum()
        })

    daily_agg = hourly_df.groupby(['lat', 'lng', 'date']).agg({
        'aqi_general_avg': ['mean', 'min', 'max'],
        'no2_avg': 'mean',
        'o3_avg': 'mean',
        'pm25_avg': 'mean',
        'samples_count': 'sum',
        'dominant_pollutant': lambda x: x.mode()[0] if len(x.mode()) > 0 else None
    }).reset_index()

    # Aplanar columnas
    daily_agg.columns = ['lat', 'lng', 'date',
                        'aqi_avg', 'aqi_min', 'aqi_max',
                        'no2_avg', 'o3_avg', 'pm25_avg',
                        'samples_count', 'dominant_pollutant']

    # Agregar categorización de horas
    hour_cats = hourly_df.groupby(['lat', 'lng', 'date']).apply(categorize_hours).reset_index()
    daily_agg = daily_agg.merge(hour_cats, on=['lat', 'lng', 'date'], how='left')

    print(f"   ✓ Agregado a {len(daily_agg):,} registros diarios")

    return daily_agg

# ============================================================================
# MAIN
# ============================================================================

def main():
    parser = argparse.ArgumentParser(description='Agrega datos históricos de EPA')
    parser.add_argument('--days', type=int, default=None, help='Número de días a procesar (default: todos)')
    parser.add_argument('--year', type=str, default='2025-ene-jun',
                       choices=['2024-full', '2025-ene-jun'],
                       help='Qué dataset usar')
    args = parser.parse_args()

    print("=" * 60)
    print("🏭 Agregador de Datos Históricos EPA → AQI")
    print("=" * 60)

    epa_path = EPA_DIR / args.year

    if not epa_path.exists():
        print(f"❌ No existe el directorio: {epa_path}")
        print(f"   Datasets disponibles:")
        for d in EPA_DIR.iterdir():
            if d.is_dir():
                print(f"   - {d.name}")
        sys.exit(1)

    # Procesar cada contaminante
    no2_df = None
    o3_df = None
    pm25_df = None

    if (epa_path / 'no2.csv').exists():
        no2_df = process_csv(epa_path / 'no2.csv', 'NO2', args.days)

    if (epa_path / 'o3.csv').exists():
        o3_df = process_csv(epa_path / 'o3.csv', 'O3', args.days)

    if (epa_path / 'pm25.csv').exists():
        pm25_df = process_csv(epa_path / 'pm25.csv', 'PM25', args.days)

    # Combinar todos
    merged_df = merge_pollutants(no2_df, o3_df, pm25_df)

    # Agregar a diario también
    daily_df = aggregate_to_daily(merged_df)

    # Guardar como JSON
    OUTPUT_FILE.parent.mkdir(parents=True, exist_ok=True)

    output_data = {
        'metadata': {
            'generated_at': datetime.now().isoformat(),
            'dataset': args.year,
            'days_limit': args.days,
            'california_bounds': CA_BOUNDS,
            'coord_precision': COORD_PRECISION
        },
        'hourly': {
            'count': len(merged_df),
            'data': merged_df.to_dict('records')
        },
        'daily': {
            'count': len(daily_df),
            'data': daily_df.to_dict('records')
        }
    }

    # Convertir timestamps y dates a strings
    for record in output_data['hourly']['data']:
        if pd.notna(record.get('timestamp')):
            record['timestamp'] = pd.Timestamp(record['timestamp']).isoformat()

    for record in output_data['daily']['data']:
        if pd.notna(record.get('date')):
            record['date'] = str(record['date'])

    print(f"\n💾 Guardando resultados en {OUTPUT_FILE}...")
    with open(OUTPUT_FILE, 'w') as f:
        json.dump(output_data, f, indent=2, default=str)

    file_size_mb = OUTPUT_FILE.stat().st_size / (1024 * 1024)
    print(f"   ✓ Guardado: {file_size_mb:.2f} MB")

    print("\n" + "=" * 60)
    print("✅ COMPLETADO")
    print("=" * 60)
    print(f"📊 Resumen:")
    print(f"   Registros horarios: {len(merged_df):,}")
    print(f"   Registros diarios: {len(daily_df):,}")
    print(f"   Archivo: {OUTPUT_FILE}")
    print(f"   Tamaño: {file_size_mb:.2f} MB")
    print("\n💡 Siguiente paso:")
    print(f"   pnpm --filter=@atmos/database seed:history")
    print("=" * 60)

if __name__ == '__main__':
    main()

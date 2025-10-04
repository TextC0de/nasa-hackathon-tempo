#!/usr/bin/env python3
"""
Extrae grid completo de NO2 column density desde archivos TEMPO NetCDF/HDF5

A diferencia de extract-tempo-no2-h5py.py que extrae un solo punto interpolado,
este script extrae TODAS las celdas dentro de un radius, retornando el grid completo.

Esto es crucial para forecasting porque:
1. Podemos hacer advección del grid completo (mover todas las celdas con el viento)
2. No perdemos resolución espacial
3. Aprovechamos los ~500x550 pixeles de TEMPO

Uso:
    python extract-tempo-grid-h5py.py <netcdf_file> <center_lat> <center_lon> <radius_km>

Ejemplo:
    python extract-tempo-grid-h5py.py TEMPO_NO2_L3.nc 34.05 -118.24 50
    # Extrae grid de 50km radius alrededor de Los Angeles
"""

import sys
import json
import h5py
import numpy as np
from datetime import datetime
from pathlib import Path

def extract_tempo_grid(
    nc_file: str,
    center_lat: float,
    center_lon: float,
    radius_km: float = 50
):
    """
    Extrae grid completo de NO2 column density desde archivo TEMPO

    Args:
        nc_file: Path al archivo NetCDF/HDF5
        center_lat: Latitud del centro del área de interés
        center_lon: Longitud del centro del área de interés
        radius_km: Radio en km alrededor del centro

    Returns:
        Dict con grid de celdas y metadata
    """
    try:
        with h5py.File(nc_file, 'r') as f:
            # Paths posibles para lat/lon en archivos TEMPO
            possible_lat_paths = [
                'geolocation/latitude',
                'latitude',
                'lat',
                'Latitude'
            ]

            possible_lon_paths = [
                'geolocation/longitude',
                'longitude',
                'lon',
                'Longitude'
            ]

            possible_no2_paths = [
                'product/vertical_column_troposphere',
                'vertical_column_troposphere',
                'no2_column',
                'nitrogen_dioxide_tropospheric_column',
                'NO2'
            ]

            # Encontrar datasets
            lat_data = None
            for path in possible_lat_paths:
                if path in f:
                    lat_data = f[path][:]
                    break

            lon_data = None
            for path in possible_lon_paths:
                if path in f:
                    lon_data = f[path][:]
                    break

            no2_data = None
            no2_path = None
            for path in possible_no2_paths:
                if path in f:
                    no2_data = f[path][:]
                    no2_path = path
                    break

            if lat_data is None or lon_data is None:
                return {
                    "error": "No se encontraron datasets de lat/lon",
                    "datasets": list(f.keys())
                }

            if no2_data is None:
                return {
                    "error": "No se encontró dataset de NO2",
                    "datasets": list(f.keys())
                }

            # Manejar diferentes dimensiones de NO2 data
            # A veces viene como (time, lat, lon) o (lat, lon, level)
            if len(no2_data.shape) > 2:
                # Tomar primer slice si es 3D
                no2_data = no2_data[0] if no2_data.shape[0] < no2_data.shape[-1] else no2_data[:,:,0]

            # Extraer celdas del grid
            cells = []

            # Grid regular (1D lat, 1D lon)
            if lat_data.ndim == 1 and lon_data.ndim == 1:
                for i in range(len(lat_data)):
                    for j in range(len(lon_data)):
                        lat = float(lat_data[i])
                        lon = float(lon_data[j])

                        # Calcular distancia desde centro
                        dlat = lat - center_lat
                        dlon = lon - center_lon
                        dist_km = np.sqrt(dlat**2 + dlon**2) * 111

                        # Solo incluir celdas dentro del radius
                        if dist_km <= radius_km:
                            value = no2_data[i, j]

                            # Solo incluir valores válidos
                            if not np.isnan(value) and not np.isinf(value) and value > 0:
                                cells.append({
                                    'latitude': lat,
                                    'longitude': lon,
                                    'no2_column': float(value),
                                    'distance_from_center_km': float(dist_km)
                                })

            # Grid irregular (2D lat, 2D lon)
            else:
                for i in range(lat_data.shape[0]):
                    for j in range(lat_data.shape[1]):
                        lat = float(lat_data[i,j])
                        lon = float(lon_data[i,j])

                        # Calcular distancia desde centro
                        dlat = lat - center_lat
                        dlon = lon - center_lon
                        dist_km = np.sqrt(dlat**2 + dlon**2) * 111

                        # Solo incluir celdas dentro del radius
                        if dist_km <= radius_km:
                            value = no2_data[i,j]

                            # Solo incluir valores válidos
                            if not np.isnan(value) and not np.isinf(value) and value > 0:
                                cells.append({
                                    'latitude': lat,
                                    'longitude': lon,
                                    'no2_column': float(value),
                                    'distance_from_center_km': float(dist_km)
                                })

            if len(cells) == 0:
                return {
                    "error": "No se encontraron celdas válidas dentro del radius",
                    "center_lat": center_lat,
                    "center_lon": center_lon,
                    "radius_km": radius_km
                }

            # Calcular bounds del grid
            lats = [c['latitude'] for c in cells]
            lons = [c['longitude'] for c in cells]

            bounds = {
                'north': float(max(lats)),
                'south': float(min(lats)),
                'east': float(max(lons)),
                'west': float(min(lons))
            }

            # Estimar resolución promedio
            if len(cells) > 1:
                # Calcular distancias entre celdas cercanas
                sorted_cells = sorted(cells, key=lambda c: (c['latitude'], c['longitude']))
                distances = []
                for i in range(min(100, len(sorted_cells) - 1)):
                    c1 = sorted_cells[i]
                    c2 = sorted_cells[i + 1]
                    dlat = abs(c1['latitude'] - c2['latitude'])
                    dlon = abs(c1['longitude'] - c2['longitude'])
                    if dlat > 0:
                        distances.append(dlat)
                    if dlon > 0:
                        distances.append(dlon)

                resolution = float(np.median(distances)) if distances else 0.02
            else:
                resolution = 0.02  # Default ~2km

            # Extraer timestamp del filename
            filename = Path(nc_file).name
            timestamp_str = filename.split('_')[4]
            timestamp = datetime.strptime(timestamp_str, '%Y%m%dT%H%M%SZ')

            # Obtener units si está disponible
            try:
                units = f[no2_path].attrs.get('units', 'molecules/cm²')
                if isinstance(units, bytes):
                    units = units.decode('utf-8')
            except:
                units = 'molecules/cm²'

            # Estadísticas del grid
            no2_values = [c['no2_column'] for c in cells]
            stats = {
                'mean': float(np.mean(no2_values)),
                'median': float(np.median(no2_values)),
                'std': float(np.std(no2_values)),
                'min': float(np.min(no2_values)),
                'max': float(np.max(no2_values))
            }

            return {
                "success": True,
                "timestamp": timestamp.isoformat(),
                "file": filename,
                "center": {
                    "latitude": center_lat,
                    "longitude": center_lon
                },
                "radius_km": radius_km,
                "grid": {
                    "cells": cells,
                    "cell_count": len(cells),
                    "bounds": bounds,
                    "resolution_degrees": resolution
                },
                "units": units,
                "statistics": stats,
                "metadata": {
                    "no2_path": no2_path,
                    "grid_shape": list(no2_data.shape)
                }
            }

    except Exception as e:
        import traceback
        return {
            "error": str(e),
            "error_type": type(e).__name__,
            "traceback": traceback.format_exc()
        }

if __name__ == "__main__":
    if len(sys.argv) < 4:
        print(json.dumps({
            "error": "Uso: python extract-tempo-grid-h5py.py <netcdf_file> <center_lat> <center_lon> [radius_km]"
        }))
        sys.exit(1)

    nc_file = sys.argv[1]
    center_lat = float(sys.argv[2])
    center_lon = float(sys.argv[3])
    radius_km = float(sys.argv[4]) if len(sys.argv) > 4 else 50.0

    result = extract_tempo_grid(nc_file, center_lat, center_lon, radius_km)
    print(json.dumps(result, indent=2))

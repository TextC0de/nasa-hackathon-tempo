#!/usr/bin/env python3
"""
Extract NO2 column density from TEMPO NetCDF/HDF5 file using h5py

Usage:
    python extract-tempo-no2-h5py.py <netcdf_file> <latitude> <longitude>
"""

import sys
import json
import h5py
import numpy as np
from datetime import datetime
from pathlib import Path

def extract_no2_at_point(nc_file: str, target_lat: float, target_lon: float, radius_km: float = 50):
    """Extract NO2 column density using h5py"""
    try:
        with h5py.File(nc_file, 'r') as f:
            # List all datasets
            def print_structure(name, obj):
                if isinstance(obj, h5py.Dataset):
                    print(f"  Dataset: {name}, Shape: {obj.shape}, Dtype: {obj.dtype}")

            print("File structure:")
            f.visititems(print_structure)
            print()

            # Try to find lat/lon and NO2 data
            # Common structures in TEMPO files:
            # /geolocation/latitude
            # /geolocation/longitude
            # /product/vertical_column_troposphere

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

            # Find lat dataset
            lat_data = None
            for path in possible_lat_paths:
                if path in f:
                    lat_data = f[path][:]
                    print(f"Found latitude at: {path}")
                    break

            # Find lon dataset
            lon_data = None
            for path in possible_lon_paths:
                if path in f:
                    lon_data = f[path][:]
                    print(f"Found longitude at: {path}")
                    break

            # Find NO2 dataset
            no2_data = None
            no2_path = None
            for path in possible_no2_paths:
                if path in f:
                    no2_data = f[path][:]
                    no2_path = path
                    print(f"Found NO2 at: {path}")
                    break

            if lat_data is None or lon_data is None:
                return {
                    "error": "Could not find lat/lon datasets",
                    "datasets": list(f.keys())
                }

            if no2_data is None:
                return {
                    "error": "Could not find NO2 dataset",
                    "datasets": list(f.keys())
                }

            print(f"\nData shapes:")
            print(f"  lat: {lat_data.shape}")
            print(f"  lon: {lon_data.shape}")
            print(f"  NO2: {no2_data.shape}")

            # Handle different shapes
            if len(no2_data.shape) > 2:
                no2_data = no2_data[0] if no2_data.shape[0] < no2_data.shape[-1] else no2_data[:,:,0]

            # Find nearest points
            if lat_data.ndim == 1 and lon_data.ndim == 1:
                # Regular grid
                lat_idx = np.argmin(np.abs(lat_data - target_lat))
                lon_idx = np.argmin(np.abs(lon_data - target_lon))

                # Get surrounding points
                valid_values = []
                for i in range(max(0, lat_idx-2), min(len(lat_data), lat_idx+3)):
                    for j in range(max(0, lon_idx-2), min(len(lon_data), lon_idx+3)):
                        value = no2_data[i, j]
                        if not np.isnan(value) and not np.isinf(value) and value > 0:
                            dlat = lat_data[i] - target_lat
                            dlon = lon_data[j] - target_lon
                            dist_km = np.sqrt(dlat**2 + dlon**2) * 111

                            if dist_km <= radius_km:
                                valid_values.append({
                                    'value': float(value),
                                    'distance_km': float(dist_km),
                                    'lat': float(lat_data[i]),
                                    'lon': float(lon_data[j])
                                })
            else:
                # Irregular/2D grid
                valid_values = []
                for i in range(lat_data.shape[0]):
                    for j in range(lat_data.shape[1]):
                        dlat = lat_data[i,j] - target_lat
                        dlon = lon_data[i,j] - target_lon
                        dist_km = np.sqrt(dlat**2 + dlon**2) * 111

                        if dist_km <= radius_km:
                            value = no2_data[i,j]
                            if not np.isnan(value) and not np.isinf(value) and value > 0:
                                valid_values.append({
                                    'value': float(value),
                                    'distance_km': float(dist_km),
                                    'lat': float(lat_data[i,j]),
                                    'lon': float(lon_data[i,j])
                                })

            if len(valid_values) == 0:
                return {
                    "error": "No valid NO2 data within radius",
                    "target_lat": target_lat,
                    "target_lon": target_lon,
                    "radius_km": radius_km
                }

            # Sort by distance
            valid_values.sort(key=lambda x: x['distance_km'])
            closest = valid_values[0]

            # Weighted average
            weights = [1.0 / (v['distance_km'] + 0.1) for v in valid_values[:5]]
            total_weight = sum(weights)
            weighted_no2 = sum(v['value'] * w for v, w in zip(valid_values[:5], weights)) / total_weight

            # Extract timestamp from filename
            filename = Path(nc_file).name
            timestamp_str = filename.split('_')[4]
            timestamp = datetime.strptime(timestamp_str, '%Y%m%dT%H%M%SZ')

            # Get units if available
            try:
                units = f[no2_path].attrs.get('units', 'molecules/cm²')
                if isinstance(units, bytes):
                    units = units.decode('utf-8')
            except:
                units = 'molecules/cm²'

            return {
                "success": True,
                "no2_column": float(weighted_no2),
                "units": units,
                "timestamp": timestamp.isoformat(),
                "file": filename,
                "location": {
                    "target_lat": target_lat,
                    "target_lon": target_lon,
                    "closest_lat": closest['lat'],
                    "closest_lon": closest['lon'],
                    "distance_km": closest['distance_km']
                },
                "neighbors": valid_values[:5],
                "metadata": {
                    "no2_path": no2_path,
                    "grid_shape": list(no2_data.shape),
                    "valid_points_in_radius": len(valid_values)
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
            "error": "Usage: python extract-tempo-no2-h5py.py <netcdf_file> <latitude> <longitude> [radius_km]"
        }))
        sys.exit(1)

    nc_file = sys.argv[1]
    lat = float(sys.argv[2])
    lon = float(sys.argv[3])
    radius_km = float(sys.argv[4]) if len(sys.argv) > 4 else 50.0

    result = extract_no2_at_point(nc_file, lat, lon, radius_km)
    print(json.dumps(result, indent=2))

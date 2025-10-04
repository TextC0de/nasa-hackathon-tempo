#!/usr/bin/env python3
"""
Extract NO2 column density from TEMPO NetCDF file at a specific location

Usage:
    python extract-tempo-no2.py <netcdf_file> <latitude> <longitude>

Output:
    JSON with NO2 column density and metadata
"""

import sys
import json
import xarray as xr
import numpy as np
from datetime import datetime
from pathlib import Path

def extract_no2_at_point(nc_file: str, target_lat: float, target_lon: float, radius_km: float = 50):
    """
    Extract NO2 column density from TEMPO NetCDF at a specific location

    Uses nearest neighbor interpolation within radius_km
    """
    try:
        # Open NetCDF file
        ds = xr.open_dataset(nc_file)

        # Find NO2 column variable (different names possible)
        no2_var_names = [
            'vertical_column_troposphere',
            'nitrogen_dioxide_tropospheric_column',
            'no2_column',
            'NO2'
        ]

        no2_var = None
        for var_name in no2_var_names:
            if var_name in ds.variables:
                no2_var = var_name
                break

        if no2_var is None:
            # Try to find any variable with 'no2' in name
            for var in ds.variables:
                if 'no2' in var.lower() and len(ds[var].dims) >= 2:
                    no2_var = var
                    break

        if no2_var is None:
            return {
                "error": "NO2 variable not found",
                "available_variables": list(ds.variables.keys())
            }

        # Get lat/lon arrays
        lat_var = 'latitude' if 'latitude' in ds.variables else 'lat'
        lon_var = 'longitude' if 'longitude' in ds.variables else 'lon'

        lats = ds[lat_var].values
        lons = ds[lon_var].values
        no2_data = ds[no2_var].values

        # Handle different dimensions
        if len(no2_data.shape) > 2:
            # If 3D, take first time slice or layer
            no2_data = no2_data[0] if no2_data.shape[0] < no2_data.shape[-1] else no2_data[:,:,0]

        # Find nearest point using haversine distance
        if lats.ndim == 1 and lons.ndim == 1:
            # Regular grid
            lat_idx = np.argmin(np.abs(lats - target_lat))
            lon_idx = np.argmin(np.abs(lons - target_lon))

            # Get surrounding points for interpolation
            lat_indices = [max(0, lat_idx-2), max(0, lat_idx-1), lat_idx, min(len(lats)-1, lat_idx+1), min(len(lats)-1, lat_idx+2)]
            lon_indices = [max(0, lon_idx-2), max(0, lon_idx-1), lon_idx, min(len(lons)-1, lon_idx+1), min(len(lons)-1, lon_idx+2)]

            valid_values = []
            for i in lat_indices:
                for j in lon_indices:
                    value = no2_data[i, j]
                    if not np.isnan(value) and value > 0:
                        # Calculate distance
                        dlat = lats[i] - target_lat
                        dlon = lons[j] - target_lon
                        dist_km = np.sqrt(dlat**2 + dlon**2) * 111  # rough approximation

                        if dist_km <= radius_km:
                            valid_values.append({
                                'value': float(value),
                                'distance_km': float(dist_km),
                                'lat': float(lats[i]),
                                'lon': float(lons[j])
                            })

        else:
            # Irregular grid
            flat_lats = lats.flatten()
            flat_lons = lons.flatten()
            flat_no2 = no2_data.flatten()

            valid_values = []
            for i, (lat, lon, value) in enumerate(zip(flat_lats, flat_lons, flat_no2)):
                if not np.isnan(value) and value > 0:
                    dlat = lat - target_lat
                    dlon = lon - target_lon
                    dist_km = np.sqrt(dlat**2 + dlon**2) * 111

                    if dist_km <= radius_km:
                        valid_values.append({
                            'value': float(value),
                            'distance_km': float(dist_km),
                            'lat': float(lat),
                            'lon': float(lon)
                        })

        if len(valid_values) == 0:
            return {
                "error": "No valid NO2 data within radius",
                "target_lat": target_lat,
                "target_lon": target_lon,
                "radius_km": radius_km
            }

        # Sort by distance and get closest
        valid_values.sort(key=lambda x: x['distance_km'])
        closest = valid_values[0]

        # Calculate mean of nearest neighbors (inverse distance weighted)
        weights = [1.0 / (v['distance_km'] + 0.1) for v in valid_values[:5]]
        total_weight = sum(weights)
        weighted_no2 = sum(v['value'] * w for v, w in zip(valid_values[:5], weights)) / total_weight

        # Extract timestamp from filename
        filename = Path(nc_file).name
        # Format: TEMPO_NO2_L3_V03_20240110T141610Z_S003.nc
        timestamp_str = filename.split('_')[4]  # 20240110T141610Z
        timestamp = datetime.strptime(timestamp_str, '%Y%m%dT%H%M%SZ')

        # Get attributes
        no2_units = ds[no2_var].attrs.get('units', 'molecules/cm²')

        ds.close()

        return {
            "success": True,
            "no2_column": float(weighted_no2),
            "units": no2_units,
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
                "variable_name": no2_var,
                "grid_shape": list(no2_data.shape),
                "valid_points_in_radius": len(valid_values)
            }
        }

    except Exception as e:
        return {
            "error": str(e),
            "error_type": type(e).__name__
        }

if __name__ == "__main__":
    if len(sys.argv) < 4:
        print(json.dumps({
            "error": "Usage: python extract-tempo-no2.py <netcdf_file> <latitude> <longitude> [radius_km]"
        }))
        sys.exit(1)

    nc_file = sys.argv[1]
    lat = float(sys.argv[2])
    lon = float(sys.argv[3])
    radius_km = float(sys.argv[4]) if len(sys.argv) > 4 else 50.0

    result = extract_no2_at_point(nc_file, lat, lon, radius_km)
    print(json.dumps(result, indent=2))

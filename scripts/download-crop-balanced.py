#!/usr/bin/env python3
"""
download-crop-balanced.py

Downloads TEMPO NetCDF and crops to California bbox on-the-fly.
Uses balanced 60-day dataset following ML best practices.

Features:
- Standalone script with hardcoded strategic days
- Checks existing files in cropped/ directory
- Downloads only missing files
- Crops on-the-fly (saves 96% space)
- Real-time statistics

Requirements:
  pip install h5py numpy requests

Usage:
  python3 scripts/download-crop-balanced.py
"""

import os
import sys
import json
import time
import h5py
import numpy as np
import requests
from pathlib import Path
from typing import Tuple, Dict, Set, List
from datetime import datetime

# ============================================================================
# CONFIG
# ============================================================================

CONFIG = {
    'token': 'eyJ0eXAiOiJKV1QiLCJvcmlnaW4iOiJFYXJ0aGRhdGEgTG9naW4iLCJzaWciOiJlZGxqd3RwdWJrZXlfb3BzIiwiYWxnIjoiUlMyNTYifQ.eyJ0eXBlIjoiVXNlciIsInVpZCI6InRleHRjb2RlIiwiZXhwIjoxNzY0NTQ3MTk5LCJpYXQiOjE3NTkyODcwOTYsImlzcyI6Imh0dHBzOi8vdXJzLmVhcnRoZGF0YS5uYXNhLmdvdiIsImlkZW50aXR5X3Byb3ZpZGVyIjoiZWRsX29wcyIsImFjciI6ImVkbCIsImFzc3VyYW5jZV9sZXZlbCI6M30.1bVH1D8nS37CdpEI00oCqxSyq4Hr_7Q9rhYomJQy1h8uEAZU-zP2R6TSN9LElB1R1m4824zoY48xcYgmXf_9PVDNJxhty4JnF1AHjyQl_6V5QSCFOX0m_kXF3hPXZ9tsKehSNkdn6bi-rN9VNrbSKkpgtP8adwFCHo5Qjlx0u0vJ2QsQ6cjB2rIVP7ksDqpmcQn3XhwZdQUGMdjv93ikwuVbpwvAd1rl_YixUqWRqjYL4YyVkotEaGWDUakk2NSe4UrocE4VKBO4xHIInehudG8iw6HToAZlBOgQe0OafjOPu5jbNu_jnaXor31AFRMr0VKWfF8hiBOki4sTiNMc7g',

    'cmr_api': 'https://cmr.earthdata.nasa.gov/search/granules.json',
    'collection_id': 'C2930763263-LARC_CLOUD',  # TEMPO NO2 L3 V03

    'california_bbox': {
        'lon_min': -125.0,
        'lat_min': 32.0,
        'lon_max': -114.0,
        'lat_max': 42.0,
    },

    'output_dir': 'scripts/data/tempo/california/cropped',
    'temp_dir': 'scripts/data/tempo/california/temp',
}

# ============================================================================
# BALANCED DATASET STRATEGY (60 DAYS)
# ============================================================================

STRATEGIC_DAYS = {
    'winter': [
        '2024-01-10', '2024-01-17', '2024-01-24',
        '2024-02-07', '2024-02-14', '2024-02-21',
        '2024-12-05', '2024-12-12', '2024-12-19',
        '2025-01-08',
    ],
    'spring': [
        '2024-03-06', '2024-03-20',
        '2024-04-10', '2024-04-24',
        '2024-05-08', '2024-05-22',
        '2025-02-12', '2025-03-15',
    ],
    'summer_normal': [
        '2024-06-05', '2024-06-12', '2024-06-19', '2024-06-26',
        '2024-07-03', '2024-07-10', '2024-07-17',
        '2024-09-04', '2024-09-11', '2024-09-18', '2024-09-25',
        '2025-06-18',
    ],
    'fall': [
        '2024-10-02', '2024-10-09', '2024-10-16', '2024-10-23',
        '2024-11-06', '2024-11-13', '2024-11-20', '2024-11-27',
        '2025-09-10', '2025-09-24', '2025-10-08', '2025-10-22',
    ],
    'park_fire': [
        '2024-07-24', '2024-07-28', '2024-07-31',
        '2024-08-03', '2024-08-07',
        '2024-08-14', '2024-08-25',
    ],
    'other_fires': [
        '2024-08-18', '2024-09-05', '2025-07-20',
    ],
    'marine_layer': [
        '2024-01-28', '2024-06-08',
    ],
    'santa_ana': [
        '2024-09-12', '2024-10-15',
    ],
    'precipitation': [
        '2024-02-25', '2024-11-10',
    ],
    'urban_spikes': [
        '2024-07-04', '2024-11-28',
    ],
}

# Flatten all days
ALL_DAYS = sorted([
    *STRATEGIC_DAYS['winter'],
    *STRATEGIC_DAYS['spring'],
    *STRATEGIC_DAYS['summer_normal'],
    *STRATEGIC_DAYS['fall'],
    *STRATEGIC_DAYS['park_fire'],
    *STRATEGIC_DAYS['other_fires'],
    *STRATEGIC_DAYS['marine_layer'],
    *STRATEGIC_DAYS['santa_ana'],
    *STRATEGIC_DAYS['precipitation'],
    *STRATEGIC_DAYS['urban_spikes'],
])

# ============================================================================
# UTILS
# ============================================================================

def format_size(bytes: int) -> str:
    for unit in ['B', 'KB', 'MB', 'GB']:
        if bytes < 1024:
            return f"{bytes:.1f} {unit}"
        bytes /= 1024
    return f"{bytes:.1f} TB"

def query_cmr_for_day(day: str) -> List[str]:
    """Query CMR API for TEMPO granules on a specific day."""
    date = datetime.strptime(day, '%Y-%m-%d')
    start_time = date.replace(hour=0, minute=0, second=0).isoformat() + 'Z'
    end_time = date.replace(hour=23, minute=59, second=59).isoformat() + 'Z'

    bbox = CONFIG['california_bbox']
    bbox_str = f"{bbox['lon_min']},{bbox['lat_min']},{bbox['lon_max']},{bbox['lat_max']}"

    params = {
        'collection_concept_id': CONFIG['collection_id'],
        'temporal': f"{start_time},{end_time}",
        'bounding_box': bbox_str,
        'page_size': 2000,
    }

    try:
        response = requests.get(CONFIG['cmr_api'], params=params, timeout=30)
        response.raise_for_status()
        data = response.json()

        urls = []
        for entry in data.get('feed', {}).get('entry', []):
            for link in entry.get('links', []):
                if link.get('rel') == 'http://esipfed.org/ns/fedsearch/1.1/data#':
                    url = link.get('href', '')
                    if url.endswith('.nc'):
                        urls.append(url)

        return urls

    except Exception as e:
        print(f"Warning: CMR query failed for {day}: {e}")
        return []

def find_bbox_indices(coords: np.ndarray, min_val: float, max_val: float) -> Tuple[int, int]:
    mask = (coords >= min_val) & (coords <= max_val)
    indices = np.where(mask)[0]
    if len(indices) == 0:
        raise ValueError(f"No coordinates in range [{min_val}, {max_val}]")
    return int(indices[0]), int(indices[-1] + 1)

def get_existing_files() -> Set[str]:
    """Get set of already downloaded/cropped files."""
    existing = set()

    # Check cropped directory
    cropped_dir = Path(CONFIG['output_dir'])
    if cropped_dir.exists():
        for file in cropped_dir.glob('*.nc'):
            existing.add(file.name)

    # Also check main california directory for already cropped files
    main_dir = Path('scripts/data/tempo/california')
    if main_dir.exists():
        for file in main_dir.glob('*.nc'):
            # Check if it's already cropped (small file size)
            if file.stat().st_size < 100 * 1024 * 1024:  # Less than 100 MB
                existing.add(file.name)

    return existing

# ============================================================================
# DOWNLOAD
# ============================================================================

def download_file(url: str, output_path: str) -> int:
    headers = {'Authorization': f'Bearer {CONFIG["token"]}'}
    response = requests.get(url, headers=headers, stream=True)
    response.raise_for_status()

    total_size = 0
    with open(output_path, 'wb') as f:
        for chunk in response.iter_content(chunk_size=8192):
            if chunk:
                f.write(chunk)
                total_size += len(chunk)
    return total_size

# ============================================================================
# CROP
# ============================================================================

def crop_netcdf(input_path: str, output_path: str) -> Tuple[int, int, Dict]:
    original_size = os.path.getsize(input_path)
    bbox = CONFIG['california_bbox']

    with h5py.File(input_path, 'r') as src:
        lats = src['latitude'][:]
        lons = src['longitude'][:]

        lat_start, lat_end = find_bbox_indices(lats, bbox['lat_min'], bbox['lat_max'])
        lon_start, lon_end = find_bbox_indices(lons, bbox['lon_min'], bbox['lon_max'])

        stats = {
            'original_shape': (len(lats), len(lons)),
            'cropped_shape': (lat_end - lat_start, lon_end - lon_start),
        }

        with h5py.File(output_path, 'w') as dst:
            dst.create_dataset('latitude', data=lats[lat_start:lat_end])
            dst.create_dataset('longitude', data=lons[lon_start:lon_end])

            if 'time' in src:
                dst.create_dataset('time', data=src['time'][:])

            def copy_dataset(name, obj):
                if isinstance(obj, h5py.Dataset) and name not in ['latitude', 'longitude', 'time']:
                    if obj.ndim == 3 and obj.shape[1:] == (len(lats), len(lons)):
                        cropped_data = obj[:, lat_start:lat_end, lon_start:lon_end]
                        dst.create_dataset(name, data=cropped_data, compression='gzip', compression_opts=4)
                    elif obj.ndim == 2 and obj.shape == (len(lats), len(lons)):
                        cropped_data = obj[lat_start:lat_end, lon_start:lon_end]
                        dst.create_dataset(name, data=cropped_data, compression='gzip', compression_opts=4)
                    else:
                        dst.create_dataset(name, data=obj[:])

                    for attr_name, attr_value in obj.attrs.items():
                        dst[name].attrs[attr_name] = attr_value

            src.visititems(copy_dataset)

            for attr_name, attr_value in src.attrs.items():
                dst.attrs[attr_name] = attr_value

            dst.attrs['cropped_to_california'] = True
            dst.attrs['california_bbox'] = f"{bbox['lon_min']},{bbox['lat_min']},{bbox['lon_max']},{bbox['lat_max']}"

    cropped_size = os.path.getsize(output_path)
    return original_size, cropped_size, stats

# ============================================================================
# MAIN
# ============================================================================

def main():
    Path(CONFIG['output_dir']).mkdir(parents=True, exist_ok=True)
    Path(CONFIG['temp_dir']).mkdir(parents=True, exist_ok=True)

    # Get existing files
    existing_files = get_existing_files()

    print('\n' + '='*70)
    print('TEMPO Download + Crop - Balanced 60-Day Dataset (Standalone)')
    print('='*70)
    print(f'\nStrategic days: {len(ALL_DAYS)}')
    print(f'Already downloaded: {len(existing_files)} files')
    print(f'\nOutput: {CONFIG["output_dir"]}')
    print(f'California bbox: {CONFIG["california_bbox"]}')
    print('\n🔍 Querying CMR API for download URLs...\n')

    # Query CMR API for all URLs
    urls = []
    for i, day in enumerate(ALL_DAYS, 1):
        print(f'  [{i}/{len(ALL_DAYS)}] {day}... ', end='', flush=True)
        day_urls = query_cmr_for_day(day)
        urls.extend(day_urls)
        print(f'{len(day_urls)} granules')
        time.sleep(0.5)  # Be nice to CMR API

    print(f'\n✓ Found {len(urls)} total granules')
    print(f'  To download: {len(urls) - len(existing_files)}\n')

    total_original = 0
    total_cropped = 0
    successful = 0
    failed = 0
    skipped = 0

    start_time = time.time()

    for i, url in enumerate(urls, 1):
        filename = os.path.basename(url)
        temp_path = os.path.join(CONFIG['temp_dir'], filename)
        output_path = os.path.join(CONFIG['output_dir'], filename)

        # Skip if already exists
        if filename in existing_files:
            print(f"[{i}/{len(urls)}] ⏭️  Skip (exists): {filename}")
            skipped += 1
            continue

        print(f"[{i}/{len(urls)}] 📥 Downloading: {filename}")

        try:
            # Download
            dl_size = download_file(url, temp_path)
            print(f"           ✓ Downloaded: {format_size(dl_size)}")

            # Crop
            print(f"           ✂️  Cropping...")
            orig_size, crop_size, stats = crop_netcdf(temp_path, output_path)

            reduction = (1 - crop_size/orig_size) * 100
            print(f"           ✓ Cropped: {format_size(crop_size)} ({reduction:.1f}% reduction)")

            # Cleanup
            os.remove(temp_path)

            total_original += orig_size
            total_cropped += crop_size
            successful += 1

            # Running stats every 10 files
            if i % 10 == 0:
                print(f"\n           📊 Running totals:")
                print(f"              Downloaded: {successful}, Skipped: {skipped}")
                print(f"              Cropped size: {format_size(total_cropped)}")
                if total_original > 0:
                    print(f"              Space saved: {format_size(total_original - total_cropped)} ({(1-total_cropped/total_original)*100:.1f}%)")
                print()

        except Exception as e:
            print(f"           ❌ Error: {e}")
            failed += 1
            if os.path.exists(temp_path):
                os.remove(temp_path)

    # Final stats
    elapsed = time.time() - start_time

    print('\n' + '='*70)
    print('FINAL STATISTICS')
    print('='*70)
    print(f'\n✅ Successful: {successful}')
    print(f'⏭️  Skipped:    {skipped}')
    print(f'❌ Failed:     {failed}')

    if successful > 0:
        print(f'\n💾 Storage:')
        print(f'   Cropped size: {format_size(total_cropped)}')
        print(f'   Space saved:  {format_size(total_original - total_cropped)} ({(1-total_cropped/total_original)*100:.1f}%)')
        print(f'   Avg per file: {format_size(total_cropped / successful)}')

        # Estimate total
        total_files = successful + skipped
        if total_files > 0:
            avg_size = total_cropped / successful
            estimated_total = len(urls) * avg_size
            print(f'\n🔮 Estimated total for all {len(urls)} files: {format_size(estimated_total)}')

    print(f'\n⏱️  Time: {elapsed/60:.1f} minutes')
    print(f'📁 Output: {CONFIG["output_dir"]}')
    print('='*70 + '\n')

if __name__ == '__main__':
    try:
        main()
    except KeyboardInterrupt:
        print('\n⚠️  Interrupted by user.')
        sys.exit(0)
    except Exception as e:
        print(f'\n❌ Error: {e}')
        import traceback
        traceback.print_exc()
        sys.exit(1)

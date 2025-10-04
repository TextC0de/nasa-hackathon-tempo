/**
 * TEMPO NetCDF loader
 * Reads real NO2 column density from TEMPO satellite NetCDF files
 */

import { execSync } from 'child_process';
import { existsSync, readdirSync } from 'fs';
import { join } from 'path';

export interface TEMPOData {
  success: boolean;
  no2_column: number; // molecules/cm²
  units: string;
  timestamp: Date;
  file: string;
  location: {
    target_lat: number;
    target_lon: number;
    closest_lat: number;
    closest_lon: number;
    distance_km: number;
  };
  neighbors: Array<{
    value: number;
    distance_km: number;
    lat: number;
    lon: number;
  }>;
  metadata: {
    no2_path: string;
    grid_shape: number[];
    valid_points_in_radius: number;
  };
  error?: string;
}

/**
 * Find TEMPO NetCDF file closest to a given timestamp
 */
export function findClosestTEMPOFile(
  timestamp: Date,
  tempoDir: string
): string | null {
  if (!existsSync(tempoDir)) {
    return null;
  }

  const files = readdirSync(tempoDir).filter(f => f.endsWith('.nc'));

  if (files.length === 0) {
    return null;
  }

  // Parse timestamps from filenames
  // Format: TEMPO_NO2_L3_V03_20240110T151610Z_S004.nc
  const filesWithTime = files.map(file => {
    const match = file.match(/(\d{8}T\d{6}Z)/);
    if (!match) return null;

    const timeStr = match[1];
    const fileTime = new Date(
      timeStr.substring(0, 4) + '-' +
      timeStr.substring(4, 6) + '-' +
      timeStr.substring(6, 11) + ':' +
      timeStr.substring(11, 13) + ':' +
      timeStr.substring(13, 15) + 'Z'
    );

    return {
      file,
      time: fileTime,
      delta: Math.abs(fileTime.getTime() - timestamp.getTime())
    };
  }).filter(x => x !== null) as Array<{file: string; time: Date; delta: number}>;

  if (filesWithTime.length === 0) {
    return null;
  }

  // Sort by delta and return closest
  filesWithTime.sort((a, b) => a.delta - b.delta);
  return join(tempoDir, filesWithTime[0].file);
}

/**
 * Load TEMPO NO2 data for a specific location
 * Calls Python script to extract data from NetCDF file
 */
export function loadTEMPOData(
  ncFile: string,
  latitude: number,
  longitude: number,
  radiusKm: number = 50
): TEMPOData {
  if (!existsSync(ncFile)) {
    return {
      success: false,
      no2_column: 0,
      units: 'molecules/cm²',
      timestamp: new Date(),
      file: ncFile,
      location: {
        target_lat: latitude,
        target_lon: longitude,
        closest_lat: 0,
        closest_lon: 0,
        distance_km: 0
      },
      neighbors: [],
      metadata: {
        no2_path: '',
        grid_shape: [],
        valid_points_in_radius: 0
      },
      error: `File not found: ${ncFile}`
    };
  }

  try {
    // Find Python script
    const scriptPath = join(process.cwd(), 'scripts/extract-tempo-no2-h5py.py');

    if (!existsSync(scriptPath)) {
      throw new Error(`Python script not found: ${scriptPath}`);
    }

    // Call Python script
    const command = `python3 "${scriptPath}" "${ncFile}" ${latitude} ${longitude} ${radiusKm}`;
    const output = execSync(command, {
      encoding: 'utf-8',
      maxBuffer: 10 * 1024 * 1024 // 10MB buffer
    });

    // Parse JSON output
    const result = JSON.parse(output);

    if (result.error) {
      return {
        success: false,
        no2_column: 0,
        units: 'molecules/cm²',
        timestamp: new Date(),
        file: ncFile,
        location: {
          target_lat: latitude,
          target_lon: longitude,
          closest_lat: 0,
          closest_lon: 0,
          distance_km: 0
        },
        neighbors: [],
        metadata: {
          no2_path: '',
          grid_shape: [],
          valid_points_in_radius: 0
        },
        error: result.error
      };
    }

    return {
      ...result,
      timestamp: new Date(result.timestamp),
      success: true
    };

  } catch (error) {
    const err = error as Error;
    return {
      success: false,
      no2_column: 0,
      units: 'molecules/cm²',
      timestamp: new Date(),
      file: ncFile,
      location: {
        target_lat: latitude,
        target_lon: longitude,
        closest_lat: 0,
        closest_lon: 0,
        distance_km: 0
      },
      neighbors: [],
      metadata: {
        no2_path: '',
        grid_shape: [],
        valid_points_in_radius: 0
      },
      error: err.message
    };
  }
}

/**
 * Load TEMPO data for a specific timestamp and location
 * Automatically finds the closest file
 */
export function loadTEMPODataAtTime(
  timestamp: Date,
  latitude: number,
  longitude: number,
  tempoDir: string,
  radiusKm: number = 50
): TEMPOData | null {
  const ncFile = findClosestTEMPOFile(timestamp, tempoDir);

  if (!ncFile) {
    return null;
  }

  return loadTEMPOData(ncFile, latitude, longitude, radiusKm);
}

/**
 * Get all available TEMPO file timestamps
 */
export function getAvailableTEMPOTimestamps(tempoDir: string): Date[] {
  if (!existsSync(tempoDir)) {
    return [];
  }

  const files = readdirSync(tempoDir).filter(f => f.endsWith('.nc'));

  const timestamps = files.map(file => {
    const match = file.match(/(\d{8}T\d{6}Z)/);
    if (!match) return null;

    const timeStr = match[1];
    return new Date(
      timeStr.substring(0, 4) + '-' +
      timeStr.substring(4, 6) + '-' +
      timeStr.substring(6, 11) + ':' +
      timeStr.substring(11, 13) + ':' +
      timeStr.substring(13, 15) + 'Z'
    );
  }).filter(t => t !== null) as Date[];

  timestamps.sort((a, b) => a.getTime() - b.getTime());
  return timestamps;
}

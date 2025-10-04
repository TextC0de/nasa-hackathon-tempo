/**
 * EPA ground station data loader
 * Reads CSV files from EPA Air Quality System
 */

import { readFileSync, createReadStream } from 'fs';
import { parse } from 'date-fns';
import { createInterface } from 'readline';
import type { GroundMeasurement } from '../types';

/**
 * EPA CSV row structure (for documentation)
 *
 * interface EPARow {
 *   'State Code': string;
 *   'County Code': string;
 *   'Site Num': string;
 *   'Parameter Code': string;
 *   POC: string;
 *   Latitude: string;
 *   Longitude: string;
 *   Datum: string;
 *   'Parameter Name': string;
 *   'Date Local': string;
 *   'Time Local': string;
 *   'Date GMT': string;
 *   'Time GMT': string;
 *   'Sample Measurement': string;
 *   'Units of Measure': string;
 *   MDL: string;
 *   Uncertainty: string;
 *   Qualifier: string;
 *   'Method Type': string;
 *   'Method Code': string;
 *   'Method Name': string;
 *   'State Name': string;
 *   'County Name': string;
 *   'Date of Last Change': string;
 * }
 */

/**
 * Parse EPA CSV line
 */
function parseCSVLine(line: string): string[] {
  const result: string[] = [];
  let current = '';
  let inQuotes = false;

  for (let i = 0; i < line.length; i++) {
    const char = line[i];

    if (char === '"') {
      inQuotes = !inQuotes;
    } else if (char === ',' && !inQuotes) {
      result.push(current.trim());
      current = '';
    } else {
      current += char;
    }
  }

  result.push(current.trim());
  return result;
}

/**
 * Load EPA measurements from CSV
 */
export function loadEPAData(filePath: string): GroundMeasurement[] {
  const content = readFileSync(filePath, 'utf-8');
  const lines = content.split('\n').filter((line) => line.trim());

  if (lines.length < 2) {
    return [];
  }

  // Parse header
  const headers = parseCSVLine(lines[0]);

  // Parse rows
  const measurements: GroundMeasurement[] = [];

  for (let i = 1; i < lines.length; i++) {
    const values = parseCSVLine(lines[i]);

    if (values.length !== headers.length) {
      continue;
    }

    // Create row object
    const row: Record<string, string> = {};
    headers.forEach((header, idx) => {
      row[header] = values[idx];
    });

    // Parse measurement
    const dateStr = row['Date Local'];
    const timeStr = row['Time Local'];
    const value = parseFloat(row['Sample Measurement']);

    if (isNaN(value)) {
      continue;
    }

    // Parse timestamp
    const timestamp = parse(
      `${dateStr} ${timeStr}`,
      'yyyy-MM-dd HH:mm',
      new Date()
    );

    measurements.push({
      latitude: parseFloat(row['Latitude']),
      longitude: parseFloat(row['Longitude']),
      parameter: row['Parameter Name'].includes('NO2')
        ? 'NO2'
        : row['Parameter Name'].includes('PM2.5')
        ? 'PM25'
        : row['Parameter Name'].includes('Ozone')
        ? 'O3'
        : row['Parameter Name'],
      value,
      unit: row['Units of Measure'],
      timestamp,
      state: row['State Name'],
      county: row['County Name'],
    });
  }

  return measurements;
}

/**
 * Filter measurements by time range
 */
export function filterByTimeRange(
  measurements: GroundMeasurement[],
  start: Date,
  end: Date
): GroundMeasurement[] {
  return measurements.filter(
    (m) => m.timestamp >= start && m.timestamp <= end
  );
}

/**
 * Filter measurements by location (within radius)
 */
export function filterByLocation(
  measurements: GroundMeasurement[],
  latitude: number,
  longitude: number,
  radiusKm: number
): GroundMeasurement[] {
  return measurements.filter((m) => {
    const distance = getDistanceKm(
      latitude,
      longitude,
      m.latitude,
      m.longitude
    );
    return distance <= radiusKm;
  });
}

/**
 * Calculate distance between two points in km (Haversine)
 */
function getDistanceKm(
  lat1: number,
  lon1: number,
  lat2: number,
  lon2: number
): number {
  const R = 6371; // Earth radius in km
  const dLat = ((lat2 - lat1) * Math.PI) / 180;
  const dLon = ((lon2 - lon1) * Math.PI) / 180;

  const a =
    Math.sin(dLat / 2) * Math.sin(dLat / 2) +
    Math.cos((lat1 * Math.PI) / 180) *
      Math.cos((lat2 * Math.PI) / 180) *
      Math.sin(dLon / 2) *
      Math.sin(dLon / 2);

  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
  return R * c;
}

/**
 * Get measurement closest to a timestamp
 */
export function getClosestMeasurement(
  measurements: GroundMeasurement[],
  targetTime: Date,
  maxDeltaMinutes: number = 60
): GroundMeasurement | null {
  let closest: GroundMeasurement | null = null;
  let minDelta = Infinity;

  for (const m of measurements) {
    const delta = Math.abs(m.timestamp.getTime() - targetTime.getTime());
    const deltaMinutes = delta / (1000 * 60);

    if (deltaMinutes <= maxDeltaMinutes && delta < minDelta) {
      minDelta = delta;
      closest = m;
    }
  }

  return closest;
}

/**
 * Load EPA data with streaming (for large files)
 * Samples the file while reading to avoid loading everything in memory
 */
export async function loadEPADataStreaming(
  filePath: string,
  options?: {
    sampleSize?: number;
    filterLocation?: {
      latitude: number;
      longitude: number;
      radiusKm: number;
    };
    filterTimeRange?: {
      start: Date;
      end: Date;
    };
    parameter?: string;
  }
): Promise<GroundMeasurement[]> {
  const sampleSize = options?.sampleSize || 1000;
  const reservoirSize = sampleSize * 10; // Reservoir for random sampling

  return new Promise((resolve, reject) => {
    const fileStream = createReadStream(filePath);
    const rl = createInterface({
      input: fileStream,
      crlfDelay: Infinity,
    });

    let headers: string[] = [];
    let lineNumber = 0;
    let reservoir: GroundMeasurement[] = [];

    rl.on('line', (line: string) => {
      lineNumber++;

      // Parse header
      if (lineNumber === 1) {
        headers = parseCSVLine(line);
        return;
      }

      // Parse data line
      const values = parseCSVLine(line);
      if (values.length !== headers.length) {
        return;
      }

      // Create row object
      const row: Record<string, string> = {};
      headers.forEach((header, idx) => {
        row[header] = values[idx];
      });

      // Filter by parameter
      if (options?.parameter) {
        const paramName = row['Parameter Name'];
        if (!paramName.includes(options.parameter)) {
          return;
        }
      }

      // Parse basic fields
      const value = parseFloat(row['Sample Measurement']);
      if (isNaN(value)) {
        return;
      }

      const latitude = parseFloat(row['Latitude']);
      const longitude = parseFloat(row['Longitude']);

      // Filter by location
      if (options?.filterLocation) {
        const distance = getDistanceKm(
          options.filterLocation.latitude,
          options.filterLocation.longitude,
          latitude,
          longitude
        );
        if (distance > options.filterLocation.radiusKm) {
          return;
        }
      }

      // Parse timestamp
      const dateStr = row['Date Local'];
      const timeStr = row['Time Local'];
      const timestamp = parse(
        `${dateStr} ${timeStr}`,
        'yyyy-MM-dd HH:mm',
        new Date()
      );

      // Filter by time range
      if (options?.filterTimeRange) {
        if (
          timestamp < options.filterTimeRange.start ||
          timestamp > options.filterTimeRange.end
        ) {
          return;
        }
      }

      // Create measurement
      const measurement: GroundMeasurement = {
        latitude,
        longitude,
        parameter: row['Parameter Name'].includes('NO2')
          ? 'NO2'
          : row['Parameter Name'].includes('PM2.5')
          ? 'PM25'
          : row['Parameter Name'].includes('Ozone')
          ? 'O3'
          : row['Parameter Name'],
        value,
        unit: row['Units of Measure'],
        timestamp,
        state: row['State Name'],
        county: row['County Name'],
      };

      // Reservoir sampling algorithm
      if (reservoir.length < reservoirSize) {
        reservoir.push(measurement);
      } else {
        // Random replacement
        const randomIndex = Math.floor(Math.random() * lineNumber);
        if (randomIndex < reservoirSize) {
          reservoir[randomIndex] = measurement;
        }
      }
    });

    rl.on('close', () => {
      // Final random sample from reservoir
      const finalSample: GroundMeasurement[] = [];
      const indices = new Set<number>();

      while (
        indices.size < Math.min(sampleSize, reservoir.length) &&
        indices.size < reservoir.length
      ) {
        indices.add(Math.floor(Math.random() * reservoir.length));
      }

      for (const idx of indices) {
        finalSample.push(reservoir[idx]);
      }

      resolve(finalSample);
    });

    rl.on('error', (error) => {
      reject(error);
    });
  });
}

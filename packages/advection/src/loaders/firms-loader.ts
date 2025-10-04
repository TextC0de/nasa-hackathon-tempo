/**
 * FIRMS (Fire Information for Resource Management System) data loader
 * Reads CSV files from NASA FIRMS
 */

import { readFileSync } from 'fs';
import { parse } from 'date-fns';
import type { Fire } from '../types';

/**
 * FIRMS CSV row structure (for documentation)
 *
 * interface FIRMSRow {
 *   latitude: string;
 *   longitude: string;
 *   brightness: string;
 *   scan: string;
 *   track: string;
 *   acq_date: string;
 *   acq_time: string;
 *   satellite: string;
 *   instrument: string;
 *   confidence: string;
 *   version: string;
 *   bright_t31: string;
 *   frp: string;
 *   daynight: string;
 *   type: string;
 * }
 */

/**
 * Parse FIRMS CSV
 */
export function loadFIRMSData(filePath: string): Fire[] {
  const content = readFileSync(filePath, 'utf-8');
  const lines = content.split('\n').filter((line) => line.trim());

  if (lines.length < 2) {
    return [];
  }

  // Parse header
  const headers = lines[0].split(',').map((h) => h.trim());

  // Parse rows
  const fires: Fire[] = [];

  for (let i = 1; i < lines.length; i++) {
    const values = lines[i].split(',').map((v) => v.trim());

    if (values.length !== headers.length) {
      continue;
    }

    // Create row object
    const row: Record<string, string> = {};
    headers.forEach((header, idx) => {
      row[header] = values[idx];
    });

    const frp = parseFloat(row['frp']);
    const brightness = parseFloat(row['brightness']);

    if (isNaN(frp) || isNaN(brightness)) {
      continue;
    }

    fires.push({
      latitude: parseFloat(row['latitude']),
      longitude: parseFloat(row['longitude']),
      brightness,
      frp,
      confidence: row['confidence'],
      acq_date: row['acq_date'],
      acq_time: row['acq_time'],
      satellite: row['satellite'],
    });
  }

  return fires;
}

/**
 * Filter fires by date
 */
export function filterFiresByDate(fires: Fire[], date: Date): Fire[] {
  const targetDateStr = date.toISOString().split('T')[0];
  return fires.filter((f) => f.acq_date === targetDateStr);
}

/**
 * Filter fires by time range
 */
export function filterFiresByTimeRange(
  fires: Fire[],
  start: Date,
  end: Date
): Fire[] {
  return fires.filter((f) => {
    const fireDate = parse(
      `${f.acq_date} ${f.acq_time}`,
      'yyyy-MM-dd HHmm',
      new Date()
    );
    return fireDate >= start && fireDate <= end;
  });
}

/**
 * Filter fires by location (within radius)
 */
export function filterFiresByLocation(
  fires: Fire[],
  latitude: number,
  longitude: number,
  radiusKm: number
): Fire[] {
  return fires.filter((f) => {
    const distance = getDistanceKm(latitude, longitude, f.latitude, f.longitude);
    return distance <= radiusKm;
  });
}

/**
 * Calculate total FRP for fires in area
 */
export function calculateTotalFRP(fires: Fire[]): number {
  return fires.reduce((sum, fire) => sum + fire.frp, 0);
}

/**
 * Calculate weighted FRP impact based on distance
 */
export function calculateWeightedFRP(
  fires: Fire[],
  targetLat: number,
  targetLon: number,
  decayExponent: number = 2.5
): number {
  let totalImpact = 0;

  for (const fire of fires) {
    const distance = getDistanceKm(targetLat, targetLon, fire.latitude, fire.longitude);

    // Avoid division by zero
    const distanceFactor = Math.max(distance, 0.1);

    // Weight decreases with distance
    const weight = 1 / Math.pow(distanceFactor, decayExponent);
    totalImpact += fire.frp * weight;
  }

  return totalImpact;
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
 * Group fires by date
 */
export function groupFiresByDate(fires: Fire[]): Map<string, Fire[]> {
  const groups = new Map<string, Fire[]>();

  for (const fire of fires) {
    const existing = groups.get(fire.acq_date) || [];
    existing.push(fire);
    groups.set(fire.acq_date, existing);
  }

  return groups;
}

/**
 * OpenMeteo data loader for advection
 * Converts OpenMeteo API/file format to WeatherConditions
 */

import { readFileSync } from 'fs';
import type { WeatherConditions } from '../types';

/**
 * OpenMeteo hourly data structure (from API or JSON file)
 */
interface OpenMeteoData {
  latitude: number;
  longitude: number;
  elevation: number;
  hourly_units: {
    time: string;
    windspeed_10m?: string;
    winddirection_10m?: string;
    boundary_layer_height?: string;
    precipitation?: string;
    temperature_2m?: string;
    surface_pressure?: string;
    relative_humidity_2m?: string;
    cloud_cover?: string;
  };
  hourly: {
    time: string[];
    windspeed_10m?: number[];
    winddirection_10m?: number[];
    boundary_layer_height?: number[];
    precipitation?: number[];
    temperature_2m?: number[];
    surface_pressure?: number[];
    relative_humidity_2m?: number[];
    cloud_cover?: number[];
  };
}

/**
 * Convert OpenMeteo data to WeatherConditions array
 *
 * Handles unit conversions:
 * - windspeed: km/h → m/s (divide by 3.6)
 * - winddirection: degrees (no conversion)
 * - boundary_layer_height: m (no conversion)
 * - precipitation: mm (no conversion)
 * - temperature: °C (no conversion)
 *
 * @param data - OpenMeteo data structure
 * @returns Array of WeatherConditions, one per hour
 */
export function convertOpenMeteoToWeatherConditions(
  data: OpenMeteoData
): WeatherConditions[] {
  const conditions: WeatherConditions[] = [];

  const timeArray = data.hourly.time;
  const length = timeArray.length;

  for (let i = 0; i < length; i++) {
    const timestamp = new Date(timeArray[i]);

    // Convert km/h to m/s (divide by 3.6)
    const windSpeedKmh = data.hourly.windspeed_10m?.[i] ?? 0;
    const windSpeedMs = windSpeedKmh / 3.6;

    conditions.push({
      wind_speed: windSpeedMs,
      wind_direction: data.hourly.winddirection_10m?.[i] ?? 0,
      pbl_height: data.hourly.boundary_layer_height?.[i] ?? 800, // Default 800m
      temperature: data.hourly.temperature_2m?.[i] ?? 15, // Default 15°C
      precipitation: data.hourly.precipitation?.[i] ?? 0,
      timestamp,
    });
  }

  return conditions;
}

/**
 * Load OpenMeteo data from JSON file
 *
 * @param filePath - Path to OpenMeteo JSON file
 * @returns Array of WeatherConditions
 *
 * @example
 * ```typescript
 * const weather = loadOpenMeteoData('scripts/data/openmeteo/Los_Angeles.json');
 * console.log(`Loaded ${weather.length} hourly weather records`);
 * ```
 */
export function loadOpenMeteoData(filePath: string): WeatherConditions[] {
  const content = readFileSync(filePath, 'utf-8');
  const data: OpenMeteoData = JSON.parse(content);

  return convertOpenMeteoToWeatherConditions(data);
}

/**
 * Filter weather conditions by time range
 *
 * @param conditions - Array of WeatherConditions
 * @param start - Start date
 * @param end - End date
 * @returns Filtered array
 */
export function filterWeatherByTimeRange(
  conditions: WeatherConditions[],
  start: Date,
  end: Date
): WeatherConditions[] {
  return conditions.filter(
    (c) => c.timestamp >= start && c.timestamp <= end
  );
}

/**
 * Get weather condition closest to a timestamp
 *
 * @param conditions - Array of WeatherConditions
 * @param targetTime - Target timestamp
 * @param maxDeltaMinutes - Maximum time difference in minutes (default: 60)
 * @returns Closest weather condition or null if none within maxDelta
 */
export function getClosestWeather(
  conditions: WeatherConditions[],
  targetTime: Date,
  maxDeltaMinutes: number = 60
): WeatherConditions | null {
  let closest: WeatherConditions | null = null;
  let minDelta = Infinity;

  for (const condition of conditions) {
    const delta = Math.abs(condition.timestamp.getTime() - targetTime.getTime());
    const deltaMinutes = delta / (1000 * 60);

    if (deltaMinutes <= maxDeltaMinutes && delta < minDelta) {
      minDelta = delta;
      closest = condition;
    }
  }

  return closest;
}

/**
 * Calculate statistics for weather conditions
 *
 * @param conditions - Array of WeatherConditions
 * @returns Statistics object
 */
export function calculateWeatherStatistics(conditions: WeatherConditions[]): {
  wind_speed: { mean: number; max: number; min: number };
  temperature: { mean: number; max: number; min: number };
  pbl_height: { mean: number; max: number; min: number };
  total_precipitation: number;
} {
  if (conditions.length === 0) {
    return {
      wind_speed: { mean: 0, max: 0, min: 0 },
      temperature: { mean: 0, max: 0, min: 0 },
      pbl_height: { mean: 0, max: 0, min: 0 },
      total_precipitation: 0,
    };
  }

  const windSpeeds = conditions.map((c) => c.wind_speed);
  const temperatures = conditions.map((c) => c.temperature);
  const pblHeights = conditions.map((c) => c.pbl_height);
  const precipitations = conditions.map((c) => c.precipitation);

  return {
    wind_speed: {
      mean: windSpeeds.reduce((s, v) => s + v, 0) / windSpeeds.length,
      max: Math.max(...windSpeeds),
      min: Math.min(...windSpeeds),
    },
    temperature: {
      mean: temperatures.reduce((s, v) => s + v, 0) / temperatures.length,
      max: Math.max(...temperatures),
      min: Math.min(...temperatures),
    },
    pbl_height: {
      mean: pblHeights.reduce((s, v) => s + v, 0) / pblHeights.length,
      max: Math.max(...pblHeights),
      min: Math.min(...pblHeights),
    },
    total_precipitation: precipitations.reduce((s, v) => s + v, 0),
  };
}

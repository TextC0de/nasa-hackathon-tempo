/**
 * Tests for OpenMeteo loader
 */

import { describe, it, expect } from 'vitest';
import { existsSync } from 'fs';
import { join } from 'path';
import {
  loadOpenMeteoData,
  convertOpenMeteoToWeatherConditions,
  filterWeatherByTimeRange,
  getClosestWeather,
  calculateWeatherStatistics,
} from './openmeteo-loader';

describe('OpenMeteo Loader', () => {
  const testDataPath = join(
    process.cwd(),
    'scripts/data/openmeteo/Los_Angeles.json'
  );

  it('should load OpenMeteo data from JSON file', () => {
    if (!existsSync(testDataPath)) {
      console.warn('⚠️  Test data not found, skipping test');
      return;
    }

    const weather = loadOpenMeteoData(testDataPath);

    expect(weather).toBeDefined();
    expect(weather.length).toBeGreaterThan(0);

    // Check first record structure
    const first = weather[0];
    expect(first).toHaveProperty('wind_speed');
    expect(first).toHaveProperty('wind_direction');
    expect(first).toHaveProperty('pbl_height');
    expect(first).toHaveProperty('temperature');
    expect(first).toHaveProperty('precipitation');
    expect(first).toHaveProperty('timestamp');

    // Wind speed should be in m/s (converted from km/h)
    expect(first.wind_speed).toBeGreaterThanOrEqual(0);
    expect(first.wind_speed).toBeLessThan(100); // Sanity check

    console.log('✅ Loaded', weather.length, 'weather records');
    console.log('📊 Sample:', {
      timestamp: first.timestamp.toISOString(),
      wind_speed_ms: first.wind_speed.toFixed(2),
      pbl_height: first.pbl_height,
      temperature: first.temperature,
    });
  });

  it('should convert km/h to m/s correctly', () => {
    const mockData = {
      latitude: 34.05,
      longitude: -118.24,
      elevation: 100,
      hourly_units: {},
      hourly: {
        time: ['2024-01-01T00:00'],
        windspeed_10m: [36], // 36 km/h = 10 m/s
        winddirection_10m: [180],
        boundary_layer_height: [800],
        temperature_2m: [20],
        precipitation: [0],
      },
    };

    const weather = convertOpenMeteoToWeatherConditions(mockData);

    expect(weather).toHaveLength(1);
    expect(weather[0].wind_speed).toBeCloseTo(10, 1); // 36 km/h / 3.6 = 10 m/s
  });

  it('should handle missing PBL height with default', () => {
    const mockData = {
      latitude: 34.05,
      longitude: -118.24,
      elevation: 100,
      hourly_units: {},
      hourly: {
        time: ['2024-01-01T00:00'],
        windspeed_10m: [10],
        winddirection_10m: [180],
        boundary_layer_height: [undefined], // Missing
        temperature_2m: [20],
        precipitation: [0],
      },
    };

    const weather = convertOpenMeteoToWeatherConditions(mockData);

    expect(weather[0].pbl_height).toBe(800); // Default value
  });

  it('should filter weather by time range', () => {
    if (!existsSync(testDataPath)) {
      return;
    }

    const weather = loadOpenMeteoData(testDataPath);
    const start = new Date('2024-01-15T00:00:00Z');
    const end = new Date('2024-01-15T23:59:59Z');

    const filtered = filterWeatherByTimeRange(weather, start, end);

    expect(filtered.length).toBeGreaterThan(0);
    expect(filtered.length).toBeLessThanOrEqual(24); // Max 24 hours

    // All should be within range
    for (const w of filtered) {
      expect(w.timestamp.getTime()).toBeGreaterThanOrEqual(start.getTime());
      expect(w.timestamp.getTime()).toBeLessThanOrEqual(end.getTime());
    }
  });

  it('should find closest weather to timestamp', () => {
    if (!existsSync(testDataPath)) {
      return;
    }

    const weather = loadOpenMeteoData(testDataPath);
    const target = new Date(weather[10].timestamp.getTime() + 15 * 60 * 1000); // +15 min

    const closest = getClosestWeather(weather, target, 60);

    expect(closest).toBeDefined();
    expect(closest).toBe(weather[10]); // Should match the 10th record
  });

  it('should calculate weather statistics', () => {
    if (!existsSync(testDataPath)) {
      return;
    }

    const weather = loadOpenMeteoData(testDataPath);
    const stats = calculateWeatherStatistics(weather);

    expect(stats.wind_speed.mean).toBeGreaterThan(0);
    expect(stats.wind_speed.max).toBeGreaterThanOrEqual(stats.wind_speed.mean);
    expect(stats.wind_speed.min).toBeLessThanOrEqual(stats.wind_speed.mean);

    expect(stats.temperature.mean).toBeGreaterThan(-50);
    expect(stats.temperature.mean).toBeLessThan(60);

    expect(stats.pbl_height.mean).toBeGreaterThan(0);

    console.log('📊 Weather Statistics:', {
      wind_speed: `${stats.wind_speed.mean.toFixed(2)} m/s`,
      temperature: `${stats.temperature.mean.toFixed(1)}°C`,
      pbl_height: `${stats.pbl_height.mean.toFixed(0)}m`,
      total_precipitation: `${stats.total_precipitation.toFixed(1)}mm`,
    });
  });
});

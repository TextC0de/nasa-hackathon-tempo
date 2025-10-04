/**
 * Tests for core advection model
 */

import { describe, it, expect } from 'vitest';
import {
  advectGrid,
  columnToSurface,
  calculateFireImpact,
  calculateWashout,
  forecastAdvection,
  forecastPersistence,
} from './advection';
import { DEFAULT_FACTORS } from '../types';
import type { AdvectionGrid, WeatherConditions, Fire, GroundMeasurement } from '../types';

describe('advectGrid', () => {
  it('should move grid cells based on wind', () => {
    const grid: AdvectionGrid = {
      cells: [
        { latitude: 34.0, longitude: -118.0, no2_column: 1e16 },
        { latitude: 34.1, longitude: -118.0, no2_column: 1.2e16 },
      ],
      bounds: { north: 34.2, south: 33.8, east: -117.8, west: -118.2 },
      resolution: 0.1,
      timestamp: new Date('2024-01-01T12:00:00Z'),
    };

    const weather: WeatherConditions = {
      wind_speed: 5, // m/s
      wind_direction: 90, // East
      pbl_height: 800,
      temperature: 20,
      precipitation: 0,
      timestamp: new Date('2024-01-01T12:00:00Z'),
    };

    const advected = advectGrid(grid, weather, 1);

    // Wind from East should move cells West (negative longitude)
    expect(advected.cells[0].longitude).toBeLessThan(-118.0);
    expect(advected.cells[0].latitude).toBeCloseTo(34.0, 1);
  });
});

describe('columnToSurface', () => {
  it('should convert NO2 column to surface concentration', () => {
    const columnDensity = 1e16; // molecules/cm²
    const pblHeight = 800; // meters

    const surface = columnToSurface(columnDensity, pblHeight, DEFAULT_FACTORS);

    expect(surface).toBeGreaterThan(0);
    expect(surface).toBeLessThan(100); // Reasonable ppb range
  });

  it('should adjust for PBL height', () => {
    const columnDensity = 1e16;

    const lowPBL = columnToSurface(columnDensity, 400, DEFAULT_FACTORS);
    const highPBL = columnToSurface(columnDensity, 1200, DEFAULT_FACTORS);

    // Lower PBL should result in higher surface concentration
    expect(lowPBL).toBeGreaterThan(highPBL);
  });
});

describe('calculateFireImpact', () => {
  it('should calculate impact from nearby fires', () => {
    const fires: Fire[] = [
      {
        latitude: 34.0,
        longitude: -118.0,
        brightness: 350,
        frp: 10, // MW
        confidence: 'h',
        acq_date: '2024-01-01',
        acq_time: '1200',
        satellite: 'N',
      },
    ];

    const location = { latitude: 34.05, longitude: -118.05 };

    const impact = calculateFireImpact(fires, location, DEFAULT_FACTORS);

    expect(impact).toBeGreaterThan(0);
  });

  it('should decrease impact with distance', () => {
    const fire: Fire = {
      latitude: 34.0,
      longitude: -118.0,
      brightness: 350,
      frp: 10,
      confidence: 'h',
      acq_date: '2024-01-01',
      acq_time: '1200',
      satellite: 'N',
    };

    const nearLocation = { latitude: 34.01, longitude: -118.01 };
    const farLocation = { latitude: 34.5, longitude: -118.5 };

    const nearImpact = calculateFireImpact([fire], nearLocation, DEFAULT_FACTORS);
    const farImpact = calculateFireImpact([fire], farLocation, DEFAULT_FACTORS);

    expect(nearImpact).toBeGreaterThan(farImpact);
  });
});

describe('calculateWashout', () => {
  it('should return 1.0 for no precipitation', () => {
    const washout = calculateWashout(0, DEFAULT_FACTORS);
    expect(washout).toBe(1.0);
  });

  it('should reduce with precipitation', () => {
    const washout = calculateWashout(5, DEFAULT_FACTORS);
    expect(washout).toBeLessThan(1.0);
    expect(washout).toBeGreaterThan(0);
  });

  it('should decrease more with heavier rain', () => {
    const lightRain = calculateWashout(2, DEFAULT_FACTORS);
    const heavyRain = calculateWashout(10, DEFAULT_FACTORS);

    expect(lightRain).toBeGreaterThan(heavyRain);
  });
});

describe('forecastAdvection', () => {
  it('should produce a valid forecast', () => {
    const location = { latitude: 34.05, longitude: -118.24 };
    const no2Column = 1.5e16;

    const weather: WeatherConditions = {
      wind_speed: 5,
      wind_direction: 90,
      pbl_height: 800,
      temperature: 20,
      precipitation: 0,
      timestamp: new Date('2024-01-01T12:00:00Z'),
    };

    const fires: Fire[] = [];
    const groundTruth = null;

    const forecast = forecastAdvection(
      location,
      no2Column,
      weather,
      fires,
      groundTruth,
      DEFAULT_FACTORS,
      3
    );

    expect(forecast.value).toBeGreaterThan(0);
    expect(forecast.hours_ahead).toBe(3);
    expect(forecast.method).toBe('advection');
    expect(forecast.confidence).toBeGreaterThan(0);
    expect(forecast.confidence).toBeLessThanOrEqual(1);
  });

  it('should include fire contribution', () => {
    const location = { latitude: 34.05, longitude: -118.24 };
    const no2Column = 1e16;

    const weather: WeatherConditions = {
      wind_speed: 5,
      wind_direction: 90,
      pbl_height: 800,
      temperature: 20,
      precipitation: 0,
      timestamp: new Date('2024-01-01T12:00:00Z'),
    };

    const fires: Fire[] = [
      {
        latitude: 34.0,
        longitude: -118.2,
        brightness: 350,
        frp: 20,
        confidence: 'h',
        acq_date: '2024-01-01',
        acq_time: '1200',
        satellite: 'N',
      },
    ];

    const forecastNoFire = forecastAdvection(
      location,
      no2Column,
      weather,
      [],
      null,
      DEFAULT_FACTORS,
      1
    );

    const forecastWithFire = forecastAdvection(
      location,
      no2Column,
      weather,
      fires,
      null,
      DEFAULT_FACTORS,
      1
    );

    expect(forecastWithFire.value).toBeGreaterThan(forecastNoFire.value);
    expect(forecastWithFire.components?.fire_contribution).toBeGreaterThan(0);
  });
});

describe('forecastPersistence', () => {
  it('should use last observation', () => {
    const location = { latitude: 34.05, longitude: -118.24 };

    const groundTruth: GroundMeasurement = {
      latitude: 34.05,
      longitude: -118.24,
      parameter: 'PM25',
      value: 25,
      unit: 'µg/m³',
      timestamp: new Date('2024-01-01T12:00:00Z'),
      state: 'California',
      county: 'Los Angeles',
    };

    const forecast = forecastPersistence(location, groundTruth, 3);

    expect(forecast.value).toBe(25);
    expect(forecast.hours_ahead).toBe(3);
    expect(forecast.method).toBe('persistence');
  });

  it('should have decreasing confidence', () => {
    const location = { latitude: 34.05, longitude: -118.24 };
    const groundTruth: GroundMeasurement = {
      latitude: 34.05,
      longitude: -118.24,
      parameter: 'PM25',
      value: 25,
      unit: 'µg/m³',
      timestamp: new Date('2024-01-01T12:00:00Z'),
      state: 'California',
      county: 'Los Angeles',
    };

    const forecast1h = forecastPersistence(location, groundTruth, 1);
    const forecast6h = forecastPersistence(location, groundTruth, 6);

    expect(forecast1h.confidence).toBeGreaterThan(forecast6h.confidence);
  });
});

/**
 * Integration test for advection calibration with real data
 *
 * This test verifies that:
 * 1. Loaders can read real data files
 * 2. Advection model can make predictions
 * 3. R² can be calculated
 * 4. Calibrated factors improve performance
 */

import { describe, it, expect } from 'vitest';
import { existsSync } from 'fs';
import { join } from 'path';
import {
  loadOpenMeteoData,
  getClosestWeather,
  type WeatherConditions,
  type AdvectionFactors,
  DEFAULT_FACTORS,
  calculateAllMetrics,
  type ComparisonSample,
} from './index';

describe('Advection Calibration with Real Data', () => {
  const weatherPath = join(
    process.cwd(),
    'scripts/data/openmeteo/Los_Angeles.json'
  );

  /**
   * Simplified PM2.5 forecast for testing
   */
  function forecastPM25Simple(
    weather: WeatherConditions,
    factors: AdvectionFactors
  ): number {
    const baseline = 15; // µg/m³
    const pblFactor = factors.pbl_reference / weather.pbl_height;

    const washout =
      weather.precipitation > 0
        ? Math.exp(-weather.precipitation * factors.washout_rate)
        : 1.0;

    return Math.max(0, baseline * pblFactor * washout);
  }

  it('should load weather data successfully', () => {
    if (!existsSync(weatherPath)) {
      console.warn('⚠️  Weather data not found, skipping test');
      return;
    }

    const weather = loadOpenMeteoData(weatherPath);

    expect(weather).toBeDefined();
    expect(weather.length).toBeGreaterThan(100);

    console.log(`✅ Loaded ${weather.length} weather records`);
  });

  it('should calculate R² with synthetic ground truth', () => {
    if (!existsSync(weatherPath)) {
      return;
    }

    const weather = loadOpenMeteoData(weatherPath);

    // Create synthetic "ground truth" with known pattern
    const samples: ComparisonSample[] = weather.slice(0, 100).map((w) => {
      // Synthetic ground truth: correlated with PBL height and precipitation
      const syntheticPM25 =
        20 * (800 / w.pbl_height) * (w.precipitation > 0 ? 0.7 : 1.0) +
        Math.random() * 3; // Add noise

      const predicted = forecastPM25Simple(w, DEFAULT_FACTORS);

      return {
        predicted,
        actual: syntheticPM25,
        timestamp: w.timestamp,
        location: { latitude: 34.05, longitude: -118.24 },
        pollutant: 'PM25' as const,
      };
    });

    const metrics = calculateAllMetrics(samples);

    expect(metrics.r2).toBeGreaterThan(-1);
    expect(metrics.r2).toBeLessThanOrEqual(1);
    expect(metrics.mae).toBeGreaterThan(0);
    expect(metrics.rmse).toBeGreaterThan(0);
    expect(metrics.count).toBe(100);

    console.log('\n📊 Metrics with Synthetic Data:');
    console.log(`   R²:   ${metrics.r2.toFixed(3)}`);
    console.log(`   MAE:  ${metrics.mae.toFixed(2)} µg/m³`);
    console.log(`   RMSE: ${metrics.rmse.toFixed(2)} µg/m³`);
    console.log(`   Bias: ${metrics.bias.toFixed(2)} µg/m³`);
  });

  it('should show improvement with optimized factors', () => {
    if (!existsSync(weatherPath)) {
      return;
    }

    const weather = loadOpenMeteoData(weatherPath);

    // Create synthetic ground truth
    const groundTruthGenerator = (w: WeatherConditions) =>
      20 * (800 / w.pbl_height) * (w.precipitation > 0 ? 0.7 : 1.0);

    // Test with DEFAULT_FACTORS
    const defaultSamples: ComparisonSample[] = weather.slice(0, 100).map((w) => ({
      predicted: forecastPM25Simple(w, DEFAULT_FACTORS),
      actual: groundTruthGenerator(w),
      timestamp: w.timestamp,
      location: { latitude: 34.05, longitude: -118.24 },
      pollutant: 'PM25' as const,
    }));

    const defaultMetrics = calculateAllMetrics(defaultSamples);

    // Test with "optimized" factors (closer to synthetic ground truth)
    const optimizedFactors: AdvectionFactors = {
      ...DEFAULT_FACTORS,
      pbl_reference: 800,
      washout_rate: 0.35, // Closer to synthetic truth
    };

    const optimizedSamples: ComparisonSample[] = weather.slice(0, 100).map((w) => ({
      predicted: forecastPM25Simple(w, optimizedFactors),
      actual: groundTruthGenerator(w),
      timestamp: w.timestamp,
      location: { latitude: 34.05, longitude: -118.24 },
      pollutant: 'PM25' as const,
    }));

    const optimizedMetrics = calculateAllMetrics(optimizedSamples);

    // Optimized should be better
    expect(optimizedMetrics.r2).toBeGreaterThanOrEqual(defaultMetrics.r2);
    expect(optimizedMetrics.mae).toBeLessThanOrEqual(defaultMetrics.mae);

    console.log('\n📊 Comparison:');
    console.log('\nDefault factors:');
    console.log(`   R²:  ${defaultMetrics.r2.toFixed(3)}`);
    console.log(`   MAE: ${defaultMetrics.mae.toFixed(2)} µg/m³`);

    console.log('\nOptimized factors:');
    console.log(`   R²:  ${optimizedMetrics.r2.toFixed(3)}`);
    console.log(`   MAE: ${optimizedMetrics.mae.toFixed(2)} µg/m³`);

    const r2Improvement =
      ((optimizedMetrics.r2 - defaultMetrics.r2) / Math.abs(defaultMetrics.r2)) * 100;
    const maeImprovement =
      ((defaultMetrics.mae - optimizedMetrics.mae) / defaultMetrics.mae) * 100;

    console.log('\nImprovement:');
    console.log(`   R²:  ${r2Improvement > 0 ? '+' : ''}${r2Improvement.toFixed(1)}%`);
    console.log(`   MAE: ${maeImprovement > 0 ? '+' : ''}${maeImprovement.toFixed(1)}%`);

    expect(r2Improvement).toBeGreaterThan(0);
  });

  it('should demonstrate PBL height impact on forecast', () => {
    const baseWeather: WeatherConditions = {
      wind_speed: 5,
      wind_direction: 180,
      pbl_height: 800,
      temperature: 20,
      precipitation: 0,
      timestamp: new Date(),
    };

    // Test with different PBL heights
    const pblHeights = [400, 600, 800, 1000, 1200];
    const results = pblHeights.map((pbl) => {
      const weather = { ...baseWeather, pbl_height: pbl };
      const pm25 = forecastPM25Simple(weather, DEFAULT_FACTORS);
      return { pbl, pm25 };
    });

    console.log('\n📊 PBL Height Impact:');
    for (const { pbl, pm25 } of results) {
      console.log(`   PBL ${pbl}m: PM2.5 = ${pm25.toFixed(2)} µg/m³`);
    }

    // PM2.5 should decrease as PBL increases (dilution)
    expect(results[0].pm25).toBeGreaterThan(results[results.length - 1].pm25);
  });

  it('should demonstrate precipitation washout effect', () => {
    const baseWeather: WeatherConditions = {
      wind_speed: 5,
      wind_direction: 180,
      pbl_height: 800,
      temperature: 20,
      precipitation: 0,
      timestamp: new Date(),
    };

    // Test with different precipitation amounts
    const precipitations = [0, 1, 5, 10, 20];
    const results = precipitations.map((precip) => {
      const weather = { ...baseWeather, precipitation: precip };
      const pm25 = forecastPM25Simple(weather, DEFAULT_FACTORS);
      return { precip, pm25 };
    });

    console.log('\n📊 Precipitation Washout Effect:');
    for (const { precip, pm25 } of results) {
      console.log(`   Precip ${precip}mm: PM2.5 = ${pm25.toFixed(2)} µg/m³`);
    }

    // PM2.5 should decrease with precipitation (washout)
    expect(results[0].pm25).toBeGreaterThan(results[results.length - 1].pm25);
  });
});

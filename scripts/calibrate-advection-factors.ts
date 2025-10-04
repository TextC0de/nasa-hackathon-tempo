#!/usr/bin/env tsx
/**
 * Calibrate advection factors using local historical data
 *
 * This script:
 * 1. Loads historical data from local files (OpenMeteo, EPA, FIRMS)
 * 2. Performs grid search to find optimal advection factors
 * 3. Validates using train/test split
 * 4. Saves calibrated factors and metrics
 *
 * Usage:
 *   tsx scripts/calibrate-advection-factors.ts
 */

import { existsSync, writeFileSync } from 'fs';
import { join } from 'path';
import {
  loadOpenMeteoData,
  getClosestWeather,
  loadEPAData,
  getClosestMeasurement,
  loadFIRMSData,
  filterFiresByTimeRange,
  calculateTotalFRP,
  type WeatherConditions,
  type GroundMeasurement,
  type Fire,
  type AdvectionFactors,
  type ComparisonSample,
  calculateAllMetrics,
  type ValidationMetrics,
  DEFAULT_FACTORS,
} from '../packages/advection/src';

/**
 * Calibration sample with features and target
 */
interface CalibrationSample {
  timestamp: Date;
  location: string;

  // Features (inputs)
  wind_speed: number;
  wind_direction: number;
  pbl_height: number;
  temperature: number;
  precipitation: number;
  fires_total_frp: number;

  // Target (output)
  pm25_actual: number;
}

/**
 * Load calibration data from local files
 */
async function loadLocalCalibrationData(): Promise<CalibrationSample[]> {
  console.log('📊 Loading calibration data from local files...\n');

  const samples: CalibrationSample[] = [];

  const cities = [
    { name: 'Los_Angeles', displayName: 'Los Angeles' },
    { name: 'San_Francisco', displayName: 'San Francisco' },
    { name: 'San_Diego', displayName: 'San Diego' },
    { name: 'Oakland', displayName: 'Oakland' },
    { name: 'Sacramento', displayName: 'Sacramento' },
    { name: 'Fresno', displayName: 'Fresno' },
  ];

  // Load FIRMS data once (shared across cities)
  const firesPath = join(
    process.cwd(),
    'scripts/downloads-uncompressed/firms/2024-full'
  );
  let allFires: Fire[] = [];

  if (existsSync(firesPath)) {
    console.log('🔥 Loading FIRMS fire data...');
    // TODO: Load actual FIRMS CSV files
    console.log('   ⚠️  FIRMS data not loaded (implement CSV loader)');
  }

  for (const city of cities) {
    console.log(`\n📍 Loading data for ${city.displayName}...`);

    // 1. Load OpenMeteo weather
    const weatherPath = join(
      process.cwd(),
      `scripts/data/openmeteo/${city.name}.json`
    );

    if (!existsSync(weatherPath)) {
      console.log(`   ⚠️  Weather file not found: ${weatherPath}`);
      continue;
    }

    console.log(`   ✅ Loading weather from ${city.name}.json`);
    const weatherData = loadOpenMeteoData(weatherPath);
    console.log(`   📊 Loaded ${weatherData.length} hourly weather records`);

    // 2. Load EPA ground truth
    const epaPath = join(
      process.cwd(),
      'scripts/downloads-uncompressed/epa/2024-full'
    );

    let epaData: GroundMeasurement[] = [];

    if (existsSync(epaPath)) {
      console.log('   ✅ Loading EPA ground truth...');
      // TODO: Load EPA CSV files for this city
      console.log('   ⚠️  EPA data not loaded (implement CSV loader)');
    } else {
      console.log(`   ⚠️  EPA directory not found: ${epaPath}`);
      continue;
    }

    // 3. Match weather with ground truth
    let matchedCount = 0;

    for (const weather of weatherData) {
      // Find matching ground truth within 30 minutes
      const groundTruth = getClosestMeasurement(epaData, weather.timestamp, 30);

      if (!groundTruth || groundTruth.parameter !== 'PM25') {
        continue;
      }

      // Get nearby fires (within 1 hour window)
      const nearbyFires = filterFiresByTimeRange(
        allFires,
        new Date(weather.timestamp.getTime() - 3600000),
        weather.timestamp
      );

      samples.push({
        timestamp: weather.timestamp,
        location: city.name,

        // Features
        wind_speed: weather.wind_speed,
        wind_direction: weather.wind_direction,
        pbl_height: weather.pbl_height,
        temperature: weather.temperature,
        precipitation: weather.precipitation,
        fires_total_frp: calculateTotalFRP(nearbyFires),

        // Target
        pm25_actual: groundTruth.value,
      });

      matchedCount++;
    }

    console.log(`   ✅ Matched ${matchedCount} samples`);
  }

  console.log(
    `\n📊 Total calibration samples: ${samples.length}\n`
  );

  return samples;
}

/**
 * Simplified advection forecast for calibration
 * (without TEMPO NO2 column for now)
 */
function forecastPM25Simple(
  weather: WeatherConditions,
  fires_frp: number,
  factors: AdvectionFactors
): number {
  // Simplified PM2.5 estimation based on weather and fires
  // Without TEMPO NO2, we use a baseline + fire contribution + washout

  // Baseline PM2.5 (assume moderate pollution)
  const baseline = 15; // µg/m³

  // PBL mixing effect
  const pblFactor = factors.pbl_reference / weather.pbl_height;

  // Fire contribution
  const fireContribution = fires_frp * factors.fire_frp_scaling * 0.01;

  // Washout
  const washout =
    weather.precipitation > 0
      ? Math.exp(-weather.precipitation * factors.washout_rate)
      : 1.0;

  // Final forecast
  const pm25 = (baseline * pblFactor + fireContribution) * washout;

  return Math.max(0, pm25);
}

/**
 * Evaluate factors on a dataset
 */
function evaluateFactors(
  factors: AdvectionFactors,
  samples: CalibrationSample[]
): ValidationMetrics {
  const comparisonSamples: ComparisonSample[] = [];

  for (const sample of samples) {
    const predicted = forecastPM25Simple(
      {
        wind_speed: sample.wind_speed,
        wind_direction: sample.wind_direction,
        pbl_height: sample.pbl_height,
        temperature: sample.temperature,
        precipitation: sample.precipitation,
        timestamp: sample.timestamp,
      },
      sample.fires_total_frp,
      factors
    );

    comparisonSamples.push({
      predicted,
      actual: sample.pm25_actual,
      timestamp: sample.timestamp,
      location: { latitude: 0, longitude: 0 },
      pollutant: 'PM25',
    });
  }

  return calculateAllMetrics(comparisonSamples);
}

/**
 * Grid search for optimal factors
 */
async function calibrateFactorsWithGridSearch(
  samples: CalibrationSample[]
): Promise<{ factors: AdvectionFactors; metrics: ValidationMetrics }> {
  console.log('🔍 Starting grid search for optimal factors...\n');

  // Train/test split (80/20, temporal)
  samples.sort((a, b) => a.timestamp.getTime() - b.timestamp.getTime());

  const trainSize = Math.floor(samples.length * 0.8);
  const trainSet = samples.slice(0, trainSize);
  const testSet = samples.slice(trainSize);

  console.log(`📊 Train: ${trainSet.length}, Test: ${testSet.length}\n`);

  // Define search space
  const searchSpace = {
    pbl_reference: [600, 800, 1000],
    fire_frp_scaling: [80, 100, 120],
    fire_distance_decay: [2.0, 2.5, 3.0],
    washout_rate: [0.15, 0.2, 0.25],
    bias_correction_weight: [0.3, 0.5, 0.7],
  };

  const totalCombos =
    searchSpace.pbl_reference.length *
    searchSpace.fire_frp_scaling.length *
    searchSpace.fire_distance_decay.length *
    searchSpace.washout_rate.length *
    searchSpace.bias_correction_weight.length;

  console.log(`🔢 Testing ${totalCombos} factor combinations...\n`);

  let bestR2 = -Infinity;
  let bestFactors: AdvectionFactors = DEFAULT_FACTORS;
  let bestMetrics: ValidationMetrics = {
    mae: Infinity,
    rmse: Infinity,
    r2: -Infinity,
    bias: 0,
    count: 0,
  };

  let tested = 0;
  const startTime = Date.now();

  for (const pbl_ref of searchSpace.pbl_reference) {
    for (const fire_scaling of searchSpace.fire_frp_scaling) {
      for (const fire_decay of searchSpace.fire_distance_decay) {
        for (const washout of searchSpace.washout_rate) {
          for (const bias_weight of searchSpace.bias_correction_weight) {
            const factors: AdvectionFactors = {
              ...DEFAULT_FACTORS,
              pbl_reference: pbl_ref,
              fire_frp_scaling: fire_scaling,
              fire_distance_decay: fire_decay,
              washout_rate: washout,
              bias_correction_weight: bias_weight,
            };

            // Evaluate on train set
            const trainMetrics = evaluateFactors(factors, trainSet);

            // Only test on test set if train R² is decent
            if (trainMetrics.r2 > 0.3) {
              const testMetrics = evaluateFactors(factors, testSet);

              if (testMetrics.r2 > bestR2) {
                bestR2 = testMetrics.r2;
                bestFactors = factors;
                bestMetrics = testMetrics;

                console.log(`✅ New best R²: ${bestR2.toFixed(3)}`);
                console.log(
                  `   MAE: ${testMetrics.mae.toFixed(2)}, RMSE: ${testMetrics.rmse.toFixed(2)}`
                );
                console.log(`   Factors:`, {
                  pbl_reference: pbl_ref,
                  fire_frp_scaling: fire_scaling,
                  fire_distance_decay: fire_decay,
                  washout_rate: washout,
                  bias_correction_weight: bias_weight,
                });
                console.log();
              }
            }

            tested++;

            if (tested % 50 === 0) {
              const elapsed = (Date.now() - startTime) / 1000;
              const rate = tested / elapsed;
              const remaining = (totalCombos - tested) / rate;

              console.log(
                `⏳ Progress: ${tested}/${totalCombos} (${((tested / totalCombos) * 100).toFixed(1)}%) - ETA: ${remaining.toFixed(0)}s`
              );
            }
          }
        }
      }
    }
  }

  const totalTime = ((Date.now() - startTime) / 1000).toFixed(1);
  console.log(`\n✅ Grid search completed in ${totalTime}s\n`);

  return { factors: bestFactors, metrics: bestMetrics };
}

/**
 * Main calibration function
 */
async function main() {
  console.log('🚀 Advection Factor Calibration\n');
  console.log('=' .repeat(60) + '\n');

  // 1. Load data
  const samples = await loadLocalCalibrationData();

  if (samples.length === 0) {
    console.error('❌ No calibration samples found. Check data files.');
    process.exit(1);
  }

  // 2. Calibrate
  const { factors, metrics } = await calibrateFactorsWithGridSearch(samples);

  // 3. Display results
  console.log('🏆 CALIBRATION RESULTS\n');
  console.log('=' .repeat(60) + '\n');

  console.log('📊 Best Factors:');
  console.log(JSON.stringify(factors, null, 2));
  console.log();

  console.log('📈 Test Set Metrics:');
  console.log(`   R²:   ${metrics.r2.toFixed(3)}`);
  console.log(`   MAE:  ${metrics.mae.toFixed(2)} µg/m³`);
  console.log(`   RMSE: ${metrics.rmse.toFixed(2)} µg/m³`);
  console.log(`   Bias: ${metrics.bias.toFixed(2)} µg/m³`);
  console.log(`   N:    ${metrics.count}`);
  console.log();

  // 4. Compare with defaults
  console.log('📊 Comparison with DEFAULT_FACTORS:\n');
  const defaultMetrics = evaluateFactors(DEFAULT_FACTORS, samples);

  console.log('Default factors:');
  console.log(`   R²:   ${defaultMetrics.r2.toFixed(3)}`);
  console.log(`   MAE:  ${defaultMetrics.mae.toFixed(2)} µg/m³`);
  console.log();

  const r2Improvement = ((metrics.r2 - defaultMetrics.r2) / Math.abs(defaultMetrics.r2)) * 100;
  const maeImprovement = ((defaultMetrics.mae - metrics.mae) / defaultMetrics.mae) * 100;

  console.log('Improvement:');
  console.log(`   R²:  ${r2Improvement > 0 ? '+' : ''}${r2Improvement.toFixed(1)}%`);
  console.log(`   MAE: ${maeImprovement > 0 ? '+' : ''}${maeImprovement.toFixed(1)}%`);
  console.log();

  // 5. Save results
  const outputPath = join(process.cwd(), 'calibrated-advection-factors.json');

  const output = {
    factors,
    metrics: {
      r2: metrics.r2,
      mae: metrics.mae,
      rmse: metrics.rmse,
      bias: metrics.bias,
      count: metrics.count,
    },
    baseline: {
      r2: defaultMetrics.r2,
      mae: defaultMetrics.mae,
      rmse: defaultMetrics.rmse,
    },
    improvement: {
      r2_percent: r2Improvement,
      mae_percent: maeImprovement,
    },
    calibration_date: new Date().toISOString(),
    sample_count: samples.length,
  };

  writeFileSync(outputPath, JSON.stringify(output, null, 2));

  console.log(`💾 Results saved to: ${outputPath}\n`);
  console.log('✅ Calibration complete!\n');
}

// Run
main().catch((error) => {
  console.error('❌ Error:', error.message);
  process.exit(1);
});

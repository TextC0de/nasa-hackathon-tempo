#!/usr/bin/env tsx
/**
 * Test script to verify loaders work with real data
 *
 * Usage:
 *   tsx scripts/test-loaders.ts
 */

import { existsSync } from 'fs';
import { join } from 'path';
import {
  loadOpenMeteoData,
  calculateWeatherStatistics,
  filterWeatherByTimeRange,
  DEFAULT_FACTORS,
} from '../packages/advection/src';

console.log('🧪 Testing Data Loaders\n');
console.log('='.repeat(60) + '\n');

// Test OpenMeteo loader
const weatherPath = join(process.cwd(), 'scripts/data/openmeteo/Los_Angeles.json');

if (existsSync(weatherPath)) {
  console.log('📍 Los Angeles Weather Data\n');

  const weather = loadOpenMeteoData(weatherPath);

  console.log(`✅ Loaded ${weather.length} hourly weather records`);

  // Show date range
  const first = weather[0];
  const last = weather[weather.length - 1];

  console.log(`📅 Date range: ${first.timestamp.toISOString()} to ${last.timestamp.toISOString()}`);

  // Calculate statistics
  const stats = calculateWeatherStatistics(weather);

  console.log('\n📊 Weather Statistics:');
  console.log(`   Wind Speed:   ${stats.wind_speed.mean.toFixed(2)} m/s (${(stats.wind_speed.mean * 3.6).toFixed(2)} km/h)`);
  console.log(`                 Range: ${stats.wind_speed.min.toFixed(2)} - ${stats.wind_speed.max.toFixed(2)} m/s`);
  console.log(`   Temperature:  ${stats.temperature.mean.toFixed(1)}°C`);
  console.log(`                 Range: ${stats.temperature.min.toFixed(1)} - ${stats.temperature.max.toFixed(1)}°C`);
  console.log(`   PBL Height:   ${stats.pbl_height.mean.toFixed(0)} m`);
  console.log(`                 Range: ${stats.pbl_height.min.toFixed(0)} - ${stats.pbl_height.max.toFixed(0)} m`);
  console.log(`   Total Precip: ${stats.total_precipitation.toFixed(1)} mm`);

  // Sample records
  console.log('\n📋 Sample Weather Records:\n');

  const samples = [0, Math.floor(weather.length / 2), weather.length - 1];

  for (const idx of samples) {
    const w = weather[idx];
    console.log(`   ${w.timestamp.toISOString()}`);
    console.log(`     Wind: ${w.wind_speed.toFixed(1)} m/s @ ${w.wind_direction}°`);
    console.log(`     PBL:  ${w.pbl_height}m`);
    console.log(`     Temp: ${w.temperature.toFixed(1)}°C`);
    console.log(`     Rain: ${w.precipitation.toFixed(1)}mm`);
    console.log();
  }

  // Test filtering
  const jan15Start = new Date('2024-01-15T00:00:00Z');
  const jan15End = new Date('2024-01-15T23:59:59Z');

  const jan15Weather = filterWeatherByTimeRange(weather, jan15Start, jan15End);

  console.log(`📅 January 15, 2024: ${jan15Weather.length} records`);

  if (jan15Weather.length > 0) {
    const jan15Stats = calculateWeatherStatistics(jan15Weather);
    console.log(`   Avg Wind Speed: ${jan15Stats.wind_speed.mean.toFixed(2)} m/s`);
    console.log(`   Avg Temperature: ${jan15Stats.temperature.mean.toFixed(1)}°C`);
    console.log(`   Total Precipitation: ${jan15Stats.total_precipitation.toFixed(1)}mm`);
  }

  console.log();

  // Test DEFAULT_FACTORS
  console.log('⚙️  Default Advection Factors:\n');
  console.log(`   NO2 column → surface:     ${DEFAULT_FACTORS.no2_column_to_surface}`);
  console.log(`   PM index → surface:       ${DEFAULT_FACTORS.pm_index_to_surface}`);
  console.log(`   PBL reference:            ${DEFAULT_FACTORS.pbl_reference} m`);
  console.log(`   Fire FRP scaling:         ${DEFAULT_FACTORS.fire_frp_scaling}`);
  console.log(`   Fire distance decay:      ${DEFAULT_FACTORS.fire_distance_decay}`);
  console.log(`   Washout rate:             ${DEFAULT_FACTORS.washout_rate}`);
  console.log(`   Bias correction weight:   ${DEFAULT_FACTORS.bias_correction_weight}`);

  console.log();
  console.log('✅ Loaders working correctly!\n');

} else {
  console.log('❌ Weather data not found at:', weatherPath);
  console.log('\nPlease ensure OpenMeteo data is downloaded to:');
  console.log('  scripts/data/openmeteo/Los_Angeles.json');
  console.log();
}

// Check for other data sources
console.log('📂 Checking for other data sources:\n');

const dataChecks = [
  {
    name: 'OpenMeteo (San Francisco)',
    path: 'scripts/data/openmeteo/San_Francisco.json',
  },
  {
    name: 'EPA Ground Truth',
    path: 'scripts/downloads-uncompressed/epa/2024-full',
  },
  {
    name: 'FIRMS Fire Data',
    path: 'scripts/downloads-uncompressed/firms/2024-full',
  },
  {
    name: 'TEMPO NO2',
    path: 'scripts/data/tempo/california',
  },
];

for (const check of dataChecks) {
  const fullPath = join(process.cwd(), check.path);
  const exists = existsSync(fullPath);

  console.log(`   ${exists ? '✅' : '❌'} ${check.name}`);

  if (exists) {
    console.log(`      ${fullPath}`);
  }
}

console.log();
console.log('✅ Test complete!\n');

#!/usr/bin/env ts-node
/**
 * download-openmeteo-weather.ts
 *
 * Descarga datos meteorológicos de Open-Meteo para los mismos 60 días
 * estratégicos del dataset balanceado de TEMPO.
 *
 * Features:
 * - Usa @atmos/openmeteo-client
 * - Descarga para ciudades principales de California
 * - Guarda en formato JSON por ciudad
 * - Variables críticas para advección (wind, PBL, precipitation)
 *
 * Usage:
 *   pnpm tsx scripts/download-openmeteo-weather.ts
 */

import * as fs from 'fs';
import * as path from 'path';
import { OpenMeteoClient, HourlyVariable } from '../packages/openmeteo-client/src/index';

// ============================================================================
// CONFIG
// ============================================================================

const CONFIG = {
  outputDir: 'scripts/data/openmeteo',

  // Mismos días estratégicos que download-crop-balanced.py
  strategicDays: {
    winter: [
      '2024-01-10', '2024-01-17', '2024-01-24',
      '2024-02-07', '2024-02-14', '2024-02-21',
      '2024-12-05', '2024-12-12', '2024-12-19',
      '2025-01-08',
    ],
    spring: [
      '2024-03-06', '2024-03-20',
      '2024-04-10', '2024-04-24',
      '2024-05-08', '2024-05-22',
      '2025-02-12', '2025-03-15',
    ],
    summer_normal: [
      '2024-06-05', '2024-06-12', '2024-06-19', '2024-06-26',
      '2024-07-03', '2024-07-10', '2024-07-17',
      '2024-09-04', '2024-09-11', '2024-09-18', '2024-09-25',
      '2025-06-18',
    ],
    fall: [
      '2024-10-02', '2024-10-09', '2024-10-16', '2024-10-23',
      '2024-11-06', '2024-11-13', '2024-11-20', '2024-11-27',
      '2025-09-10', '2025-09-24', '2025-10-08', '2025-10-22',
    ],
    park_fire: [
      '2024-07-24', '2024-07-28', '2024-07-31',
      '2024-08-03', '2024-08-07',
      '2024-08-14', '2024-08-25',
    ],
    other_fires: [
      '2024-08-18', '2024-09-05', '2025-07-20',
    ],
    marine_layer: [
      '2024-01-28', '2024-06-08',
    ],
    santa_ana: [
      '2024-09-12', '2024-10-15',
    ],
    precipitation: [
      '2024-02-25', '2024-11-10',
    ],
    urban_spikes: [
      '2024-07-04', '2024-11-28',
    ],
  },

  // Ciudades principales de California (dentro del bbox -125,-114,32,42)
  cities: [
    { name: 'Los_Angeles', lat: 34.0522, lon: -118.2437 },
    { name: 'San_Diego', lat: 32.7157, lon: -117.1611 },
    { name: 'San_Jose', lat: 37.3382, lon: -121.8863 },
    { name: 'San_Francisco', lat: 37.7749, lon: -122.4194 },
    { name: 'Fresno', lat: 36.7378, lon: -119.7871 },
    { name: 'Sacramento', lat: 38.5816, lon: -121.4944 },
    { name: 'Long_Beach', lat: 33.7701, lon: -118.1937 },
    { name: 'Oakland', lat: 37.8044, lon: -122.2712 },
    { name: 'Bakersfield', lat: 35.3733, lon: -119.0187 },
    { name: 'Anaheim', lat: 33.8366, lon: -117.9143 },
    { name: 'Santa_Ana', lat: 33.7455, lon: -117.8677 },
    { name: 'Riverside', lat: 33.9533, lon: -117.3962 },
    { name: 'Stockton', lat: 37.9577, lon: -121.2908 },
    { name: 'Irvine', lat: 33.6846, lon: -117.8265 },
    { name: 'Chula_Vista', lat: 32.6401, lon: -117.0842 },
    { name: 'Fremont', lat: 37.5485, lon: -121.9886 },
    { name: 'San_Bernardino', lat: 34.1083, lon: -117.2898 },
    { name: 'Modesto', lat: 37.6391, lon: -120.9969 },
    { name: 'Fontana', lat: 34.0922, lon: -117.4350 },
    { name: 'Oxnard', lat: 34.1975, lon: -119.1771 },
    { name: 'Moreno_Valley', lat: 33.9425, lon: -117.2297 },
    { name: 'Huntington_Beach', lat: 33.6603, lon: -117.9992 },
    { name: 'Glendale', lat: 34.1425, lon: -118.2551 },
    { name: 'Santa_Clarita', lat: 34.3917, lon: -118.5426 },
    { name: 'Oceanside', lat: 33.1959, lon: -117.3795 },
  ],

  // Variables críticas para advección
  hourlyVariables: [
    HourlyVariable.WIND_SPEED_10M,
    HourlyVariable.WIND_DIRECTION_10M,
    HourlyVariable.BOUNDARY_LAYER_HEIGHT,
    HourlyVariable.PRECIPITATION,
    HourlyVariable.TEMPERATURE_2M,
    HourlyVariable.SURFACE_PRESSURE,
    HourlyVariable.RELATIVE_HUMIDITY_2M,
    HourlyVariable.CLOUD_COVER,
  ],
};

// ============================================================================
// UTILS
// ============================================================================

function getAllDaysSorted(): string[] {
  const allDays = [
    ...CONFIG.strategicDays.winter,
    ...CONFIG.strategicDays.spring,
    ...CONFIG.strategicDays.summer_normal,
    ...CONFIG.strategicDays.fall,
    ...CONFIG.strategicDays.park_fire,
    ...CONFIG.strategicDays.other_fires,
    ...CONFIG.strategicDays.marine_layer,
    ...CONFIG.strategicDays.santa_ana,
    ...CONFIG.strategicDays.precipitation,
    ...CONFIG.strategicDays.urban_spikes,
  ];
  return [...new Set(allDays)].sort();
}

function getDateRanges(days: string[]): Array<{ start: string; end: string }> {
  // Agrupar días en rangos continuos para minimizar requests
  // Open-Meteo permite date ranges, así que podemos agrupar días cercanos

  const sorted = [...days].sort();
  const ranges: Array<{ start: string; end: string }> = [];

  let rangeStart = sorted[0];
  let rangeEnd = sorted[0];

  for (let i = 1; i < sorted.length; i++) {
    const prevDate = new Date(sorted[i - 1]);
    const currDate = new Date(sorted[i]);
    const diffDays = (currDate.getTime() - prevDate.getTime()) / (1000 * 60 * 60 * 24);

    // Si están a menos de 7 días, agregar al rango actual
    if (diffDays <= 7) {
      rangeEnd = sorted[i];
    } else {
      // Guardar rango actual y empezar uno nuevo
      ranges.push({ start: rangeStart, end: rangeEnd });
      rangeStart = sorted[i];
      rangeEnd = sorted[i];
    }
  }

  // Agregar último rango
  ranges.push({ start: rangeStart, end: rangeEnd });

  return ranges;
}

function formatSize(bytes: number): string {
  const units = ['B', 'KB', 'MB', 'GB'];
  let size = bytes;
  let unitIndex = 0;

  while (size >= 1024 && unitIndex < units.length - 1) {
    size /= 1024;
    unitIndex++;
  }

  return `${size.toFixed(1)} ${units[unitIndex]}`;
}

// ============================================================================
// DOWNLOAD
// ============================================================================

async function downloadCityWeather(
  client: OpenMeteoClient,
  city: { name: string; lat: number; lon: number },
  dateRanges: Array<{ start: string; end: string }>
): Promise<void> {
  console.log(`\n📍 ${city.name.replace(/_/g, ' ')} (${city.lat}, ${city.lon})`);

  const outputPath = path.join(CONFIG.outputDir, `${city.name}.json`);
  const allData: any[] = [];

  for (let i = 0; i < dateRanges.length; i++) {
    const range = dateRanges[i];
    console.log(`   Range ${i + 1}/${dateRanges.length}: ${range.start} to ${range.end}`);

    try {
      const weather = await client.getHistoricalWeather(
        { latitude: city.lat, longitude: city.lon },
        {
          startDate: range.start,
          endDate: range.end,
          hourly: CONFIG.hourlyVariables,
          timezone: 'America/Los_Angeles',
        }
      );

      allData.push(weather);
      console.log(`   ✓ Downloaded ${weather.hourly?.time.length || 0} hours`);

      // Guardar progreso inmediatamente después de cada range
      const merged = mergeWeatherData(allData);
      fs.writeFileSync(outputPath, JSON.stringify(merged, null, 2));
      const fileSize = fs.statSync(outputPath).size;
      console.log(`   💾 Saved progress: ${formatSize(fileSize)}`);

      // Rate limiting: esperar 200ms entre requests
      await new Promise((resolve) => setTimeout(resolve, 200));
    } catch (error) {
      console.error(`   ❌ Error: ${error}`);
      // Si ya tenemos datos parciales, los guardamos antes de fallar
      if (allData.length > 0) {
        const merged = mergeWeatherData(allData);
        fs.writeFileSync(outputPath, JSON.stringify(merged, null, 2));
        console.log(`   💾 Saved partial data before failing`);
      }
      throw error;
    }
  }

  const fileSize = fs.statSync(outputPath).size;
  console.log(`   ✅ Complete: ${formatSize(fileSize)}`);
}

function mergeWeatherData(datasets: any[]): any {
  if (datasets.length === 0) return null;
  if (datasets.length === 1) return datasets[0];

  // Merge hourly data from multiple ranges
  const merged = { ...datasets[0] };

  for (let i = 1; i < datasets.length; i++) {
    const dataset = datasets[i];

    if (!dataset.hourly) continue;

    // Merge hourly arrays
    for (const key in dataset.hourly) {
      if (Array.isArray(dataset.hourly[key])) {
        merged.hourly[key] = [...merged.hourly[key], ...dataset.hourly[key]];
      }
    }
  }

  return merged;
}

async function checkExistingFiles(): Promise<Set<string>> {
  const existing = new Set<string>();

  if (!fs.existsSync(CONFIG.outputDir)) {
    return existing;
  }

  const files = fs.readdirSync(CONFIG.outputDir);
  for (const file of files) {
    if (file.endsWith('.json')) {
      existing.add(file.replace('.json', ''));
    }
  }

  return existing;
}

// ============================================================================
// MAIN
// ============================================================================

async function main() {
  console.log('═══════════════════════════════════════════════════════════════════════');
  console.log('Open-Meteo Weather Download - Balanced 60-Day Dataset');
  console.log('═══════════════════════════════════════════════════════════════════════\n');

  // Create output directory
  fs.mkdirSync(CONFIG.outputDir, { recursive: true });

  const allDays = getAllDaysSorted();
  const dateRanges = getDateRanges(allDays);

  console.log(`📅 Strategic days: ${allDays.length}`);
  console.log(`📊 Date ranges: ${dateRanges.length}`);
  console.log(`🏙️  Cities: ${CONFIG.cities.length}`);
  console.log(`🌡️  Variables: ${CONFIG.hourlyVariables.length}`);
  console.log(`\nDate ranges to download:`);
  dateRanges.forEach((range, i) => {
    console.log(`  ${i + 1}. ${range.start} → ${range.end}`);
  });

  // Check existing files
  const existingFiles = await checkExistingFiles();
  const citiesToDownload = CONFIG.cities.filter(
    (city) => !existingFiles.has(city.name)
  );

  console.log(`\n✓ Already downloaded: ${existingFiles.size} cities`);
  console.log(`📥 To download: ${citiesToDownload.length} cities\n`);

  if (citiesToDownload.length === 0) {
    console.log('All cities already downloaded! ✨\n');
    return;
  }

  // Initialize client
  const client = new OpenMeteoClient();

  // Download each city
  const startTime = Date.now();
  let successful = 0;
  let failed = 0;

  for (let i = 0; i < citiesToDownload.length; i++) {
    const city = citiesToDownload[i];

    console.log(`\n[${i + 1}/${citiesToDownload.length}] ━━━━━━━━━━━━━━━━━━━━━━━━━━`);

    try {
      await downloadCityWeather(client, city, dateRanges);
      successful++;
    } catch (error) {
      console.error(`❌ Failed to download ${city.name}: ${error}`);
      failed++;
    }

    // Progress update
    if ((i + 1) % 5 === 0) {
      const elapsed = (Date.now() - startTime) / 1000;
      const rate = (i + 1) / elapsed;
      const remaining = citiesToDownload.length - (i + 1);
      const eta = remaining / rate;

      console.log(`\n   📊 Progress: ${i + 1}/${citiesToDownload.length}`);
      console.log(`   ⏱️  ETA: ${Math.ceil(eta / 60)} minutes\n`);
    }
  }

  // Final statistics
  const elapsed = (Date.now() - startTime) / 1000;

  console.log('\n═══════════════════════════════════════════════════════════════════════');
  console.log('FINAL STATISTICS');
  console.log('═══════════════════════════════════════════════════════════════════════\n');
  console.log(`✅ Successful: ${successful}`);
  console.log(`❌ Failed:     ${failed}`);
  console.log(`⏭️  Skipped:    ${existingFiles.size}`);

  // Calculate total size
  const files = fs.readdirSync(CONFIG.outputDir);
  let totalSize = 0;
  for (const file of files) {
    if (file.endsWith('.json')) {
      const filePath = path.join(CONFIG.outputDir, file);
      totalSize += fs.statSync(filePath).size;
    }
  }

  console.log(`\n💾 Total size: ${formatSize(totalSize)}`);
  console.log(`📁 Output: ${CONFIG.outputDir}`);
  console.log(`⏱️  Time: ${(elapsed / 60).toFixed(1)} minutes`);
  console.log(`🚀 Rate: ${(successful / (elapsed / 60)).toFixed(1)} cities/min`);

  console.log(`\n✨ Weather data ready for advection modeling!\n`);
  console.log('═══════════════════════════════════════════════════════════════════════\n');
}

// ============================================================================
// RUN
// ============================================================================

main().catch((error) => {
  console.error('\n❌ Fatal error:', error);
  process.exit(1);
});

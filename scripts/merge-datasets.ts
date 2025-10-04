/**
 * merge-datasets.ts
 *
 * Merge datasets bulk separados en un solo calibration-dataset.json
 *
 * Inputs:
 *   - data/epa-aqs/*.csv (ground truth)
 *   - data/firms/*.csv (fires)
 *   - data/tempo/*.nc (satellite)
 *   - data/openmeteo/*.json (weather)
 *
 * Output:
 *   - calibration-dataset.json (72k samples)
 */

import * as fs from 'fs';
import * as path from 'path';
import { parse } from 'papaparse';
import { parseISO, format } from 'date-fns';

// ============================================================================
// 1. CONFIGURACIÓN
// ============================================================================

const TARGET_CITIES = [
  { name: 'Los Angeles', lat: 34.05, lon: -118.24 },
  { name: 'Phoenix', lat: 33.45, lon: -112.07 },
  { name: 'Houston', lat: 29.76, lon: -95.37 },
  // ... +47 ciudades más
];

const DATE_RANGE = {
  start: '2024-08-01',
  end: '2024-09-30', // 60 días
};

const DATA_DIRS = {
  epa: './data/epa-aqs',
  firms: './data/firms',
  tempo: './data/tempo',
  openmeteo: './data/openmeteo',
};

// ============================================================================
// 2. TIPOS
// ============================================================================

interface CalibrationSample {
  // Location
  lat: number;
  lon: number;
  city: string;

  // Timestamp
  timestamp: string;
  hour: number;
  day_of_week: number;
  month: number;

  // TEMPO (satellite)
  tempo_no2_column: number;
  tempo_hcho_column?: number;
  tempo_aerosol_index?: number;

  // Ground truth (target)
  pm25_actual: number;
  no2_actual: number;
  o3_actual: number;

  // Meteorology
  temperature: number;
  humidity: number;
  wind_speed: number;
  wind_direction: number;
  precipitation: number;
  pbl_height: number;
  pressure: number;

  // Fires
  fires_count: number;
  fires_total_frp: number;
  fires_closest_distance: number;

  // Engineered features
  wind_u: number;
  wind_v: number;
}

interface EPARecord {
  lat: number;
  lon: number;
  timestamp: Date;
  pm25?: number;
  no2?: number;
  o3?: number;
}

interface FIRMSRecord {
  lat: number;
  lon: number;
  timestamp: Date;
  frp: number;
  confidence: number;
}

interface OpenMeteoRecord {
  timestamp: Date;
  temperature: number;
  humidity: number;
  wind_speed: number;
  wind_direction: number;
  precipitation: number;
  pbl_height: number;
  pressure: number;
}

// ============================================================================
// 3. PARSERS
// ============================================================================

/**
 * Parse EPA AQS CSV
 *
 * Columnas esperadas:
 *   State Code, County Code, Site Num, Latitude, Longitude,
 *   Date Local, Time Local, Sample Measurement, Units of Measure, Parameter Name
 */
async function parseEPAAQS(csvPath: string): Promise<EPARecord[]> {
  const content = fs.readFileSync(csvPath, 'utf-8');
  const { data } = parse(content, { header: true });

  const records: EPARecord[] = [];

  for (const row of data as any[]) {
    const lat = parseFloat(row['Latitude']);
    const lon = parseFloat(row['Longitude']);
    const dateStr = row['Date Local'];
    const timeStr = row['Time Local'];
    const value = parseFloat(row['Sample Measurement']);
    const param = row['Parameter Name'];

    // Parse timestamp (local → UTC conversion necesaria)
    const timestamp = parseISO(`${dateStr}T${timeStr}`);

    // Find or create record
    let record = records.find(
      (r) =>
        r.lat === lat &&
        r.lon === lon &&
        r.timestamp.getTime() === timestamp.getTime()
    );

    if (!record) {
      record = { lat, lon, timestamp };
      records.push(record);
    }

    // Map parameter
    if (param.includes('PM2.5')) {
      record.pm25 = value;
    } else if (param.includes('Nitrogen dioxide')) {
      record.no2 = value;
    } else if (param.includes('Ozone')) {
      record.o3 = value;
    }
  }

  return records;
}

/**
 * Parse FIRMS CSV
 */
async function parseFIRMS(csvPath: string): Promise<FIRMSRecord[]> {
  const content = fs.readFileSync(csvPath, 'utf-8');
  const { data } = parse(content, { header: true });

  return (data as any[])
    .filter((row) => parseFloat(row.confidence) >= 50) // Min confidence
    .map((row) => ({
      lat: parseFloat(row.latitude),
      lon: parseFloat(row.longitude),
      timestamp: parseISO(`${row.acq_date}T${row.acq_time}`),
      frp: parseFloat(row.frp),
      confidence: parseFloat(row.confidence),
    }));
}

/**
 * Parse TEMPO NetCDF
 * (Requiere xarray en Python o netcdf4.js en Node)
 *
 * TODO: Implementar con netcdf4.js o llamar script Python
 */
async function parseTEMPO(ncPath: string, lat: number, lon: number): Promise<any> {
  // Placeholder: Usar Python script para extract
  // O usar netcdf4.js en TypeScript
  console.warn('TEMPO parsing not implemented. Use Python xarray.');
  return null;
}

/**
 * Parse Open-Meteo JSON (ya lo tenemos de fetch)
 */
function parseOpenMeteo(jsonPath: string): OpenMeteoRecord[] {
  const data = JSON.parse(fs.readFileSync(jsonPath, 'utf-8'));

  return data.hourly.time.map((timestamp: string, i: number) => ({
    timestamp: parseISO(timestamp),
    temperature: data.hourly.temperature_2m[i],
    humidity: data.hourly.relative_humidity_2m[i],
    wind_speed: data.hourly.windspeed_10m[i],
    wind_direction: data.hourly.winddirection_10m[i],
    precipitation: data.hourly.precipitation[i],
    pbl_height: data.hourly.boundary_layer_height[i],
    pressure: data.hourly.surface_pressure[i],
  }));
}

// ============================================================================
// 4. SPATIAL/TEMPORAL JOINS
// ============================================================================

/**
 * Haversine distance (km)
 */
function haversine(
  lat1: number,
  lon1: number,
  lat2: number,
  lon2: number
): number {
  const R = 6371; // Earth radius km
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
 * Find nearest EPA station to target city
 */
function findNearestEPA(
  targetLat: number,
  targetLon: number,
  epaRecords: EPARecord[],
  maxDistance: number = 50 // km
): EPARecord[] {
  return epaRecords
    .map((r) => ({
      ...r,
      distance: haversine(targetLat, targetLon, r.lat, r.lon),
    }))
    .filter((r) => r.distance <= maxDistance)
    .sort((a, b) => a.distance - b.distance);
}

/**
 * Find fires within radius
 */
function findFiresNearby(
  targetLat: number,
  targetLon: number,
  timestamp: Date,
  firmsRecords: FIRMSRecord[],
  maxDistance: number = 500 // km
): { count: number; totalFRP: number; closestDistance: number } {
  const nearby = firmsRecords
    .filter((f) => {
      const timeDiff = Math.abs(f.timestamp.getTime() - timestamp.getTime());
      const withinTime = timeDiff < 24 * 3600 * 1000; // Same day
      const distance = haversine(targetLat, targetLon, f.lat, f.lon);
      return withinTime && distance <= maxDistance;
    })
    .map((f) => ({
      ...f,
      distance: haversine(targetLat, targetLon, f.lat, f.lon),
    }));

  if (nearby.length === 0) {
    return { count: 0, totalFRP: 0, closestDistance: Infinity };
  }

  return {
    count: nearby.length,
    totalFRP: nearby.reduce((sum, f) => sum + f.frp, 0),
    closestDistance: Math.min(...nearby.map((f) => f.distance)),
  };
}

// ============================================================================
// 5. MERGE PIPELINE
// ============================================================================

async function mergeDatasets(): Promise<CalibrationSample[]> {
  console.log('Loading datasets...');

  // 1. Load EPA AQS
  const epaRecords: EPARecord[] = [];
  const epaFiles = fs.readdirSync(DATA_DIRS.epa);
  for (const file of epaFiles) {
    if (file.endsWith('.csv')) {
      const records = await parseEPAAQS(path.join(DATA_DIRS.epa, file));
      epaRecords.push(...records);
    }
  }
  console.log(`Loaded ${epaRecords.length} EPA records`);

  // 2. Load FIRMS
  const firmsRecords: FIRMSRecord[] = [];
  const firmsFiles = fs.readdirSync(DATA_DIRS.firms);
  for (const file of firmsFiles) {
    if (file.endsWith('.csv')) {
      const records = await parseFIRMS(path.join(DATA_DIRS.firms, file));
      firmsRecords.push(...records);
    }
  }
  console.log(`Loaded ${firmsRecords.length} FIRMS records`);

  // 3. Merge por ciudad y timestamp
  const samples: CalibrationSample[] = [];

  for (const city of TARGET_CITIES) {
    console.log(`Processing ${city.name}...`);

    // Load Open-Meteo para esta ciudad
    const meteoPath = path.join(
      DATA_DIRS.openmeteo,
      `${city.name.replace(/\s+/g, '_')}.json`
    );
    if (!fs.existsSync(meteoPath)) {
      console.warn(`  Missing Open-Meteo data for ${city.name}`);
      continue;
    }
    const meteoRecords = parseOpenMeteo(meteoPath);

    // Find nearest EPA station
    const nearestEPA = findNearestEPA(city.lat, city.lon, epaRecords);
    if (nearestEPA.length === 0) {
      console.warn(`  No EPA station near ${city.name}`);
      continue;
    }

    // Para cada hora en meteo records
    for (const meteo of meteoRecords) {
      // Find matching EPA record (same hour)
      const epaMatch = nearestEPA.find(
        (epa) =>
          epa.timestamp.getTime() === meteo.timestamp.getTime() &&
          epa.pm25 !== undefined &&
          epa.no2 !== undefined
      );

      if (!epaMatch) continue; // Skip if no ground truth

      // Find fires nearby
      const fires = findFiresNearby(
        city.lat,
        city.lon,
        meteo.timestamp,
        firmsRecords
      );

      // TODO: Get TEMPO data for this location + timestamp
      const tempoData = {
        no2_column: 0, // Placeholder
        hcho_column: 0,
        aerosol_index: 0,
      };

      // Calculate engineered features
      const windU =
        meteo.wind_speed * Math.cos((meteo.wind_direction * Math.PI) / 180);
      const windV =
        meteo.wind_speed * Math.sin((meteo.wind_direction * Math.PI) / 180);

      // Create sample
      samples.push({
        lat: city.lat,
        lon: city.lon,
        city: city.name,
        timestamp: meteo.timestamp.toISOString(),
        hour: meteo.timestamp.getHours(),
        day_of_week: meteo.timestamp.getDay(),
        month: meteo.timestamp.getMonth() + 1,

        // TEMPO
        tempo_no2_column: tempoData.no2_column,
        tempo_hcho_column: tempoData.hcho_column,
        tempo_aerosol_index: tempoData.aerosol_index,

        // Ground truth
        pm25_actual: epaMatch.pm25!,
        no2_actual: epaMatch.no2!,
        o3_actual: epaMatch.o3 || 0,

        // Meteorology
        temperature: meteo.temperature,
        humidity: meteo.humidity,
        wind_speed: meteo.wind_speed,
        wind_direction: meteo.wind_direction,
        precipitation: meteo.precipitation,
        pbl_height: meteo.pbl_height,
        pressure: meteo.pressure,

        // Fires
        fires_count: fires.count,
        fires_total_frp: fires.totalFRP,
        fires_closest_distance: fires.closestDistance,

        // Engineered
        wind_u: windU,
        wind_v: windV,
      });
    }

    console.log(`  ${city.name}: ${samples.length} samples so far`);
  }

  return samples;
}

// ============================================================================
// 6. MAIN
// ============================================================================

async function main() {
  console.log('Starting dataset merge...\n');

  const samples = await mergeDatasets();

  console.log(`\nTotal samples: ${samples.length}`);

  // Save
  const outputPath = './calibration-dataset.json';
  fs.writeFileSync(outputPath, JSON.stringify(samples, null, 2));

  console.log(`\nSaved to: ${outputPath}`);

  // Statistics
  const stats = {
    total_samples: samples.length,
    cities: [...new Set(samples.map((s) => s.city))].length,
    date_range: {
      start: samples[0]?.timestamp,
      end: samples[samples.length - 1]?.timestamp,
    },
    avg_pm25: samples.reduce((sum, s) => sum + s.pm25_actual, 0) / samples.length,
    avg_no2: samples.reduce((sum, s) => sum + s.no2_actual, 0) / samples.length,
  };

  console.log('\nDataset Statistics:');
  console.log(JSON.stringify(stats, null, 2));
}

main().catch(console.error);

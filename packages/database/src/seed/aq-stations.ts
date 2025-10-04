import * as fs from 'fs';
import * as path from 'path';
import { fileURLToPath } from 'url';
import { dirname } from 'path';
import type { PostgresJsDatabase } from 'drizzle-orm/postgres-js';
import { sql } from 'drizzle-orm';
import { aqStations } from '../schema/aq-stations';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

interface StationCSVRow {
  provider: string;
  latitude: string;
  longitude: string;
  parameter: string;
}

// Simple CSV parser
function parseCSV(content: string): Record<string, string>[] {
  const lines = content.split('\n').filter(line => line.trim());
  if (lines.length === 0) return [];

  // Parse header
  const headers = lines[0].split(',');

  // Parse rows
  const records: Record<string, string>[] = [];
  for (let i = 1; i < lines.length; i++) {
    const fields = lines[i].split(',');
    const record: Record<string, string> = {};
    headers.forEach((header, idx) => {
      record[header] = fields[idx] || '';
    });
    records.push(record);
  }

  return records;
}

export async function seedAqStations(db: PostgresJsDatabase) {
  const CSV_PATH = path.join(__dirname, 'aq-stations.csv');

  console.log('Reading CSV file...');
  const content = fs.readFileSync(CSV_PATH, 'utf-8');
  const records = parseCSV(content) as StationCSVRow[];

  console.log(`Found ${records.length} stations to seed`);

  // Preparar datos para inserción con PostGIS geometry
  const stations = records.map(record => {
    const lat = parseFloat(record.latitude);
    const lon = parseFloat(record.longitude);

    return {
      provider: record.provider,
      // PostGIS ST_MakePoint(longitude, latitude) con SRID 4326 (WGS84)
      // NOTA: PostGIS usa (lon, lat), no (lat, lon)
      location: sql`ST_SetSRID(ST_MakePoint(${lon}, ${lat}), 4326)`,
      parameter: record.parameter as 'o2' | 'ozone' | 'pm2.5',
    };
  });

  console.log('Inserting stations into database...');

  // Insertar en lotes de 100 (PostgreSQL tiene límite de ~65535 parámetros)
  const BATCH_SIZE = 100;
  for (let i = 0; i < stations.length; i += BATCH_SIZE) {
    const batch = stations.slice(i, i + BATCH_SIZE);
    await db.insert(aqStations).values(batch);
    console.log(`  Inserted ${Math.min(i + BATCH_SIZE, stations.length)}/${stations.length} stations`);
  }

  console.log('Seeding completed!');
}

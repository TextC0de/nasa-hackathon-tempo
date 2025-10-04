import * as fs from 'fs';
import * as path from 'path';
import { db } from '../index';
import { aqStations } from '../schema/aq-stations';

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

async function seedAqStations() {
  const CSV_PATH = path.join(__dirname, 'aq-stations.csv');

  console.log('Reading CSV file...');
  const content = fs.readFileSync(CSV_PATH, 'utf-8');
  const records = parseCSV(content) as StationCSVRow[];

  console.log(`Found ${records.length} stations to seed`);

  // Preparar datos para inserción
  const stations = records.map(record => ({
    provider: record.provider,
    latitude: parseFloat(record.latitude),
    longitude: parseFloat(record.longitude),
    parameter: record.parameter,
  }));

  console.log('Inserting stations into database...');

  // Insertar en lotes de 1000
  const BATCH_SIZE = 1000;
  for (let i = 0; i < stations.length; i += BATCH_SIZE) {
    const batch = stations.slice(i, i + BATCH_SIZE);
    await db.insert(aqStations).values(batch);
    console.log(`  Inserted ${Math.min(i + BATCH_SIZE, stations.length)}/${stations.length} stations`);
  }

  console.log('Seeding completed!');
}

seedAqStations()
  .catch((error) => {
    console.error('Error seeding AQ stations:', error);
    process.exit(1);
  })
  .finally(() => {
    process.exit(0);
  });

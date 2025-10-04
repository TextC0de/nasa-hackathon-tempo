import * as fs from 'fs';
import * as path from 'path';

interface StationRecord {
  provider: string;
  latitude: number;
  longitude: number;
  parameter: string;
}

const EPA_DIR = path.join(__dirname, '../packages/database/src/seed/epa');
const OUTPUT_CSV = path.join(__dirname, '../packages/database/src/seed/aq-stations.csv');

// Mapeo de nombres de parámetros EPA a nombres normalizados
const PARAMETER_MAP: Record<string, string> = {
  'Nitrogen dioxide (NO2)': 'no2',
  'Ozone': 'ozone',
  'PM2.5 - Local Conditions': 'pm2.5',
};

// Simple CSV parser
function parseCSV(content: string): Record<string, string>[] {
  const lines = content.split('\n').filter(line => line.trim());
  if (lines.length === 0) return [];

  // Parse header
  const headerLine = lines[0];
  const headers: string[] = [];
  let inQuote = false;
  let currentField = '';

  for (let i = 0; i < headerLine.length; i++) {
    const char = headerLine[i];
    if (char === '"') {
      inQuote = !inQuote;
    } else if (char === ',' && !inQuote) {
      headers.push(currentField.replace(/^"|"$/g, ''));
      currentField = '';
    } else {
      currentField += char;
    }
  }
  headers.push(currentField.replace(/^"|"$/g, ''));

  // Parse rows
  const records: Record<string, string>[] = [];
  for (let i = 1; i < lines.length; i++) {
    const line = lines[i];
    const fields: string[] = [];
    inQuote = false;
    currentField = '';

    for (let j = 0; j < line.length; j++) {
      const char = line[j];
      if (char === '"') {
        inQuote = !inQuote;
      } else if (char === ',' && !inQuote) {
        fields.push(currentField.replace(/^"|"$/g, ''));
        currentField = '';
      } else {
        currentField += char;
      }
    }
    fields.push(currentField.replace(/^"|"$/g, ''));

    const record: Record<string, string> = {};
    headers.forEach((header, idx) => {
      record[header] = fields[idx] || '';
    });
    records.push(record);
  }

  return records;
}

// Simple CSV stringifier
function stringifyCSV(data: StationRecord[]): string {
  const headers = ['provider', 'latitude', 'longitude', 'parameter'];
  const rows = [headers.join(',')];

  for (const record of data) {
    const row = headers.map(h => record[h as keyof StationRecord]).join(',');
    rows.push(row);
  }

  return rows.join('\n');
}

async function extractUniqueStations() {
  const stations = new Map<string, StationRecord>();

  // Buscar todos los archivos CSV en el directorio EPA
  const csvFiles: string[] = [];

  function findCsvFiles(dir: string) {
    const entries = fs.readdirSync(dir, { withFileTypes: true });
    for (const entry of entries) {
      const fullPath = path.join(dir, entry.name);
      if (entry.isDirectory()) {
        findCsvFiles(fullPath);
      } else if (entry.isFile() && entry.name.endsWith('.csv')) {
        csvFiles.push(fullPath);
      }
    }
  }

  findCsvFiles(EPA_DIR);
  console.log(`Found ${csvFiles.length} CSV files`);

  // Procesar cada archivo CSV usando streams para archivos grandes
  for (const csvFile of csvFiles) {
    console.log(`Processing ${csvFile}...`);

    const stream = fs.createReadStream(csvFile, { encoding: 'utf-8' });
    let buffer = '';
    let headers: string[] = [];
    let headersParsed = false;
    let lineCount = 0;

    for await (const chunk of stream) {
      buffer += chunk;
      const lines = buffer.split('\n');
      buffer = lines.pop() || '';

      for (const line of lines) {
        if (!line.trim()) continue;

        if (!headersParsed) {
          // Parse headers
          const fields: string[] = [];
          let inQuote = false;
          let currentField = '';

          for (let i = 0; i < line.length; i++) {
            const char = line[i];
            if (char === '"') {
              inQuote = !inQuote;
            } else if (char === ',' && !inQuote) {
              fields.push(currentField.replace(/^"|"$/g, ''));
              currentField = '';
            } else {
              currentField += char;
            }
          }
          fields.push(currentField.replace(/^"|"$/g, ''));
          headers = fields;
          headersParsed = true;
          continue;
        }

        // Parse data row
        const fields: string[] = [];
        let inQuote = false;
        let currentField = '';

        for (let i = 0; i < line.length; i++) {
          const char = line[i];
          if (char === '"') {
            inQuote = !inQuote;
          } else if (char === ',' && !inQuote) {
            fields.push(currentField.replace(/^"|"$/g, ''));
            currentField = '';
          } else {
            currentField += char;
          }
        }
        fields.push(currentField.replace(/^"|"$/g, ''));

        const record: Record<string, string> = {};
        headers.forEach((header, idx) => {
          record[header] = fields[idx] || '';
        });

        const lat = parseFloat(record['Latitude']);
        const lon = parseFloat(record['Longitude']);
        const paramName = record['Parameter Name'];

        if (isNaN(lat) || isNaN(lon)) continue;

        // Normalizar el nombre del parámetro
        const parameter = PARAMETER_MAP[paramName];
        if (!parameter) {
          continue;
        }

        // Crear clave única basada en lat, lon, y parámetro
        const key = `${lat.toFixed(6)}_${lon.toFixed(6)}_${parameter}`;

        if (!stations.has(key)) {
          stations.set(key, {
            provider: 'airnow',
            latitude: lat,
            longitude: lon,
            parameter,
          });
        }

        lineCount++;
        if (lineCount % 100000 === 0) {
          console.log(`  Processed ${lineCount} lines, found ${stations.size} unique stations so far...`);
        }
      }
    }

    console.log(`  Finished ${csvFile}: ${lineCount} lines processed`);
  }

  console.log(`Found ${stations.size} unique stations`);

  // Generar CSV con estaciones únicas
  const stationArray = Array.from(stations.values());
  const csv = stringifyCSV(stationArray);

  fs.writeFileSync(OUTPUT_CSV, csv);
  console.log(`Saved unique stations to ${OUTPUT_CSV}`);
}

extractUniqueStations().catch(console.error);

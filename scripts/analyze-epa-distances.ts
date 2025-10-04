import fs from "fs";
import path from "path";

interface Station {
  id: string;
  lat: number;
  lon: number;
}

function haversineDistance(
  lat1: number,
  lon1: number,
  lat2: number,
  lon2: number
): number {
  const R = 6371; // Radio de la Tierra en km
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

function parseCSV(content: string): string[][] {
  const lines: string[][] = [];
  let currentField = "";
  let currentRow: string[] = [];
  let inQuotes = false;

  for (let i = 0; i < content.length; i++) {
    const char = content[i];
    const nextChar = content[i + 1];

    if (char === '"') {
      if (inQuotes && nextChar === '"') {
        currentField += '"';
        i++;
      } else {
        inQuotes = !inQuotes;
      }
    } else if (char === "," && !inQuotes) {
      currentRow.push(currentField);
      currentField = "";
    } else if (char === "\n" && !inQuotes) {
      if (currentField || currentRow.length > 0) {
        currentRow.push(currentField);
        lines.push(currentRow);
        currentRow = [];
        currentField = "";
      }
    } else if (char !== "\r") {
      currentField += char;
    }
  }

  if (currentField || currentRow.length > 0) {
    currentRow.push(currentField);
    lines.push(currentRow);
  }

  return lines;
}

async function loadStations(dirPath: string): Promise<Station[]> {
  const stations = new Map<string, Station>();
  const files = ["no2.csv", "o3.csv", "pm25.csv"];

  for (const file of files) {
    const filePath = path.join(dirPath, file);
    if (!fs.existsSync(filePath)) continue;

    const stream = fs.createReadStream(filePath, { encoding: "utf-8" });
    let buffer = "";
    let headers: string[] = [];
    let stateCodeIdx = -1,
      countyCodeIdx = -1,
      siteNumIdx = -1,
      latIdx = -1,
      lonIdx = -1;
    let isFirstLine = true;

    for await (const chunk of stream) {
      buffer += chunk;
      const lines = buffer.split("\n");
      buffer = lines.pop() || "";

      for (const line of lines) {
        if (isFirstLine) {
          const headerRow = parseCSV(line + "\n")[0];
          headers = headerRow;
          stateCodeIdx = headers.indexOf("State Code");
          countyCodeIdx = headers.indexOf("County Code");
          siteNumIdx = headers.indexOf("Site Num");
          latIdx = headers.indexOf("Latitude");
          lonIdx = headers.indexOf("Longitude");
          isFirstLine = false;
          continue;
        }

        const rows = parseCSV(line + "\n");
        if (rows.length === 0) continue;
        const row = rows[0];

        const id = `${row[stateCodeIdx]}-${row[countyCodeIdx]}-${row[siteNumIdx]}`;
        const lat = parseFloat(row[latIdx]);
        const lon = parseFloat(row[lonIdx]);

        if (!isNaN(lat) && !isNaN(lon)) {
          stations.set(id, { id, lat, lon });
        }
      }
    }
  }

  return Array.from(stations.values());
}

function analyzeDistances(stations: Station[]) {
  const distances: number[] = [];

  for (let i = 0; i < stations.length; i++) {
    for (let j = i + 1; j < stations.length; j++) {
      const dist = haversineDistance(
        stations[i].lat,
        stations[i].lon,
        stations[j].lat,
        stations[j].lon
      );
      distances.push(dist);
    }
  }

  distances.sort((a, b) => a - b);

  const min = distances[0];
  const max = distances[distances.length - 1];
  const avg = distances.reduce((sum, d) => sum + d, 0) / distances.length;
  const variance =
    distances.reduce((sum, d) => sum + Math.pow(d - avg, 2), 0) /
    distances.length;
  const stdDev = Math.sqrt(variance);

  const midIndex = Math.floor(distances.length / 2);
  const median = distances.length % 2 === 0
    ? (distances[midIndex - 1] + distances[midIndex]) / 2
    : distances[midIndex];

  return { min, max, avg, stdDev, median, count: distances.length };
}

async function main() {
  const dirs = [
    "/Users/ignacio/Documents/projects/nasa-hackathon-tempo/scripts/downloads-uncompressed/epa/2024-full",
    "/Users/ignacio/Documents/projects/nasa-hackathon-tempo/scripts/downloads-uncompressed/epa/2025-ene-jun",
  ];

  for (const dir of dirs) {
    console.log(`\n📊 Análisis de: ${path.basename(path.dirname(dir))}/${path.basename(dir)}`);
    console.log("=".repeat(60));

    const stations = await loadStations(dir);
    console.log(`Estaciones encontradas: ${stations.length}`);

    if (stations.length < 2) {
      console.log("⚠️  No hay suficientes estaciones para calcular distancias");
      continue;
    }

    const stats = analyzeDistances(stations);

    console.log(`\n📏 Estadísticas de distancias (km):`);
    console.log(`   Distancia mínima:        ${stats.min.toFixed(2)} km`);
    console.log(`   Distancia máxima:        ${stats.max.toFixed(2)} km`);
    console.log(`   Promedio:                ${stats.avg.toFixed(2)} km`);
    console.log(`   Mediana:                 ${stats.median.toFixed(2)} km`);
    console.log(`   Desviación estándar:     ${stats.stdDev.toFixed(2)} km`);
    console.log(`   Total de pares:          ${stats.count}`);
  }
}

main().catch(console.error);

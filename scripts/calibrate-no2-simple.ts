#!/usr/bin/env tsx
/**
 * Calibración SIMPLIFICADA del factor de conversión NO2 column → NO2 surface
 *
 * Estrategia más simple y rápida:
 * 1. Cargar archivos TEMPO directamente (sin loadTEMPOGridAtTime)
 * 2. Cargar datos EPA
 * 3. Para cada archivo TEMPO, buscar EPA cercano
 * 4. Regresión lineal simple
 */

import { join } from 'path';
import { readdirSync } from 'fs';
import { execSync } from 'child_process';
import {
  loadEPADataStreaming,
  loadOpenMeteoData,
  getHistoricalWeather,
  type GroundMeasurement
} from '../packages/advection/src';

// ============================================================================
// CONFIGURACIÓN
// ============================================================================

const TEMPO_DIR = join(process.cwd(), 'scripts/data/tempo/california/cropped');
const EPA_FILE = join(process.cwd(), 'scripts/downloads-uncompressed/epa/2024-full/no2.csv');
const OPENMETEO_FILE = join(process.cwd(), 'scripts/data/openmeteo/Los_Angeles.json');
const PYTHON_SCRIPT = join(process.cwd(), 'scripts/extract-tempo-grid-h5py.py');

const LA_LOCATION = { latitude: 34.0522, longitude: -118.2437 };
const RADIUS_KM = 50;
const PBL_REF = 800; // meters

// ============================================================================
// TIPOS
// ============================================================================

interface CalibrationPair {
  no2_column: number;
  no2_surface_epa: number;
  pbl_height: number;
  timestamp: Date;
}

// ============================================================================
// MAIN
// ============================================================================

async function main() {
  console.log('🔧 Calibración SIMPLIFICADA de conversión NO2\n');

  // 1. Listar archivos TEMPO
  console.log('📂 Listando archivos TEMPO...');
  const tempoFiles = readdirSync(TEMPO_DIR)
    .filter(f => f.endsWith('.nc'))
    .sort();

  console.log(`   ✓ ${tempoFiles.length} archivos encontrados\n`);

  // 2. Cargar datos EPA
  console.log('📡 Cargando datos EPA...');
  const epaData = await loadEPADataStreaming(EPA_FILE, {
    parameter: 'NO2',
    filterLocation: { ...LA_LOCATION, radiusKm: RADIUS_KM },
    sampleSize: 10000
  });
  console.log(`   ✓ ${epaData.length} mediciones EPA\n`);

  // 3. Cargar datos meteorológicos
  console.log('🌤️  Cargando datos meteorológicos...');
  const weatherData = loadOpenMeteoData(OPENMETEO_FILE);
  console.log(`   ✓ ${weatherData.length} registros\n`);

  // 4. Procesar archivos TEMPO y crear pares
  console.log('🔗 Procesando archivos TEMPO y creando pares...\n');
  const pairs: CalibrationPair[] = [];

  // Tomar muestra de archivos (cada 5º archivo, máximo 100)
  const sampleFiles = tempoFiles.filter((_, i) => i % 5 === 0).slice(0, 100);

  for (let i = 0; i < sampleFiles.length; i++) {
    const filename = sampleFiles[i];
    const filepath = join(TEMPO_DIR, filename);

    if (i % 10 === 0) {
      console.log(`   Progreso: ${i}/${sampleFiles.length} (${pairs.length} pares)`);
    }

    try {
      // Extraer timestamp del nombre del archivo
      // Formato: TEMPO_NO2_L3_V03_20240110T141610Z_S003.nc
      const match = filename.match(/(\d{4})(\d{2})(\d{2})T(\d{2})(\d{2})(\d{2})/);
      if (!match) continue;

      const [, year, month, day, hour, minute, second] = match;
      const timestamp = new Date(`${year}-${month}-${day}T${hour}:${minute}:${second}Z`);

      // Extraer grid TEMPO usando Python
      const pythonCmd = `python3 "${PYTHON_SCRIPT}" "${filepath}" ${LA_LOCATION.latitude} ${LA_LOCATION.longitude} ${RADIUS_KM}`;
      let output: string;
      try {
        output = execSync(pythonCmd, { encoding: 'utf-8', stdio: ['pipe', 'pipe', 'pipe'] });
      } catch (execError: any) {
        if (i < 3) {
          console.log(`   DEBUG: Python failed for ${filename}: ${execError.message}`);
        }
        continue;
      }

      let gridData: any;
      try {
        gridData = JSON.parse(output);
      } catch (parseError) {
        if (i < 3) {
          console.log(`   DEBUG: JSON parse failed for ${filename}`);
          console.log(`   Output: ${output.substring(0, 200)}`);
        }
        continue;
      }

      // Acceder a la estructura correcta: gridData.grid.cells
      const cells = gridData.grid?.cells || gridData.cells || [];

      if (cells.length === 0) {
        if (i < 3) {
          console.log(`   DEBUG: No cells in grid for ${filename}`);
        }
        continue;
      }

      if (i < 3) {
        console.log(`   DEBUG: Found ${cells.length} cells for ${filename}`);
      }

      // Buscar mediciones EPA cercanas en tiempo (±2 horas)
      const timeWindow = 2 * 60 * 60 * 1000;
      const matchingEPA = epaData.filter(m =>
        Math.abs(m.timestamp.getTime() - timestamp.getTime()) < timeWindow
      );

      if (matchingEPA.length === 0) {
        if (i < 3) {
          console.log(`   DEBUG: No matching EPA for ${filename}`);
        }
        continue;
      }

      if (i < 3) {
        console.log(`   DEBUG: Found ${matchingEPA.length} EPA matches`);
      }

      // Buscar weather (o usar default si no está disponible)
      const weather = getHistoricalWeather(weatherData, timestamp, LA_LOCATION);
      const pblHeight = weather?.pbl_height || PBL_REF; // Usar PBL_REF si no hay dato

      if (i < 3) {
        console.log(`   DEBUG: PBL height = ${pblHeight}m (from weather: ${weather?.pbl_height || 'N/A'})`);
      }

      // Para cada medición EPA, buscar celda TEMPO más cercana
      for (const epaMeasurement of matchingEPA) {
        let closestCell = null;
        let minDist = Infinity;

        for (const cell of cells) {
          if (!cell.no2_column || cell.no2_column <= 0) continue;

          const dist = Math.sqrt(
            (cell.latitude - epaMeasurement.latitude) ** 2 +
            (cell.longitude - epaMeasurement.longitude) ** 2
          );

          if (dist < minDist) {
            minDist = dist;
            closestCell = cell;
          }
        }

        if (!closestCell) continue;

        // Validar datos antes de agregar
        const validNO2 = isFinite(closestCell.no2_column) && closestCell.no2_column > 0;
        const validEPA = isFinite(epaMeasurement.value) && epaMeasurement.value >= 0;
        const validPBL = isFinite(pblHeight) && pblHeight > 0;

        if (i < 3 && pairs.length < 5) {
          console.log(`   DEBUG validation: NO2=${validNO2} (${closestCell.no2_column}), EPA=${validEPA} (${epaMeasurement.value}), PBL=${validPBL} (${weather.pbl_height})`);
        }

        if (!validNO2 || !validEPA || !validPBL) {
          continue;
        }

        // Agregar par
        pairs.push({
          no2_column: closestCell.no2_column,
          no2_surface_epa: epaMeasurement.value,
          pbl_height: pblHeight,
          timestamp
        });
      }
    } catch (error) {
      // Skip archivos con error
      continue;
    }
  }

  console.log(`\n   ✓ ${pairs.length} pares de calibración creados\n`);

  if (pairs.length < 10) {
    console.error(`❌ Insuficientes pares (${pairs.length}/10 mínimo)`);
    console.error('   Intentando con más archivos o ventana temporal más amplia...\n');
    process.exit(1);
  }

  // 5. Calcular factor óptimo
  console.log('📊 Calculando factor de conversión óptimo...\n');

  // X = NO2_column * (PBL_ref / PBL_height)
  // Y = NO2_surface_epa
  const X = pairs.map(p => p.no2_column * (PBL_REF / p.pbl_height));
  const Y = pairs.map(p => p.no2_surface_epa);

  // Regresión NORMAL (con intercept)
  const normal = linearRegression(X, Y);

  // Regresión THROUGH-ORIGIN (sin intercept - físicamente correcto)
  const throughOrigin = linearRegressionThroughOrigin(X, Y);

  console.log('   ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
  console.log('   RESULTADOS DE CALIBRACIÓN');
  console.log('   ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
  console.log('\n   REGRESIÓN NORMAL (con intercept):');
  console.log(`   Factor:            ${normal.slope.toExponential(4)}`);
  console.log(`   Intercept (bias):  ${normal.intercept.toFixed(3)} ppb`);
  console.log(`   R²:                ${normal.r2.toFixed(4)}`);
  console.log('\n   REGRESIÓN THROUGH-ORIGIN (sin intercept - físicamente correcto):');
  console.log(`   Factor:            ${throughOrigin.slope.toExponential(4)}`);
  console.log(`   Intercept (bias):  ${throughOrigin.intercept.toFixed(3)} ppb (forzado)`);
  console.log(`   R²:                ${throughOrigin.r2.toFixed(4)}`);
  console.log(`   Muestras:          ${pairs.length}`);
  console.log('   ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n');

  // Comparar con actual
  const CURRENT_FACTOR = 2e-16 * 0.8;

  // 6. Calcular errores con AMBOS métodos
  const errorsBefore = pairs.map(p => {
    const pred = p.no2_column * CURRENT_FACTOR * (PBL_REF / p.pbl_height);
    return Math.abs(pred - p.no2_surface_epa);
  });

  const errorsNormal = pairs.map(p => {
    const pred = p.no2_column * normal.slope * (PBL_REF / p.pbl_height) + normal.intercept;
    return Math.abs(pred - p.no2_surface_epa);
  });

  const errorsThroughOrigin = pairs.map(p => {
    const pred = p.no2_column * throughOrigin.slope * (PBL_REF / p.pbl_height);
    return Math.abs(pred - p.no2_surface_epa);
  });

  const maeBefore = errorsBefore.reduce((s, e) => s + e, 0) / errorsBefore.length;
  const maeNormal = errorsNormal.reduce((s, e) => s + e, 0) / errorsNormal.length;
  const maeThroughOrigin = errorsThroughOrigin.reduce((s, e) => s + e, 0) / errorsThroughOrigin.length;

  console.log('   Comparación MAE:');
  console.log(`   Antes (factor=0.8):              ${maeBefore.toFixed(2)} ppb`);
  console.log(`   Normal (con intercept):          ${maeNormal.toFixed(2)} ppb (${((maeBefore - maeNormal) / maeBefore * 100).toFixed(1)}% mejora)`);
  console.log(`   Through-Origin (sin intercept):  ${maeThroughOrigin.toFixed(2)} ppb (${((maeBefore - maeThroughOrigin) / maeBefore * 100).toFixed(1)}% mejora)\n`);

  // 7. Generar código para THROUGH-ORIGIN (sin sesgo)
  console.log('💾 Actualizar en types.ts (usando Through-Origin - sin sesgo):\n');
  console.log('```typescript');
  console.log('export const DEFAULT_FACTORS: AdvectionFactors = {');
  console.log(`  no2_column_to_surface: ${(throughOrigin.slope / 2e-16).toFixed(4)}, // Through-origin calibrado`);
  console.log('  pm_index_to_surface: 0.4,');
  console.log('  pbl_reference: 800,');
  console.log('  fire_frp_scaling: 1.0,');
  console.log('  fire_distance_decay: 2.5,');
  console.log('  washout_rate: 0.2,');
  console.log('  bias_correction_weight: 0.0, // No usar bias artificial');
  console.log('};');
  console.log('```\n');

  // 8. Ejemplos
  console.log('📋 Ejemplos (primeros 5 pares):\n');
  pairs.slice(0, 5).forEach((p, i) => {
    const before = p.no2_column * CURRENT_FACTOR * (PBL_REF / p.pbl_height);
    const afterThroughOrigin = p.no2_column * throughOrigin.slope * (PBL_REF / p.pbl_height);

    console.log(`${i + 1}. NO2 column: ${p.no2_column.toExponential(2)}`);
    console.log(`   Antes:            ${before.toFixed(1)} ppb (error: ${Math.abs(before - p.no2_surface_epa).toFixed(1)})`);
    console.log(`   Through-Origin:   ${afterThroughOrigin.toFixed(1)} ppb (error: ${Math.abs(afterThroughOrigin - p.no2_surface_epa).toFixed(1)})`);
    console.log(`   Real:             ${p.no2_surface_epa.toFixed(1)} ppb\n`);
  });

  console.log('✅ Calibración completa!\n');
}

// ============================================================================
// UTILIDADES
// ============================================================================

function linearRegression(X: number[], Y: number[]) {
  const n = X.length;
  const meanX = X.reduce((s, x) => s + x, 0) / n;
  const meanY = Y.reduce((s, y) => s + y, 0) / n;

  let numerator = 0;
  let denominator = 0;

  for (let i = 0; i < n; i++) {
    numerator += (X[i] - meanX) * (Y[i] - meanY);
    denominator += (X[i] - meanX) ** 2;
  }

  const slope = denominator !== 0 ? numerator / denominator : 0;
  const intercept = meanY - slope * meanX;

  const predictions = X.map(x => slope * x + intercept);
  const ssTot = Y.reduce((s, y) => s + (y - meanY) ** 2, 0);
  const ssRes = Y.reduce((s, y, i) => s + (y - predictions[i]) ** 2, 0);
  const r2 = 1 - (ssRes / ssTot);

  return { slope, intercept, r2 };
}

/**
 * Regresión lineal forzando intercept = 0 (through-origin)
 * Esto es físicamente correcto: si NO2 column = 0, entonces NO2 surface = 0
 */
function linearRegressionThroughOrigin(X: number[], Y: number[]) {
  const n = X.length;

  // Para regresión through-origin: slope = Σ(x*y) / Σ(x²)
  let sumXY = 0;
  let sumX2 = 0;

  for (let i = 0; i < n; i++) {
    sumXY += X[i] * Y[i];
    sumX2 += X[i] * X[i];
  }

  const slope = sumX2 !== 0 ? sumXY / sumX2 : 0;
  const intercept = 0; // Forzado

  // Calcular R² para through-origin
  const predictions = X.map(x => slope * x);
  const meanY = Y.reduce((s, y) => s + y, 0) / n;
  const ssTot = Y.reduce((s, y) => s + y ** 2, 0); // Para through-origin, usar Σy²
  const ssRes = Y.reduce((s, y, i) => s + (y - predictions[i]) ** 2, 0);
  const r2 = 1 - (ssRes / ssTot);

  return { slope, intercept, r2 };
}

// ============================================================================
// RUN
// ============================================================================

main().catch(error => {
  console.error('\n❌ Error:', error.message);
  process.exit(1);
});

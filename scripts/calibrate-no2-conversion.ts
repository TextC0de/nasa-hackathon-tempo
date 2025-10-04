#!/usr/bin/env tsx
/**
 * Calibración del factor de conversión NO2 column → NO2 surface
 *
 * Este script:
 * 1. Carga datos TEMPO (NO2 column) y EPA (NO2 surface)
 * 2. Encuentra pares coincidentes en tiempo y espacio
 * 3. Calcula factor óptimo usando regresión lineal
 * 4. Calcula también bias correction
 * 5. Muestra factor calibrado para usar en DEFAULT_FACTORS
 */

import { join } from 'path';
import {
  loadTEMPOGridAtTime,
  toAdvectionGrid,
  getAvailableTEMPOTimestamps,
  loadEPADataStreaming,
  loadOpenMeteoData,
  getHistoricalWeather,
  type GroundMeasurement,
  type AdvectionGrid
} from '../packages/advection/src';

// ============================================================================
// CONFIGURACIÓN
// ============================================================================

const TEMPO_DIR = join(process.cwd(), 'scripts/data/tempo/california/cropped');
const EPA_FILE = join(process.cwd(), 'scripts/downloads-uncompressed/epa/2024-full/no2.csv');
const OPENMETEO_FILE = join(process.cwd(), 'scripts/data/openmeteo/Los_Angeles.json');

const LA_LOCATION = { latitude: 34.0522, longitude: -118.2437 };
const RADIUS_KM = 50;

// ============================================================================
// TIPOS
// ============================================================================

interface CalibrationPair {
  no2_column: number;        // molecules/cm² (TEMPO)
  no2_surface_epa: number;   // ppb (EPA ground truth)
  pbl_height: number;        // meters (OpenMeteo)
  timestamp: Date;
  location: { latitude: number; longitude: number };
}

// ============================================================================
// MAIN
// ============================================================================

async function main() {
  console.log('🔧 Calibración de conversión NO2 column → surface\n');

  // 1. Cargar timestamps TEMPO
  console.log('📂 Cargando archivos TEMPO...');
  const allTimestamps = getAvailableTEMPOTimestamps(TEMPO_DIR);
  console.log(`   ✓ ${allTimestamps.length} archivos encontrados\n`);

  // Tomar solo primeros 80% para calibración (dejar 20% para test)
  const calibrationTimestamps = allTimestamps.slice(0, Math.floor(allTimestamps.length * 0.8));
  console.log(`   Usando ${calibrationTimestamps.length} archivos para calibración\n`);

  // 2. Cargar datos EPA (sin filtro temporal, solo espacial)
  console.log('📡 Cargando datos EPA...');
  const epaData = await loadEPADataStreaming(EPA_FILE, {
    parameter: 'NO2',
    filterLocation: { ...LA_LOCATION, radiusKm: RADIUS_KM },
    sampleSize: 10000 // Más datos para mejor calibración
  });
  console.log(`   ✓ ${epaData.length} mediciones EPA`);

  if (epaData.length > 0) {
    const epaDates = epaData.map(m => m.timestamp).sort((a, b) => a.getTime() - b.getTime());
    console.log(`   Rango EPA: ${epaDates[0].toISOString()} → ${epaDates[epaDates.length - 1].toISOString()}\n`);
  }

  // 3. Cargar datos meteorológicos
  console.log('🌤️  Cargando datos meteorológicos...');
  const weatherData = loadOpenMeteoData(OPENMETEO_FILE);
  console.log(`   ✓ ${weatherData.length} registros\n`);

  // 4. Crear pares de calibración (TEMPO + EPA coincidentes)
  console.log('🔗 Creando pares de calibración...');
  const pairs: CalibrationPair[] = [];

  // Tomar muestra de timestamps (para no procesar todos)
  const sampleTimestamps = calibrationTimestamps.filter((_, i) => i % 10 === 0).slice(0, 50);

  for (let i = 0; i < sampleTimestamps.length; i++) {
    const timestamp = sampleTimestamps[i];

    if (i % 10 === 0) {
      console.log(`   Progreso: ${i}/${sampleTimestamps.length}`);
    }

    try {
      // Cargar grid TEMPO
      const tempoResult = loadTEMPOGridAtTime(
        TEMPO_DIR,
        timestamp,
        LA_LOCATION.latitude,
        LA_LOCATION.longitude,
        RADIUS_KM
      );

      if (!tempoResult) {
        if (i < 5) {
          console.log(`   DEBUG: loadTEMPOGridAtTime returned null for ${timestamp.toISOString()}`);
        }
        continue;
      }

      const grid = toAdvectionGrid(tempoResult);

      // DEBUG: Verificar que el grid tiene NO2
      const cellsWithNO2 = grid.cells.filter(c => c.no2_column && c.no2_column > 0);
      if (i < 3) {
        console.log(`   DEBUG: Grid tiene ${grid.cells.length} celdas, ${cellsWithNO2.length} con NO2 > 0`);
      }

      if (cellsWithNO2.length === 0) {
        if (i < 3) {
          console.log(`   DEBUG: Grid sin celdas NO2, skipping`);
        }
        continue;
      }

      // Buscar mediciones EPA cercanas en tiempo (±2 horas, más flexible)
      const timeWindow = 2 * 60 * 60 * 1000; // 2 horas
      const matchingEPA = epaData.filter(m =>
        Math.abs(m.timestamp.getTime() - timestamp.getTime()) < timeWindow
      );

      if (matchingEPA.length === 0) {
        if (i < 5) {
          console.log(`   DEBUG: No EPA match for ${timestamp.toISOString()}`);
        }
        continue;
      }

      // Para cada medición EPA, buscar celda TEMPO más cercana
      for (const epaMeasurement of matchingEPA) {
        const closestCell = findClosestCell(grid, {
          latitude: epaMeasurement.latitude,
          longitude: epaMeasurement.longitude
        });

        if (!closestCell || !closestCell.no2_column) {
          if (i < 3) {
            console.log(`   DEBUG: No TEMPO cell with NO2 for EPA station`);
          }
          continue;
        }

        // Buscar PBL height del weather más cercano
        const weather = getHistoricalWeather(weatherData, timestamp, LA_LOCATION);
        if (!weather) {
          if (i < 3) {
            console.log(`   DEBUG: No weather data for ${timestamp.toISOString()}`);
          }
          continue;
        }

        pairs.push({
          no2_column: closestCell.no2_column,
          no2_surface_epa: epaMeasurement.value,
          pbl_height: weather.pbl_height,
          timestamp,
          location: {
            latitude: epaMeasurement.latitude,
            longitude: epaMeasurement.longitude
          }
        });
      }
    } catch (error) {
      continue;
    }
  }

  console.log(`\n   ✓ ${pairs.length} pares de calibración creados\n`);

  if (pairs.length < 10) {
    console.error('❌ Insuficientes pares para calibración (necesitamos al menos 10)');
    process.exit(1);
  }

  // 5. Calcular factor óptimo usando regresión lineal
  console.log('📊 Calculando factor de conversión óptimo...\n');

  // Modelo: NO2_surface = (NO2_column * factor) * (PBL_ref / PBL_actual)
  // Queremos encontrar el mejor "factor"

  // Simplificación: asumimos PBL_ref = 800m (valor medio)
  const PBL_REF = 800;

  // Preparar datos para regresión
  // X = NO2_column * (PBL_ref / PBL_height)
  // Y = NO2_surface_epa
  const X = pairs.map(p => p.no2_column * (PBL_REF / p.pbl_height));
  const Y = pairs.map(p => p.no2_surface_epa);

  // Regresión lineal: Y = slope * X + intercept
  const { slope, intercept, r2 } = linearRegression(X, Y);

  console.log('   Resultados de calibración:');
  console.log(`   ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━`);
  console.log(`   Factor óptimo:     ${slope.toExponential(3)}`);
  console.log(`   Intercept (bias):  ${intercept.toFixed(2)} ppb`);
  console.log(`   R² (fit quality):  ${r2.toFixed(3)}`);
  console.log(`   Muestras usadas:   ${pairs.length}`);
  console.log(`   ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n`);

  // Comparar con factor actual
  const CURRENT_FACTOR = 2e-16 * 0.8; // Factor actual en código
  const improvement = ((slope - CURRENT_FACTOR) / CURRENT_FACTOR) * 100;

  console.log('   Comparación con factor actual:');
  console.log(`   Factor actual:     ${CURRENT_FACTOR.toExponential(3)}`);
  console.log(`   Factor calibrado:  ${slope.toExponential(3)}`);
  console.log(`   Cambio:            ${improvement > 0 ? '+' : ''}${improvement.toFixed(1)}%\n`);

  // 6. Mostrar estadísticas de error antes/después
  console.log('📈 Comparación de errores:\n');

  const errorsBefore = pairs.map(p => {
    const predicted = p.no2_column * CURRENT_FACTOR * (PBL_REF / p.pbl_height);
    return Math.abs(predicted - p.no2_surface_epa);
  });

  const errorsAfter = pairs.map(p => {
    const predicted = p.no2_column * slope * (PBL_REF / p.pbl_height) + intercept;
    return Math.abs(predicted - p.no2_surface_epa);
  });

  const maeBefore = errorsBefore.reduce((s, e) => s + e, 0) / errorsBefore.length;
  const maeAfter = errorsAfter.reduce((s, e) => s + e, 0) / errorsAfter.length;

  console.log(`   MAE antes de calibración:  ${maeBefore.toFixed(2)} ppb`);
  console.log(`   MAE después de calibración: ${maeAfter.toFixed(2)} ppb`);
  console.log(`   Mejora:                     ${((maeBefore - maeAfter) / maeBefore * 100).toFixed(1)}%\n`);

  // 7. Generar código para actualizar
  console.log('💾 Código para actualizar DEFAULT_FACTORS:\n');
  console.log('   ```typescript');
  console.log('   export const DEFAULT_FACTORS: AdvectionFactors = {');
  console.log(`     no2_column_to_surface: ${(slope / 2e-16).toFixed(3)}, // Calibrado (era 0.8)`);
  console.log('     pm_index_to_surface: 0.4,');
  console.log('     pbl_reference: 800,');
  console.log('     fire_frp_scaling: 1.0,');
  console.log('     fire_distance_decay: 2.5,');
  console.log('     washout_rate: 0.2,');
  console.log(`     bias_correction_weight: 0.5, // Bias = ${intercept.toFixed(2)} ppb`);
  console.log('   };');
  console.log('   ```\n');

  // 8. Mostrar ejemplos
  console.log('📋 Ejemplos de predicción:\n');
  const examples = pairs.slice(0, 5);

  for (const ex of examples) {
    const predBefore = ex.no2_column * CURRENT_FACTOR * (PBL_REF / ex.pbl_height);
    const predAfter = ex.no2_column * slope * (PBL_REF / ex.pbl_height) + intercept;
    const actual = ex.no2_surface_epa;

    console.log(`   NO2 column: ${ex.no2_column.toExponential(2)} molecules/cm²`);
    console.log(`   Antes:      ${predBefore.toFixed(1)} ppb (error: ${Math.abs(predBefore - actual).toFixed(1)} ppb)`);
    console.log(`   Después:    ${predAfter.toFixed(1)} ppb (error: ${Math.abs(predAfter - actual).toFixed(1)} ppb)`);
    console.log(`   Real (EPA): ${actual.toFixed(1)} ppb`);
    console.log('');
  }

  console.log('✅ Calibración completa!\n');
}

// ============================================================================
// UTILIDADES
// ============================================================================

function findClosestCell(
  grid: AdvectionGrid,
  location: { latitude: number; longitude: number }
) {
  let closest = null;
  let minDist = Infinity;

  for (const cell of grid.cells) {
    const dist = Math.sqrt(
      (cell.latitude - location.latitude) ** 2 +
      (cell.longitude - location.longitude) ** 2
    );

    if (dist < minDist) {
      minDist = dist;
      closest = cell;
    }
  }

  return closest;
}

function linearRegression(X: number[], Y: number[]) {
  const n = X.length;

  // Calcular promedios
  const meanX = X.reduce((s, x) => s + x, 0) / n;
  const meanY = Y.reduce((s, y) => s + y, 0) / n;

  // Calcular slope (pendiente)
  let numerator = 0;
  let denominator = 0;

  for (let i = 0; i < n; i++) {
    numerator += (X[i] - meanX) * (Y[i] - meanY);
    denominator += (X[i] - meanX) ** 2;
  }

  const slope = denominator !== 0 ? numerator / denominator : 0;
  const intercept = meanY - slope * meanX;

  // Calcular R²
  const predictions = X.map(x => slope * x + intercept);
  const ssTot = Y.reduce((s, y) => s + (y - meanY) ** 2, 0);
  const ssRes = Y.reduce((s, y, i) => s + (y - predictions[i]) ** 2, 0);
  const r2 = 1 - (ssRes / ssTot);

  return { slope, intercept, r2 };
}

// ============================================================================
// RUN
// ============================================================================

main().catch(error => {
  console.error('\n❌ Error en calibración:', error);
  process.exit(1);
});

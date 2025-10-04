#!/usr/bin/env tsx
/**
 * Test rápido de integración TEMPO NetCDF
 */

import { join } from 'path';
import { loadTEMPODataAtTime, getAvailableTEMPOTimestamps } from '../packages/advection/src';

const TEMPO_DIR = join(process.cwd(), 'scripts/data/tempo/california/cropped');
const LA_LOCATION = { lat: 34.0522, lon: -118.2437 };

console.log('🧪 Test de Integración TEMPO NetCDF\n');

// 1. Listar archivos disponibles
console.log('📂 Listando timestamps disponibles...');
const timestamps = getAvailableTEMPOTimestamps(TEMPO_DIR);
console.log(`   ✓ ${timestamps.length} archivos TEMPO encontrados`);

if (timestamps.length > 0) {
  console.log(`   Primer archivo: ${timestamps[0].toISOString()}`);
  console.log(`   Último archivo: ${timestamps[timestamps.length - 1].toISOString()}\n`);

  // 2. Cargar datos para primer timestamp
  console.log('📡 Cargando datos TEMPO para Los Angeles...');
  const tempoData = loadTEMPODataAtTime(
    timestamps[0],
    LA_LOCATION.lat,
    LA_LOCATION.lon,
    TEMPO_DIR,
    50
  );

  if (tempoData && tempoData.success) {
    console.log(`   ✅ Datos TEMPO cargados exitosamente!`);
    console.log(`   Timestamp: ${tempoData.timestamp.toISOString()}`);
    console.log(`   NO2 Column: ${tempoData.no2_column.toExponential(2)} ${tempoData.units}`);
    console.log(`   Ubicación más cercana: (${tempoData.location.closest_lat.toFixed(4)}, ${tempoData.location.closest_lon.toFixed(4)})`);
    console.log(`   Distancia: ${tempoData.location.distance_km.toFixed(2)} km`);
    console.log(`   Vecinos encontrados: ${tempoData.neighbors.length}`);
  } else {
    console.error('   ❌ Error cargando datos TEMPO:', tempoData?.error);
  }

  // 3. Test con timestamp intermedio
  console.log('\n📡 Test con timestamp intermedio...');
  const midTimestamp = timestamps[Math.floor(timestamps.length / 2)];
  const tempoData2 = loadTEMPODataAtTime(
    midTimestamp,
    LA_LOCATION.lat,
    LA_LOCATION.lon,
    TEMPO_DIR,
    50
  );

  if (tempoData2 && tempoData2.success) {
    console.log(`   ✅ OK - NO2: ${tempoData2.no2_column.toExponential(2)} ${tempoData2.units}`);
  } else {
    console.error('   ❌ Error:', tempoData2?.error);
  }

  // 4. Test con timestamp que no existe (debería buscar el más cercano)
  console.log('\n📡 Test con timestamp no exacto...');
  const testDate = new Date('2024-01-15T12:30:00Z');
  const tempoData3 = loadTEMPODataAtTime(
    testDate,
    LA_LOCATION.lat,
    LA_LOCATION.lon,
    TEMPO_DIR,
    50
  );

  if (tempoData3 && tempoData3.success) {
    console.log(`   ✅ Encontró archivo más cercano: ${tempoData3.timestamp.toISOString()}`);
    console.log(`   NO2: ${tempoData3.no2_column.toExponential(2)} ${tempoData3.units}`);
  } else {
    console.error('   ❌ Error:', tempoData3?.error);
  }
} else {
  console.error('❌ No se encontraron archivos TEMPO en:', TEMPO_DIR);
}

console.log('\n✅ Test completado');

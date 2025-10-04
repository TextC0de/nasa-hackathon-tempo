#!/usr/bin/env tsx
/**
 * Test script para leer archivos TEMPO NetCDF
 * Explora la estructura del archivo para implementar el loader
 */

import { readFileSync } from 'fs';
import { NetCDFReader } from 'netcdfjs';

const testFile = '/Users/ignacio/Documents/projects/nasa-hackathon-tempo/scripts/data/tempo/california/cropped/TEMPO_NO2_L3_V03_20240110T141610Z_S003.nc';

console.log('📂 Leyendo archivo TEMPO NetCDF...\n');
console.log(`   File: ${testFile.split('/').pop()}\n`);

try {
  // Leer archivo
  const buffer = readFileSync(testFile);
  const reader = new NetCDFReader(buffer);

  // 1. Metadata general
  console.log('📋 METADATA:');
  console.log(`   Format: ${reader.version}`);
  console.log(`   Record dimension: ${reader.recordDimension}`);
  console.log('');

  // 2. Dimensions
  console.log('📐 DIMENSIONS:');
  for (const dim of reader.dimensions) {
    console.log(`   ${dim.name}: ${dim.size}`);
  }
  console.log('');

  // 3. Variables
  console.log('📊 VARIABLES:');
  for (const varName of reader.variables) {
    const variable = reader.getDataVariable(varName);
    console.log(`   ${varName}:`);
    console.log(`      Dimensions: ${variable.dimensions.join(', ')}`);
    console.log(`      Shape: [${variable.dimensions.map(d => reader.dimensionLength(d)).join(', ')}]`);
    console.log(`      Type: ${variable.type}`);

    // Attributes
    const attrs = reader.getAttributeNames(varName);
    if (attrs.length > 0) {
      console.log(`      Attributes: ${attrs.join(', ')}`);

      // Mostrar attributes importantes
      for (const attr of attrs) {
        if (['units', 'long_name', '_FillValue', 'valid_range'].includes(attr)) {
          const value = reader.getAttribute(varName, attr);
          console.log(`         ${attr}: ${JSON.stringify(value)}`);
        }
      }
    }
    console.log('');
  }

  // 4. Leer datos de variables clave
  console.log('🔍 DATOS DE VARIABLES CLAVE:\n');

  // Latitud
  if (reader.variables.includes('latitude') || reader.variables.includes('lat')) {
    const latVarName = reader.variables.includes('latitude') ? 'latitude' : 'lat';
    const latData = reader.getDataVariable(latVarName);
    const latValues = latData.values;
    console.log(`   ${latVarName}:`);
    console.log(`      Min: ${Math.min(...latValues)}`);
    console.log(`      Max: ${Math.max(...latValues)}`);
    console.log(`      Count: ${latValues.length}`);
    console.log(`      Sample: [${latValues.slice(0, 5).map(v => v.toFixed(4)).join(', ')}...]`);
    console.log('');
  }

  // Longitud
  if (reader.variables.includes('longitude') || reader.variables.includes('lon')) {
    const lonVarName = reader.variables.includes('longitude') ? 'longitude' : 'lon';
    const lonData = reader.getDataVariable(lonVarName);
    const lonValues = lonData.values;
    console.log(`   ${lonVarName}:`);
    console.log(`      Min: ${Math.min(...lonValues)}`);
    console.log(`      Max: ${Math.max(...lonValues)}`);
    console.log(`      Count: ${lonValues.length}`);
    console.log(`      Sample: [${lonValues.slice(0, 5).map(v => v.toFixed(4)).join(', ')}...]`);
    console.log('');
  }

  // NO2 column density
  const no2VarNames = ['vertical_column_troposphere', 'no2_column', 'NO2', 'nitrogen_dioxide_tropospheric_column'];
  let no2VarName = null;
  for (const name of no2VarNames) {
    if (reader.variables.includes(name)) {
      no2VarName = name;
      break;
    }
  }

  if (no2VarName) {
    const no2Data = reader.getDataVariable(no2VarName);
    const no2Values = no2Data.values;

    // Filtrar valores válidos (no null/NaN/_FillValue)
    const fillValue = reader.getAttribute(no2VarName, '_FillValue');
    const validValues = no2Values.filter(v =>
      v !== null &&
      v !== undefined &&
      !isNaN(v) &&
      (fillValue === null || v !== fillValue)
    );

    console.log(`   ${no2VarName}:`);
    console.log(`      Total points: ${no2Values.length}`);
    console.log(`      Valid points: ${validValues.length} (${(validValues.length/no2Values.length*100).toFixed(1)}%)`);
    if (validValues.length > 0) {
      console.log(`      Min: ${Math.min(...validValues).toExponential(2)}`);
      console.log(`      Max: ${Math.max(...validValues).toExponential(2)}`);
      console.log(`      Mean: ${(validValues.reduce((a,b) => a+b, 0) / validValues.length).toExponential(2)}`);
      console.log(`      Sample: [${validValues.slice(0, 5).map(v => v.toExponential(2)).join(', ')}...]`);
    }
    console.log('');
  } else {
    console.log('   ⚠️  NO2 column variable not found');
    console.log('   Available variables:', reader.variables.join(', '));
    console.log('');
  }

  // 5. Global attributes
  console.log('🌍 GLOBAL ATTRIBUTES:');
  const globalAttrs = reader.globalAttributes;
  for (const attr of globalAttrs) {
    const value = reader.getAttribute('global', attr.name);
    if (typeof value === 'string' && value.length < 100) {
      console.log(`   ${attr.name}: ${value}`);
    } else if (typeof value !== 'string') {
      console.log(`   ${attr.name}: ${JSON.stringify(value)}`);
    }
  }

  console.log('\n✅ Lectura exitosa!');

} catch (error) {
  console.error('❌ Error leyendo archivo NetCDF:', error);
  console.error(error.stack);
  process.exit(1);
}

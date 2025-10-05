import type { PostgresJsDatabase } from 'drizzle-orm/postgres-js'
import { aqiMeasurements } from '../schema/aqi-measurements'
import { aqStations } from '../schema/aq-stations'
import { eq, and, sql } from 'drizzle-orm'
import { createReadStream } from 'fs'
import { resolve } from 'path'
import { parse } from 'csv-parse'
import { existsSync } from 'fs'

/**
 * Seed AQI Measurements from EPA CSV files
 *
 * Lee archivos CSV de EPA desde scripts/downloads-uncompressed/epa/2025-ene-jun
 * y carga mediciones individuales en la base de datos.
 *
 * Optimizaciones:
 * - Streaming (no carga archivos completos en memoria)
 * - Filtra solo California (State Code = "06")
 * - Batch inserts de 2000 registros
 * - Mapea estaciones usando State+County+Site
 */

interface EPARow {
  'State Code': string
  'County Code': string
  'Site Num': string
  'Latitude': string
  'Longitude': string
  'Parameter Name': string
  'Date GMT': string
  'Time GMT': string
  'Sample Measurement': string
  'Units of Measure': string
  'Qualifier': string
  'State Name': string
  'County Name': string
}

// Función helper para calcular AQI aproximado desde concentración
function calculateSimpleAQI(parameter: string, value: number, unit: string): number {
  // Conversiones básicas según EPA breakpoints
  // https://www.airnow.gov/aqi/aqi-basics/

  if (parameter === 'O3') {
    // Ozone: convertir de PPM a PPB si es necesario
    const ppb = unit.toLowerCase().includes('million') ? value * 1000 : value

    if (ppb <= 54) return Math.round((50 / 54) * ppb)
    if (ppb <= 70) return Math.round(50 + ((100 - 50) / (70 - 55)) * (ppb - 55))
    if (ppb <= 85) return Math.round(100 + ((150 - 100) / (85 - 71)) * (ppb - 71))
    if (ppb <= 105) return Math.round(150 + ((200 - 150) / (105 - 86)) * (ppb - 86))
    return 200
  }

  if (parameter === 'NO2') {
    // NO2 en PPB
    const ppb = value

    if (ppb <= 53) return Math.round((50 / 53) * ppb)
    if (ppb <= 100) return Math.round(50 + ((100 - 50) / (100 - 54)) * (ppb - 54))
    if (ppb <= 360) return Math.round(100 + ((150 - 100) / (360 - 101)) * (ppb - 101))
    if (ppb <= 649) return Math.round(150 + ((200 - 150) / (649 - 361)) * (ppb - 361))
    return 200
  }

  if (parameter === 'PM25') {
    // PM2.5 en μg/m³
    const ugm3 = value

    if (ugm3 <= 12.0) return Math.round((50 / 12.0) * ugm3)
    if (ugm3 <= 35.4) return Math.round(50 + ((100 - 50) / (35.4 - 12.1)) * (ugm3 - 12.1))
    if (ugm3 <= 55.4) return Math.round(100 + ((150 - 100) / (55.4 - 35.5)) * (ugm3 - 35.5))
    if (ugm3 <= 150.4) return Math.round(150 + ((200 - 150) / (150.4 - 55.5)) * (ugm3 - 55.5))
    return 200
  }

  return 0 // Default para parámetros no soportados
}

function getAQICategory(aqi: number): number {
  if (aqi <= 50) return 1 // Good
  if (aqi <= 100) return 2 // Moderate
  if (aqi <= 150) return 3 // Unhealthy for Sensitive
  if (aqi <= 200) return 4 // Unhealthy
  if (aqi <= 300) return 5 // Very Unhealthy
  return 6 // Hazardous
}

export async function seedAqiMeasurements(db: PostgresJsDatabase<Record<string, unknown>>) {
  console.log('\n📊 Seeding AQI Measurements from EPA CSV files...')

  const basePath = resolve(process.cwd(), '../../scripts/downloads-uncompressed/epa/2025-ene-jun')

  // Verificar que exista el directorio
  if (!existsSync(basePath)) {
    console.log(`   ❌ Directorio no encontrado: ${basePath}`)
    console.log(`   ℹ️  Descarga primero los archivos EPA`)
    return
  }

  const files = [
    { path: resolve(basePath, 'o3.csv'), parameter: 'O3' },
    { path: resolve(basePath, 'no2.csv'), parameter: 'NO2' },
    { path: resolve(basePath, 'pm25.csv'), parameter: 'PM25' },
  ]

  // 1. Cargar estaciones de California en memoria para mapeo rápido
  console.log('\n   📍 Cargando estaciones de California...')

  const stations = await db
    .select({
      id: aqStations.id,
      latitude: sql<number>`ST_Y(${aqStations.location})`,
      longitude: sql<number>`ST_X(${aqStations.location})`,
      provider: aqStations.provider,
      parameter: aqStations.parameter,
    })
    .from(aqStations)

  console.log(`   ✓ ${stations.length} estaciones cargadas`)

  // Helper para encontrar station_id por coordenadas (con tolerancia de 0.01°)
  const findStationId = (lat: number, lng: number, param: string): number | null => {
    const station = stations.find(s => {
      const latMatch = Math.abs(s.latitude - lat) < 0.01
      const lngMatch = Math.abs(s.longitude - lng) < 0.01
      const paramMatch = s.parameter.toLowerCase() === param.toLowerCase()
      return latMatch && lngMatch && paramMatch
    })
    return station?.id ?? null
  }

  // 2. Procesar cada archivo CSV
  for (const file of files) {
    if (!existsSync(file.path)) {
      console.log(`\n   ⚠️  Archivo no encontrado: ${file.path}`)
      continue
    }

    console.log(`\n   🔄 Procesando ${file.parameter}...`)
    console.log(`      Archivo: ${file.path}`)

    let totalRows = 0
    let californiaRows = 0
    let insertedRows = 0
    let batch: typeof aqiMeasurements.$inferInsert[] = []
    const batchSize = 2000

    const parser = createReadStream(file.path).pipe(
      parse({
        columns: true,
        skip_empty_lines: true,
      })
    )

    for await (const row of parser as AsyncIterable<EPARow>) {
      totalRows++

      // Filtrar solo California (State Code = "06")
      if (row['State Code'] !== '06') continue

      californiaRows++

      // Parsear valores
      const lat = parseFloat(row['Latitude'])
      const lng = parseFloat(row['Longitude'])
      const value = parseFloat(row['Sample Measurement'])
      const dateGMT = row['Date GMT']
      const timeGMT = row['Time GMT']

      // Validar
      if (isNaN(lat) || isNaN(lng) || isNaN(value)) continue
      if (value < 0) continue // Saltar valores negativos

      // Construir timestamp
      const timestamp = new Date(`${dateGMT}T${timeGMT}:00Z`)
      if (isNaN(timestamp.getTime())) continue

      // Encontrar station_id
      const stationId = findStationId(lat, lng, file.parameter)
      if (!stationId) {
        // Estación no encontrada en aq_stations, skip
        continue
      }

      // Calcular AQI
      const aqi = calculateSimpleAQI(file.parameter, value, row['Units of Measure'])
      const category = getAQICategory(aqi)

      // Agregar a batch
      batch.push({
        station_id: stationId,
        lat,
        lng,
        timestamp,
        parameter: file.parameter as 'O3' | 'NO2' | 'PM25',
        value,
        unit: row['Units of Measure'],
        aqi,
        category,
        site_name: `${row['County Name']}, ${row['State Name']}`,
        agency_name: 'EPA',
        provider: 'epa',
        quality_flag: row['Qualifier'] || 'valid',
        raw_concentration: value,
      })

      // Insert batch si está lleno
      if (batch.length >= batchSize) {
        await db.insert(aqiMeasurements).values(batch).onConflictDoNothing()
        insertedRows += batch.length
        batch = []

        if (insertedRows % 10000 === 0) {
          console.log(`      [${file.parameter}] ${insertedRows.toLocaleString()} registros insertados...`)
        }
      }
    }

    // Insert último batch
    if (batch.length > 0) {
      await db.insert(aqiMeasurements).values(batch).onConflictDoNothing()
      insertedRows += batch.length
    }

    console.log(`   ✅ ${file.parameter} completado:`)
    console.log(`      Total filas: ${totalRows.toLocaleString()}`)
    console.log(`      California: ${californiaRows.toLocaleString()}`)
    console.log(`      Insertadas: ${insertedRows.toLocaleString()}`)
  }

  console.log('\n✅ Seed de mediciones completado!')
}

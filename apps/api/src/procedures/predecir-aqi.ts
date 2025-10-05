import { z } from 'zod'
import { publicProcedure } from '../trpc'
import { sql } from 'drizzle-orm'
import { aqStations } from '@atmos/database'
import { AirNowClient } from '@atmos/airnow-client'
import { OpenMeteoClient, HourlyVariable } from '@atmos/openmeteo-client'
import { TEMPOService } from '@atmos/earthdata-imageserver-client'

/**
 * Build ML features for NO2 prediction
 *
 * TODO: This is a simplified version. For full accuracy, we need:
 * - Complete TEMPO grid (for spatial neighborhoods, upwind/downwind)
 * - PBL height from better meteo source
 * - Historical NO2 data from database
 * - Urban proximity calculation
 */
function buildNO2Features(params: {
  no2Column: number
  latitude: number
  longitude: number
  windSpeed: number
  windDirection: number
  temperature: number
  precipitation: number
  timestamp: Date
}): Record<string, number> {
  const { no2Column, latitude, longitude, windSpeed, windDirection, temperature, precipitation, timestamp } = params

  // Temporal features
  const hour = timestamp.getUTCHours()
  const localHour = (hour - 8) % 24 // UTC-8 for LA
  const dayOfWeek = timestamp.getUTCDay()
  const month = timestamp.getUTCMonth() + 1
  const dayOfYear = Math.floor((timestamp.getTime() - new Date(timestamp.getUTCFullYear(), 0, 0).getTime()) / 86400000)

  // Cyclic encoding
  const hourSin = Math.sin(2 * Math.PI * localHour / 24)
  const hourCos = Math.cos(2 * Math.PI * localHour / 24)
  const daySin = Math.sin(2 * Math.PI * dayOfWeek / 7)
  const dayCos = Math.cos(2 * Math.PI * dayOfWeek / 7)
  const monthSin = Math.sin(2 * Math.PI * month / 12)
  const monthCos = Math.cos(2 * Math.PI * month / 12)

  // Wind components
  const windU = windSpeed * Math.cos((windDirection * Math.PI) / 180)
  const windV = windSpeed * Math.sin((windDirection * Math.PI) / 180)

  // Physics-based baseline prediction (calibrated from training)
  const NO2_FACTOR = 1.8749
  const BASE_FACTOR = 2e-16
  const PBL_REF = 800
  const pblHeight = 800 // Default PBL (we don't have real data yet)

  let physicsPred = no2Column * BASE_FACTOR * NO2_FACTOR
  const pblFactor = Math.sqrt(PBL_REF / Math.max(pblHeight, 300))
  physicsPred *= pblFactor

  // Diurnal adjustment
  let diurnalFactor = 1.0
  if (localHour >= 6 && localHour < 10) diurnalFactor = 1.15
  else if (localHour >= 10 && localHour < 16) diurnalFactor = 0.85
  else if (localHour >= 16 && localHour < 20) diurnalFactor = 1.1
  physicsPred *= diurnalFactor

  // Estimate urban proximity (simplified - based on California major cities)
  const urbanProximity = estimateUrbanProximity(latitude, longitude)
  const distanceToCity = estimateDistanceToNearestCity(latitude, longitude)

  // Build features with conservative defaults for missing spatial data
  // TODO: Replace with real grid-based calculations
  return {
    // Center
    no2_column_center: no2Column,

    // Geographic
    urban_proximity_index: urbanProximity,
    distance_to_nearest_city_km: distanceToCity,

    // Spatial (using center value as proxy - NOT IDEAL)
    no2_avg_5km: no2Column,
    no2_max_5km: no2Column * 1.1,
    no2_min_5km: no2Column * 0.9,
    no2_std_5km: no2Column * 0.05,

    no2_avg_10km: no2Column,
    no2_max_10km: no2Column * 1.1,
    no2_min_10km: no2Column * 0.9,
    no2_std_10km: no2Column * 0.05,

    no2_avg_20km: no2Column,
    no2_max_20km: no2Column * 1.1,
    no2_min_20km: no2Column * 0.9,
    no2_std_20km: no2Column * 0.05,

    // Upwind (using center value - needs real grid data)
    no2_upwind_10km_avg: no2Column,
    no2_upwind_10km_max: no2Column * 1.1,
    no2_upwind_10km_std: no2Column * 0.05,

    no2_upwind_20km_avg: no2Column,
    no2_upwind_20km_max: no2Column * 1.1,
    no2_upwind_20km_std: no2Column * 0.05,

    no2_upwind_30km_avg: no2Column,
    no2_upwind_30km_max: no2Column * 1.1,
    no2_upwind_30km_std: no2Column * 0.05,

    // Downwind
    no2_downwind_10km_avg: no2Column,
    no2_downwind_10km_max: no2Column * 1.1,
    no2_downwind_10km_std: no2Column * 0.05,

    // Cardinals
    no2_north_10km: no2Column,
    no2_north_std_10km: no2Column * 0.05,
    no2_east_10km: no2Column,
    no2_east_std_10km: no2Column * 0.05,
    no2_south_10km: no2Column,
    no2_south_std_10km: no2Column * 0.05,
    no2_west_10km: no2Column,
    no2_west_std_10km: no2Column * 0.05,

    // Gradients (zero since we don't have spatial variation)
    gradient_NS: 0,
    gradient_EW: 0,
    gradient_upwind_downwind: 0,
    gradient_center_avg: 0,

    // Meteorology
    wind_speed: windSpeed,
    wind_direction: windDirection,
    wind_u: windU,
    wind_v: windV,
    pbl_height: pblHeight,
    temperature: temperature,
    precipitation: precipitation,
    pbl_normalized: pblHeight / 800,

    // Temporal
    hour: localHour,
    day_of_week: dayOfWeek,
    month: month,
    hour_sin: hourSin,
    hour_cos: hourCos,
    day_sin: daySin,
    day_cos: dayCos,

    // Physics
    physics_prediction: physicsPred,

    // Historical (not available - use 0)
    no2_avg_24h: 0,
    no2_avg_7d: 0,
    no2_trend_24h: 0,

    // Interactions
    wind_speed_x_upwind_no2: windSpeed * no2Column,
    hour_x_urban: localHour * urbanProximity,
    pbl_x_center_no2: pblHeight * no2Column,

    // Advanced temporal
    day_of_year: dayOfYear,
    month_sin: monthSin,
    month_cos: monthCos,
  }
}

/** Estimate urban proximity index (simplified) */
function estimateUrbanProximity(lat: number, lon: number): number {
  const majorCities = [
    { name: 'Los Angeles', lat: 34.0522, lon: -118.2437, pop: 3900000 },
    { name: 'San Diego', lat: 32.7157, lon: -117.1611, pop: 1400000 },
    { name: 'San Jose', lat: 37.3382, lon: -121.8863, pop: 1000000 },
    { name: 'San Francisco', lat: 37.7749, lon: -122.4194, pop: 875000 },
  ]

  let totalWeight = 0
  for (const city of majorCities) {
    const dist = Math.sqrt((lat - city.lat) ** 2 + (lon - city.lon) ** 2) * 111 // Rough km
    const weight = city.pop / Math.max(dist, 1)
    totalWeight += weight
  }

  return totalWeight / 1000000 // Normalize
}

/** Estimate distance to nearest major city (simplified) */
function estimateDistanceToNearestCity(lat: number, lon: number): number {
  const majorCities = [
    { lat: 34.0522, lon: -118.2437 },
    { lat: 32.7157, lon: -117.1611 },
    { lat: 37.3382, lon: -121.8863 },
    { lat: 37.7749, lon: -122.4194 },
  ]

  let minDist = Infinity
  for (const city of majorCities) {
    const dist = Math.sqrt((lat - city.lat) ** 2 + (lon - city.lon) ** 2) * 111 // Rough km
    minDist = Math.min(minDist, dist)
  }

  return minDist
}

/**
 * Call ML Service to predict NO2 surface concentration
 */
async function predictNO2WithML(mlServiceUrl: string, features: Record<string, number>): Promise<number | null> {
  try {
    const response = await fetch(`${mlServiceUrl}/predict`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(features),
    })

    if (!response.ok) {
      console.error(`❌ ML Service error: ${response.status} ${response.statusText}`)
      return null
    }

    const data = await response.json()
    return data.predicted_no2_ppb
  } catch (error) {
    console.error(`❌ ML Service call failed:`, error)
    return null
  }
}

/**
 * Procedure: predecir-aqi
 *
 * Predice la calidad del aire en una ubicación específica usando:
 * 1. Búsqueda de estación AQ más cercana (PostgreSQL PostGIS)
 * 2. Datos actuales de AirNow para esa estación
 * 3. Datos meteorológicos de OpenMeteo para esa ubicación
 * 4. Modelo de forecasting (TODO: integrar modelo de advección)
 */
export const predecirAqiProcedure = publicProcedure
  .input(
    z.object({
      latitude: z.number().min(-90).max(90),
      longitude: z.number().min(-180).max(180),
    })
  )
  .query(async ({ input, ctx }) => {
    const { latitude, longitude } = input

    // =====================================================
    // 1. BUSCAR TOP ESTACIONES POR CADA PARÁMETRO
    // =====================================================
    console.log(`📍 Buscando estaciones por parámetro cerca de (${latitude}, ${longitude})...`)

    const MAX_STATIONS_PER_PARAM = 5

    // Configuración de parámetros
    const PARAMETERS_CONFIG = [
      { key: 'O3', dbParam: 'ozone', airNowParams: ['O3', 'OZONE'] },
      { key: 'NO2', dbParam: 'no2', airNowParams: ['NO2'] },
      // AirNow API usa 'PM25' sin punto (no 'PM2.5')
      { key: 'PM25', dbParam: 'pm2.5', airNowParams: ['PM25'] }
    ] as const

    // Helper para buscar estaciones por parámetro
    const findStationsByParameter = async (dbParameter: string) => {
      return await ctx.db
        .select({
          id: aqStations.id,
          provider: aqStations.provider,
          parameter: aqStations.parameter,
          latitude: sql<number>`ST_Y(${aqStations.location})`.as('latitude'),
          longitude: sql<number>`ST_X(${aqStations.location})`.as('longitude'),
          distance: sql<number>`
            ST_Distance(
              ${aqStations.location}::geography,
              ST_SetSRID(ST_MakePoint(${longitude}, ${latitude}), 4326)::geography
            ) / 1000
          `.as('distance'),
        })
        .from(aqStations)
        .where(sql`${aqStations.parameter} = ${dbParameter}`)
        .orderBy(sql`distance ASC`)
        .limit(MAX_STATIONS_PER_PARAM)
    }

    // =====================================================
    // 2. BUSCAR DATOS POR PARÁMETRO CON FALLBACK
    // =====================================================
    console.log(`📊 Buscando datos de AirNow por parámetro con fallback...`)

    const airNowClient = new AirNowClient({
      apiKey: ctx.env.AIRNOW_API_KEY,
    })
    const tempoService = new TEMPOService()
    const now = new Date()

    const timeRanges = [
      { start: 0, end: 1 },
      { start: -1, end: 1 },
      { start: -3, end: 1 },
      { start: -6, end: 1 },
    ]

    // Helper para intentar obtener datos de una estación
    const tryGetStationData = async (station: any, airNowParamNames: string[]) => {
      const bbox = {
        minLongitude: station.longitude - 1.5,
        minLatitude: station.latitude - 1.5,
        maxLongitude: station.longitude + 1.5,
        maxLatitude: station.latitude + 1.5,
      }

      console.log(`      🔎 Buscando datos en bbox:`, {
        station: { lat: station.latitude, lng: station.longitude },
        bbox,
        params: airNowParamNames
      })

      for (const range of timeRanges) {
        const startTime = new Date(now.getTime() + range.start * 60 * 60 * 1000)
        const endTime = new Date(now.getTime() + range.end * 60 * 60 * 1000)

        const startDate = `${startTime.getUTCFullYear()}-${String(startTime.getUTCMonth() + 1).padStart(2, '0')}-${String(startTime.getUTCDate()).padStart(2, '0')}T${String(startTime.getUTCHours()).padStart(2, '0')}`
        const endDate = `${endTime.getUTCFullYear()}-${String(endTime.getUTCMonth() + 1).padStart(2, '0')}-${String(endTime.getUTCDate()).padStart(2, '0')}T${String(endTime.getUTCHours()).padStart(2, '0')}`

        console.log(`      ⏰ Time range: ${startDate} - ${endDate}, params: ${airNowParamNames.join(',')}`)

        const data = await airNowClient.getMonitoringSites(bbox, {
          startDate,
          endDate,
          parameters: airNowParamNames.join(','),
          dataType: 'B',
          verbose: 1,
          monitorType: 2,
          includerawconcentrations: 1,
        })

        // Verificar si tenemos datos del parámetro buscado
        // IMPORTANTE: AirNow devuelve "PM2.5" pero la query usa "PM25"
        const foundData = data.find(obs => {
          const paramUpper = obs.Parameter.toUpperCase().replace('.', '')
          return airNowParamNames.some(param =>
            paramUpper.includes(param.toUpperCase()) ||
            obs.Parameter.toUpperCase().includes(param.toUpperCase())
          )
        })

        if (foundData) {
          console.log(`   ✓ Datos encontrados para ${station.parameter} en estación a ${station.distance.toFixed(2)} km`)
          return foundData
        }
      }

      return null
    }

    // Resultados por parámetro
    type ParameterResult = {
      station: any
      data: any
      tempo: { station: number | null; user: number | null; ratio: number | null; timestamp?: string | undefined }
    } | null

    const parameterResults: {
      O3: ParameterResult
      NO2: ParameterResult
      PM25: ParameterResult
    } = {
      O3: null,
      NO2: null,
      PM25: null
    }

    // =====================================================
    // 3. BUSCAR ESTACIÓN + DATOS + TEMPO POR CADA PARÁMETRO
    // =====================================================
    console.log(`🔄 Procesando cada parámetro con fallback...`)

    for (const config of PARAMETERS_CONFIG) {
      try {
        console.log(`\n   📋 Buscando ${config.key}...`)

        // Obtener top estaciones para este parámetro
        const stations = await findStationsByParameter(config.dbParam)

        if (stations.length === 0) {
          console.log(`   ⚠️  No hay estaciones de ${config.key} en la DB`)
          continue
        }

        console.log(`   🔍 Encontradas ${stations.length} estaciones de ${config.key}`)

        // Intentar cada estación hasta encontrar datos
        for (let i = 0; i < stations.length; i++) {
          const station = stations[i]
          console.log(`   → Intentando estación ${i + 1}/${stations.length} a ${station.distance.toFixed(2)} km...`)

          const airNowData = await tryGetStationData(station, [...config.airNowParams])

        if (airNowData) {
          console.log(`   📊 AirNow data:`, {
            Parameter: airNowData.Parameter,
            AQI: airNowData.AQI,
            Value: airNowData.Value,
            Unit: airNowData.Unit,
            RawConcentration: airNowData.RawConcentration
          })

          // ¡Datos encontrados! Ahora obtener TEMPO (solo para O3 y NO2)
          let tempo: { station: number | null; user: number | null; ratio: number | null; timestamp?: string | undefined } = {
            station: null,
            user: null,
            ratio: null,
            timestamp: undefined
          }

          if (config.key === 'O3' || config.key === 'NO2') {
            try {
              console.log(`   🛰️  Obteniendo datos TEMPO para ${config.key}...`)

              const extent = await (config.key === 'O3'
                ? tempoService.getTemporalExtent('O3')
                : tempoService.getTemporalExtent('NO2'))

              const timestamp = extent.end
              tempo.timestamp = timestamp.toISOString()

              const [stationValue, userValue] = await Promise.all([
                (config.key === 'O3'
                  ? tempoService.getO3AtPoint({
                      location: { latitude: station.latitude, longitude: station.longitude },
                      timestamp
                    })
                  : tempoService.getNO2AtPoint({
                      location: { latitude: station.latitude, longitude: station.longitude },
                      timestamp
                    })
                ).catch(() => null),
                (config.key === 'O3'
                  ? tempoService.getO3AtPoint({
                      location: { latitude, longitude },
                      timestamp
                    })
                  : tempoService.getNO2AtPoint({
                      location: { latitude, longitude },
                      timestamp
                    })
                ).catch(() => null)
              ])

              tempo.station = stationValue?.value ?? null
              tempo.user = userValue?.value ?? null

              // Calcular ratio si tenemos ambos valores
              // Usar RawConcentration porque Value puede ser -999 o 0
              const groundValue = airNowData.RawConcentration > 0 ? airNowData.RawConcentration : airNowData.Value

              if (tempo.station && tempo.station > 0 && groundValue > 0) {
                tempo.ratio = groundValue / tempo.station
                console.log(`   ✓ Ratio ${config.key}: ${tempo.ratio.toFixed(6)} (${groundValue} / ${tempo.station.toExponential(2)})`)
              } else {
                console.log(`   ⚠️  No se pudo calcular ratio: ground=${groundValue}, tempo=${tempo.station}`)
              }

              console.log(`   ✓ TEMPO ${config.key} - Estación: ${tempo.station?.toExponential(2) ?? 'N/A'}, Usuario: ${tempo.user?.toExponential(2) ?? 'N/A'}`)
            } catch (err) {
              console.log(`   ⚠️  TEMPO ${config.key} error: ${err instanceof Error ? err.message : 'Unknown'}`)
            }
          }

          // Guardar resultado
          parameterResults[config.key] = {
            station,
            data: airNowData,
            tempo
          }

          console.log(`   ✅ ${config.key} completo - Estación a ${station.distance.toFixed(2)} km`)
          break // Encontramos datos, siguiente parámetro
        }
      }

        if (!parameterResults[config.key]) {
          console.log(`   ❌ No se encontraron datos activos de ${config.key}`)
        }
      } catch (error) {
        console.error(`   ❌ ERROR procesando ${config.key}:`, error)
        console.error(`   Stack:`, error instanceof Error ? error.stack : 'No stack trace')
        // Continuar con el siguiente parámetro en caso de error
      }
    }

    console.log(`\n📊 Resumen de parámetros encontrados:`)
    console.log(`   O3: ${parameterResults.O3 ? '✅' : '❌'}`)
    console.log(`   NO2: ${parameterResults.NO2 ? '✅' : '❌'}`)
    console.log(`   PM25: ${parameterResults.PM25 ? '✅' : '❌'}`)

    // =====================================================
    // 4. OBTENER DATOS METEOROLÓGICOS
    // =====================================================
    console.log(`🌤️  Obteniendo datos meteorológicos...`)

    const openMeteoClient = new OpenMeteoClient()

    // Usar la primera estación que encontramos para el clima
    const firstStation = parameterResults.O3?.station || parameterResults.NO2?.station || parameterResults.PM25?.station

    let weather = null
    if (firstStation) {
      const forecastData = await openMeteoClient.getForecast(
        {
          latitude: firstStation.latitude,
          longitude: firstStation.longitude,
        },
        {
          hourly: [
            HourlyVariable.TEMPERATURE_2M,
            HourlyVariable.WIND_SPEED_10M,
            HourlyVariable.WIND_DIRECTION_10M,
            HourlyVariable.RELATIVE_HUMIDITY_2M,
            HourlyVariable.PRECIPITATION,
          ],
        }
      )

      weather = openMeteoClient.getWeatherAtTime(forecastData, now)
      console.log(`   ✓ Clima obtenido: ${weather?.temperature}°C`)
    }

    // =====================================================
    // 5. CALCULAR AQI GENERAL (EL PEOR DE TODOS)
    // =====================================================
    const allAqis = [
      parameterResults.O3?.data.AQI,
      parameterResults.NO2?.data.AQI,
      parameterResults.PM25?.data.AQI
    ].filter((aqi) => aqi != null) as number[]

    const generalAqi = allAqis.length > 0 ? Math.max(...allAqis) : null
    let worstParameter = null

    if (generalAqi) {
      if (parameterResults.O3?.data.AQI === generalAqi) worstParameter = parameterResults.O3.data
      else if (parameterResults.NO2?.data.AQI === generalAqi) worstParameter = parameterResults.NO2.data
      else if (parameterResults.PM25?.data.AQI === generalAqi) worstParameter = parameterResults.PM25.data
    }

    // Helper para mapear categorías
    const getCategoryName = (categoryNum: number): string => {
      const categories = ['Good', 'Moderate', 'Unhealthy for Sensitive Groups', 'Unhealthy', 'Very Unhealthy', 'Hazardous']
      return categories[categoryNum - 1] || 'Unknown'
    }

    // Helper para crear forecast mock
    const createForecast = (currentValue: number) => ({
      t1h: currentValue,
      t2h: currentValue,
      t3h: currentValue,
    })

    console.log(`✅ Predicción generada con ${allAqis.length} parámetro(s)`)

    // =====================================================
    // 6. RETORNAR RESULTADO CON ESTACIONES SEPARADAS
    // =====================================================
    return {
      // Estaciones por parámetro (pueden ser diferentes)
      stations: {
        O3: parameterResults.O3?.station ? {
          id: parameterResults.O3.station.id,
          provider: parameterResults.O3.station.provider,
          latitude: parameterResults.O3.station.latitude,
          longitude: parameterResults.O3.station.longitude,
          distanceKm: parameterResults.O3.station.distance,
        } : null,
        NO2: parameterResults.NO2?.station ? {
          id: parameterResults.NO2.station.id,
          provider: parameterResults.NO2.station.provider,
          latitude: parameterResults.NO2.station.latitude,
          longitude: parameterResults.NO2.station.longitude,
          distanceKm: parameterResults.NO2.station.distance,
        } : null,
        PM25: parameterResults.PM25?.station ? {
          id: parameterResults.PM25.station.id,
          provider: parameterResults.PM25.station.provider,
          latitude: parameterResults.PM25.station.latitude,
          longitude: parameterResults.PM25.station.longitude,
          distanceKm: parameterResults.PM25.station.distance,
        } : null,
      },
      // Estación primaria (para retrocompatibilidad) - la más cercana
      station: firstStation ? {
        id: firstStation.id,
        provider: firstStation.provider,
        latitude: firstStation.latitude,
        longitude: firstStation.longitude,
        distanceKm: firstStation.distance,
      } : null,
      weather: weather ? {
        temperature: weather.temperature,
        windSpeed: weather.windSpeed,
        windDirection: weather.windDirection,
        relativeHumidity: weather.relativeHumidity,
        precipitation: weather.precipitation,
      } : null,
      general: generalAqi
        ? {
            aqi: generalAqi,
            category: getCategoryName(worstParameter?.Category ?? 0),
            dominantParameter: worstParameter?.Parameter,
          }
        : null,
      O3: parameterResults.O3
        ? {
            currentData: {
              aqi: parameterResults.O3.data.AQI,
              category: getCategoryName(parameterResults.O3.data.Category),
              value: parameterResults.O3.data.Value,
              unit: parameterResults.O3.data.Unit,
              rawConcentration: parameterResults.O3.data.RawConcentration,
              utc: parameterResults.O3.data.UTC,
              parameterName: parameterResults.O3.data.Parameter,
              siteName: parameterResults.O3.data.SiteName,
            },
            tempo: {
              stationValue: parameterResults.O3.tempo.station,
              userValue: parameterResults.O3.tempo.user,
              ratio: parameterResults.O3.tempo.ratio,
              timestamp: parameterResults.O3.tempo.timestamp ?? undefined,
              // Estimación basada en TEMPO si hay proporción
              estimatedUserValue: parameterResults.O3.tempo.ratio && parameterResults.O3.tempo.user
                ? parameterResults.O3.tempo.ratio * parameterResults.O3.tempo.user
                : null,
            },
            forecast: {
              horizons: [
                { hoursAhead: 1, predictedAQI: createForecast(parameterResults.O3.data.AQI).t1h },
                { hoursAhead: 2, predictedAQI: createForecast(parameterResults.O3.data.AQI).t2h },
                { hoursAhead: 3, predictedAQI: createForecast(parameterResults.O3.data.AQI).t3h },
              ],
            },
          }
        : null,
      NO2: parameterResults.NO2
        ? await (async () => {
            // Try ML-based forecast if enabled and service is available
            let mlPrediction: number | null = null

            if (ctx.env.ML_ENABLED && ctx.env.ML_SERVICE_URL && weather && parameterResults.NO2.tempo.station) {
              try {
                console.log(`🤖 ML enabled - attempting XGBoost prediction for NO2...`)

                const features = buildNO2Features({
                  no2Column: parameterResults.NO2.tempo.station,
                  latitude: parameterResults.NO2.station.latitude,
                  longitude: parameterResults.NO2.station.longitude,
                  windSpeed: weather.windSpeed ?? 5,
                  windDirection: weather.windDirection ?? 270,
                  temperature: weather.temperature ?? 20,
                  precipitation: weather.precipitation ?? 0,
                  timestamp: new Date(),
                })

                mlPrediction = await predictNO2WithML(ctx.env.ML_SERVICE_URL, features)

                if (mlPrediction) {
                  console.log(`✅ ML prediction successful: ${mlPrediction.toFixed(2)} ppb`)
                } else {
                  console.log(`⚠️  ML prediction returned null, using fallback`)
                }
              } catch (err) {
                console.error(`⚠️ ML prediction failed, using fallback:`, err)
              }
            } else if (!ctx.env.ML_ENABLED) {
              console.log(`ℹ️  ML predictions disabled (ML_ENABLED=false)`)
            } else if (!ctx.env.ML_SERVICE_URL) {
              console.log(`ℹ️  ML service URL not configured`)
            }

            // Fallback to current AQI if ML fails
            const forecastAQI = mlPrediction
              ? Math.round(mlPrediction) // Convert ppb to AQI (simplified)
              : parameterResults.NO2.data.AQI

            return {
              currentData: {
                aqi: parameterResults.NO2.data.AQI,
                category: getCategoryName(parameterResults.NO2.data.Category),
                value: parameterResults.NO2.data.Value,
                unit: parameterResults.NO2.data.Unit,
                rawConcentration: parameterResults.NO2.data.RawConcentration,
                utc: parameterResults.NO2.data.UTC,
                parameterName: parameterResults.NO2.data.Parameter,
                siteName: parameterResults.NO2.data.SiteName,
              },
              tempo: {
                stationValue: parameterResults.NO2.tempo.station,
                userValue: parameterResults.NO2.tempo.user,
                ratio: parameterResults.NO2.tempo.ratio,
                timestamp: parameterResults.NO2.tempo.timestamp ?? undefined,
                // Estimación basada en TEMPO si hay proporción
                estimatedUserValue: parameterResults.NO2.tempo.ratio && parameterResults.NO2.tempo.user
                  ? parameterResults.NO2.tempo.ratio * parameterResults.NO2.tempo.user
                  : null,
              },
              forecast: {
                horizons: [
                  { hoursAhead: 1, predictedAQI: forecastAQI, mlPredicted: mlPrediction !== null },
                  { hoursAhead: 2, predictedAQI: forecastAQI, mlPredicted: mlPrediction !== null },
                  { hoursAhead: 3, predictedAQI: forecastAQI, mlPredicted: mlPrediction !== null },
                ],
                mlUsed: mlPrediction !== null,
                mlPredictionPpb: mlPrediction,
              },
            }
          })()
        : null,
      PM25: parameterResults.PM25
        ? {
            currentData: {
              aqi: parameterResults.PM25.data.AQI,
              category: getCategoryName(parameterResults.PM25.data.Category),
              value: parameterResults.PM25.data.Value,
              unit: parameterResults.PM25.data.Unit,
              rawConcentration: parameterResults.PM25.data.RawConcentration,
              utc: parameterResults.PM25.data.UTC,
              parameterName: parameterResults.PM25.data.Parameter,
              siteName: parameterResults.PM25.data.SiteName,
            },
            tempo: null, // PM2.5 no tiene datos TEMPO
            forecast: {
              horizons: [
                { hoursAhead: 1, predictedAQI: createForecast(parameterResults.PM25.data.AQI).t1h },
                { hoursAhead: 2, predictedAQI: createForecast(parameterResults.PM25.data.AQI).t2h },
                { hoursAhead: 3, predictedAQI: createForecast(parameterResults.PM25.data.AQI).t3h },
              ],
            },
          }
        : null,
    }
  })

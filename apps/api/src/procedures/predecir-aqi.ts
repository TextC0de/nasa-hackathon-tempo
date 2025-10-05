import { z } from 'zod'
import { publicProcedure } from '../trpc'
import { sql } from 'drizzle-orm'
import { aqStations } from '@atmos/database'
import { AirNowClient } from '@atmos/airnow-client'
import { OpenMeteoClient, HourlyVariable } from '@atmos/openmeteo-client'
import { TEMPOService } from '@atmos/earthdata-imageserver-client'

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
        ? {
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
                { hoursAhead: 1, predictedAQI: createForecast(parameterResults.NO2.data.AQI).t1h },
                { hoursAhead: 2, predictedAQI: createForecast(parameterResults.NO2.data.AQI).t2h },
                { hoursAhead: 3, predictedAQI: createForecast(parameterResults.NO2.data.AQI).t3h },
              ],
            },
          }
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

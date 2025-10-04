import { z } from 'zod'
import { publicProcedure } from '../trpc'
import { sql } from 'drizzle-orm'
import { aqStations } from '@atmos/database'
import { AirNowClient } from '@atmos/airnow-client'
import { OpenMeteoClient, HourlyVariable } from '@atmos/openmeteo-client'

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
    // 1. BUSCAR ESTACIÓN MÁS CERCANA
    // =====================================================
    console.log(`📍 Buscando estación más cercana a (${latitude}, ${longitude})...`)

    // Usar PostGIS ST_Distance para encontrar la estación más cercana
    // ST_Distance con geography devuelve metros
    const nearestStation = await ctx.db
      .select({
        id: aqStations.id,
        provider: aqStations.provider,
        parameter: aqStations.parameter,
        // Extraer lat/lon de la columna geometry
        latitude: sql<number>`ST_Y(${aqStations.location})`.as('latitude'),
        longitude: sql<number>`ST_X(${aqStations.location})`.as('longitude'),
        // Calcular distancia en kilómetros usando PostGIS ST_Distance con geography
        // geography cast convierte automáticamente a esfera y devuelve metros
        distance: sql<number>`
          ST_Distance(
            ${aqStations.location}::geography,
            ST_SetSRID(ST_MakePoint(${longitude}, ${latitude}), 4326)::geography
          ) / 1000
        `.as('distance'),
      })
      .from(aqStations)
      .orderBy(sql`distance ASC`)
      .limit(1)

    if (!nearestStation || nearestStation.length === 0) {
      throw new Error('No se encontró ninguna estación en la base de datos')
    }

    const station = nearestStation[0]
    console.log(`   ✓ Estación encontrada: ${station.provider} a ${station.distance?.toFixed(2)} km`)

    // =====================================================
    // 2. OBTENER DATOS ACTUALES DE AIRNOW
    // =====================================================
    console.log(`📊 Obteniendo datos de AirNow...`)

    const airNowClient = new AirNowClient({
      apiKey: ctx.env.AIRNOW_API_KEY,
    })

    // Obtener datos actuales de la estación
    const currentAirQuality = await airNowClient.getCurrentObservationsByLocation({
      latitude: station.latitude,
      longitude: station.longitude,
    })

    console.log(`   ✓ ${currentAirQuality.length} observaciones obtenidas`)

    // =====================================================
    // 3. OBTENER DATOS METEOROLÓGICOS DE OPENMETEO
    // =====================================================
    console.log(`🌤️  Obteniendo datos meteorológicos...`)

    const openMeteoClient = new OpenMeteoClient()

    const forecastData = await openMeteoClient.getForecast(
      {
        latitude: station.latitude,
        longitude: station.longitude,
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

    const weather = openMeteoClient.getWeatherAtTime(forecastData, new Date())

    if (!weather) {
      throw new Error('No se pudo obtener el clima actual')
    }

    console.log(`   ✓ Clima obtenido: ${weather.temperature}°C, viento ${weather.windSpeed} m/s`)

    // =====================================================
    // 4. ORGANIZAR DATOS POR PARÁMETRO
    // =====================================================

    // Buscar datos para cada parámetro
    const o3Data = currentAirQuality.find((obs) => obs.ParameterName.toUpperCase().includes('O3'))
    const no2Data = currentAirQuality.find((obs) => obs.ParameterName.toUpperCase().includes('NO2'))
    const pm25Data = currentAirQuality.find((obs) => obs.ParameterName.toUpperCase().includes('PM2.5'))

    // Helper para crear forecast mock
    const createForecast = (currentValue: number) => ({
      t1h: currentValue,
      t2h: currentValue,
      t3h: currentValue,
    })

    console.log(`✅ Predicción generada`)

    // =====================================================
    // 5. CALCULAR AQI GENERAL (EL PEOR DE TODOS)
    // =====================================================
    const allAqis = [o3Data?.AQI, no2Data?.AQI, pm25Data?.AQI].filter((aqi) => aqi != null) as number[]
    const generalAqi = allAqis.length > 0 ? Math.max(...allAqis) : null
    const worstParameter = generalAqi
      ? currentAirQuality.find((obs) => obs.AQI === generalAqi)
      : null

    // =====================================================
    // 6. RETORNAR RESULTADO
    // =====================================================
    return {
      station: {
        id: station.id,
        provider: station.provider,
        latitude: station.latitude,
        longitude: station.longitude,
        distanceKm: station.distance,
      },
      weather: {
        temperature: weather.temperature,
        windSpeed: weather.windSpeed,
        windDirection: weather.windDirection,
        relativeHumidity: weather.relativeHumidity,
        precipitation: weather.precipitation,
      },
      general: generalAqi
        ? {
            aqi: generalAqi,
            category: worstParameter?.Category?.Name,
            dominantParameter: worstParameter?.ParameterName,
          }
        : null,
      O3: o3Data
        ? {
            currentData: {
              aqi: o3Data.AQI,
              category: o3Data.Category?.Name,
              dateObserved: o3Data.DateObserved,
              parameterName: o3Data.ParameterName,
            },
            forecast: {
              horizons: [
                { hoursAhead: 1, predictedAQI: createForecast(o3Data.AQI).t1h },
                { hoursAhead: 2, predictedAQI: createForecast(o3Data.AQI).t2h },
                { hoursAhead: 3, predictedAQI: createForecast(o3Data.AQI).t3h },
              ],
            },
          }
        : null,
      NO2: no2Data
        ? {
            currentData: {
              aqi: no2Data.AQI,
              category: no2Data.Category?.Name,
              dateObserved: no2Data.DateObserved,
              parameterName: no2Data.ParameterName,
            },
            forecast: {
              horizons: [
                { hoursAhead: 1, predictedAQI: createForecast(no2Data.AQI).t1h },
                { hoursAhead: 2, predictedAQI: createForecast(no2Data.AQI).t2h },
                { hoursAhead: 3, predictedAQI: createForecast(no2Data.AQI).t3h },
              ],
            },
          }
        : null,
      PM25: pm25Data
        ? {
            currentData: {
              aqi: pm25Data.AQI,
              category: pm25Data.Category?.Name,
              dateObserved: pm25Data.DateObserved,
              parameterName: pm25Data.ParameterName,
            },
            forecast: {
              horizons: [
                { hoursAhead: 1, predictedAQI: createForecast(pm25Data.AQI).t1h },
                { hoursAhead: 2, predictedAQI: createForecast(pm25Data.AQI).t2h },
                { hoursAhead: 3, predictedAQI: createForecast(pm25Data.AQI).t3h },
              ],
            },
          }
        : null,
    }
  })

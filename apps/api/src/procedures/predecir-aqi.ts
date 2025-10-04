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
      parameter: z.enum(['NO2', 'O3', 'PM25']).optional(),
    })
  )
  .query(async ({ input, ctx }) => {
    const { latitude, longitude, parameter } = input

    // =====================================================
    // 1. BUSCAR ESTACIÓN MÁS CERCANA
    // =====================================================
    console.log(
      `📍 Buscando estación ${parameter || 'cualquier parámetro'} más cercana a (${latitude}, ${longitude})...`
    )

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
      .where(parameter ? sql`${aqStations.parameter} = ${parameter}` : sql`1=1`)
      .orderBy(sql`distance ASC`)
      .limit(1)

    if (!nearestStation || nearestStation.length === 0) {
      throw new Error(
        `No se encontró ninguna estación ${parameter ? `de ${parameter}` : ''} en la base de datos`
      )
    }

    const station = nearestStation[0]
    console.log(`    Estación encontrada: ${station.provider} a ${station.distance?.toFixed(2)} km`)

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

    // Filtrar por el parámetro solicitado (si está especificado)
    const relevantData = parameter
      ? currentAirQuality.filter((obs) => obs.ParameterName.toUpperCase().includes(parameter))
      : currentAirQuality

    console.log(
      `    ${relevantData.length} observaciones ${parameter ? `de ${parameter}` : 'totales'} obtenidas`
    )

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

    console.log(`    Clima obtenido: ${weather.temperature}°C, viento ${weather.windSpeed} m/s`)

    // =====================================================
    // 4. GENERAR PREDICCIÓN (MOCK POR AHORA)
    // =====================================================
    // TODO: Integrar modelo de advección real

    const currentValue = relevantData[0]?.AQI || 0

    const forecast = {
      t1h: currentValue,
      t2h: currentValue,
      t3h: currentValue,
    }

    console.log(`✅ Predicción generada`)

    // =====================================================
    // 5. RETORNAR RESULTADO
    // =====================================================
    return {
      O3: {
        station: {
          id: station.id,
          provider: station.provider,
          latitude: station.latitude,
          longitude: station.longitude,
          parameter: station.parameter,
          distanceKm: station.distance,
        },
        currentData: {
          aqi: relevantData[0]?.AQI,
          category: relevantData[0]?.Category?.Name,
          dateObserved: relevantData[0]?.DateObserved,
          parameterName: relevantData[0]?.ParameterName,
        },
        // Cuando no se especifica parámetro, devolver todos los disponibles
        ...(parameter
          ? {}
          : {
              allParameters: relevantData.map((obs) => ({
                aqi: obs.AQI,
                category: obs.Category?.Name,
                dateObserved: obs.DateObserved,
                parameterName: obs.ParameterName,
              })),
            }),
        weather: {
          temperature: weather.temperature,
          windSpeed: weather.windSpeed,
          windDirection: weather.windDirection,
          relativeHumidity: weather.relativeHumidity,
          precipitation: weather.precipitation,
        },
        forecast: {
          parameter: parameter || relevantData[0]?.ParameterName,
          horizons: [
            { hoursAhead: 1, predictedAQI: forecast.t1h },
            { hoursAhead: 2, predictedAQI: forecast.t2h },
            { hoursAhead: 3, predictedAQI: forecast.t3h },
          ],
        },
      },
    }
  })

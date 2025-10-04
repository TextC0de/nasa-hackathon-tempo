import { z } from 'zod'
import { publicProcedure } from '../trpc'
import { OpenMeteoClient, HourlyVariable } from '@atmos/openmeteo-client'

/**
 * Procedure para obtener clima en tiempo real
 *
 * Usa Open-Meteo Forecast API con pastDays=1 para obtener
 * las condiciones meteorológicas actuales de una ubicación
 */
export const obtenerClimaActualProcedure = publicProcedure
  .input(
    z.object({
      latitud: z.number().min(-90).max(90),
      longitud: z.number().min(-180).max(180),
    })
  )
  .query(async ({ input }) => {
    try {
      const { latitud, longitud } = input
      const meteoClient = new OpenMeteoClient()

      console.log('🌤️ [CLIMA] Obteniendo clima actual para:', { latitud, longitud })

      // Obtener forecast con 1 día hacia atrás (incluye datos actuales)
      const forecast = await meteoClient.getForecast(
        {
          latitude: latitud,
          longitude: longitud,
        },
        {
          pastDays: 1,        // Incluir último día (datos actuales)
          forecastDays: 1,    // Solo 1 día hacia adelante
          hourly: [
            HourlyVariable.TEMPERATURE_2M,        // Temperatura actual
            HourlyVariable.RELATIVE_HUMIDITY_2M,  // Humedad relativa
            HourlyVariable.APPARENT_TEMPERATURE,  // Sensación térmica
            HourlyVariable.PRECIPITATION,         // Precipitación
            HourlyVariable.RAIN,                  // Lluvia
            HourlyVariable.WEATHER_CODE,          // Código de clima
            HourlyVariable.CLOUD_COVER,           // Cobertura de nubes
            HourlyVariable.SURFACE_PRESSURE,      // Presión superficial
            HourlyVariable.WIND_SPEED_10M,        // Velocidad del viento
            HourlyVariable.WIND_DIRECTION_10M,    // Dirección del viento
            HourlyVariable.WIND_GUSTS_10M,        // Ráfagas de viento
          ],
        }
      )

      // Obtener el índice de la hora más reciente (última entrada)
      if (!forecast.hourly || forecast.hourly.time.length === 0) {
        throw new Error('No hay datos de clima disponibles')
      }

      // Buscar el índice de la hora más cercana a ahora
      const now = new Date()
      const currentHourIndex = forecast.hourly.time.findIndex((timeStr) => {
        const timeDate = new Date(timeStr)
        return timeDate <= now
      })

      // Usar el último índice disponible (más reciente)
      const latestIndex = currentHourIndex >= 0
        ? forecast.hourly.time.length - 1 - [...forecast.hourly.time].reverse().findIndex((timeStr) => new Date(timeStr) <= now)
        : forecast.hourly.time.length - 1

      console.log('✅ [CLIMA] Datos obtenidos. Índice actual:', latestIndex)

      // Extraer datos actuales
      const climaActual = {
        timestamp: forecast.hourly.time[latestIndex],
        temperature: forecast.hourly.temperature_2m?.[latestIndex] ?? null,
        apparentTemperature: forecast.hourly.apparent_temperature?.[latestIndex] ?? null,
        humidity: forecast.hourly.relative_humidity_2m?.[latestIndex] ?? null,
        precipitation: forecast.hourly.precipitation?.[latestIndex] ?? null,
        rain: forecast.hourly.rain?.[latestIndex] ?? null,
        weatherCode: forecast.hourly.weather_code?.[latestIndex] ?? null,
        cloudCover: forecast.hourly.cloud_cover?.[latestIndex] ?? null,
        pressure: forecast.hourly.surface_pressure?.[latestIndex] ?? null,
        windSpeed: forecast.hourly.windspeed_10m?.[latestIndex] ?? null,
        windDirection: forecast.hourly.winddirection_10m?.[latestIndex] ?? null,
        windGusts: forecast.hourly.wind_gusts_10m?.[latestIndex] ?? null,
      }

      return {
        location: {
          latitude: latitud,
          longitude: longitud,
          elevation: forecast.elevation,
        },
        timezone: forecast.timezone,
        current: climaActual,
        units: {
          temperature: '°C',
          humidity: '%',
          precipitation: 'mm',
          pressure: 'hPa',
          windSpeed: 'm/s',
          windDirection: '°',
        },
      }
    } catch (error) {
      console.error('❌ [CLIMA] Error al obtener datos de clima:', error)
      throw new Error(
        `No se pudieron obtener los datos de clima: ${error instanceof Error ? error.message : 'Error desconocido'}`
      )
    }
  })

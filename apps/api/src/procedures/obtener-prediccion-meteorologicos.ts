import { z } from 'zod'
import { publicProcedure } from '../trpc'
import { OpenMeteoClient, HourlyVariable } from '@atmos/openmeteo-client'

/**
 * Procedure para obtener predicción meteorológica
 *
 * Soporta dos modos:
 * - Por días (forecastDays): 1-16 días completos
 * - Por horas (horasPronostico): 1-384 horas (16 días)
 */
export const obtenerPrediccionMeteorologicaProcedure = publicProcedure
  .input(
    z.object({
      latitud: z.number().min(-90).max(90),
      longitud: z.number().min(-180).max(180),
      // Opciones mutuamente exclusivas
      diasPrediccion: z.number().min(1).max(16).optional(),
      horasPronostico: z.number().min(1).max(384).optional(), // Máximo 16 días = 384 horas
    }).refine(
      (data) => data.diasPrediccion !== undefined || data.horasPronostico !== undefined,
      { message: "Debe especificar diasPrediccion o horasPronostico" }
    )
  )
  .query(async ({ input }) => {
    try {
      const { latitud, longitud, diasPrediccion, horasPronostico } = input
      const meteorologicoClient = new OpenMeteoClient()

      // Calcular días necesarios basados en horas solicitadas
      const forecastDays = diasPrediccion ?? Math.ceil((horasPronostico ?? 1) / 24)

      console.log('🌤️ [FORECAST] Obteniendo pronóstico:', {
        latitud,
        longitud,
        forecastDays,
        horasSolicitadas: horasPronostico
      })

      // Variables críticas para pronóstico meteorológico
      const datosMeteo = await meteorologicoClient.getForecast(
        {
          latitude: latitud,
          longitude: longitud,
        },
        {
          forecastDays: forecastDays,
          hourly: [
            HourlyVariable.TEMPERATURE_2M,        // Temperatura
            HourlyVariable.APPARENT_TEMPERATURE,  // Sensación térmica
            HourlyVariable.RELATIVE_HUMIDITY_2M,  // Humedad relativa
            HourlyVariable.PRECIPITATION,         // Precipitación
            HourlyVariable.RAIN,                  // Lluvia
            HourlyVariable.WEATHER_CODE,          // Código de clima
            HourlyVariable.CLOUD_COVER,           // Cobertura de nubes
            HourlyVariable.SURFACE_PRESSURE,      // Presión superficial
            HourlyVariable.WIND_SPEED_10M,        // Velocidad del viento
            HourlyVariable.WIND_DIRECTION_10M,    // Dirección del viento
            HourlyVariable.WIND_GUSTS_10M,        // Ráfagas
            HourlyVariable.VISIBILITY,            // Visibilidad
          ],
        }
      )

      // Si se solicitó por horas, filtrar solo las horas necesarias
      let filteredData = datosMeteo
      if (horasPronostico && datosMeteo.hourly) {
        // Encontrar índice de hora actual
        const now = new Date()
        const currentHourIndex = datosMeteo.hourly.time.findIndex((timeStr) => {
          const timeDate = new Date(timeStr)
          return timeDate >= now
        })

        if (currentHourIndex >= 0) {
          const endIndex = Math.min(currentHourIndex + horasPronostico, datosMeteo.hourly.time.length)

          // Filtrar arrays de datos
          filteredData = {
            ...datosMeteo,
            hourly: {
              ...datosMeteo.hourly,
              time: datosMeteo.hourly.time.slice(currentHourIndex, endIndex),
              temperature_2m: datosMeteo.hourly.temperature_2m?.slice(currentHourIndex, endIndex),
              apparent_temperature: datosMeteo.hourly.apparent_temperature?.slice(currentHourIndex, endIndex),
              relative_humidity_2m: datosMeteo.hourly.relative_humidity_2m?.slice(currentHourIndex, endIndex),
              precipitation: datosMeteo.hourly.precipitation?.slice(currentHourIndex, endIndex),
              rain: datosMeteo.hourly.rain?.slice(currentHourIndex, endIndex),
              weather_code: datosMeteo.hourly.weather_code?.slice(currentHourIndex, endIndex),
              cloud_cover: datosMeteo.hourly.cloud_cover?.slice(currentHourIndex, endIndex),
              surface_pressure: datosMeteo.hourly.surface_pressure?.slice(currentHourIndex, endIndex),
              windspeed_10m: datosMeteo.hourly.windspeed_10m?.slice(currentHourIndex, endIndex),
              winddirection_10m: datosMeteo.hourly.winddirection_10m?.slice(currentHourIndex, endIndex),
              wind_gusts_10m: datosMeteo.hourly.wind_gusts_10m?.slice(currentHourIndex, endIndex),
              visibility: datosMeteo.hourly.visibility?.slice(currentHourIndex, endIndex),
            }
          }

          console.log(`✅ [FORECAST] Filtrado a ${horasPronostico} horas (${filteredData.hourly?.time.length} puntos)`)
        }
      }

      return {
        location: {
          latitude: latitud,
          longitude: longitud,
        },
        forecast_days: forecastDays,
        forecast_hours: horasPronostico,
        weather_data: filteredData,
        units: {
          temperature: '°C',
          humidity: '%',
          precipitation: 'mm',
          pressure: 'hPa',
          windSpeed: 'm/s',
          windDirection: '°',
          visibility: 'm'
        }
      }
    } catch (error) {
      console.error('❌ [FORECAST] Error al obtener pronóstico meteorológico:', error)
      throw new Error(
        `No se pudieron obtener los datos meteorológicos: ${error instanceof Error ? error.message : 'Error desconocido'}`
      )
    }
  })

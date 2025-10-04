import { z } from 'zod'
import { publicProcedure } from '../trpc'
import { OpenMeteoClient, HourlyVariable } from '@atmos/openmeteo-client'

export const obtenerPrediccionMeteorologicaProcedure = publicProcedure
  .input(
    z.object({
      latitud: z.number().min(-90).max(90),
      longitud: z.number().min(-180).max(180),
      diasPrediccion: z.number().min(1).max(16).default(7),
    })
  )
  .query(async ({ input }) => {
    try {
      const { latitud, longitud, diasPrediccion } = input
      const meteorologicoClient = new OpenMeteoClient()

      // Variables críticas para modelado de advección y contaminación del aire
      const datosMeteo = await meteorologicoClient.getForecast(
        {
          latitude: latitud,
          longitude: longitud,
        },
        {
          forecastDays: diasPrediccion,
          hourly: [
            HourlyVariable.WIND_SPEED_10M,        // Velocidad del viento (crítico para advección)
            HourlyVariable.WIND_DIRECTION_10M,    // Dirección del viento (crítico para advección)
            HourlyVariable.BOUNDARY_LAYER_HEIGHT, // Altura de capa límite (conversión columna-superficie)
            HourlyVariable.TEMPERATURE_2M,        // Temperatura (estabilidad atmosférica)
            HourlyVariable.PRECIPITATION,         // Precipitación (washout de contaminantes)
            HourlyVariable.RELATIVE_HUMIDITY_2M,  // Humedad relativa
            HourlyVariable.SURFACE_PRESSURE,      // Presión superficial
            HourlyVariable.CLOUD_COVER,           // Cobertura de nubes
          ],
        }
      )

      return {
        location: {
          latitude: latitud,
          longitude: longitud,
        },
        forecast_days: diasPrediccion,
        weather_data: datosMeteo,
      }
    } catch (error) {
      console.error('Error al obtener datos meteorológicos:', error)
      throw new Error(`No se pudieron obtener los datos meteorológicos: ${error instanceof Error ? error.message : 'Error desconocido'}`)
    }
  })

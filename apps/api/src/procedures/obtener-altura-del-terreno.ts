import { z } from 'zod'
import { publicProcedure } from '../trpc'
import { OpenMeteoClient } from '@atmos/openmeteo-client'

export const obtenerAlturaDelTerrenoProcedure = publicProcedure
  .input(
    z.object({
      latitud: z.number().min(-90).max(90),
      longitud: z.number().min(-180).max(180),
    })
  )
  .query(async ({ input }) => {
    try {
      const { latitud, longitud } = input
      const meteorologicoClient = new OpenMeteoClient()

      const elevationData = await meteorologicoClient.getForecast(
        {
          latitude: latitud,
          longitude: longitud
        },
        {
          forecastDays: 1 // Mínimo necesario para obtener la respuesta
        }
      )

      return {
        location: {
          latitude: elevationData.latitude,
          longitude: elevationData.longitude,
        },
        elevation: elevationData.elevation,
        elevation_unit: 'meters',
        timezone: elevationData.timezone,
      }
    } catch (error) {
      console.error('Error al obtener la altura del terreno:', error)
      throw new Error(`No se pudo obtener la altura del terreno: ${error instanceof Error ? error.message : 'Error desconocido'}`)
    }
  })

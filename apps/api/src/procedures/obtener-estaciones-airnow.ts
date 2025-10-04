import { z } from 'zod'
import { publicProcedure } from '../trpc'
import { AirNowClient } from '@atmos/airnow-client'

export const obtenerEstacionesAirNowProcedure = publicProcedure
  .input(
    z.object({
      latitud: z.number().min(0).max(90),
      longitud: z.number().min(-180).max(180),
      radiusKm: z.number().positive().max(500).default(50),
    })
  )
  .query(async ({ input }) => {
    const { latitud, longitud, radiusKm } = input
    const airnowClient = new AirNowClient({ apiKey: 'A09EAF06-910B-4426-A2A8-8DC2D82641C6' })
    const latOffset = radiusKm / 111 // Latitud es constante
    const lngOffset = radiusKm / (111 * Math.cos((latitud * Math.PI) / 180)) // Longitud varía

    try {
      const stations = await airnowClient.getMonitoringSites(
        {
          minLongitude: longitud - lngOffset,
          minLatitude: latitud - latOffset,
          maxLongitude: longitud + lngOffset,
          maxLatitude: latitud + latOffset,
        },
        {
          startDate: '2025-10-04T16',
          endDate: '2025-10-04T17',
          parameters: 'NO2,PM25,O3,PM10,SO2,CO',
        }
      )
      return stations
    } catch (error) {
      console.error('Error al obtener estaciones de AirNow:', error)
    }
  })

import { z } from 'zod'
import { router, publicProcedure } from './trpc'
import { FIRMSClient } from '@atmos/firms-client'
import { SEDACService } from '@atmos/earthdata-imageserver-client'
import { AirNowClient } from '@atmos/airnow-client'
import { ca } from 'zod/v4/locales'

export const appRouter = router({
  hello: publicProcedure.input(z.object({ name: z.string().optional() })).query(({ input }) => {
    return {
      greeting: `Hello ${input.name ?? 'World'}!`,
    }
  }),

  users: publicProcedure.query(() => {
    return [
      { id: 1, name: 'Alice' },
      { id: 2, name: 'Bob' },
    ]
  }),

  createUser: publicProcedure.input(z.object({ name: z.string() })).mutation(({ input }) => {
    return {
      id: Math.floor(Math.random() * 1000),
      name: input.name,
    }
  }),

  obtenerFuegoActivoenArea: publicProcedure
    .input(
      z.object({
        latitud: z.number().min(0).max(90),
        longitud: z.number().min(-180).max(180),
        radiusKm: z.number().positive().max(500).default(50),
      })
    )
    .query(async ({ input }) => {
      const { latitud, longitud, radiusKm } = input

      const bbox = SEDACService.createBBoxFromRadius(
        { latitude: latitud, longitude: longitud },
        radiusKm
      )

      const firmsClient = new FIRMSClient({ mapKey: '0912b42987c4a3aeeb686a0bc0b2f870' })
      const fireData = await firmsClient.getFiresInRegion(bbox.toJSON())

      return fireData
    }),

  obtenerCalidadDelAire: publicProcedure
    .input(
      z.object({
        latitud: z.number().min(0).max(90),
        longitud: z.number().min(-180).max(180),
        radiusKm: z.number().positive().max(500).default(50),
      })
    )
    .query(async ({ input }) => {
      const { latitud, longitud, radiusKm } = input

      const bbox = SEDACService.createBBoxFromRadius(
        { latitude: latitud, longitude: longitud },
        radiusKm
      )

      const airnowClient = new AirNowClient({ apiKey: 'A09EAF06-910B-4426-A2A8-8DC2D82641C6' })
      const observations = await airnowClient.getCurrentObservationsByLocation(
        { latitude: latitud, longitude: longitud },
        { distance: radiusKm }
      )

      return observations
    }),
  obtenerEstacionesAirNow: publicProcedure
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
    }),

   /* obtenerDatosMeteorologicos: publicProcedure
    .input(
      z.object({
        latitud: z.number().min(0).max(90),
        longitud: z.number().min(-180).max(180),
      })
    )
    .query(async ({ input }) => {
      const { latitud, longitud } = input
      const */
})

export type AppRouter = typeof appRouter

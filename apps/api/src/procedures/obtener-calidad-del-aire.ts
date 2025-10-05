import { z } from 'zod'
import { publicProcedure } from '../trpc'
import { AirNowClient } from '@atmos/airnow-client'

export const obtenerCalidadDelAireProcedure = publicProcedure
  .input(
    z.object({
      latitud: z.number().min(0).max(90),
      longitud: z.number().min(-180).max(180),
      radiusKm: z.number().positive().max(500).default(50),
    })
  )
  .query(async ({ input }) => {
    const { latitud, longitud, radiusKm } = input

    const airnowClient = new AirNowClient({ apiKey: 'DA9ADC07-8368-4CA1-8B46-6C3A13D6BA1D' })
    const observations = await airnowClient.getCurrentObservationsByLocation(
      { latitude: latitud, longitude: longitud },
      { distance: radiusKm }
    )

    return observations
  })

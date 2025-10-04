import { z } from 'zod'
import { publicProcedure } from '../trpc'
import { FIRMSClient } from '@atmos/firms-client'
import { SEDACService } from '@atmos/earthdata-imageserver-client'

export const obtenerFuegoActivoenAreaProcedure = publicProcedure
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
  })

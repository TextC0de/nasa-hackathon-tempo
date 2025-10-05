

import { publicProcedure } from '../trpc'
import { z } from 'zod'
import { userReports } from '@atmos/database'

const inputSchema = z.object({
  email: z.string().email('Email inválido'),
  latitud: z.number().min(-90, 'Latitud debe estar entre -90 y 90').max(90, 'Latitud debe estar entre -90 y 90'),
  longitud: z.number().min(-180, 'Longitud debe estar entre -180 y 180').max(180, 'Longitud debe estar entre -180 y 180'),
  descripcion: z.string().max(500, 'La descripción no puede exceder 500 caracteres').optional(),
  gravedad: z.enum(['low', 'intermediate', 'critical'], {
    errorMap: () => ({ message: 'Gravedad debe ser: low, intermediate o critical' })
  }),
  tipo: z.enum(['fire', 'smoke', 'dust'], {
    errorMap: () => ({ message: 'Tipo debe ser: fire, smoke o dust' })
  }),
})

export const crearReporteUsuarioProcedure = publicProcedure
  .input(inputSchema)
  .mutation(async ({ input, ctx }) => {
    const nuevoReporte = await ctx.db.insert(userReports).values({
      email: input.email,
      latitud: input.latitud.toString(),
      longitud: input.longitud.toString(),
      descripcion: input.descripcion,
      gravedad: input.gravedad,
      tipo: input.tipo,
      // fechaReporte se asigna automáticamente con defaultNow()
    }).returning()

    return {
      exito: true,
      reporte: nuevoReporte[0],
      mensaje: 'Reporte creado exitosamente'
    }
  })
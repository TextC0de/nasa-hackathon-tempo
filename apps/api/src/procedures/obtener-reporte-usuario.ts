import { publicProcedure } from '../trpc'
import { userReports } from '@atmos/database'
import { desc } from 'drizzle-orm'

export const obtenerReportesUsuarioProcedure = publicProcedure
  .query(async ({ ctx }) => {
    // Obtener todos los reportes ordenados por fecha más reciente
    const reportes = await ctx.db
      .select()
      .from(userReports)
      .orderBy(desc(userReports.fechaReporte))

    return {
      reportes,
      total: reportes.length
    }
  })

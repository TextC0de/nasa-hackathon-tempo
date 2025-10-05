import { z } from 'zod'
import { publicProcedure } from '../trpc'
import { alerts } from '@atmos/database'
import { desc, eq, and, sql } from 'drizzle-orm'

/**
 * Procedure: listar-alertas
 *
 * Lista alertas con filtros opcionales.
 * Incluye coordenadas extraídas del PostGIS geometry.
 */
export const listarAlertasProcedure = publicProcedure
  .input(
    z.object({
      status: z.enum(['active', 'resolved', 'dismissed']).optional(),
      limit: z.number().min(1).max(100).default(50),
    })
  )
  .query(async ({ input, ctx }) => {
    const { status, limit } = input

    console.log(`📋 Listando alertas${status ? ` (status: ${status})` : ''}`)

    // Query con extracción de coordenadas
    const query = ctx.db
      .select({
        id: alerts.id,
        title: alerts.title,
        description: alerts.description,
        urgency: alerts.urgency,
        status: alerts.status,
        alertType: alerts.alertType,
        locationName: alerts.locationName,
        createdAt: alerts.createdAt,
        resolvedAt: alerts.resolvedAt,
        dismissedAt: alerts.dismissedAt,
        // Extraer coordenadas del PostGIS geometry
        latitude: sql<number>`ST_Y(${alerts.location})`,
        longitude: sql<number>`ST_X(${alerts.location})`,
      })
      .from(alerts)

    // Aplicar filtro de status si existe
    if (status) {
      query.where(eq(alerts.status, status))
    }

    const results = await query
      .orderBy(desc(alerts.createdAt))
      .limit(limit)

    console.log(`   ✓ ${results.length} alertas encontradas`)

    return {
      alerts: results.map(alert => ({
        id: alert.id,
        title: alert.title,
        description: alert.description,
        urgency: alert.urgency,
        status: alert.status,
        alertType: alert.alertType,
        locationName: alert.locationName,
        coordinates: {
          lat: alert.latitude,
          lng: alert.longitude,
        },
        createdAt: alert.createdAt,
        resolvedAt: alert.resolvedAt,
        dismissedAt: alert.dismissedAt,
      })),
    }
  })

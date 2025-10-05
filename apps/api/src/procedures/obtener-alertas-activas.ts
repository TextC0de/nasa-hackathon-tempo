import { z } from 'zod'
import { publicProcedure } from '../trpc'
import { alerts } from '@atmos/database'
import { eq, sql } from 'drizzle-orm'

/**
 * Procedure: obtener-alertas-activas
 *
 * Obtiene alertas activas para la ubicación del usuario.
 * Filtra por radio de distancia usando PostGIS ST_DWithin.
 */
export const obtenerAlertasActivasProcedure = publicProcedure
  .input(
    z.object({
      latitude: z.number().min(-90).max(90),
      longitude: z.number().min(-180).max(180),
      radiusKm: z.number().min(1).max(500).default(100),
    })
  )
  .query(async ({ input, ctx }) => {
    const { latitude, longitude, radiusKm } = input

    console.log(`🔔 Obteniendo alertas activas para (${latitude}, ${longitude})`)
    console.log(`   Radio: ${radiusKm} km`)

    // Consultar alertas activas dentro del radio usando PostGIS
    const radiusMeters = radiusKm * 1000

    const activeAlerts = await ctx.db
      .select({
        id: alerts.id,
        title: alerts.title,
        description: alerts.description,
        urgency: alerts.urgency,
        status: alerts.status,
        alertType: alerts.alertType,
        locationName: alerts.locationName,
        createdAt: alerts.createdAt,
        // Extraer coordenadas
        latitude: sql<number>`ST_Y(${alerts.location})`,
        longitude: sql<number>`ST_X(${alerts.location})`,
        // Calcular distancia en km
        distanceKm: sql<number>`ROUND((ST_Distance(
          ${alerts.location}::geography,
          ST_SetSRID(ST_MakePoint(${longitude}, ${latitude}), 4326)::geography
        ) / 1000)::numeric, 1)`,
      })
      .from(alerts)
      .where(
        sql`
          ${alerts.status} = 'active'
          AND ST_DWithin(
            ${alerts.location}::geography,
            ST_SetSRID(ST_MakePoint(${longitude}, ${latitude}), 4326)::geography,
            ${radiusMeters}
          )
        `
      )
      .orderBy(sql`${alerts.createdAt} DESC`)
      .limit(50)

    console.log(`✅ ${activeAlerts.length} alertas activas encontradas`)

    // Mapear a formato esperado por el frontend
    const mappedAlerts = activeAlerts.map(alert => {
      // Mapear urgency a severity
      const severityMap = {
        low: 'info' as const,
        medium: 'warning' as const,
        high: 'danger' as const,
        critical: 'critical' as const,
      }

      // Mapear alertType a type
      const typeMap = {
        wildfire: 'fire' as const,
        ozone: 'air_quality' as const,
        pm25: 'air_quality' as const,
        custom: 'air_quality' as const,
      }

      return {
        id: alert.id.toString(),
        type: alert.alertType ? typeMap[alert.alertType] : 'air_quality',
        severity: severityMap[alert.urgency],
        title: alert.title,
        message: alert.description,
        location: {
          name: alert.locationName || 'Ubicación desconocida',
          lat: alert.latitude,
          lng: alert.longitude,
        },
        timestamp: alert.createdAt.toISOString(),
        distanceKm: alert.distanceKm,
        createdBy: 'Sistema de Alertas',
      }
    })

    return {
      alerts: mappedAlerts,
      count: mappedAlerts.length,
      lastUpdate: new Date().toISOString(),
    }
  })

import { z } from 'zod'
import { publicProcedure } from '../trpc'
import { alerts } from '@atmos/database'
import { sql } from 'drizzle-orm'

/**
 * Procedure: crear-alerta
 *
 * Crea una nueva alerta de calidad del aire.
 * Guarda en DB para persistencia y tracking.
 */
export const crearAlertaProcedure = publicProcedure
  .input(
    z.object({
      title: z.string().min(3).max(255),
      description: z.string().min(10),
      urgency: z.enum(['low', 'medium', 'high', 'critical']),
      latitude: z.number().min(-90).max(90),
      longitude: z.number().min(-180).max(180),
      locationName: z.string().optional(),
      alertType: z.enum(['wildfire', 'ozone', 'pm25', 'custom']).optional(),
    })
  )
  .mutation(async ({ input, ctx }) => {
    const { title, description, urgency, latitude, longitude, locationName, alertType } = input

    console.log(`🚨 Creando alerta: ${title}`)
    console.log(`   Ubicación: (${latitude}, ${longitude})`)
    console.log(`   Urgencia: ${urgency}`)

    // Crear punto PostGIS
    const location = sql`ST_SetSRID(ST_MakePoint(${longitude}, ${latitude}), 4326)`

    // Insertar alerta
    const [newAlert] = await ctx.db
      .insert(alerts)
      .values({
        title,
        description,
        urgency,
        location,
        locationName,
        alertType,
        status: 'active',
      })
      .returning()

    console.log(`   ✓ Alerta creada con ID: ${newAlert.id}`)

    return {
      success: true,
      alert: {
        id: newAlert.id,
        title: newAlert.title,
        description: newAlert.description,
        urgency: newAlert.urgency,
        status: newAlert.status,
        alertType: newAlert.alertType,
        locationName: newAlert.locationName,
        createdAt: newAlert.createdAt,
      },
    }
  })

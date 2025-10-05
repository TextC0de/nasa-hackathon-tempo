import { z } from 'zod'
import { publicProcedure } from '../trpc'
import { alerts } from '@atmos/database'
import { eq } from 'drizzle-orm'

/**
 * Procedure: actualizar-alerta
 *
 * Actualiza el estado de una alerta (resolver, descartar).
 */
export const actualizarAlertaProcedure = publicProcedure
  .input(
    z.object({
      id: z.number(),
      status: z.enum(['active', 'resolved', 'dismissed']),
    })
  )
  .mutation(async ({ input, ctx }) => {
    const { id, status } = input

    console.log(`✏️  Actualizando alerta ${id} → ${status}`)

    const updateData: any = { status }

    // Agregar timestamp según el nuevo status
    if (status === 'resolved') {
      updateData.resolvedAt = new Date()
    } else if (status === 'dismissed') {
      updateData.dismissedAt = new Date()
    }

    const [updatedAlert] = await ctx.db
      .update(alerts)
      .set(updateData)
      .where(eq(alerts.id, id))
      .returning()

    if (!updatedAlert) {
      throw new Error(`Alerta ${id} no encontrada`)
    }

    console.log(`   ✓ Alerta actualizada`)

    return {
      success: true,
      alert: {
        id: updatedAlert.id,
        status: updatedAlert.status,
        resolvedAt: updatedAlert.resolvedAt,
        dismissedAt: updatedAlert.dismissedAt,
      },
    }
  })

import { z } from 'zod'
import { publicProcedure } from '../trpc'
import { TEMPOService } from '@atmos/earthdata-imageserver-client'

/**
 * Procedimiento para analizar impacto de incendios en calidad del aire
 *
 * Correlaciona datos FIRMS (detección de incendios) con series temporales TEMPO
 * para mostrar evolución de contaminantes (HCHO, NO2) desde T0 (detección) hasta ahora
 */
export const analizarImpactoIncendioProcedure = publicProcedure
  .input(
    z.object({
      fire: z.object({
        latitude: z.number().min(-90).max(90),
        longitude: z.number().min(-180).max(180),
        acq_date: z.string(), // "YYYY-MM-DD"
        acq_time: z.string(), // "HHMM" en UTC
        frp: z.number(), // Fire Radiative Power
      }),
      pollutant: z.enum(['HCHO', 'NO2']).default('HCHO'),
      hoursBack: z.number().min(1).max(48).default(24), // Cuántas horas antes de T0
      hoursForward: z.number().min(0).max(48).default(24), // Cuántas horas después de T0 (o hasta ahora)
    })
  )
  .query(async ({ input }) => {
    try {
      const { fire, pollutant, hoursBack, hoursForward } = input
      const tempoService = new TEMPOService()

      // 1. Parsear T0 (timestamp de detección del incendio)
      // FIRMS usa formato: acq_date="2024-01-15", acq_time="1430" (UTC)
      const [year, month, day] = fire.acq_date.split('-').map(Number)
      const hours = parseInt(fire.acq_time.substring(0, 2))
      const minutes = parseInt(fire.acq_time.substring(2, 4))

      const t0 = new Date(Date.UTC(year, month - 1, day, hours, minutes, 0))

      // 2. Obtener rango temporal disponible real de TEMPO
      const temporalExtent = await tempoService.getTemporalExtent(pollutant)

      // 3. Calcular rango temporal deseado y ajustarlo a datos disponibles
      const requestedStart = new Date(t0.getTime() - hoursBack * 60 * 60 * 1000)
      const requestedEnd = new Date(t0.getTime() + hoursForward * 60 * 60 * 1000)

      // Ajustar a rango disponible
      const startTime = requestedStart < temporalExtent.start
        ? temporalExtent.start
        : requestedStart
      const endTime = requestedEnd > temporalExtent.end
        ? temporalExtent.end
        : requestedEnd

      // 4. Obtener serie temporal de contaminante en ubicación del incendio
      let timeSeries
      if (pollutant === 'HCHO') {
        timeSeries = await tempoService.getHCHOTimeSeries({
          location: { latitude: fire.latitude, longitude: fire.longitude },
          timeRange: { start: startTime, end: endTime },
          intervalHours: 1,
        })
      } else {
        timeSeries = await tempoService.getNO2TimeSeries({
          location: { latitude: fire.latitude, longitude: fire.longitude },
          timeRange: { start: startTime, end: endTime },
          intervalHours: 1,
        })
      }

      // 4. Calcular baseline (promedio antes del incendio)
      const baselinePoints = timeSeries.data.filter(
        (p) => p.timestamp < t0 && p.value !== null
      )
      const baselineValues = baselinePoints.map((p) => p.value!)
      const baselineAvg =
        baselineValues.length > 0
          ? baselineValues.reduce((a, b) => a + b, 0) / baselineValues.length
          : null

      // 5. Encontrar valor en T0 (o más cercano)
      const t0Point = timeSeries.data.reduce((closest, current) => {
        const closestDiff = Math.abs(closest.timestamp.getTime() - t0.getTime())
        const currentDiff = Math.abs(current.timestamp.getTime() - t0.getTime())
        return currentDiff < closestDiff ? current : closest
      }, timeSeries.data[0])

      // 6. Encontrar pico (valor máximo después de T0)
      const postT0Points = timeSeries.data.filter(
        (p) => p.timestamp >= t0 && p.value !== null
      )
      const peakPoint = postT0Points.reduce(
        (max, current) => (current.value! > (max.value || 0) ? current : max),
        postT0Points[0] || { value: null, timestamp: t0 }
      )

      // 7. Valor actual (último dato disponible)
      const currentPoint = timeSeries.data[timeSeries.data.length - 1]

      // 8. Calcular trend (últimas 3 mediciones)
      const recentPoints = timeSeries.data
        .filter((p) => p.value !== null)
        .slice(-3)
      let trend: 'improving' | 'worsening' | 'stable' = 'stable'
      if (recentPoints.length >= 3) {
        const [p1, p2, p3] = recentPoints
        const change1 = p2.value! - p1.value!
        const change2 = p3.value! - p2.value!
        const avgChange = (change1 + change2) / 2
        const threshold = (baselineAvg || 1) * 0.1 // 10% threshold
        if (avgChange < -threshold) trend = 'improving'
        else if (avgChange > threshold) trend = 'worsening'
      }

      // 9. Construir timeline para visualización
      const timeline = timeSeries.data.map((point) => {
        const relativeTime = (point.timestamp.getTime() - t0.getTime()) / (60 * 60 * 1000)
        const changePercent = baselineAvg && point.value !== null
          ? ((point.value - baselineAvg) / baselineAvg) * 100
          : 0

        // Marcar eventos especiales
        const isT0 = Math.abs(point.timestamp.getTime() - t0.getTime()) < 30 * 60 * 1000 // ±30 min
        const isPeak = peakPoint && point.timestamp.getTime() === peakPoint.timestamp.getTime()
        const isCurrent = point.timestamp.getTime() === currentPoint.timestamp.getTime()

        return {
          timestamp: point.timestamp.toISOString(),
          timestampLocal: point.timestamp.toLocaleString('es-MX', {
            timeZone: 'America/Los_Angeles',
            month: 'short',
            day: 'numeric',
            hour: '2-digit',
            minute: '2-digit',
          }),
          relativeTime: relativeTime >= 0 ? `T+${relativeTime.toFixed(0)}h` : `T${relativeTime.toFixed(0)}h`,
          value: point.value,
          valueFormatted: point.value !== null
            ? pollutant === 'HCHO'
              ? `${(point.value / 1e15).toFixed(2)} × 10¹⁵`
              : `${point.value.toFixed(1)} DU`
            : null,
          changePercent: changePercent.toFixed(1),
          event: isT0 ? 'fire_detected' : isPeak ? 'peak' : isCurrent ? 'current' : null,
          reason: (point as any).reason,
        }
      })

      // 10. Calcular métricas de impacto
      const peakIncrease = baselineAvg && peakPoint?.value
        ? ((peakPoint.value - baselineAvg) / baselineAvg) * 100
        : 0
      const currentIncrease = baselineAvg && currentPoint?.value
        ? ((currentPoint.value - baselineAvg) / baselineAvg) * 100
        : 0

      // 11. Generar interpretación y recomendaciones
      const alertLevel: 'low' | 'moderate' | 'high' | 'critical' =
        currentIncrease > 200 ? 'critical' :
        currentIncrease > 100 ? 'high' :
        currentIncrease > 50 ? 'moderate' : 'low'

      const statusMessages = {
        improving: {
          critical: 'Contaminación extrema pero disminuyendo',
          high: 'Alta contaminación, mejorando lentamente',
          moderate: 'Contaminación moderada, en descenso',
          low: 'Niveles casi normales, mejorando',
        },
        worsening: {
          critical: 'Contaminación crítica y empeorando',
          high: 'Alta contaminación, sigue aumentando',
          moderate: 'Contaminación en aumento',
          low: 'Niveles subiendo desde baseline',
        },
        stable: {
          critical: 'Contaminación crítica y estable',
          high: 'Alta contaminación persistente',
          moderate: 'Contaminación moderada estable',
          low: 'Niveles estables cerca de lo normal',
        },
      }

      const recommendations = {
        critical: 'Evacuación recomendada. No salir al exterior. Cerrar todas las ventanas.',
        high: 'Permanecer en interiores. Evitar toda actividad física al aire libre.',
        moderate: 'Limitar exposición al exterior. Grupos sensibles deben permanecer en interiores.',
        low: 'Precaución para grupos sensibles. Monitorear condiciones.',
      }

      return {
        timeline,
        impact: {
          baselineAvg,
          t0Value: t0Point?.value || null,
          peakValue: peakPoint?.value || null,
          currentValue: currentPoint?.value || null,
          peakIncrease: peakIncrease.toFixed(1),
          currentIncrease: currentIncrease.toFixed(1),
          trend,
          unit: timeSeries.unit,
        },
        fire: {
          detectionTime: t0.toISOString(),
          detectionTimeLocal: t0.toLocaleString('es-MX', {
            timeZone: 'America/Los_Angeles',
            dateStyle: 'medium',
            timeStyle: 'short',
          }),
          frp: fire.frp,
          location: {
            latitude: fire.latitude,
            longitude: fire.longitude,
          },
        },
        interpretation: {
          status: statusMessages[trend][alertLevel],
          recommendation: recommendations[alertLevel],
          alertLevel,
          pollutant: pollutant === 'HCHO' ? 'Formaldehído' : 'Dióxido de Nitrógeno',
        },
        statistics: timeSeries.statistics,
      }
    } catch (error) {
      console.error('Error al analizar impacto de incendio:', error)
      throw new Error(
        `No se pudo analizar el impacto del incendio: ${error instanceof Error ? error.message : 'Error desconocido'}`
      )
    }
  })

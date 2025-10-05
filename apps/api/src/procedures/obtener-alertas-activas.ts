import { z } from 'zod'
import { publicProcedure } from '../trpc'

/**
 * Procedure: obtener-alertas-activas
 *
 * Obtiene alertas activas para la ubicación del usuario.
 * Filtra por radio de distancia y últimas 24 horas.
 */
export const obtenerAlertasActivasProcedure = publicProcedure
  .input(
    z.object({
      latitude: z.number().min(-90).max(90),
      longitude: z.number().min(-180).max(180),
      radiusKm: z.number().min(1).max(500).default(100),
    })
  )
  .query(async ({ input }) => {
    const { latitude, longitude, radiusKm } = input

    console.log(`🔔 Obteniendo alertas activas para (${latitude}, ${longitude})`)
    console.log(`   Radio: ${radiusKm} km`)

    // Calcular bounding box para el radio especificado
    const latDelta = radiusKm / 111
    const lngDelta = radiusKm / (111 * Math.cos(latitude * Math.PI / 180))

    const latMin = latitude - latDelta
    const latMax = latitude + latDelta
    const lngMin = longitude - lngDelta
    const lngMax = longitude + lngDelta

    // Filtrar últimas 24 horas
    const last24Hours = new Date()
    last24Hours.setHours(last24Hours.getHours() - 24)

    // Simulación de alertas (más adelante conectarás con tu BD)
    // Por ahora retornamos mock data para testing
    const mockAlerts = [
      {
        id: 'alert-1',
        type: 'air_quality' as const,
        severity: 'warning' as const,
        title: 'AQI Moderado en Los Angeles',
        message: 'El índice de calidad del aire ha alcanzado 85 (Moderado). Grupos sensibles deben considerar reducir actividades al aire libre.',
        location: {
          name: 'Los Angeles',
          lat: 34.0522,
          lng: -118.2437
        },
        aqi: 85,
        timestamp: new Date(Date.now() - 1000 * 60 * 15).toISOString(), // 15 min ago
        expiresAt: new Date(Date.now() + 1000 * 60 * 60 * 4).toISOString(), // expires in 4h
        createdBy: 'EPA California',
        isActive: true
      },
      {
        id: 'alert-2',
        type: 'fire' as const,
        severity: 'danger' as const,
        title: '🔥 Incendio detectado cerca',
        message: 'Se ha detectado un incendio activo a 15km de tu ubicación. El humo puede afectar la calidad del aire.',
        location: {
          name: 'Santa Monica Mountains',
          lat: 34.0928,
          lng: -118.7308
        },
        timestamp: new Date(Date.now() - 1000 * 60 * 45).toISOString(), // 45 min ago
        expiresAt: new Date(Date.now() + 1000 * 60 * 60 * 12).toISOString(), // expires in 12h
        createdBy: 'CalFire',
        isActive: true
      }
    ]

    // Filtrar alertas dentro del bounding box (simulado)
    const alertsInRange = mockAlerts.filter(alert => {
      const inBounds =
        alert.location.lat >= latMin &&
        alert.location.lat <= latMax &&
        alert.location.lng >= lngMin &&
        alert.location.lng <= lngMax

      const isRecent = new Date(alert.timestamp) >= last24Hours

      return inBounds && isRecent && alert.isActive
    })

    // Calcular distancia aproximada
    const alertsWithDistance = alertsInRange.map(alert => {
      const latDiff = alert.location.lat - latitude
      const lngDiff = alert.location.lng - longitude
      const distance = Math.sqrt(latDiff * latDiff + lngDiff * lngDiff) * 111 // km aproximado

      return {
        ...alert,
        distanceKm: Math.round(distance * 10) / 10
      }
    })

    // Ordenar por más recientes primero
    alertsWithDistance.sort((a, b) =>
      new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime()
    )

    console.log(`✅ ${alertsWithDistance.length} alertas activas encontradas`)

    return {
      alerts: alertsWithDistance,
      count: alertsWithDistance.length,
      lastUpdate: new Date().toISOString()
    }
  })

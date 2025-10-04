import { z } from 'zod'
import { publicProcedure } from '../trpc'
import { AirNowClient } from '@atmos/airnow-client'

export const obtenerEstacionesAirNowProcedure = publicProcedure
  .input(
    z.object({
      latitud: z.number().min(0).max(90),
      longitud: z.number().min(-180).max(180),
      radiusKm: z.number().positive().max(500).default(50),
    })
  )
.query(async ({ input }) => {
    const { latitud, longitud, radiusKm } = input
    const airnowClient = new AirNowClient({ apiKey: 'A09EAF06-910B-4426-A2A8-8DC2D82641C6' })
    const latOffset = radiusKm / 111 // Latitud es constante
    const lngOffset = radiusKm / (111 * Math.cos((latitud * Math.PI) / 180)) // Longitud varía

    // Generar fechas dinámicamente (última hora completa)
    const now = new Date()
    const endDate = new Date(now.getFullYear(), now.getMonth(), now.getDate(), now.getHours())
    const startDate = new Date(endDate)
    startDate.setHours(startDate.getHours() - 1)

    const formatDate = (date: Date) => {
      const year = date.getFullYear()
      const month = String(date.getMonth() + 1).padStart(2, '0')
      const day = String(date.getDate()).padStart(2, '0')
      const hour = String(date.getHours()).padStart(2, '0')
      return `${year}-${month}-${day}T${hour}`
    }

    const bbox = {
      minLongitude: longitud - lngOffset,
      minLatitude: latitud - latOffset,
      maxLongitude: longitud + lngOffset,
      maxLatitude: latitud + latOffset,
    }

    console.log('🔍 [AIRNOW] === SOLICITUD DE ESTACIONES ===')
    console.log('📍 Centro:', { latitud, longitud, radiusKm })
    console.log('📦 BoundingBox:', bbox)
    console.log('📅 Fechas:', {
      start: formatDate(startDate),
      end: formatDate(endDate)
    })

    try {
      const stations = await airnowClient.getMonitoringSites(
        bbox,
        {
          startDate: formatDate(startDate),
          endDate: formatDate(endDate),
          parameters: 'NO2,PM25,O3,PM10,SO2,CO',
        }
      )

      console.log(`✅ [AIRNOW] Estaciones recibidas: ${stations?.length || 0}`)

      if (stations && stations.length > 0) {
        console.log('📊 [AIRNOW] Primeras 3 estaciones:')
        stations.slice(0, 3).forEach((station, idx) => {
          console.log(`  ${idx + 1}. ${station.SiteName}:`, {
            coords: [station.Latitude, station.Longitude],
            AQI: station.AQI,
            Parameter: station.Parameter
          })
        })

        // Análisis de coordenadas únicas
        const uniqueCoords = new Set(
          stations.map(s => `${s.Latitude.toFixed(4)},${s.Longitude.toFixed(4)}`)
        )
        console.log(`🗺️  [AIRNOW] Coordenadas únicas: ${uniqueCoords.size} de ${stations.length}`)

        if (uniqueCoords.size < stations.length) {
          console.warn(`⚠️  [AIRNOW] DUPLICADOS DETECTADOS: ${stations.length - uniqueCoords.size} estaciones con coordenadas repetidas`)
        }
      }

      return stations
    } catch (error) {
      console.error('❌ [AIRNOW] Error al obtener estaciones:', error)
      throw error
    }
  })

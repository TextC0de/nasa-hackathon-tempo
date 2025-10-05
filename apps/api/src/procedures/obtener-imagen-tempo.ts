import { z } from 'zod'
import { publicProcedure } from '../trpc'
import { TEMPOService } from '@atmos/earthdata-imageserver-client'

/**
 * Procedimiento para obtener imagen TEMPO de una región (overlay para mapa)
 *
 * Retorna URL de imagen + metadata interpretada para usuario promedio
 */
export const obtenerImagenTEMPOProcedure = publicProcedure
  .input(
    z.object({
      // Bounding box de California (o región custom)
      bbox: z.object({
        north: z.number().min(-90).max(90),
        south: z.number().min(-90).max(90),
        east: z.number().min(-180).max(180),
        west: z.number().min(-180).max(180),
      }),
      // Contaminante a visualizar
      pollutant: z.enum(['NO2', 'O3', 'HCHO']).default('NO2'),
      // Timestamp (opcional, usa último disponible si no se especifica)
      timestamp: z.string().datetime().optional(),
      // Resolución de imagen
      width: z.number().min(256).max(2048).default(1024),
      height: z.number().min(256).max(2048).default(768),
    })
  )
  .query(async ({ input }) => {
    try {
      const { bbox, pollutant, timestamp, width, height } = input
      const tempoService = new TEMPOService()

      // Determinar timestamp a usar
      let fechaConsulta: Date
      if (timestamp) {
        fechaConsulta = new Date(timestamp)
      } else {
        // Usar último timestamp disponible
        fechaConsulta = await tempoService.getLatestAvailableTime(pollutant)
      }

      // Obtener imagen de región según contaminante
      let regionData
      if (pollutant === 'NO2') {
        regionData = await tempoService.getNO2InRegion({
          bbox,
          timestamp: fechaConsulta,
          resolution: { width, height },
        })
      } else if (pollutant === 'O3') {
        regionData = await tempoService.getO3InRegion({
          bbox,
          timestamp: fechaConsulta,
          resolution: { width, height },
        })
      } else {
        regionData = await tempoService.getHCHOInRegion({
          bbox,
          timestamp: fechaConsulta,
          resolution: { width, height },
        })
      }

      // Obtener datos de punto central para interpretación
      const centerLat = (bbox.north + bbox.south) / 2
      const centerLon = (bbox.east + bbox.west) / 2

      let centerData
      if (pollutant === 'NO2') {
        centerData = await tempoService.getNO2AtPoint({
          location: { latitude: centerLat, longitude: centerLon },
          timestamp: fechaConsulta,
        })
      } else if (pollutant === 'O3') {
        centerData = await tempoService.getO3AtPoint({
          location: { latitude: centerLat, longitude: centerLon },
          timestamp: fechaConsulta,
        })
      } else {
        centerData = await tempoService.getHCHOAtPoint({
          location: { latitude: centerLat, longitude: centerLon },
          timestamp: fechaConsulta,
        })
      }

      // Interpretar nivel para usuario promedio
      const interpretarNivel = (value: number | null, tipo: string): {
        nivel: string
        color: string
        descripcion: string
      } => {
        if (value === null) {
          return {
            nivel: 'Sin datos',
            color: 'gray',
            descripcion: 'No hay datos disponibles para esta ubicación',
          }
        }

        if (tipo === 'NO2') {
          if (value < 1e15) {
            return {
              nivel: 'Bajo',
              color: 'green',
              descripcion: 'Aire limpio. Excelente calidad.',
            }
          } else if (value < 3e15) {
            return {
              nivel: 'Moderado',
              color: 'yellow',
              descripcion: 'Calidad aceptable. Algunos grupos sensibles pueden experimentar molestias.',
            }
          } else if (value < 8e15) {
            return {
              nivel: 'Medio',
              color: 'orange',
              descripcion: 'Grupos sensibles deben limitar exposición prolongada al exterior.',
            }
          } else if (value < 15e15) {
            return {
              nivel: 'Alto',
              color: 'red',
              descripcion: 'Todos pueden experimentar efectos. Grupos sensibles deben evitar actividades al aire libre.',
            }
          } else {
            return {
              nivel: 'Muy alto',
              color: 'purple',
              descripcion: 'Alerta de salud. Todos deben evitar esfuerzos al aire libre.',
            }
          }
        } else if (tipo === 'O3') {
          if (value < 220) {
            return {
              nivel: 'Bajo',
              color: 'green',
              descripcion: 'Niveles normales de ozono estratosférico.',
            }
          } else if (value <= 350) {
            return {
              nivel: 'Normal',
              color: 'blue',
              descripcion: 'Niveles saludables de ozono estratosférico.',
            }
          } else {
            return {
              nivel: 'Alto',
              color: 'yellow',
              descripcion: 'Niveles elevados de ozono.',
            }
          }
        } else {
          // HCHO
          const valueInDU = value / 2.69e16
          if (valueInDU < 20) {
            return {
              nivel: 'Bajo',
              color: 'green',
              descripcion: 'Bajos niveles de formaldehído.',
            }
          } else if (valueInDU < 50) {
            return {
              nivel: 'Normal',
              color: 'blue',
              descripcion: 'Niveles normales de formaldehído.',
            }
          } else {
            return {
              nivel: 'Alto',
              color: 'orange',
              descripcion: 'Niveles elevados de formaldehído. Posible actividad industrial o incendios.',
            }
          }
        }
      }

      const interpretacion = interpretarNivel(centerData.value, pollutant)

      return {
        // Imagen overlay
        overlay: {
          imageUrl: regionData.imageUrl,
          bounds: {
            north: bbox.north,
            south: bbox.south,
            east: bbox.east,
            west: bbox.west,
          },
          width: regionData.width,
          height: regionData.height,
        },

        // Metadata para sidebar
        metadata: {
          pollutant,
          timestamp: fechaConsulta.toISOString(),
          timestampLocal: fechaConsulta.toLocaleString('es-MX', {
            timeZone: 'America/Los_Angeles',
            dateStyle: 'medium',
            timeStyle: 'short',
          }),
          center: {
            latitude: centerLat,
            longitude: centerLon,
            value: centerData.value,
            valueFormatted:
              centerData.value !== null
                ? pollutant === 'O3'
                  ? `${centerData.value.toFixed(1)} ${centerData.unit}`
                  : `${(centerData.value / 1e15).toFixed(2)} × 10¹⁵ ${centerData.unit}`
                : null,
          },
          interpretation: interpretacion,
        },

        // Info satelital
        satellite: {
          name: 'TEMPO',
          fullName: 'Tropospheric Emissions: Monitoring of Pollution',
          agency: 'NASA',
          resolution: 'Hourly',
          coverage: 'North America',
        },
      }
    } catch (error) {
      console.error('Error al obtener imagen TEMPO:', error)
      throw new Error(
        `No se pudo obtener la imagen TEMPO: ${error instanceof Error ? error.message : 'Error desconocido'}`
      )
    }
  })

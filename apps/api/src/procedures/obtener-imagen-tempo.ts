import { z } from 'zod'
import { publicProcedure } from '../trpc'
import { TEMPOService } from '@atmos/earthdata-imageserver-client'

/**
 * Procedure to get TEMPO image from a region (map overlay)
 *
 * Returns image URL + interpreted metadata for average user
 */
export const obtenerImagenTEMPOProcedure = publicProcedure
  .input(
    z.object({
      // Bounding box of California (or custom region)
      bbox: z.object({
        north: z.number().min(-90).max(90),
        south: z.number().min(-90).max(90),
        east: z.number().min(-180).max(180),
        west: z.number().min(-180).max(180),
      }),
      // Pollutant to visualize
      pollutant: z.enum(['NO2', 'O3', 'HCHO']).default('NO2'),
      // Timestamp (optional, uses latest available if not specified)
      timestamp: z.string().datetime().optional(),
      // Image resolution
      width: z.number().min(256).max(2048).default(1024),
      height: z.number().min(256).max(2048).default(768),
    })
  )
  .query(async ({ input }) => {
    try {
      const { bbox, pollutant, timestamp, width, height } = input
      const tempoService = new TEMPOService()

      // Determine timestamp to use
      let queryDate: Date
      if (timestamp) {
        queryDate = new Date(timestamp)
      } else {
        // Use latest available timestamp
        queryDate = await tempoService.getLatestAvailableTime(pollutant)
      }

      // Get region image based on pollutant
      let regionData
      if (pollutant === 'NO2') {
        regionData = await tempoService.getNO2InRegion({
          bbox,
          timestamp: queryDate,
          resolution: { width, height },
        })
      } else if (pollutant === 'O3') {
        regionData = await tempoService.getO3InRegion({
          bbox,
          timestamp: queryDate,
          resolution: { width, height },
        })
      } else {
        regionData = await tempoService.getHCHOInRegion({
          bbox,
          timestamp: queryDate,
          resolution: { width, height },
        })
      }

      // Get center point data for interpretation
      const centerLat = (bbox.north + bbox.south) / 2
      const centerLon = (bbox.east + bbox.west) / 2

      let centerData
      if (pollutant === 'NO2') {
        centerData = await tempoService.getNO2AtPoint({
          location: { latitude: centerLat, longitude: centerLon },
          timestamp: queryDate,
        })
      } else if (pollutant === 'O3') {
        centerData = await tempoService.getO3AtPoint({
          location: { latitude: centerLat, longitude: centerLon },
          timestamp: queryDate,
        })
      } else {
        centerData = await tempoService.getHCHOAtPoint({
          location: { latitude: centerLat, longitude: centerLon },
          timestamp: queryDate,
        })
      }

      // Interpret level for average user
      const interpretLevel = (value: number | null, type: string): {
        level: string
        color: string
        description: string
      } => {
        if (value === null) {
          return {
            level: 'No data',
            color: 'gray',
            description: 'No data available for this location',
          }
        }

        if (type === 'NO2') {
          if (value < 1e15) {
            return {
              level: 'Low',
              color: 'green',
              description: 'Clean air. Excellent quality.',
            }
          } else if (value < 3e15) {
            return {
              level: 'Moderate',
              color: 'yellow',
              description: 'Acceptable quality. Some sensitive groups may experience discomfort.',
            }
          } else if (value < 8e15) {
            return {
              level: 'Medium',
              color: 'orange',
              description: 'Sensitive groups should limit prolonged outdoor exposure.',
            }
          } else if (value < 15e15) {
            return {
              level: 'High',
              color: 'red',
              description: 'Everyone may experience effects. Sensitive groups should avoid outdoor activities.',
            }
          } else {
            return {
              level: 'Very high',
              color: 'purple',
              description: 'Health alert. Everyone should avoid outdoor exertion.',
            }
          }
        } else if (type === 'O3') {
          if (value < 220) {
            return {
              level: 'Low',
              color: 'green',
              description: 'Normal stratospheric ozone levels.',
            }
          } else if (value <= 350) {
            return {
              level: 'Normal',
              color: 'blue',
              description: 'Healthy stratospheric ozone levels.',
            }
          } else {
            return {
              level: 'High',
              color: 'yellow',
              description: 'Elevated ozone levels.',
            }
          }
        } else {
          // HCHO
          const valueInDU = value / 2.69e16
          if (valueInDU < 20) {
            return {
              level: 'Low',
              color: 'green',
              description: 'Low formaldehyde levels.',
            }
          } else if (valueInDU < 50) {
            return {
              level: 'Normal',
              color: 'blue',
              description: 'Normal formaldehyde levels.',
            }
          } else {
            return {
              level: 'High',
              color: 'orange',
              description: 'Elevated formaldehyde levels. Possible industrial activity or fires.',
            }
          }
        }
      }

      const interpretation = interpretLevel(centerData.value, pollutant)

      return {
        // Overlay image
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

        // Metadata for sidebar
        metadata: {
          pollutant,
          timestamp: queryDate.toISOString(),
          timestampLocal: queryDate.toLocaleString('en-US', {
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
          interpretation: interpretation,
        },

        // Satellite info
        satellite: {
          name: 'TEMPO',
          fullName: 'Tropospheric Emissions: Monitoring of Pollution',
          agency: 'NASA',
          resolution: 'Hourly',
          coverage: 'North America',
        },
      }
    } catch (error) {
      console.error('Error getting TEMPO image:', error)
      throw new Error(
        `Could not get TEMPO image: ${error instanceof Error ? error.message : 'Unknown error'}`
      )
    }
  })

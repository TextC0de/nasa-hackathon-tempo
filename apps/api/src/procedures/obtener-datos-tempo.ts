import { z } from 'zod'
import { publicProcedure } from '../trpc'
import { TEMPOService } from '@atmos/earthdata-imageserver-client'

export const obtenerDatosTEMPOProcedure = publicProcedure
  .input(
    z.object({
      latitud: z.number().min(-90).max(90),
      longitud: z.number().min(-180).max(180),
      timestamp: z.string().datetime().optional(), // ISO 8601 format, opcional
      usarUltimoDisponible: z.boolean().default(true), // Por defecto usar último disponible
    })
  )
  .query(async ({ input }) => {
    try {
      const { latitud, longitud, timestamp, usarUltimoDisponible } = input
      const tempoService = new TEMPOService()

      // Si no se proporciona timestamp o se solicita usar el último disponible
      // obtener el timestamp más reciente con datos
      let fechaConsulta: Date
      let timestampSource: string

      if (!timestamp || usarUltimoDisponible) {
        // Usar el último timestamp disponible de TEMPO
        fechaConsulta = await tempoService.getLatestAvailableTime('NO2')
        timestampSource = usarUltimoDisponible ? 'latest_available' : 'default_latest'
      } else {
        fechaConsulta = new Date(timestamp)
        timestampSource = 'user_provided'
      }

      // Obtener datos de todos los contaminantes en paralelo
      const [no2Data, o3Data, hchoData] = await Promise.allSettled([
        tempoService.getNO2AtPoint({
          location: { latitude: latitud, longitude: longitud },
          timestamp: fechaConsulta,
        }),
        tempoService.getO3AtPoint({
          location: { latitude: latitud, longitude: longitud },
          timestamp: fechaConsulta,
        }),
        tempoService.getHCHOAtPoint({
          location: { latitude: latitud, longitude: longitud },
          timestamp: fechaConsulta,
        }),
      ])

      // Función helper para formatear valores grandes
      const formatValue = (value: number | null) => {
        if (value === null) return null
        // Si el valor es mayor a 1e14, usar notación científica legible
        if (Math.abs(value) >= 1e14) {
          const exponent = Math.floor(Math.log10(Math.abs(value)))
          const mantissa = value / Math.pow(10, exponent)
          return `${mantissa.toFixed(2)} × 10¹⁵`
        }
        // Para valores normales (como O3), usar 2 decimales
        return value.toFixed(2)
      }

      // Función para clasificar NO2
      const clasificarNO2 = (value: number | null): string | null => {
        if (value === null) return null
        if (value < 1e15) return 'Bajo'
        if (value >= 3e15 && value < 8e15) return 'Mediano'
        if (value >= 8e15 && value < 15e15) return 'Alto'
        if (value >= 15e15) return 'Muy alto'
        return 'Bajo' // Para valores entre 1e15 y 3e15
      }

      // Función para clasificar O3 (en DU)
      const clasificarO3 = (value: number | null): string | null => {
        if (value === null) return null
        // O3 ya viene en DU, no necesita conversión
        if (value < 220) return 'Bajo'
        if (value >= 220 && value <= 350) return 'Normal'
        if (value > 350) return 'Alto'
        return 'Normal'
      }

      // Función para clasificar HCHO (convertir de molec/cm² a DU)
      const clasificarHCHO = (value: number | null): string | null => {
        if (value === null) return null
        // Convertir de molec/cm² a DU
        // 1 DU = 2.69×10¹⁶ molec/cm²
        const valueInDU = value / 2.69e16

        if (valueInDU < 20) return 'Bajo'
        if (valueInDU >= 20 && valueInDU < 35) return 'Normal'
        if (valueInDU >= 35 && valueInDU < 50) return 'Normal'
        if (valueInDU >= 50) return 'Alto'
        return 'Normal'
      }

      return {
        location: {
          latitude: latitud,
          longitude: longitud,
        },
        timestamp: fechaConsulta.toISOString(),
        timestamp_utc: fechaConsulta.toISOString(),
        timestamp_source: timestampSource,
        timestamp_info: timestampSource === 'user_provided'
          ? 'Timestamp proporcionado por el usuario'
          : 'Último timestamp disponible en TEMPO (datos satelitales tienen retraso de procesamiento)',
        data: {
          NO2: no2Data.status === 'fulfilled' ? {
            value: no2Data.value.value,
            value_formatted: formatValue(no2Data.value.value),
            nivel: clasificarNO2(no2Data.value.value),
            unit: no2Data.value.unit,
            description: 'Dióxido de nitrógeno troposférico'
          } : {
            error: no2Data.status === 'rejected' ? no2Data.reason.message : 'Error desconocido',
            value: null,
            value_formatted: null,
            nivel: null
          },
          O3: o3Data.status === 'fulfilled' ? {
            value: o3Data.value.value,
            nivel: clasificarO3(o3Data.value.value),
            unit: o3Data.value.unit,
            description: 'Ozono total columnar'
          } : {
            error: o3Data.status === 'rejected' ? o3Data.reason.message : 'Error desconocido',
            value: null,
            nivel: null
          },
          HCHO: hchoData.status === 'fulfilled' ? {
            value: hchoData.value.value,
            value_formatted: formatValue(hchoData.value.value),
            value_DU: hchoData.value.value !== null ? (hchoData.value.value / 2.69e16).toFixed(2) : null,
            nivel: clasificarHCHO(hchoData.value.value),
            unit: hchoData.value.unit,
            description: 'Formaldehído columnar'
          } : {
            error: hchoData.status === 'rejected' ? hchoData.reason.message : 'Error desconocido',
            value: null,
            value_formatted: null,
            value_DU: null,
            nivel: null
          },
        },
        satellite: 'TEMPO',
        data_source: 'NASA Earthdata - TEMPO V04',
        notes: 'Datos satelitales horarios de contaminación troposférica'
      }
    } catch (error) {
      console.error('Error al obtener datos TEMPO:', error)
      throw new Error(`No se pudieron obtener los datos TEMPO: ${error instanceof Error ? error.message : 'Error desconocido'}`)
    }
  })

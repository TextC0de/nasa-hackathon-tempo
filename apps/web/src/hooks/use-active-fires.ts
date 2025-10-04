"use client"

import { trpc } from '@/lib/trpc'
import { useEffect, useState, useMemo, useCallback } from 'react'

/**
 * Tipos para incendios activos basados en NASA FIRMS API
 * Documentación: https://firms.modaps.eosdis.nasa.gov
 */
export interface FireDataPoint {
  /** Latitud (-90 a 90) */
  latitude: number

  /** Longitud (-180 a 180) */
  longitude: number

  /** Temperatura de brillo (Kelvin) - VIIRS usa bright_ti4, MODIS usa brightness */
  brightness?: number
  bright_ti4?: number | string
  bright_ti5?: number | string

  /** Fecha de adquisición (YYYY-MM-DD) */
  acq_date: string

  /** Hora de adquisición (HHMM UTC) */
  acq_time: string

  /** Satélite (ej: 'Suomi-NPP', 'NOAA-20', 'Terra', 'Aqua') */
  satellite: string

  /** Confianza (MODIS: 0-100, VIIRS: 'l'/'n'/'h', Landsat: 'low'/'medium'/'high') */
  confidence: number | string

  /** Versión del algoritmo */
  version: string

  /** FRP - Fire Radiative Power (MW) - Potencia radiativa del fuego */
  frp: number

  /** Tipo de detección (día/noche) */
  daynight: 'D' | 'N'

  // Campos adicionales
  [key: string]: string | number
}

/**
 * Respuesta de datos de incendios
 */
export interface FireDataResponse {
  fires: FireDataPoint[]
  count: number
  metadata: {
    source: string
    bbox: {
      west: number
      south: number
      east: number
      north: number
    }
    dayRange?: number
    date?: string
    requestedAt: Date
  }
}

/**
 * Estadísticas de incendios
 */
export interface FireStatistics {
  totalFires: number
  averageFRP: number
  maxFRP: number
  totalFRP: number
  highConfidenceFires: number
  lowConfidenceFires: number
  dayFires: number
  nightFires: number
}

/**
 * Props para el hook de incendios activos
 */
export interface UseActiveFiresProps {
  centerLat?: number
  centerLng?: number
  radiusKm?: number
  enabled?: boolean
}

/**
 * Configuración por defecto para California
 */
const DEFAULT_CONFIG = {
  centerLat: 36.7783,
  centerLng: -119.4179,
  radiusKm: 200,
  enabled: true
} as const

/**
 * Configuración de React Query para datos de incendios
 * Los incendios se actualizan frecuentemente, refrescar cada 5 minutos
 */
const QUERY_CONFIG = {
  refetchInterval: 5 * 60 * 1000, // 5 minutos
  staleTime: 2 * 60 * 1000, // 2 minutos
  retry: 3,
  retryDelay: 1000,
} as const

/**
 * Normalizar nivel de confianza para comparaciones
 */
const normalizeConfidence = (confidence: number | string): 'high' | 'nominal' | 'low' => {
  if (typeof confidence === 'number') {
    // MODIS (0-100)
    if (confidence >= 80) return 'high'
    if (confidence >= 50) return 'nominal'
    return 'low'
  }

  // VIIRS/Landsat (string)
  const conf = String(confidence).toLowerCase()
  if (conf === 'h' || conf === 'high') return 'high'
  if (conf === 'n' || conf === 'nominal' || conf === 'medium') return 'nominal'
  return 'low'
}

/**
 * Hook personalizado para obtener datos de incendios activos
 *
 * @param props - Configuración del hook
 * @returns Objeto con datos de incendios, estado de carga y errores
 *
 * @example
 * ```typescript
 * const { fires, statistics, isLoading } = useActiveFires({
 *   centerLat: 34.0522,
 *   centerLng: -118.2437,
 *   radiusKm: 50
 * })
 * ```
 */
export function useActiveFires({
  centerLat = DEFAULT_CONFIG.centerLat,
  centerLng = DEFAULT_CONFIG.centerLng,
  radiusKm = DEFAULT_CONFIG.radiusKm,
  enabled = DEFAULT_CONFIG.enabled
}: UseActiveFiresProps = {}) {
  const [fires, setFires] = useState<FireDataPoint[]>([])
  const [isLoading, setIsLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)

  // Query para obtener incendios activos
  const {
    data: fireData,
    isLoading: fireLoading,
    error: fireError,
    refetch: refetchFires
  } = trpc.obtenerFuegoActivoenArea.useQuery(
    {
      latitud: centerLat,
      longitud: centerLng,
      radiusKm: radiusKm
    },
    {
      enabled,
      ...QUERY_CONFIG
    }
  )

  // Callback para refetch manual
  const refetch = useCallback(async () => {
    try {
      await refetchFires()
    } catch (error) {
      console.error('Error al refetch de datos de incendios:', error)
    }
  }, [refetchFires])

  // Efecto para manejar datos de incendios
  useEffect(() => {
    if (fireData) {
      try {
        const response = fireData as unknown as FireDataResponse

        console.log('🔥 [FIRES HOOK] === DATOS DE INCENDIOS RECIBIDOS ===')
        console.log(`🔥 Total de incendios detectados: ${response.fires.length}`)

        if (response.fires.length > 0) {
          // Análisis de confianza
          const confidenceAnalysis = response.fires.reduce((acc, fire) => {
            const level = normalizeConfidence(fire.confidence)
            acc[level]++
            return acc
          }, { high: 0, nominal: 0, low: 0 })

          console.log('📊 Distribución por confianza:', confidenceAnalysis)

          // Análisis FRP
          const frpValues = response.fires.map(f => f.frp).filter(f => f > 0)
          if (frpValues.length > 0) {
            const avgFRP = frpValues.reduce((a, b) => a + b, 0) / frpValues.length
            const maxFRP = Math.max(...frpValues)
            console.log(`🔥 FRP Promedio: ${avgFRP.toFixed(2)} MW`)
            console.log(`🔥 FRP Máximo: ${maxFRP.toFixed(2)} MW`)
          }

          // Primeros 3 incendios como ejemplo
          console.log('📋 Primeros 3 incendios:')
          response.fires.slice(0, 3).forEach((fire, idx) => {
            console.log(`  ${idx + 1}. [${fire.latitude}, ${fire.longitude}]:`, {
              frp: `${fire.frp} MW`,
              brightness: `${fire.brightness} K`,
              confidence: fire.confidence,
              time: `${fire.acq_date} ${fire.acq_time}`,
              satellite: fire.satellite
            })
          })
        }

        setFires(response.fires)
        setError(null)
      } catch (error) {
        console.error('❌ [FIRES HOOK] Error al procesar datos de incendios:', error)
        setError('Error al procesar datos de incendios')
      }
    }
  }, [fireData])

  // Efecto para manejar errores
  useEffect(() => {
    if (fireError) {
      const errorMessage = fireError.message || 'Error desconocido al obtener incendios'
      setError(errorMessage)
      console.error('Error en query de incendios:', fireError)
    }
  }, [fireError])

  // Efecto para manejar estado de carga
  useEffect(() => {
    setIsLoading(fireLoading)
  }, [fireLoading])

  // Calcular estadísticas de incendios
  const statistics = useMemo((): FireStatistics => {
    if (!fires.length) {
      return {
        totalFires: 0,
        averageFRP: 0,
        maxFRP: 0,
        totalFRP: 0,
        highConfidenceFires: 0,
        lowConfidenceFires: 0,
        dayFires: 0,
        nightFires: 0
      }
    }

    const frpValues = fires.map(f => f.frp).filter(f => f > 0)
    const totalFRP = frpValues.reduce((sum, frp) => sum + frp, 0)
    const averageFRP = frpValues.length > 0 ? totalFRP / frpValues.length : 0
    const maxFRP = frpValues.length > 0 ? Math.max(...frpValues) : 0

    // Contar por confianza
    const highConfidenceFires = fires.filter(
      f => normalizeConfidence(f.confidence) === 'high'
    ).length

    const lowConfidenceFires = fires.filter(
      f => normalizeConfidence(f.confidence) === 'low'
    ).length

    // Contar día/noche
    const dayFires = fires.filter(f => f.daynight === 'D').length
    const nightFires = fires.filter(f => f.daynight === 'N').length

    return {
      totalFires: fires.length,
      averageFRP,
      maxFRP,
      totalFRP,
      highConfidenceFires,
      lowConfidenceFires,
      dayFires,
      nightFires
    }
  }, [fires])

  return {
    fires,
    statistics,
    isLoading,
    error,
    refetch
  }
}

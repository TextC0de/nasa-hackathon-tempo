"use client"

import { trpc } from '@/lib/trpc'
import { useEffect, useState, useMemo, useCallback } from 'react'

/**
 * Tipos para las estaciones de monitoreo basados en la respuesta de AirNow API
 * Documentación: https://docs.airnowapi.org/
 */
export interface MonitoringStation {
  Latitude: number
  Longitude: number
  UTC: string
  Parameter: string
  Unit: string
  RawConcentration: number
  AQI: number
  Category: number
  SiteName: string
  AgencyName: string
  FullAQSCode: string
  IntlAQSCode: string
  ParameterCode: string
  MonitorType: string
  Qualifier: string
  SiteType: string
  Status: string
  EPARegion: string
  Latitude_Band: string
  Longitude_Band: string
  GMT_Offset: number
  ParameterName: string
  DateOfLastChange: string
}

/**
 * Props para el hook de estaciones de monitoreo
 */
export interface UseMonitoringStationsProps {
  centerLat?: number
  centerLng?: number
  radiusKm?: number
  enabled?: boolean
}

/**
 * Configuración por defecto para California
 */
const DEFAULT_CONFIG = {
  centerLat: 36.7783, // Centro geográfico de California
  centerLng: -119.4179,
  radiusKm: 200, // Radio amplio para cubrir todo el estado
  enabled: true
} as const

/**
 * Configuración de React Query para datos de calidad del aire
 */
const QUERY_CONFIG = {
  refetchInterval: 5 * 60 * 1000, // Refetch cada 5 minutos
  staleTime: 2 * 60 * 1000, // Considerar stale después de 2 minutos
  retry: 3, // Reintentar 3 veces en caso de error
  retryDelay: 1000, // Esperar 1 segundo entre reintentos
} as const

/**
 * Hook personalizado para obtener datos de estaciones de monitoreo AirNow
 * 
 * @param props - Configuración del hook
 * @returns Objeto con datos de estaciones, estado de carga y errores
 * 
 * @example
 * ```typescript
 * const { stations, isLoading, error } = useMonitoringStations({
 *   centerLat: 34.0522,
 *   centerLng: -118.2437,
 *   radiusKm: 50
 * })
 * ```
 */
export function useMonitoringStations({
  centerLat = DEFAULT_CONFIG.centerLat,
  centerLng = DEFAULT_CONFIG.centerLng,
  radiusKm = DEFAULT_CONFIG.radiusKm,
  enabled = DEFAULT_CONFIG.enabled
}: UseMonitoringStationsProps = {}) {
  // Estados locales
  const [stations, setStations] = useState<MonitoringStation[]>([])
  const [isLoading, setIsLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)

  // Query para obtener estaciones de AirNow
  const { 
    data: airnowStations, 
    isLoading: airnowLoading, 
    error: airnowError,
    refetch: refetchStations
  } = trpc.obtenerEstacionesAirNow.useQuery(
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

  // Query para obtener calidad del aire actual
  const { 
    data: airQuality, 
    isLoading: airQualityLoading,
    refetch: refetchAirQuality
  } = trpc.obtenerCalidadDelAire.useQuery(
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
      await Promise.all([refetchStations(), refetchAirQuality()])
    } catch (error) {
      console.error('Error al refetch de datos:', error)
    }
  }, [refetchStations, refetchAirQuality])

  // Efecto para manejar datos de estaciones
  useEffect(() => {
    if (airnowStations) {
      try {
        setStations(airnowStations as unknown as MonitoringStation[])
        setError(null)
      } catch (error) {
        console.error('Error al procesar datos de estaciones:', error)
        setError('Error al procesar datos de estaciones')
      }
    }
  }, [airnowStations])

  // Efecto para manejar errores
  useEffect(() => {
    if (airnowError) {
      const errorMessage = airnowError.message || 'Error desconocido al obtener estaciones'
      setError(errorMessage)
      console.error('Error en query de estaciones:', airnowError)
    }
  }, [airnowError])

  // Efecto para manejar estado de carga
  useEffect(() => {
    setIsLoading(airnowLoading || airQualityLoading)
  }, [airnowLoading, airQualityLoading])

  // Memoizar estadísticas de las estaciones
  const stationStats = useMemo(() => {
    if (!stations.length) return null

    // Debug: Ver qué valores de Status están llegando
    const statusValues = [...new Set(stations.map(station => station.Status))]
    console.log('Valores de Status encontrados:', statusValues)
    console.log('Primeras 5 estaciones:', stations.slice(0, 5).map(s => ({ 
      SiteName: s.SiteName, 
      Status: s.Status, 
      Parameter: s.Parameter 
    })))

    // Filtrar estaciones activas - considerar diferentes valores posibles
    const activeStations = stations.filter(station => 
      station.Status === 'Active' || 
      station.Status === 'active' || 
      station.Status === 'ACTIVE' ||
      station.Status === '1' ||
      station.Status === 'true' ||
      station.Status === 'operational' ||
      station.Status === 'Operational'
    )
    
    const parameters = [...new Set(stations.map(station => station.Parameter))]
    const agencies = [...new Set(stations.map(station => station.AgencyName))]

    return {
      total: stations.length,
      active: activeStations.length,
      parameters: parameters.length,
      agencies: agencies.length,
      avgAQI: stations.reduce((sum, station) => sum + station.AQI, 0) / stations.length,
      // Debug info
      debug: {
        statusValues,
        sampleStations: stations.slice(0, 3)
      }
    }
  }, [stations])

  return {
    stations,
    airQuality,
    isLoading,
    error,
    refetch,
    stats: stationStats
  }
}

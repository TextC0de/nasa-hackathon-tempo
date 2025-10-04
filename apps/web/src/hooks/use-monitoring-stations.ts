"use client"

import { trpc } from '@/lib/trpc'
import { useEffect, useState } from 'react'

// Tipos para las estaciones de monitoreo basados en la respuesta real de la API
interface MonitoringStation {
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

interface UseMonitoringStationsProps {
  centerLat?: number
  centerLng?: number
  radiusKm?: number
  enabled?: boolean
}

export function useMonitoringStations({
  centerLat = 36.7783, // Centro de California
  centerLng = -119.4179,
  radiusKm = 100,
  enabled = true
}: UseMonitoringStationsProps = {}) {
  const [stations, setStations] = useState<MonitoringStation[]>([])
  const [isLoading, setIsLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)

  // Query para obtener estaciones de AirNow
  const { data: airnowStations, isLoading: airnowLoading, error: airnowError } = trpc.obtenerEstacionesAirNow.useQuery(
    {
      latitud: centerLat,
      longitud: centerLng,
      radiusKm: radiusKm
    },
    {
      enabled: enabled,
      refetchInterval: 5 * 60 * 1000, // Refetch cada 5 minutos
      staleTime: 2 * 60 * 1000, // Considerar stale después de 2 minutos
      retry: 3, // Reintentar 3 veces en caso de error
      retryDelay: 1000, // Esperar 1 segundo entre reintentos
    }
  )

  // Query para obtener calidad del aire actual
  const { data: airQuality, isLoading: airQualityLoading } = trpc.obtenerCalidadDelAire.useQuery(
    {
      latitud: centerLat,
      longitud: centerLng,
      radiusKm: radiusKm
    },
    {
      enabled: enabled,
      refetchInterval: 5 * 60 * 1000, // Refetch cada 5 minutos
      staleTime: 2 * 60 * 1000, // Considerar stale después de 2 minutos
      retry: 3, // Reintentar 3 veces en caso de error
      retryDelay: 1000, // Esperar 1 segundo entre reintentos
    }
  )

  useEffect(() => {
    if (airnowStations) {
      setStations(airnowStations as unknown as MonitoringStation[])
      setIsLoading(false)
      setError(null)
    }
  }, [airnowStations])

  useEffect(() => {
    if (airnowError) {
      setError(airnowError.message)
      setIsLoading(false)
    }
  }, [airnowError])

  useEffect(() => {
    setIsLoading(airnowLoading || airQualityLoading)
  }, [airnowLoading, airQualityLoading])

  return {
    stations,
    airQuality,
    isLoading,
    error,
    refetch: () => {
      // Trigger refetch if needed
    }
  }
}

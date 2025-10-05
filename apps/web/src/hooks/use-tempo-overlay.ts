import { useEffect, useState } from 'react'
import { trpc } from '@/lib/trpc'

interface TEMPOOverlayOptions {
  bbox: {
    north: number
    south: number
    east: number
    west: number
  }
  pollutant?: 'NO2' | 'O3' | 'HCHO'
  enabled?: boolean
  refreshInterval?: number // en milisegundos
}

export function useTempoOverlay(options: TEMPOOverlayOptions) {
  const {
    bbox,
    pollutant = 'NO2',
    enabled = true,
    refreshInterval = 60 * 60 * 1000, // 1 hora por defecto
  } = options

  const [isManualRefreshing, setIsManualRefreshing] = useState(false)

  // Query principal
  const { data, isLoading, error, refetch } = trpc.obtenerImagenTEMPO.useQuery(
    {
      bbox,
      pollutant,
      width: 1024,
      height: 768,
    },
    {
      enabled,
      retry: 2,
      staleTime: 5 * 60 * 1000, // 5 minutos
      refetchInterval: refreshInterval,
      refetchOnWindowFocus: false,
    }
  )

  // Auto-refresh periódico
  useEffect(() => {
    if (!enabled) return

    const interval = setInterval(() => {
      refetch()
    }, refreshInterval)

    return () => clearInterval(interval)
  }, [enabled, refreshInterval, refetch])

  // Función para refresh manual
  const refresh = async () => {
    setIsManualRefreshing(true)
    try {
      await refetch()
    } finally {
      setIsManualRefreshing(false)
    }
  }

  return {
    // Datos del overlay
    overlay: data?.overlay,
    metadata: data?.metadata,
    satellite: data?.satellite,

    // Estado
    isLoading: isLoading || isManualRefreshing,
    error,

    // Acciones
    refresh,
  }
}

// Hook para California completa (preset común)
export function useCaliforniaTEMPOOverlay(pollutant: 'NO2' | 'O3' | 'HCHO' = 'NO2') {
  return useTempoOverlay({
    bbox: {
      north: 42.0, // Frontera norte de California
      south: 32.5, // Frontera sur (San Diego)
      east: -114.0, // Frontera este
      west: -124.5, // Costa oeste
    },
    pollutant,
  })
}

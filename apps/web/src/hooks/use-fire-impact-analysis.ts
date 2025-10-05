import { trpc } from '@/lib/trpc'
import type { FireDataPoint } from './use-active-fires'

interface FireImpactOptions {
  fire: FireDataPoint | null
  pollutant?: 'HCHO' | 'NO2'
  hoursBack?: number
  hoursForward?: number
  enabled?: boolean
}

export function useFireImpactAnalysis(options: FireImpactOptions) {
  const {
    fire,
    pollutant = 'HCHO', // HCHO es mejor indicador de incendios
    hoursBack = 24,
    hoursForward = 24,
    enabled = true,
  } = options

  const { data, isLoading, error, refetch } = trpc.analizarImpactoIncendio.useQuery(
    {
      fire: fire
        ? {
            latitude: fire.latitude,
            longitude: fire.longitude,
            acq_date: fire.acq_date,
            acq_time: fire.acq_time,
            frp: fire.frp,
          }
        : ({} as any), // Fallback vacío
      pollutant,
      hoursBack,
      hoursForward,
    },
    {
      enabled: enabled && !!fire,
      retry: 2,
      staleTime: 5 * 60 * 1000, // 5 minutos
    }
  )

  return {
    timeline: data?.timeline ?? [],
    impact: data?.impact,
    fireInfo: data?.fire,
    interpretation: data?.interpretation,
    statistics: data?.statistics,
    isLoading,
    error,
    refetch,
    hasData: !!data && data.timeline.length > 0,
  }
}

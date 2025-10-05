"use client"

import { trpc } from '@/lib/trpc'
import { useEffect, useState, useMemo, useCallback, useRef } from 'react'

// Optimización: Configuración de debouncing para evitar llamadas excesivas
const DEBOUNCE_CONFIG = {
  delay: 300, // ms
  maxRetries: 3,
  retryDelay: 1000 // ms
}

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
 * Medición de un parámetro específico
 */
export interface ParameterMeasurement {
  Parameter: string
  AQI: number
  RawConcentration: number
  Unit: string
  UTC: string
}

/**
 * Estación agrupada con todos sus parámetros
 */
export interface GroupedStation {
  Latitude: number
  Longitude: number
  SiteName: string
  AgencyName: string
  FullAQSCode: string
  Status: string
  measurements: ParameterMeasurement[]
  dominantAQI: number // El AQI predominante de todos los parámetros
  dominantParameter: string // El parámetro predominante
  lastUpdate: string // UTC del dato más reciente
}

/**
 * Props para el hook de estaciones de monitoreo
 */
export interface UseMonitoringStationsProps {
  enabled?: boolean
}

/**
 * Principales ciudades de California - Base para calcular bbox
 */
const CIUDADES_CALIFORNIA = [
  { nombre: 'Los Angeles', lat: 34.0522, lng: -118.2437, poblacion: 3898747 },
  { nombre: 'San Diego', lat: 32.7157, lng: -117.1611, poblacion: 1386932 },
  { nombre: 'San Jose', lat: 37.3382, lng: -121.8863, poblacion: 1013240 },
  { nombre: 'San Francisco', lat: 37.7749, lng: -122.4194, poblacion: 873965 },
  { nombre: 'Fresno', lat: 36.7378, lng: -119.7871, poblacion: 542107 },
  { nombre: 'Sacramento', lat: 38.5816, lng: -121.4944, poblacion: 524943 },
  { nombre: 'Long Beach', lat: 33.7701, lng: -118.1937, poblacion: 466742 },
  { nombre: 'Oakland', lat: 37.8044, lng: -122.2712, poblacion: 440646 },
  { nombre: 'Bakersfield', lat: 35.3733, lng: -119.0187, poblacion: 403455 },
  { nombre: 'Anaheim', lat: 33.8366, lng: -117.9143, poblacion: 346824 },
  { nombre: 'Santa Ana', lat: 33.7455, lng: -117.8677, poblacion: 310227 },
  { nombre: 'Riverside', lat: 33.9806, lng: -117.3755, poblacion: 314998 },
  { nombre: 'Stockton', lat: 37.9577, lng: -121.2908, poblacion: 320804 },
  { nombre: 'Irvine', lat: 33.6846, lng: -117.8265, poblacion: 307670 },
  { nombre: 'Chula Vista', lat: 32.6401, lng: -117.0842, poblacion: 275487 },
] as const

/**
 * Calcular bounding box que cubra todas las ciudades principales de California
 * con un margen de seguridad para capturar estaciones cercanas
 */
function calcularBboxCalifornia() {
  const lats = CIUDADES_CALIFORNIA.map(c => c.lat)
  const lngs = CIUDADES_CALIFORNIA.map(c => c.lng)

  // Margen de ~50km (≈0.5 grados)
  const margin = 0.5

  return {
    minLatitude: Math.min(...lats) - margin,
    maxLatitude: Math.max(...lats) + margin,
    minLongitude: Math.min(...lngs) - margin,
    maxLongitude: Math.max(...lngs) + margin,
  }
}

/**
 * Configuración por defecto para California
 */
const DEFAULT_CONFIG = {
  enabled: true
} as const

/**
 * Configuración de React Query para datos de calidad del aire
 * Cache agresivo para evitar rate limiting de AirNow (500 req/hora)
 */
const QUERY_CONFIG = {
  refetchInterval: 60 * 60 * 1000, // Refetch cada 1 hora (datos actualizan cada hora)
  staleTime: 50 * 60 * 1000, // Considerar stale después de 50 minutos
  cacheTime: 2 * 60 * 60 * 1000, // Mantener en cache 2 horas
  retry: 2, // Reintentar solo 2 veces para no saturar API
  retryDelay: 2000, // Esperar 2 segundos entre reintentos
} as const

/**
 * Valores de error comunes en APIs de calidad del aire
 */
const ERROR_VALUES = [-999, -9999, -1, 999, 9999] as const

/**
 * Valores de estado considerados como activos
 */
const ACTIVE_STATUS_VALUES = [
  'Active', 'active', 'ACTIVE', '1', 'true', 
  'operational', 'Operational', undefined, null
] as const

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
// Optimización: Hook con debouncing y memoización
export function useMonitoringStations({
  enabled = DEFAULT_CONFIG.enabled
}: UseMonitoringStationsProps = {}) {
  // Estados locales optimizados
  const [stations, setStations] = useState<MonitoringStation[]>([])
  const [groupedStations, setGroupedStations] = useState<GroupedStation[]>([])
  const [isLoading, setIsLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)

  // Ref para debouncing
  const debounceRef = useRef<NodeJS.Timeout | null>(null)

  // Calcular bbox que cubre todas las ciudades de California
  const bbox = useMemo(() => calcularBboxCalifornia(), [])

  // Query para obtener estaciones de AirNow
  // UI controla explícitamente el bbox - backend maneja chunking
  const {
    data: airnowStations,
    isLoading: airnowLoading,
    error: airnowError,
    refetch: refetchStations
  } = trpc.obtenerEstacionesAirNow.useQuery(
    {
      bbox
    },
    {
      enabled,
      ...QUERY_CONFIG
    }
  )

  // Callback para refetch manual
  const refetch = useCallback(async () => {
    try {
      await refetchStations()
    } catch (error) {
      console.error('Error al refetch de datos:', error)
    }
  }, [refetchStations])

// Efecto para manejar datos de estaciones
  useEffect(() => {
    if (airnowStations) {
      try {
        const stationsData = airnowStations as unknown as MonitoringStation[]

        console.log('🔄 [HOOK] === DATOS RECIBIDOS DEL SERVIDOR ===')
        console.log(`📊 [HOOK] Total de estaciones: ${stationsData.length}`)

        if (stationsData.length > 0) {
          // Análisis de timestamps y códigos AQS
          console.log('⏰ [HOOK] Análisis de timestamps en duplicados:')
          const timestampAnalysis = new Map<string, MonitoringStation[]>()

          stationsData.slice(0, 10).forEach(station => {
            const key = `${station.SiteName}-${station.Parameter}`
            if (!timestampAnalysis.has(key)) {
              timestampAnalysis.set(key, [])
            }
            timestampAnalysis.get(key)!.push(station)
          })

          timestampAnalysis.forEach((stations, key) => {
            if (stations.length > 1) {
              console.warn(`  🔁 ${key}:`)
              stations.forEach(s => {
                console.warn(`    UTC: ${s.UTC}, AQI: ${s.AQI}, AQS: ${s.FullAQSCode}`)
              })
            }
          })

// AGRUPACIÓN: Agrupar mediciones por ubicación física
          console.log('🏢 [HOOK] Agrupando mediciones por estación...')

          const stationGroups = new Map<string, GroupedStation>()

          stationsData.forEach(station => {
            // Clave única por ubicación física (coordenadas + nombre)
            const locationKey = `${station.Latitude.toFixed(6)}-${station.Longitude.toFixed(6)}-${station.SiteName}`

            if (!stationGroups.has(locationKey)) {
              // Nueva estación física
              stationGroups.set(locationKey, {
                Latitude: station.Latitude,
                Longitude: station.Longitude,
                SiteName: station.SiteName,
                AgencyName: station.AgencyName,
                FullAQSCode: station.FullAQSCode,
                Status: station.Status,
                measurements: [],
                dominantAQI: -Infinity,
                dominantParameter: '',
                lastUpdate: station.UTC
              })
            }

            const group = stationGroups.get(locationKey)!

            // Agregar medición de este parámetro (solo si es más reciente)
            const existingMeasurement = group.measurements.find(m => m.Parameter === station.Parameter)

            if (!existingMeasurement) {
              // Primer dato de este parámetro
              group.measurements.push({
                Parameter: station.Parameter,
                AQI: station.AQI,
                RawConcentration: station.RawConcentration,
                Unit: station.Unit,
                UTC: station.UTC
              })
            } else {
              // Ya existe medición de este parámetro, tomar la más reciente
              const existingTime = new Date(existingMeasurement.UTC).getTime()
              const currentTime = new Date(station.UTC).getTime()

              if (!isNaN(currentTime) && currentTime > existingTime) {
                // Reemplazar con dato más reciente
                Object.assign(existingMeasurement, {
                  AQI: station.AQI,
                  RawConcentration: station.RawConcentration,
                  Unit: station.Unit,
                  UTC: station.UTC
                })
              }
            }

            // Actualizar el AQI predominante (ignorar valores negativos = sin datos)
            group.measurements.forEach(m => {
              if (m.AQI > 0 && m.AQI > group.dominantAQI) {
                group.dominantAQI = m.AQI
                group.dominantParameter = m.Parameter
              }
            })

            // Actualizar última actualización
            const groupTime = new Date(group.lastUpdate).getTime()
            const stationTime = new Date(station.UTC).getTime()
            if (!isNaN(stationTime) && stationTime > groupTime) {
              group.lastUpdate = station.UTC
            }
          })

          const grouped = Array.from(stationGroups.values())

          console.log(`✨ [HOOK] Agrupación completada:`)
          console.log(`   Mediciones totales: ${stationsData.length}`)
          console.log(`   Estaciones físicas: ${grouped.length}`)
          console.log(`   Reducción: ${((1 - grouped.length / stationsData.length) * 100).toFixed(1)}%`)

          // Análisis de parámetros por estación
          const paramsPerStation = grouped.map(s => s.measurements.length)
          const avgParams = paramsPerStation.reduce((a, b) => a + b, 0) / grouped.length

          console.log(`📊 [HOOK] Parámetros por estación:`)
          console.log(`   Promedio: ${avgParams.toFixed(1)} parámetros/estación`)
          console.log(`   Máximo: ${Math.max(...paramsPerStation)} parámetros`)
          console.log(`   Mínimo: ${Math.min(...paramsPerStation)} parámetros`)

          // Mostrar ejemplos
          console.log('📋 [HOOK] Primeras 3 estaciones agrupadas:')
          grouped.slice(0, 3).forEach((station, idx) => {
            console.log(`  ${idx + 1}. ${station.SiteName}:`, {
              coords: [station.Latitude, station.Longitude],
              measurements: station.measurements.length,
              parameters: station.measurements.map(m => `${m.Parameter}(${m.AQI})`).join(', '),
              dominantAQI: station.dominantAQI,
              dominantParameter: station.dominantParameter
            })
          })

          // Mantener compatibilidad con stations (flat)
          const flatStations = grouped.flatMap(group =>
            group.measurements.map(m => ({
              ...group,
              Parameter: m.Parameter,
              AQI: m.AQI,
              RawConcentration: m.RawConcentration,
              Unit: m.Unit,
              UTC: m.UTC,
              // Campos adicionales para compatibilidad
              Category: 0,
              ParameterCode: '',
              MonitorType: '',
              Qualifier: '',
              SiteType: '',
              EPARegion: '',
              Latitude_Band: '',
              Longitude_Band: '',
              GMT_Offset: 0,
              ParameterName: m.Parameter,
              DateOfLastChange: m.UTC,
              IntlAQSCode: group.FullAQSCode
            } as MonitoringStation))
          )

          setStations(flatStations)
          setGroupedStations(grouped)
        } else {
          setStations([])
        }

        setError(null)
      } catch (error) {
        console.error('❌ [HOOK] Error al procesar datos de estaciones:', error)
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
    setIsLoading(airnowLoading)
  }, [airnowLoading])

  // Memoizar estadísticas de las estaciones
  const stationStats = useMemo(() => {
    if (!stations.length) return null

    // Filtrar estaciones con datos válidos
    const validDataStations = stations.filter(station => 
      station.RawConcentration > 0 && !ERROR_VALUES.includes(station.RawConcentration as any)
    )

    // Filtrar estaciones activas
    const activeStations = stations.filter(station => 
      ACTIVE_STATUS_VALUES.includes(station.Status as any)
    )
    
    // Obtener parámetros y agencias únicos
    const parameters = [...new Set(stations.map(station => station.Parameter))]
    const agencies = [...new Set(stations.map(station => station.AgencyName))]

    // Calcular AQI promedio solo de estaciones con datos válidos
    const validAQIStations = validDataStations.filter(station => 
      station.AQI > 0 && station.AQI <= 500
    )
    
    const avgAQI = validAQIStations.length > 0 
      ? validAQIStations.reduce((sum, station) => sum + station.AQI, 0) / validAQIStations.length
      : 0

    return {
      total: stations.length,
      active: activeStations.length,
      validData: validDataStations.length,
      parameters: parameters.length,
      agencies: agencies.length,
      avgAQI: avgAQI
    }
  }, [stations])

return {
    stations, // Flat list (compatibilidad)
    groupedStations, // Estaciones agrupadas por ubicación
    isLoading,
    error,
    refetch,
    stats: stationStats
  }
}

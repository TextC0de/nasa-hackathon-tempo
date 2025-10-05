"use client"

import { useEffect, useState } from "react"
import { trpc } from "@/lib/trpc"

export interface CityFeature {
  type: "Feature"
  geometry: {
    type: "MultiPolygon" | "Polygon"
    coordinates: number[][][][]
  }
  properties: {
    CENSUS_PLACE_NAME: string
    population?: number
    centerLat?: number
    centerLng?: number
  }
}

export interface CaliforniaCitiesData {
  type: "FeatureCollection"
  features: CityFeature[]
}

/**
 * Hook para cargar ciudades de California con datos de población
 */
export function useCaliforniaCities(options: { enabled?: boolean } = {}) {
  const { enabled = true } = options
  const [citiesData, setCitiesData] = useState<CaliforniaCitiesData | null>(null)
  const [isLoading, setIsLoading] = useState(true)
  const [error, setError] = useState<Error | null>(null)

  // Cargar GeoJSON
  useEffect(() => {
    if (!enabled) {
      setIsLoading(false)
      return
    }

    const loadCities = async () => {
      try {
        setIsLoading(true)
        const response = await fetch('/data/query.json')
        if (!response.ok) {
          throw new Error(`Failed to load cities: ${response.statusText}`)
        }
        const data: CaliforniaCitiesData = await response.json()

        // Calcular centro de cada ciudad (promedio de coordenadas)
        const enrichedFeatures = data.features.map(feature => {
          const coords = feature.geometry.coordinates[0][0] // Primer anillo del primer polígono
          const centerLng = coords.reduce((sum, coord) => sum + coord[0], 0) / coords.length
          const centerLat = coords.reduce((sum, coord) => sum + coord[1], 0) / coords.length

          return {
            ...feature,
            properties: {
              ...feature.properties,
              centerLat,
              centerLng,
            }
          }
        })

        setCitiesData({
          ...data,
          features: enrichedFeatures
        })
        setError(null)
      } catch (err) {
        console.error('Error loading California cities:', err)
        setError(err instanceof Error ? err : new Error('Unknown error'))
      } finally {
        setIsLoading(false)
      }
    }

    loadCities()
  }, [enabled])

  return {
    citiesData,
    isLoading,
    error,
    citiesCount: citiesData?.features.length ?? 0
  }
}

/**
 * Hook para obtener datos de población de ciudades específicas
 */
export function useCityPopulation(cityName: string, options: { enabled?: boolean } = {}) {
  const { enabled = true } = options

  const { data, isLoading, error } = trpc.obtenerPoblacionCiudad.useQuery(
    { nombre: cityName },
    {
      enabled: enabled && !!cityName,
      staleTime: 1000 * 60 * 60 * 24, // 24 horas (datos de población no cambian rápido)
      retry: 1
    }
  )

  return {
    population: data?.population ?? null,
    isLoading,
    error
  }
}

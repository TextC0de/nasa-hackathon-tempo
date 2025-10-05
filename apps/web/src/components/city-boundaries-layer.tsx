"use client"

import { useEffect, useState } from "react"
import L from "leaflet"
import { trpc } from "@/lib/trpc"

interface CityBoundariesLayerProps {
  onCityHover?: (city: {
    nombre: string
    poblacion: number
    aqi: number | null
    categoria: string | null
    lat: number
    lng: number
  } | null) => void
  onCityClick?: (city: {
    nombre: string
    poblacion: number
    aqi: number | null
    categoria: string | null
    lat: number
    lng: number
  }) => void
}

// Función para obtener color del polígono según AQI
const getPolygonColor = (aqi: number | null) => {
  if (!aqi) return '#94a3b8' // gray
  if (aqi <= 50) return '#22c55e' // green
  if (aqi <= 100) return '#eab308' // yellow
  if (aqi <= 150) return '#f97316' // orange
  if (aqi <= 200) return '#ef4444' // red
  if (aqi <= 300) return '#a855f7' // purple
  return '#7f1d1d' // maroon
}

// Función para obtener el centro aproximado de una ciudad desde el GeoJSON
const getCityCenter = (nombre: string, geojsonFeatures: any[]): [number, number] => {
  const CIUDADES_COORDS: Record<string, [number, number]> = {
    'Los Angeles': [34.0522, -118.2437],
    'San Diego': [32.7157, -117.1611],
    'San Jose': [37.3382, -121.8863],
    'San Francisco': [37.7749, -122.4194],
    'Fresno': [36.7378, -119.7871],
    'Sacramento': [38.5816, -121.4944],
    'Long Beach': [33.7701, -118.1937],
    'Oakland': [37.8044, -122.2712],
    'Bakersfield': [35.3733, -119.0187],
    'Anaheim': [33.8366, -117.9143],
    'Santa Ana': [33.7455, -117.8677],
    'Riverside': [33.9806, -117.3755],
    'Stockton': [37.9577, -121.2908],
    'Irvine': [33.6846, -117.8265],
    'Chula Vista': [32.6401, -117.0842],
  }
  return CIUDADES_COORDS[nombre] || [0, 0]
}

interface CiudadData {
  nombre: string
  poblacion: number
  aqi: number | null
  categoria: string | null
  lat: number
  lng: number
}

// Componente interno que usa useMap
function CityBoundariesLayerInner({
  geojsonData,
  ciudadesData,
  onCityHover,
  onCityClick
}: {
  geojsonData: any
  ciudadesData: any
  onCityHover?: CityBoundariesLayerProps['onCityHover']
  onCityClick?: CityBoundariesLayerProps['onCityClick']
}) {
  const { useMap } = require('react-leaflet')
  const map = useMap()

  useEffect(() => {
    if (!geojsonData || !ciudadesData) return

    // Crear un mapa de ciudades por nombre para acceso rápido
    const ciudadesMap = new Map<string, CiudadData>(
      ciudadesData.ciudades.map((ciudad: any) => [ciudad.nombre, ciudad as CiudadData])
    )

    // Crear capa de GeoJSON
    const geojsonLayer = L.geoJSON(geojsonData, {
      style: (feature) => {
        const nombre = feature?.properties?.nombre
        const ciudad = nombre ? ciudadesMap.get(nombre) : null
        const aqi = ciudad?.aqi || null

        return {
          fillColor: getPolygonColor(aqi),
          fillOpacity: 0.2,
          color: getPolygonColor(aqi),
          weight: 2,
          opacity: 0.6,
        }
      },
      onEachFeature: (feature, layer) => {
        const nombre = feature.properties.nombre
        const ciudad = ciudadesMap.get(nombre) as CiudadData | undefined

        if (!ciudad) return

        const [lat, lng] = getCityCenter(nombre, geojsonData.features)

        const cityData = {
          nombre: ciudad.nombre,
          poblacion: ciudad.poblacion,
          aqi: ciudad.aqi,
          categoria: ciudad.categoria,
          lat,
          lng,
        }

        // Popup
        layer.bindPopup(`
          <div style="font-family: system-ui; min-width: 200px;">
            <div style="font-weight: 600; font-size: 16px; margin-bottom: 6px;">
              ${ciudad.nombre}
            </div>
            <div style="font-size: 12px; color: #6b7280; margin-bottom: 10px;">
              Población: ${ciudad.poblacion.toLocaleString()}
            </div>
            ${
              ciudad.aqi
                ? `
              <div style="display: flex; align-items: center; gap: 8px; padding: 6px 10px; background: ${getPolygonColor(ciudad.aqi)}20; border-radius: 6px; border-left: 4px solid ${getPolygonColor(ciudad.aqi)};">
                <div>
                  <div style="font-size: 14px; font-weight: 600;">AQI: ${ciudad.aqi}</div>
                  <div style="font-size: 11px; color: #6b7280; margin-top: 2px;">
                    ${ciudad.categoria}
                  </div>
                </div>
              </div>
            `
                : `<div style="font-size: 11px; color: #9ca3af;">Sin datos de AQI</div>`
            }
          </div>
        `)

        // Hover events
        layer.on('mouseover', function (e) {
          // Highlight visual
          const pathLayer = layer as L.Path
          pathLayer.setStyle({
            fillOpacity: 0.4,
            weight: 3,
            opacity: 1,
          })

          if (onCityHover) {
            onCityHover(cityData)
          }
        })

        layer.on('mouseout', function (e) {
          // Reset style
          const pathLayer = layer as L.Path
          pathLayer.setStyle({
            fillOpacity: 0.2,
            weight: 2,
            opacity: 0.6,
          })

          if (onCityHover) {
            onCityHover(null)
          }
        })

        // Click event
        if (onCityClick) {
          layer.on('click', () => {
            onCityClick(cityData)
          })
        }
      },
    })

    // Agregar capa al mapa
    geojsonLayer.addTo(map)

    // Cleanup
    return () => {
      geojsonLayer.removeFrom(map)
    }
  }, [map, geojsonData, ciudadesData, onCityHover, onCityClick])

  return null
}

export function CityBoundariesLayer({ onCityHover, onCityClick }: CityBoundariesLayerProps) {
  const [geojsonData, setGeojsonData] = useState<any>(null)
  const { data: ciudadesData } = trpc.obtenerPoblacionAfectada.useQuery({})

  // Cargar GeoJSON real de California
  useEffect(() => {
    fetch('http://tazasumi.com/query.json')
      .then((res) => res.json())
      .then((data) => {
        // Transformar para que coincida con el formato esperado
        const transformed = {
          ...data,
          features: data.features.map((feature: any) => ({
            ...feature,
            properties: {
              nombre: feature.properties.CENSUS_PLACE_NAME,
              ...feature.properties
            }
          }))
        }
        setGeojsonData(transformed)
      })
      .catch((err) => console.error('Error loading GeoJSON:', err))
  }, [])

  if (!geojsonData || !ciudadesData) return null

  return (
    <CityBoundariesLayerInner
      geojsonData={geojsonData}
      ciudadesData={ciudadesData}
      onCityHover={onCityHover}
      onCityClick={onCityClick}
    />
  )
}

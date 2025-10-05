"use client"

import { useEffect, useState } from "react"
import L from "leaflet"
import { trpc } from "@/lib/trpc"

// Ciudades base - Se muestran inmediatamente sin esperar AQI
const CIUDADES_BASE = [
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
]

interface CitiesLayerProps {
  onCityClick?: (city: {
    nombre: string
    poblacion: number
    aqi: number | null
    lat: number
    lng: number
  }) => void
}

const getMarkerColor = (aqi: number | null) => {
  if (!aqi) return '#94a3b8' // gray
  if (aqi <= 50) return '#22c55e' // green
  if (aqi <= 100) return '#eab308' // yellow
  if (aqi <= 150) return '#f97316' // orange
  if (aqi <= 200) return '#ef4444' // red
  if (aqi <= 300) return '#a855f7' // purple
  return '#7f1d1d' // maroon
}

const createCityIcon = (aqi: number | null, poblacion: number) => {
  const color = getMarkerColor(aqi)

  // Tamaño basado en población
  const size = poblacion > 1000000 ? 14 : poblacion > 500000 ? 12 : 10

  return L.divIcon({
    className: 'city-marker',
    html: `
      <div style="
        width: ${size}px;
        height: ${size}px;
        background: ${color};
        border: 2px solid white;
        border-radius: 50%;
        box-shadow: 0 2px 6px rgba(0,0,0,0.3);
        cursor: pointer;
      "></div>
    `,
    iconSize: [size, size],
    iconAnchor: [size / 2, size / 2],
  })
}

// Componente interno que usa useMap
function CitiesLayerInner({ data, onCityClick }: {
  data: any
  onCityClick?: CitiesLayerProps['onCityClick']
}) {
  const { useMap } = require('react-leaflet')
  const map = useMap()

  useEffect(() => {
    if (!data || !data.ciudades) return

    // Crear capa de marcadores
    const markersLayer = L.layerGroup()

    data.ciudades.forEach((ciudad: any) => {
      const marker = L.marker([ciudad.lat, ciudad.lng], {
        icon: createCityIcon(ciudad.aqi, ciudad.poblacion),
      })

      // Popup con información
      marker.bindPopup(`
        <div style="font-family: system-ui; min-width: 180px;">
          <div style="font-weight: 600; font-size: 14px; margin-bottom: 4px;">
            ${ciudad.nombre}
          </div>
          <div style="font-size: 12px; color: #6b7280; margin-bottom: 8px;">
            Población: ${ciudad.poblacion.toLocaleString()}
          </div>
          ${
            ciudad.aqi
              ? `
            <div style="display: flex; align-items: center; gap: 6px; padding: 4px 8px; background: ${getMarkerColor(ciudad.aqi)}20; border-radius: 4px;">
              <div style="width: 8px; height: 8px; background: ${getMarkerColor(ciudad.aqi)}; border-radius: 50%;"></div>
              <span style="font-size: 12px; font-weight: 500;">AQI: ${ciudad.aqi}</span>
            </div>
            <div style="font-size: 11px; color: #6b7280; margin-top: 4px;">
              ${ciudad.categoria}
            </div>
          `
              : `<div style="font-size: 11px; color: #9ca3af;">Sin datos de AQI</div>`
          }
        </div>
      `)

      // Event listener para click
      if (onCityClick) {
        marker.on('click', () => {
          onCityClick(ciudad)
        })
      }

      markersLayer.addLayer(marker)
    })

    // Agregar capa al mapa
    markersLayer.addTo(map)

    // Cleanup
    return () => {
      markersLayer.removeFrom(map)
    }
  }, [map, data, onCityClick])

  return null
}

export function CitiesLayer({ onCityClick }: CitiesLayerProps) {
  // Estado local con ciudades base (se muestran inmediatamente)
  const [ciudadesData, setCiudadesData] = useState({
    ciudades: CIUDADES_BASE.map(c => ({ ...c, aqi: null, categoria: null, color: null }))
  })

  // Query para obtener AQI actualizado (en segundo plano)
  const { data } = trpc.obtenerPoblacionAfectada.useQuery(
    {},
    {
      // No bloquear la UI mientras carga
      refetchInterval: 5 * 60 * 1000, // Refetch cada 5 minutos
      staleTime: 2 * 60 * 1000, // Considerar stale después de 2 minutos
    }
  )

  // Actualizar ciudades cuando llegue data con AQI
  useEffect(() => {
    if (data?.ciudades) {
      console.log('🏙️ [CITIES LAYER] Actualizando ciudades con AQI desde API')
      setCiudadesData(data)
    }
  }, [data])

  return <CitiesLayerInner data={ciudadesData} onCityClick={onCityClick} />
}

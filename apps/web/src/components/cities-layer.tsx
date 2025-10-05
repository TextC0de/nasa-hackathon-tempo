"use client"

import { useEffect } from "react"
import L from "leaflet"
import { trpc } from "@/lib/trpc"

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
  const { data } = trpc.obtenerPoblacionAfectada.useQuery({})

  if (!data) return null

  return <CitiesLayerInner data={data} onCityClick={onCityClick} />
}

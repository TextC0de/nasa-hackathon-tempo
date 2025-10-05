"use client"

import { useEffect, useRef } from "react"
import dynamic from "next/dynamic"
import L from "leaflet"
import "leaflet/dist/leaflet.css"

// Configuración del mapa
const MAP_CONFIG = {
  center: [36.7783, -119.4179] as [number, number], // Centro de California
  zoom: 7,
  bounds: [
    [32.5, -125.0], // Southwest corner
    [42.0, -114.0]  // Northeast corner
  ] as [[number, number], [number, number]],
  boundsOptions: { padding: [20, 20] as [number, number], maxZoom: 9 }
} as const

// Configuración del pin
const PIN_CONFIG = {
  iconSize: [32, 48] as [number, number],
  iconAnchor: [16, 48] as [number, number],
  popupAnchor: [0, -48] as [number, number]
} as const

const MapContainer = dynamic(
  () => import("react-leaflet").then((mod) => mod.MapContainer),
  { ssr: false }
)

const TileLayer = dynamic(
  () => import("react-leaflet").then((mod) => mod.TileLayer),
  { ssr: false }
)

const Marker = dynamic(
  () => import("react-leaflet").then((mod) => mod.Marker),
  { ssr: false }
)

const Popup = dynamic(
  () => import("react-leaflet").then((mod) => mod.Popup),
  { ssr: false }
)

// Configuración del pin personalizado para reportes
const createReportPinIcon = (): L.DivIcon => {
  return L.divIcon({
    className: 'custom-report-pin',
    html: `
      <div class="report-pin-container">
        <div class="report-pin-pin">
          <div class="report-pin-icon">!</div>
        </div>
        <div class="report-pin-shadow"></div>
      </div>
    `,
    iconSize: PIN_CONFIG.iconSize,
    iconAnchor: PIN_CONFIG.iconAnchor,
    popupAnchor: PIN_CONFIG.popupAnchor
  })
}

// Componente para manejar clics en el mapa
interface MapClickHandlerProps {
  onMapClick: (e: L.LeafletMouseEvent) => void
}

function MapClickHandler({ onMapClick }: MapClickHandlerProps) {
  const { useMapEvents } = require('react-leaflet')
  
  useMapEvents({
    click: (e: L.LeafletMouseEvent) => {
      onMapClick(e)
    }
  })
  return null
}

interface ReportMapProps {
  onMapClick: (e: L.LeafletMouseEvent) => void
  selectedLocation?: { lat: number; lng: number }
  className?: string
}

export function ReportMap({ onMapClick, selectedLocation, className }: ReportMapProps) {
  // Agregar estilos CSS para el pin personalizado
  useEffect(() => {
    const style = document.createElement('style')
    style.textContent = `
      .custom-report-pin {
        background: transparent !important;
        border: none !important;
      }
      
      .report-pin-container {
        position: relative;
        width: 32px;
        height: 48px;
      }
      
      .report-pin-pin {
        position: absolute;
        top: 0;
        left: 50%;
        transform: translateX(-50%);
        width: 28px;
        height: 40px;
        background: linear-gradient(135deg, #dc2626, #ea580c);
        border: 2px solid #ffffff;
        border-radius: 50% 50% 50% 0;
        transform: translateX(-50%) rotate(-45deg);
        box-shadow: 
          0 4px 8px rgba(0, 0, 0, 0.3),
          0 0 0 1px rgba(255, 255, 255, 0.8);
        z-index: 2;
        display: flex;
        align-items: center;
        justify-content: center;
      }
      
      .report-pin-icon {
        transform: rotate(45deg);
        color: white;
        font-weight: bold;
        font-size: 14px;
        text-shadow: 0 1px 2px rgba(0, 0, 0, 0.5);
        line-height: 1;
      }
      
      .report-pin-shadow {
        position: absolute;
        bottom: 2px;
        left: 50%;
        transform: translateX(-50%);
        width: 20px;
        height: 10px;
        background: rgba(0, 0, 0, 0.25);
        border-radius: 50%;
        filter: blur(3px);
        z-index: 1;
      }
      
      /* Efecto hover para interactividad */
      .report-pin-pin:hover {
        transform: translateX(-50%) rotate(-45deg) scale(1.1);
        box-shadow: 
          0 6px 12px rgba(0, 0, 0, 0.4),
          0 0 0 2px rgba(255, 255, 255, 0.9);
        transition: all 0.2s ease;
      }
    `
    document.head.appendChild(style)
    
    return () => {
      document.head.removeChild(style)
    }
  }, [])

  return (
    <div className={className}>
      <MapContainer
        center={MAP_CONFIG.center}
        zoom={MAP_CONFIG.zoom}
        style={{ height: "100%", width: "100%" }}
        bounds={MAP_CONFIG.bounds}
        boundsOptions={MAP_CONFIG.boundsOptions}
      >
        <TileLayer
          attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors'
          url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
        />
        
        {/* Handler para clics en el mapa */}
        <MapClickHandler onMapClick={onMapClick} />
        
        {/* Marcador de ubicación seleccionada */}
        {selectedLocation && selectedLocation.lat !== 0 && selectedLocation.lng !== 0 && (
          <Marker 
            position={[selectedLocation.lat, selectedLocation.lng]}
            icon={createReportPinIcon()}
          >
            <Popup>
              <div className="text-center p-2">
                <p className="font-medium text-orange-700">📍 Ubicación seleccionada</p>
                <p className="text-sm text-gray-600 mt-1">
                  {selectedLocation.lat.toFixed(4)}, {selectedLocation.lng.toFixed(4)}
                </p>
              </div>
            </Popup>
          </Marker>
        )}
      </MapContainer>
    </div>
  )
}

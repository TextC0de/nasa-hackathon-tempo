"use client"

import { useState, useEffect, useMemo, useCallback } from "react"
import dynamic from "next/dynamic"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { Slider } from "@/components/ui/slider"
import { MapPin, Maximize2, Minimize2, Navigation } from "lucide-react"
import { cn } from "@/lib/utils"
import "leaflet/dist/leaflet.css"
import L from "leaflet"

// Dynamic imports para Leaflet
const MapContainer = dynamic(
  () => import("react-leaflet").then((mod) => mod.MapContainer),
  {
    ssr: false,
    loading: () => (
      <div className="flex items-center justify-center h-full bg-muted/20">
        <div className="w-6 h-6 border-3 border-primary border-t-transparent rounded-full animate-spin" />
      </div>
    )
  }
)

const TileLayer = dynamic(
  () => import("react-leaflet").then((mod) => mod.TileLayer),
  { ssr: false }
)

const Marker = dynamic(
  () => import("react-leaflet").then((mod) => mod.Marker),
  { ssr: false }
)

const Circle = dynamic(
  () => import("react-leaflet").then((mod) => mod.Circle),
  { ssr: false }
)

const Popup = dynamic(
  () => import("react-leaflet").then((mod) => mod.Popup),
  { ssr: false }
)

interface HistoryLocationMapProps {
  latitude: number
  longitude: number
  radiusKm: number
  onLocationChange: (lat: number, lng: number) => void
  onRadiusChange?: (radius: number) => void
  className?: string
}

// Componente para manejar clicks en el mapa
const MapClickHandler = ({ onClick }: { onClick: (e: L.LeafletMouseEvent) => void }) => {
  const { useMapEvents } = require('react-leaflet')
  useMapEvents({
    click: (e: L.LeafletMouseEvent) => {
      onClick(e)
    }
  })
  return null
}

// Componente para invalidar el tamaño del mapa cuando se expande/contrae
const MapResizeHandler = ({ isExpanded }: { isExpanded: boolean }) => {
  const { useMap } = require('react-leaflet')
  const map = useMap()

  useEffect(() => {
    // Esperar a que termine la animación CSS antes de invalidar el tamaño
    const timer = setTimeout(() => {
      map.invalidateSize()
    }, 350) // Ligeramente más que la duración de la transición (300ms)

    return () => clearTimeout(timer)
  }, [isExpanded, map])

  return null
}

// Componente para mantener el mapa centrado cuando cambia la posición
const MapCenterHandler = ({ position }: { position: [number, number] }) => {
  const { useMap } = require('react-leaflet')
  const map = useMap()

  useEffect(() => {
    map.setView(position, map.getZoom(), { animate: true })
  }, [position, map])

  return null
}

// Fix para iconos de Leaflet + Crear ícono personalizado arrastrable
if (typeof window !== 'undefined') {
  delete (L.Icon.Default.prototype as any)._getIconUrl
  L.Icon.Default.mergeOptions({
    iconRetinaUrl: 'https://unpkg.com/leaflet@1.9.4/dist/images/marker-icon-2x.png',
    iconUrl: 'https://unpkg.com/leaflet@1.9.4/dist/images/marker-icon.png',
    shadowUrl: 'https://unpkg.com/leaflet@1.9.4/dist/images/marker-shadow.png',
  })
}

// Ícono personalizado con animación pulsante
const createDraggableIcon = () => {
  if (typeof window === 'undefined') return L.icon({ iconUrl: '', iconSize: [0, 0] })

  return L.divIcon({
    className: 'custom-draggable-marker',
    html: `
      <div style="position: relative; width: 40px; height: 40px;">
        <!-- Pulso animado -->
        <div style="
          position: absolute;
          top: 50%;
          left: 50%;
          transform: translate(-50%, -50%);
          width: 40px;
          height: 40px;
          background: hsl(var(--primary));
          border-radius: 50%;
          opacity: 0.3;
          animation: pulse 2s ease-out infinite;
        "></div>

        <!-- Marker principal -->
        <div style="
          position: absolute;
          top: 50%;
          left: 50%;
          transform: translate(-50%, -50%);
          width: 30px;
          height: 30px;
          background: hsl(var(--primary));
          border: 3px solid white;
          border-radius: 50%;
          box-shadow: 0 2px 8px rgba(0,0,0,0.3);
          cursor: move;
          display: flex;
          align-items: center;
          justify-content: center;
          font-size: 16px;
        ">
          📍
        </div>

        <!-- Tooltip hint -->
        <div style="
          position: absolute;
          top: -25px;
          left: 50%;
          transform: translateX(-50%);
          background: rgba(0,0,0,0.8);
          color: white;
          padding: 2px 6px;
          border-radius: 4px;
          font-size: 10px;
          white-space: nowrap;
          pointer-events: none;
        ">
          Arrastra para mover
        </div>
      </div>

      <style>
        @keyframes pulse {
          0% {
            transform: translate(-50%, -50%) scale(0.8);
            opacity: 0.5;
          }
          50% {
            opacity: 0.2;
          }
          100% {
            transform: translate(-50%, -50%) scale(1.5);
            opacity: 0;
          }
        }
        .custom-draggable-marker {
          cursor: move !important;
        }
      </style>
    `,
    iconSize: [40, 40],
    iconAnchor: [20, 40],
    popupAnchor: [0, -40]
  })
}

export function HistoryLocationMap({
  latitude,
  longitude,
  radiusKm,
  onLocationChange,
  onRadiusChange,
  className
}: HistoryLocationMapProps) {
  const [isExpanded, setIsExpanded] = useState(false)
  const [locationName, setLocationName] = useState<string>("")
  const [isLoadingLocation, setIsLoadingLocation] = useState(false)
  const [showRadiusSlider, setShowRadiusSlider] = useState(false)

  // Geocoding reverso para obtener nombre del lugar
  useEffect(() => {
    const fetchLocationName = async () => {
      setIsLoadingLocation(true)
      try {
        const response = await fetch(
          `https://nominatim.openstreetmap.org/reverse?format=json&lat=${latitude}&lon=${longitude}&zoom=10&addressdetails=1`
        )
        const data = await response.json()

        // Priorizar: ciudad > condado > estado
        const name = data.address?.city ||
                     data.address?.county ||
                     data.address?.state ||
                     'California'

        setLocationName(name)
      } catch (error) {
        console.error('Error fetching location name:', error)
        setLocationName('California')
      } finally {
        setIsLoadingLocation(false)
      }
    }

    fetchLocationName()
  }, [latitude, longitude])

  // Manejar click en el mapa
  const handleMapClick = useCallback((e: L.LeafletMouseEvent) => {
    onLocationChange(e.latlng.lat, e.latlng.lng)
  }, [onLocationChange])

  // Centrar en ubicación actual
  const handleCenterLocation = useCallback(() => {
    if (navigator.geolocation) {
      navigator.geolocation.getCurrentPosition(
        (position) => {
          onLocationChange(position.coords.latitude, position.coords.longitude)
        },
        (error) => {
          console.error('Error getting location:', error)
        }
      )
    }
  }, [onLocationChange])

  const position: [number, number] = useMemo(() => [latitude, longitude], [latitude, longitude])

  return (
    <Card className={cn("border-2", className)}>
      <CardHeader className="p-3">
        <div className="space-y-2">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2 flex-1 min-w-0">
              <MapPin className="h-4 w-4 text-primary shrink-0" />
              <div className="flex-1 min-w-0">
                <CardTitle className="text-xs font-semibold truncate">
                  {isLoadingLocation ? "Loading location..." : locationName}
                </CardTitle>
                <p className="text-[10px] text-muted-foreground truncate">
                  {latitude.toFixed(4)}, {longitude.toFixed(4)}
                </p>
              </div>
            </div>
            <div className="flex items-center gap-1">
              <Badge
                variant="outline"
                className="text-[10px] h-5 px-1.5 shrink-0 cursor-pointer hover:bg-accent"
                onClick={() => setShowRadiusSlider(!showRadiusSlider)}
              >
                Radio: {radiusKm}km
              </Badge>
              <Button
                variant="ghost"
                size="icon"
                onClick={() => setIsExpanded(!isExpanded)}
                className="h-7 w-7 shrink-0"
              >
                {isExpanded ? (
                  <Minimize2 className="h-3.5 w-3.5" />
                ) : (
                  <Maximize2 className="h-3.5 w-3.5" />
                )}
              </Button>
            </div>
          </div>

          {/* Slider para cambiar radio */}
          {showRadiusSlider && onRadiusChange && (
            <div className="space-y-1 animate-in fade-in slide-in-from-top-2 duration-200">
              <div className="flex items-center justify-between text-[10px] text-muted-foreground">
                <span>Radio de análisis</span>
                <span className="font-medium text-foreground">{radiusKm} km</span>
              </div>
              <Slider
                value={[radiusKm]}
                onValueChange={(values) => onRadiusChange(values[0])}
                min={10}
                max={200}
                step={10}
                className="w-full"
              />
              <div className="flex justify-between text-[9px] text-muted-foreground">
                <span>10 km</span>
                <span>200 km</span>
              </div>
            </div>
          )}
        </div>
      </CardHeader>

      <CardContent className="p-0">
        <div className={cn(
          "relative overflow-hidden transition-all duration-300",
          isExpanded ? "h-96" : "h-64"
        )}>
          <MapContainer
            center={position}
            zoom={isExpanded ? 10 : 9}
            minZoom={5}
            maxZoom={18}
            style={{ height: '100%', width: '100%' }}
            zoomControl={isExpanded}
            dragging={true}
            scrollWheelZoom={true}
            doubleClickZoom={true}
            touchZoom={true}
          >
            <MapClickHandler onClick={handleMapClick} />
            <MapResizeHandler isExpanded={isExpanded} />
            <MapCenterHandler position={position} />
            <TileLayer
              attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors'
              url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
              maxZoom={18}
            />

            {/* Círculo mostrando el área de análisis */}
            <Circle
              center={position}
              radius={radiusKm * 1000} // Convertir km a metros
              pathOptions={{
                fillColor: 'hsl(var(--primary))',
                fillOpacity: 0.15,
                color: 'hsl(var(--primary))',
                weight: 2,
                opacity: 0.6
              }}
            />

            {/* Marcador arrastrable */}
            <Marker
              position={position}
              draggable={true}
              icon={createDraggableIcon()}
              eventHandlers={{
                dragend: (e) => {
                  const marker = e.target
                  const pos = marker.getLatLng()
                  onLocationChange(pos.lat, pos.lng)
                }
              }}
            >
              <Popup>
                <div className="text-xs">
                  <p className="font-semibold mb-1">{locationName}</p>
                  <p className="text-muted-foreground">
                    Lat: {latitude.toFixed(4)}<br />
                    Lng: {longitude.toFixed(4)}
                  </p>
                  <p className="text-[10px] text-muted-foreground mt-1">
                    Drag the marker to move the location
                  </p>
                </div>
              </Popup>
            </Marker>
          </MapContainer>

          {/* Botón para centrar en ubicación actual */}
          <Button
            variant="secondary"
            size="icon"
            onClick={handleCenterLocation}
            className="absolute bottom-3 right-3 h-8 w-8 rounded-full shadow-lg z-[1000]"
            title="Mi ubicación"
          >
            <Navigation className="h-4 w-4" />
          </Button>

          {/* Instrucciones */}
          {!isExpanded && (
            <div className="absolute bottom-3 left-3 bg-background/90 backdrop-blur-sm border rounded-lg px-2 py-1 text-[10px] text-muted-foreground z-[1000]">
              Click to change location
            </div>
          )}
        </div>
      </CardContent>
    </Card>
  )
}

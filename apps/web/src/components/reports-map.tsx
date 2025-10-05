"use client"

import React, { useState, useMemo } from "react"
import dynamic from "next/dynamic"
import L from "leaflet"
import { UserReport } from "@/lib/report-types"
import { ReportMarkers } from "./report-markers"
import { MapLegend } from "./map-legend"

// Importar estilos de Leaflet
import "leaflet/dist/leaflet.css"

// Configuración de mapas dinámicos
const MapContainer = dynamic(
  () => import("react-leaflet").then((mod) => mod.MapContainer),
  { 
    ssr: false,
    loading: () => (
      <div className="flex items-center justify-center h-full bg-muted/20">
        <div className="flex flex-col items-center space-y-2">
          <div className="w-8 h-8 border-4 border-primary border-t-transparent rounded-full animate-spin" />
          <p className="text-sm text-muted-foreground">Cargando mapa...</p>
        </div>
      </div>
    )
  }
)

const TileLayer = dynamic(
  () => import("react-leaflet").then((mod) => mod.TileLayer),
  { ssr: false }
)

// Configuración del mapa de California
const CALIFORNIA_CENTER: [number, number] = [36.7783, -119.4179]
const CALIFORNIA_ZOOM = 6
const CALIFORNIA_BOUNDS: [[number, number], [number, number]] = [
  [32.5, -124.4], // Southwest corner
  [42.0, -114.1]  // Northeast corner
]

interface ReportsMapProps {
  reports: UserReport[]
  selectedReportId?: string
  onReportClick?: (report: UserReport) => void
  className?: string
}

function ReportsMapComponent({ 
  reports, 
  selectedReportId, 
  onReportClick, 
  className = "h-full w-full" 
}: ReportsMapProps) {
  const [mapReady, setMapReady] = useState(false)

  // Calcular bounds para ajustar el mapa a todos los reportes
  const mapBounds = useMemo(() => {
    if (!reports.length) {
      return CALIFORNIA_BOUNDS
    }

    const lats = reports.map(r => parseFloat(r.latitud)).filter(lat => !isNaN(lat))
    const lngs = reports.map(r => parseFloat(r.longitud)).filter(lng => !isNaN(lng))

    if (lats.length === 0 || lngs.length === 0) {
      return CALIFORNIA_BOUNDS
    }

    const minLat = Math.min(...lats)
    const maxLat = Math.max(...lats)
    const minLng = Math.min(...lngs)
    const maxLng = Math.max(...lngs)

    // Agregar padding
    const latPadding = (maxLat - minLat) * 0.1
    const lngPadding = (maxLng - minLng) * 0.1

    return [
      [minLat - latPadding, minLng - lngPadding],
      [maxLat + latPadding, maxLng + lngPadding]
    ] as [[number, number], [number, number]]
  }, [reports])

  // Filtrar reportes válidos
  const validReports = useMemo(() => {
    return reports.filter(report => {
      const lat = parseFloat(report.latitud)
      const lng = parseFloat(report.longitud)
      return !isNaN(lat) && !isNaN(lng)
    })
  }, [reports])


  return (
    <div className={`relative ${className}`}>

      {/* Mapa */}
      <MapContainer
        center={CALIFORNIA_CENTER}
        zoom={CALIFORNIA_ZOOM}
        className="h-full w-full z-0"
        maxBounds={CALIFORNIA_BOUNDS}
        maxBoundsViscosity={1.0}
        zoomControl={true}
        scrollWheelZoom={true}
        doubleClickZoom={true}
        dragging={true}
        keyboard={true}
        whenReady={() => setMapReady(true)}
      >
        <TileLayer
          attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors'
          url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
        />

        {/* Marcadores de reportes */}
        {mapReady && (
          <ReportMarkers
            reports={validReports}
            selectedReportId={selectedReportId}
            onReportClick={onReportClick}
          />
        )}
      </MapContainer>

      {/* Leyenda */}
      <div className="absolute bottom-4 left-1/2 transform -translate-x-1/2 z-[1000]">
        <MapLegend />
      </div>
    </div>
  )
}

// Exportar como componente dinámico para evitar problemas de SSR
export const ReportsMap = dynamic(() => Promise.resolve(ReportsMapComponent), {
  ssr: false,
  loading: () => (
    <div className="flex items-center justify-center h-full bg-muted/20">
      <div className="flex flex-col items-center space-y-2">
        <div className="w-8 h-8 border-4 border-primary border-t-transparent rounded-full animate-spin" />
        <p className="text-sm text-muted-foreground">Cargando mapa...</p>
      </div>
    </div>
  )
})

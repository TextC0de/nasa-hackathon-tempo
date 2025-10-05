"use client"

import React, { useEffect } from "react"
import { Marker } from "react-leaflet"
import L from "leaflet"
import { UserReport } from "@/lib/report-types"
import { getSeverityConfig, getTypeConfig } from "@/lib/report-utils"

// Configuración de iconos personalizados para reportes
const createReportIcon = (severity: string, type: string) => {
  const severityConfig = getSeverityConfig(severity)
  const typeConfig = getTypeConfig(type)
  
  // Colores basados en severidad
  const severityColors = {
    'low': '#22c55e',      // green-500
    'intermediate': '#eab308', // yellow-500
    'critical': '#ef4444',     // red-500
    'bajo': '#22c55e',
    'intermedio': '#eab308',
    'critico': '#ef4444'
  }
  
  const color = severityColors[severity as keyof typeof severityColors] || '#6b7280'
  
  return L.divIcon({
    html: `
      <div class="report-marker" style="
        background: ${color};
        border: 2px solid white;
        border-radius: 50% 50% 50% 0;
        width: 24px;
        height: 24px;
        transform: rotate(-45deg);
        display: flex;
        align-items: center;
        justify-content: center;
        box-shadow: 0 2px 8px rgba(0,0,0,0.3);
        position: relative;
      ">
        <span style="
          transform: rotate(45deg);
          font-size: 12px;
          color: white;
          font-weight: bold;
          text-shadow: 0 1px 2px rgba(0,0,0,0.5);
        ">${typeConfig.icon}</span>
      </div>
    `,
    className: 'custom-report-marker',
    iconSize: [24, 24],
    iconAnchor: [12, 24],
    popupAnchor: [0, -24]
  })
}

interface ReportMarkersProps {
  reports: UserReport[]
  selectedReportId?: string
  onReportClick?: (report: UserReport) => void
}

export function ReportMarkers({ reports, selectedReportId, onReportClick }: ReportMarkersProps) {
  // Inyectar estilos solo en el cliente
  useEffect(() => {
    const style = document.createElement('style')
    style.textContent = reportMarkerStyles
    document.head.appendChild(style)
    
    return () => {
      document.head.removeChild(style)
    }
  }, [])

  return (
    <>
      {reports.map((report) => {
        const lat = parseFloat(report.latitud)
        const lng = parseFloat(report.longitud)
        
        if (isNaN(lat) || isNaN(lng)) {
          return null
        }


        return (
          <Marker
            key={report.id}
            position={[lat, lng]}
            icon={createReportIcon(report.gravedad, report.tipo)}
            eventHandlers={{
              click: () => {
                if (onReportClick) {
                  onReportClick(report)
                }
              }
            }}
          />
        )
      })}
    </>
  )
}

// Estilos CSS para los marcadores
const reportMarkerStyles = `
  .custom-report-marker {
    background: transparent !important;
    border: none !important;
  }
  
  .report-marker {
    transition: all 0.2s ease;
    cursor: pointer;
  }
  
  .report-marker:hover {
    transform: rotate(-45deg) scale(1.1);
    z-index: 1000;
  }
`


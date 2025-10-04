"use client"

import React, { useEffect, useRef } from 'react'
import { useMap } from 'react-leaflet'
import L from 'leaflet'
import { Alert as AlertType } from '@/hooks/use-alerts'

interface AlertMarkersProps {
  alerts: AlertType[]
}

export function AlertMarkers({ alerts }: AlertMarkersProps) {
  const map = useMap()
  const markersRef = useRef<L.Marker[]>([])

  useEffect(() => {
    // Limpiar marcadores existentes
    markersRef.current.forEach(marker => {
      map.removeLayer(marker)
    })
    markersRef.current = []

    // Crear marcadores para alertas con coordenadas
    alerts.forEach(alert => {
      if (alert.coordinates) {
        const alertIcon = createAlertIcon(alert.urgency)
        
        const marker = L.marker([alert.coordinates.lat, alert.coordinates.lng], {
          icon: alertIcon
        })

        const popupContent = createAlertPopupContent(alert)
        marker.bindPopup(popupContent, {
          className: 'alert-popup',
          maxWidth: 300,
          closeButton: true,
          autoClose: false,
          closeOnClick: false
        })

        marker.addTo(map)
        markersRef.current.push(marker)
      }
    })

    // Si hay alertas con coordenadas, ajustar la vista del mapa
    if (alerts.some(alert => alert.coordinates)) {
      const coordinates = alerts
        .filter(alert => alert.coordinates)
        .map(alert => [alert.coordinates!.lat, alert.coordinates!.lng] as [number, number])

      if (coordinates.length > 0) {
        const group = L.featureGroup(coordinates.map(coord => L.marker(coord)))
        map.fitBounds(group.getBounds().pad(0.1))
      }
    }

    return () => {
      markersRef.current.forEach(marker => {
        map.removeLayer(marker)
      })
    }
  }, [map, alerts])

  return null
}

function createAlertIcon(urgency: AlertType['urgency']): L.DivIcon {
  const getUrgencyColor = (urgency: AlertType['urgency']) => {
    switch (urgency) {
      case 'low': return '#3B82F6' // blue
      case 'medium': return '#F59E0B' // yellow
      case 'high': return '#F97316' // orange
      case 'critical': return '#EF4444' // red
      default: return '#6B7280' // gray
    }
  }

  const getUrgencyEmoji = (urgency: AlertType['urgency']) => {
    switch (urgency) {
      case 'low': return 'ℹ️'
      case 'medium': return '⚠️'
      case 'high': return '🚨'
      case 'critical': return '🔥'
      default: return '📢'
    }
  }

  const color = getUrgencyColor(urgency)
  const emoji = getUrgencyEmoji(urgency)

  return L.divIcon({
    html: `
      <div class="alert-marker" style="
        background-color: ${color};
        border: 3px solid white;
        border-radius: 50%;
        width: 30px;
        height: 30px;
        display: flex;
        align-items: center;
        justify-content: center;
        font-size: 14px;
        box-shadow: 0 2px 8px rgba(0,0,0,0.3);
        cursor: pointer;
      ">
        ${emoji}
      </div>
    `,
    className: 'custom-alert-icon',
    iconSize: [30, 30],
    iconAnchor: [15, 15],
    popupAnchor: [0, -15]
  })
}

function createAlertPopupContent(alert: AlertType): string {
  const getUrgencyLabel = (urgency: AlertType['urgency']) => {
    switch (urgency) {
      case 'low': return 'Baja'
      case 'medium': return 'Media'
      case 'high': return 'Alta'
      case 'critical': return 'Crítica'
      default: return 'Desconocida'
    }
  }

  const getCategoryLabel = (category: string) => {
    const labels: Record<string, string> = {
      'air-quality': 'Calidad del Aire',
      'station-malfunction': 'Estación No Funciona',
      'data-error': 'Error en Datos',
      'health-concern': 'Preocupación de Salud',
      'environmental': 'Problema Ambiental',
      'other': 'Otro'
    }
    return labels[category] || category
  }

  return `
    <div class="alert-popup-content p-3 min-w-[250px]">
      <div class="flex items-start gap-2 mb-2">
        <div class="w-3 h-3 rounded-full bg-red-500 flex-shrink-0 mt-1"></div>
        <div class="flex-1">
          <h3 class="font-semibold text-sm text-gray-900">${alert.title}</h3>
          <p class="text-xs text-gray-500">${getCategoryLabel(alert.category)}</p>
        </div>
      </div>
      
      <div class="space-y-1 text-xs">
        <p class="text-gray-700">${alert.description}</p>
        
        ${alert.location ? `
          <div class="flex items-center gap-1 text-gray-600">
            <span>📍</span>
            <span>${alert.location}</span>
          </div>
        ` : ''}
        
        <div class="flex items-center gap-1 text-gray-500">
          <span>⏰</span>
          <span>${alert.createdAt.toLocaleString('es-ES', {
            day: '2-digit',
            month: '2-digit',
            hour: '2-digit',
            minute: '2-digit'
          })}</span>
        </div>
        
        <div class="flex items-center gap-1 text-gray-500">
          <span>🚨</span>
          <span>Urgencia: ${getUrgencyLabel(alert.urgency)}</span>
        </div>
        
        ${alert.contact ? `
          <div class="flex items-center gap-1 text-gray-600">
            <span>📧</span>
            <span>${alert.contact}</span>
          </div>
        ` : ''}
      </div>
    </div>
  `
}

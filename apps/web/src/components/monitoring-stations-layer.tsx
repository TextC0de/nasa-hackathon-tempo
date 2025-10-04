"use client"

import { useEffect } from 'react'
import { useMap } from 'react-leaflet'
import L from 'leaflet'
import { useMonitoringStations } from '@/hooks/use-monitoring-stations'
import { Badge } from '@/components/ui/badge'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { MapPin, Activity, Clock, Building } from 'lucide-react'

// Función para determinar el color del marcador basado en el parámetro
function getMarkerColor(parameter: string): string {
  switch (parameter.toUpperCase()) {
    case 'PM2.5':
    case 'PM25':
      return '#ef4444' // Red
    case 'O3':
      return '#f59e0b' // Amber
    case 'NO2':
      return '#3b82f6' // Blue
    case 'CO':
      return '#6b7280' // Gray
    case 'SO2':
      return '#8b5cf6' // Purple
    default:
      return '#10b981' // Green
  }
}

// Función para obtener el icono del marcador
function createStationIcon(parameter: string, isActive: boolean = true): L.DivIcon {
  const color = getMarkerColor(parameter)
  const opacity = isActive ? 1 : 0.6
  
  return L.divIcon({
    html: `
      <div class="station-marker" style="
        background-color: ${color};
        width: 20px;
        height: 20px;
        border-radius: 50%;
        border: 2px solid white;
        box-shadow: 0 2px 4px rgba(0,0,0,0.3);
        display: flex;
        align-items: center;
        justify-content: center;
        opacity: ${opacity};
        position: relative;
      ">
        <div style="
          width: 8px;
          height: 8px;
          background-color: white;
          border-radius: 50%;
        "></div>
      </div>
    `,
    className: 'custom-station-marker',
    iconSize: [20, 20],
    iconAnchor: [10, 10],
    popupAnchor: [0, -10]
  })
}

// Componente para el contenido del popup
function StationPopup({ station }: { station: any }) {
  const formatDate = (dateString: string) => {
    try {
      return new Date(dateString).toLocaleString('es-ES', {
        year: 'numeric',
        month: 'short',
        day: 'numeric',
        hour: '2-digit',
        minute: '2-digit'
      })
    } catch {
      return 'Fecha no disponible'
    }
  }

  return (
    <div className="station-popup min-w-[250px]">
      <Card className="border-0 shadow-lg">
        <CardHeader className="pb-2">
          <CardTitle className="text-sm flex items-center gap-2">
            <MapPin className="h-4 w-4" />
            Estación {station.StationID}
          </CardTitle>
          <CardDescription className="text-xs">
            {station.AgencyName}
          </CardDescription>
        </CardHeader>
        <CardContent className="pt-0 space-y-2">
          <div className="flex items-center gap-2">
            <Activity className="h-3 w-3 text-muted-foreground" />
            <Badge 
              variant="secondary" 
              className="text-xs"
              style={{ backgroundColor: getMarkerColor(station.ParameterName) + '20' }}
            >
              {station.ParameterName}
            </Badge>
          </div>
          
          <div className="flex items-center gap-2">
            <Building className="h-3 w-3 text-muted-foreground" />
            <span className="text-xs text-muted-foreground">
              {station.FullAQSID}
            </span>
          </div>
          
          <div className="flex items-center gap-2">
            <Clock className="h-3 w-3 text-muted-foreground" />
            <span className="text-xs text-muted-foreground">
              {formatDate(station.UTCDateTimeReported)}
            </span>
          </div>
          
          <div className="pt-2 border-t">
            <div className="text-xs text-muted-foreground">
              <strong>Estado:</strong> {station.Status}
            </div>
            <div className="text-xs text-muted-foreground">
              <strong>Coordenadas:</strong> {station.Latitude.toFixed(4)}, {station.Longitude.toFixed(4)}
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  )
}

// Componente principal para mostrar estaciones en el mapa
export function MonitoringStationsLayer() {
  const map = useMap()
  const { stations, isLoading, error } = useMonitoringStations({
    centerLat: 36.7783, // Centro de California
    centerLng: -119.4179,
    radiusKm: 200, // Radio más amplio para California
    enabled: true
  })

  useEffect(() => {
    if (!map || !stations) return

    // Limpiar marcadores existentes
    map.eachLayer((layer) => {
      if (layer instanceof L.Marker && (layer as any).options?.className === 'custom-station-marker') {
        map.removeLayer(layer)
      }
    })

    // Agregar nuevos marcadores
    stations.forEach((station) => {
      if (station.Latitude && station.Longitude) {
        const marker = L.marker(
          [station.Latitude, station.Longitude],
          {
            icon: createStationIcon(station.Parameter, station.Status === 'Active')
          }
        )

        // Crear popup con información de la estación
        const popupContent = `
          <div class="station-popup min-w-[250px]">
            <div class="bg-white rounded-lg shadow-lg p-4">
              <div class="flex items-center gap-2 mb-2">
                <div class="w-4 h-4 rounded-full" style="background-color: ${getMarkerColor(station.Parameter)}"></div>
                <h3 class="font-semibold text-sm">${station.SiteName}</h3>
              </div>
              <div class="text-xs text-gray-600 space-y-1">
                <div><strong>Agencia:</strong> ${station.AgencyName}</div>
                <div><strong>Parámetro:</strong> ${station.Parameter}</div>
                <div><strong>AQI:</strong> ${station.AQI}</div>
                <div><strong>Concentración:</strong> ${station.RawConcentration} ${station.Unit}</div>
                <div><strong>Estado:</strong> ${station.Status}</div>
                <div><strong>Coordenadas:</strong> ${station.Latitude.toFixed(4)}, ${station.Longitude.toFixed(4)}</div>
                <div><strong>Última actualización:</strong> ${new Date(station.UTC).toLocaleString('es-ES')}</div>
              </div>
            </div>
          </div>
        `

        marker.bindPopup(popupContent, {
          maxWidth: 300,
          className: 'station-popup-container'
        })

        marker.addTo(map)
      }
    })

    // Ajustar vista para mostrar todas las estaciones si hay estaciones
    if (stations.length > 0) {
      const markers = stations
        .filter(station => station.Latitude && station.Longitude)
        .map(station => L.marker([station.Latitude, station.Longitude]))
      
      if (markers.length > 0) {
        const group = (L as any).featureGroup(markers)
        if (stations.length > 1) {
          map.fitBounds(group.getBounds().pad(0.1))
        }
      }
    }

  }, [map, stations])

  // Mostrar estado de carga o error
  if (isLoading) {
    return null // El mapa mostrará su propio estado de carga
  }

  if (error) {
    console.error('Error cargando estaciones:', error)
    return null
  }

  return null // Este componente no renderiza nada visible, solo agrega marcadores al mapa
}

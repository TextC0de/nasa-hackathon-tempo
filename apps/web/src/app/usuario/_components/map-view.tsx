"use client"

import dynamic from "next/dynamic"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { Activity, Loader2, AlertCircle } from "lucide-react"

// Importar el mapa dinámicamente
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

const Marker = dynamic(
  () => import("react-leaflet").then((mod) => mod.Marker),
  { ssr: false }
)

const Popup = dynamic(
  () => import("react-leaflet").then((mod) => mod.Popup),
  { ssr: false }
)

const Polyline = dynamic(
  () => import("react-leaflet").then((mod) => mod.Polyline),
  { ssr: false }
)

const Circle = dynamic(
  () => import("react-leaflet").then((mod) => mod.Circle),
  { ssr: false }
)

// Importar Leaflet para divIcon
const L = typeof window !== "undefined" ? require("leaflet") : null

// Función para obtener color de fondo basado en AQI (para el marker)
function getAQIBackgroundColor(aqi: number): string {
  if (aqi <= 50) return '#10b981'        // Verde - Bueno
  if (aqi <= 100) return '#f59e0b'       // Amarillo - Moderado
  if (aqi <= 150) return '#f97316'       // Naranja - Insalubre para sensibles
  if (aqi <= 200) return '#ef4444'       // Rojo - Insalubre
  if (aqi <= 300) return '#8b5cf6'       // Púrpura - Muy insalubre
  return '#7c2d12'                        // Marrón - Peligroso
}

// Función para crear icono personalizado del usuario
function createUserIcon(aqi: number | null): any {
  if (!L) return null

  const aqiValue = aqi ?? 0
  const backgroundColor = getAQIBackgroundColor(aqiValue)
  const displayAqi = aqi !== null ? aqi.toString() : '?'

  return L.divIcon({
    html: `
      <style>
        @keyframes pulse-user {
          0%, 100% {
            transform: scale(1);
            opacity: 1;
          }
          50% {
            transform: scale(1.05);
            opacity: 0.9;
          }
        }
        .user-marker-container {
          animation: pulse-user 2s ease-in-out infinite;
        }
        .user-marker-container:hover {
          transform: scale(1.15) !important;
        }
      </style>
      <div class="user-marker-container" style="
        display: flex;
        flex-direction: column;
        align-items: center;
        cursor: pointer;
        transition: transform 0.2s ease;
      ">
        <!-- Círculo exterior con pulso -->
        <div style="
          position: relative;
          width: 50px;
          height: 50px;
        ">
          <!-- Onda de pulso -->
          <div style="
            position: absolute;
            top: 50%;
            left: 50%;
            transform: translate(-50%, -50%);
            width: 60px;
            height: 60px;
            border-radius: 50%;
            background-color: ${backgroundColor};
            opacity: 0.3;
            animation: pulse-wave 2s ease-out infinite;
          "></div>

          <!-- Marker principal -->
          <div style="
            position: absolute;
            top: 50%;
            left: 50%;
            transform: translate(-50%, -50%);
            background-color: ${backgroundColor};
            width: 44px;
            height: 44px;
            border-radius: 50%;
            border: 3px solid white;
            box-shadow: 0 4px 12px rgba(0,0,0,0.4);
            display: flex;
            align-items: center;
            justify-content: center;
          ">
            <!-- Icono de persona SVG -->
            <svg width="24" height="24" viewBox="0 0 24 24" fill="white" style="filter: drop-shadow(0 1px 2px rgba(0,0,0,0.3));">
              <path d="M12 12c2.21 0 4-1.79 4-4s-1.79-4-4-4-4 1.79-4 4 1.79 4 4 4zm0 2c-2.67 0-8 1.34-8 4v2h16v-2c0-2.66-5.33-4-8-4z"/>
            </svg>
          </div>
        </div>

        <!-- Badge con valor AQI -->
        <div style="
          margin-top: 4px;
          padding: 3px 10px;
          background-color: rgba(0, 0, 0, 0.85);
          border-radius: 12px;
          border: 2px solid ${backgroundColor};
          box-shadow: 0 2px 6px rgba(0,0,0,0.3);
          backdrop-filter: blur(4px);
        ">
          <span style="
            font-size: 12px;
            font-weight: 900;
            color: white;
            text-shadow: 0 1px 2px rgba(0,0,0,0.5);
            letter-spacing: 0.5px;
          ">AQI ${displayAqi}</span>
        </div>
      </div>

      <style>
        @keyframes pulse-wave {
          0% {
            transform: translate(-50%, -50%) scale(0.8);
            opacity: 0.5;
          }
          100% {
            transform: translate(-50%, -50%) scale(1.4);
            opacity: 0;
          }
        }
      </style>
    `,
    className: 'custom-user-marker',
    iconSize: [60, 85],
    iconAnchor: [30, 25],
    popupAnchor: [0, -30]
  })
}

// Función para crear icono personalizado de estación de monitoreo
function createStationMarkerIcon(aqi: number | null, distanceKm: number, provider: string): any {
  if (!L) return null

  const displayAqi = aqi !== null ? aqi.toString() : '?'
  const displayDistance = distanceKm.toFixed(1)
  const stationColor = '#f97316' // Naranja fijo para estaciones

  return L.divIcon({
    html: `
      <div class="station-marker-container" style="
        display: flex;
        flex-direction: column;
        align-items: center;
        cursor: pointer;
      ">
        <!-- Marker principal de estación -->
        <div style="
          position: relative;
          width: 50px;
          height: 50px;
        ">
          <!-- Círculo de fondo -->
          <div style="
            position: absolute;
            top: 50%;
            left: 50%;
            transform: translate(-50%, -50%);
            background-color: ${stationColor};
            width: 44px;
            height: 44px;
            border-radius: 50%;
            border: 3px solid white;
            box-shadow: 0 4px 12px rgba(0,0,0,0.4);
            display: flex;
            align-items: center;
            justify-content: center;
          ">
            <!-- Icono de antena/estación SVG -->
            <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="white" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" style="filter: drop-shadow(0 1px 2px rgba(0,0,0,0.3));">
              <!-- Torre de transmisión -->
              <path d="M12 2 L12 22"/>
              <path d="M6 8 L12 6 L18 8"/>
              <path d="M6 14 L12 12 L18 14"/>
              <path d="M6 20 L12 18 L18 20"/>
              <!-- Ondas de señal -->
              <circle cx="12" cy="6" r="1" fill="white"/>
              <path d="M8 4 Q6 6 8 8" opacity="0.7"/>
              <path d="M16 4 Q18 6 16 8" opacity="0.7"/>
            </svg>
          </div>

          <!-- Indicador de señal animado -->
          <div style="
            position: absolute;
            top: -2px;
            right: -2px;
            width: 12px;
            height: 12px;
            background-color: #10b981;
            border: 2px solid white;
            border-radius: 50%;
            box-shadow: 0 0 8px rgba(16, 185, 129, 0.6);
          "></div>
        </div>

        <!-- Badge con AQI y distancia -->
        <div style="
          margin-top: 4px;
          padding: 3px 10px;
          background-color: rgba(0, 0, 0, 0.85);
          border-radius: 12px;
          border: 2px solid ${stationColor};
          box-shadow: 0 2px 6px rgba(0,0,0,0.3);
          backdrop-filter: blur(4px);
          min-width: 70px;
          text-align: center;
        ">
          <div style="
            font-size: 11px;
            font-weight: 900;
            color: white;
            text-shadow: 0 1px 2px rgba(0,0,0,0.5);
            letter-spacing: 0.3px;
          ">AQI ${displayAqi}</div>
          <div style="
            font-size: 9px;
            font-weight: 600;
            color: rgba(255, 255, 255, 0.8);
            margin-top: 1px;
          ">${displayDistance} km</div>
        </div>
      </div>
    `,
    className: 'custom-station-marker',
    iconSize: [70, 90],
    iconAnchor: [35, 25],
    popupAnchor: [0, -30]
  })
}

interface MapViewProps {
  searchLat: number
  searchLng: number
  currentLocation: { name: string; lat: number; lng: number }
  prediction: any
  isLoading: boolean
  error: any
  onDialogOpen: (dialog: string) => void
  getAQIColor: (aqi: number) => string
  getAQIBadge: (aqi: number) => { color: string; label: string }
}

export function MapView({
  searchLat,
  searchLng,
  currentLocation,
  prediction,
  isLoading,
  error,
  onDialogOpen,
  getAQIColor,
  getAQIBadge
}: MapViewProps) {
  // Calcular el centro del mapa para mostrar tanto el usuario como la estación
  const stationLat = prediction?.station?.latitude
  const stationLng = prediction?.station?.longitude

  const mapCenter = stationLat && stationLng
    ? [(searchLat + stationLat) / 2, (searchLng + stationLng) / 2] as [number, number]
    : [searchLat, searchLng] as [number, number]

  return (
    <div className="h-full w-full relative">
      {/* Mapa */}
      <div className="h-full w-full">
        <MapContainer
          center={mapCenter}
          zoom={10}
          style={{ height: "100%", width: "100%" }}
          key={`${searchLat}-${searchLng}`}
        >
          <TileLayer
            attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors'
            url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
          />

          {/* Línea conectora entre usuario y estación */}
          {prediction?.station && (
            <Polyline
              positions={[
                [searchLat, searchLng],
                [prediction.station.latitude, prediction.station.longitude]
              ]}
              pathOptions={{
                color: '#3b82f6',
                weight: 2,
                opacity: 0.6,
                dashArray: '5, 10'
              }}
            />
          )}

          {/* Marcador de UBICACIÓN DEL USUARIO con SVG personalizado */}
          <Marker
            position={[searchLat, searchLng]}
            icon={createUserIcon(prediction?.general?.aqi ?? null)}
          >
            <Popup>
              <div className="text-sm space-y-2">
                <p className="font-semibold text-blue-600">👤 Tu Ubicación</p>
                <p className="font-medium">{currentLocation.name}</p>
                <p className="text-xs text-muted-foreground">
                  {searchLat.toFixed(4)}, {searchLng.toFixed(4)}
                </p>
                {prediction?.general && (
                  <div className="pt-2 border-t">
                    <p className="text-xs text-muted-foreground mb-1">Calidad del Aire Estimada</p>
                    <div className="flex items-center gap-2">
                      <span className={`text-2xl font-bold ${getAQIColor(prediction.general.aqi)}`}>
                        {prediction.general.aqi}
                      </span>
                      <Badge className={`${getAQIBadge(prediction.general.aqi).color} text-white text-xs`}>
                        {getAQIBadge(prediction.general.aqi).label}
                      </Badge>
                    </div>
                  </div>
                )}
              </div>
            </Popup>
          </Marker>

          {/* Marcador de ESTACIÓN DE MONITOREO con SVG personalizado */}
          {prediction?.station && (
            <Marker
              position={[prediction.station.latitude, prediction.station.longitude]}
              icon={createStationMarkerIcon(
                prediction?.general?.aqi ?? null,
                prediction.station.distanceKm ?? 0,
                prediction.station.provider
              )}
            >
              <Popup>
                <div className="text-sm space-y-2">
                  <p className="font-semibold text-orange-600">📡 Estación de Monitoreo</p>
                  <p className="font-medium">{prediction.station.provider}</p>
                  <p className="text-xs text-muted-foreground">
                    {prediction.station.latitude.toFixed(4)}, {prediction.station.longitude.toFixed(4)}
                  </p>
                  <div className="pt-2 border-t">
                    <p className="text-xs text-muted-foreground">Distancia desde tu ubicación</p>
                    <p className="font-semibold text-lg">{prediction.station.distanceKm?.toFixed(2)} km</p>
                  </div>
                  {prediction?.general && (
                    <div className="pt-2 border-t">
                      <p className="text-xs text-muted-foreground mb-1">Datos Medidos Aquí</p>
                      <div className="flex items-center gap-2">
                        <span className={`text-2xl font-bold ${getAQIColor(prediction.general.aqi)}`}>
                          {prediction.general.aqi}
                        </span>
                        <Badge className={`${getAQIBadge(prediction.general.aqi).color} text-white text-xs`}>
                          {getAQIBadge(prediction.general.aqi).label}
                        </Badge>
                      </div>
                    </div>
                  )}
                </div>
              </Popup>
            </Marker>
          )}
        </MapContainer>
      </div>

      {/* Card flotante con AQI principal - Mejorado */}
      {prediction?.general && !isLoading && (
        <div className="absolute bottom-4 right-4 z-[1000]">
          <Card className="w-64 sm:w-80 shadow-2xl border-2 bg-background/95 backdrop-blur-sm">
            <CardHeader className="pb-3">
              <CardTitle className="text-sm flex items-center gap-2">
                <Activity className="h-4 w-4 text-orange-500" />
                Calidad del Aire
              </CardTitle>
              <CardDescription className="text-xs flex items-center gap-1">
                <span className="inline-block w-2 h-2 rounded-full bg-blue-500"></span>
                {currentLocation.name}
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-3">
              {/* AQI Principal */}
              <div className="flex items-center justify-between">
                <div>
                  <span className={`text-4xl font-bold ${getAQIColor(prediction.general.aqi)}`}>
                    {prediction.general.aqi}
                  </span>
                  <p className="text-xs text-muted-foreground mt-1">Índice AQI</p>
                </div>
                <Badge className={`${getAQIBadge(prediction.general.aqi).color} text-white`}>
                  {getAQIBadge(prediction.general.aqi).label}
                </Badge>
              </div>

              {/* Parámetro dominante */}
              <div className="pt-2 border-t">
                <p className="text-xs text-muted-foreground">Parámetro dominante</p>
                <p className="font-medium text-sm">{prediction.general.dominantParameter}</p>
              </div>

              {/* Info de cómo se calcula */}
              <div className="pt-2 border-t bg-blue-50 dark:bg-blue-950 -mx-6 px-6 py-2">
                <p className="text-xs text-blue-700 dark:text-blue-300 font-medium mb-1">
                  📊 Datos de estación más cercana
                </p>
                <div className="flex items-center gap-2">
                  <span className="inline-block w-2 h-2 rounded-full bg-orange-500"></span>
                  <div className="flex-1">
                    <p className="font-medium text-sm text-blue-900 dark:text-blue-100">
                      {prediction.station.provider}
                    </p>
                    <p className="text-xs text-blue-600 dark:text-blue-400">
                      {prediction.station.distanceKm?.toFixed(2)} km de tu ubicación
                    </p>
                  </div>
                </div>
              </div>

              {/* Nota informativa */}
              <div className="pt-2 text-xs text-muted-foreground italic">
                💡 Los datos se estiman desde la estación de monitoreo más cercana usando datos satelitales TEMPO
              </div>

              {/* Botón para ver más detalles */}
              <Button
                variant="outline"
                size="sm"
                className="w-full mt-2"
                onClick={() => onDialogOpen("metrics")}
              >
                Ver detalles completos
              </Button>
            </CardContent>
          </Card>
        </div>
      )}

      {/* Leyenda del mapa mejorada */}
      {!isLoading && prediction?.station && (
        <div className="absolute top-4 left-4 z-[1000]">
          <Card className="bg-background/95 backdrop-blur-sm shadow-lg">
            <CardContent className="pt-4 pb-3 px-4">
              <p className="text-xs font-semibold mb-3 text-muted-foreground">LEYENDA</p>
              <div className="space-y-2.5">
                <div className="flex items-center gap-2">
                  <div className="flex-shrink-0 w-5 h-5 rounded-full border-2 border-white shadow-md flex items-center justify-center" style={{ backgroundColor: getAQIBackgroundColor(prediction?.general?.aqi ?? 0) }}>
                    <svg width="12" height="12" viewBox="0 0 24 24" fill="white">
                      <path d="M12 12c2.21 0 4-1.79 4-4s-1.79-4-4-4-4 1.79-4 4 1.79 4 4 4zm0 2c-2.67 0-8 1.34-8 4v2h16v-2c0-2.66-5.33-4-8-4z"/>
                    </svg>
                  </div>
                  <span className="text-xs font-medium">Tu ubicación</span>
                </div>
                <div className="flex items-center gap-2">
                  <div className="flex-shrink-0 w-5 h-5 rounded-full border-2 border-white shadow-md flex items-center justify-center" style={{ backgroundColor: '#f97316' }}>
                    <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="white" strokeWidth="2">
                      <path d="M12 2 L12 22"/>
                      <path d="M6 8 L12 6 L18 8"/>
                    </svg>
                  </div>
                  <span className="text-xs font-medium">Estación EPA</span>
                </div>
                <div className="flex items-center gap-2 pt-1 border-t">
                  <div className="w-6 h-0.5 border-t-2 border-dashed border-blue-500"></div>
                  <span className="text-xs text-muted-foreground">{prediction.station.distanceKm?.toFixed(1)} km</span>
                </div>
              </div>
            </CardContent>
          </Card>
        </div>
      )}

      {/* Loading overlay */}
      {isLoading && (
        <div className="absolute inset-0 bg-background/50 backdrop-blur-sm z-[999] flex items-center justify-center">
          <Card className="p-6">
            <div className="flex flex-col items-center space-y-2">
              <Loader2 className="h-8 w-8 animate-spin text-primary" />
              <p className="text-sm text-muted-foreground">Cargando datos de calidad del aire...</p>
            </div>
          </Card>
        </div>
      )}

      {/* Error overlay */}
      {error && !isLoading && (
        <div className="absolute bottom-4 left-4 z-[1000]">
          <Card className="border-destructive bg-destructive/10">
            <CardContent className="pt-4">
              <div className="flex items-center gap-2 text-destructive">
                <AlertCircle className="h-5 w-5" />
                <div>
                  <p className="font-semibold text-sm">Error al cargar datos</p>
                  <p className="text-xs">{error.message}</p>
                </div>
              </div>
            </CardContent>
          </Card>
        </div>
      )}
    </div>
  )
}

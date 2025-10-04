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

          {/* Marcador de UBICACIÓN DEL USUARIO (azul) */}
          <Circle
            center={[searchLat, searchLng]}
            radius={500}
            pathOptions={{
              fillColor: '#3b82f6',
              fillOpacity: 0.3,
              color: '#1d4ed8',
              weight: 3
            }}
          />
          <Marker position={[searchLat, searchLng]}>
            <Popup>
              <div className="text-sm space-y-2">
                <p className="font-semibold text-blue-600">📍 Tu Ubicación</p>
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

          {/* Marcador de ESTACIÓN DE MONITOREO (naranja/rojo) */}
          {prediction?.station && (
            <>
              <Circle
                center={[prediction.station.latitude, prediction.station.longitude]}
                radius={800}
                pathOptions={{
                  fillColor: '#f97316',
                  fillOpacity: 0.2,
                  color: '#ea580c',
                  weight: 3
                }}
              />
              <Marker position={[prediction.station.latitude, prediction.station.longitude]}>
                <Popup>
                  <div className="text-sm space-y-2">
                    <p className="font-semibold text-orange-600">🏭 Estación de Monitoreo</p>
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
            </>
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

      {/* Leyenda del mapa */}
      {!isLoading && prediction?.station && (
        <div className="absolute top-4 left-4 z-[1000]">
          <Card className="bg-background/95 backdrop-blur-sm shadow-lg">
            <CardContent className="pt-4 pb-3 px-4">
              <p className="text-xs font-semibold mb-2 text-muted-foreground">LEYENDA</p>
              <div className="space-y-2">
                <div className="flex items-center gap-2">
                  <div className="w-3 h-3 rounded-full bg-blue-500 border-2 border-blue-700"></div>
                  <span className="text-xs">Tu ubicación</span>
                </div>
                <div className="flex items-center gap-2">
                  <div className="w-3 h-3 rounded-full bg-orange-500 border-2 border-orange-700"></div>
                  <span className="text-xs">Estación de monitoreo</span>
                </div>
                <div className="flex items-center gap-2">
                  <div className="w-6 h-0.5 border-t-2 border-dashed border-blue-500"></div>
                  <span className="text-xs">{prediction.station.distanceKm?.toFixed(1)} km</span>
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

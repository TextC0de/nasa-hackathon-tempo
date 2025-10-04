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
  return (
    <div className="h-full w-full relative">
      {/* Mapa */}
      <div className="h-full w-full">
        <MapContainer
          center={[searchLat, searchLng]}
          zoom={10}
          style={{ height: "100%", width: "100%" }}
          key={`${searchLat}-${searchLng}`}
        >
          <TileLayer
            attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors'
            url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
          />
          <Marker position={[searchLat, searchLng]}>
            <Popup>
              <div className="text-sm space-y-2">
                <p className="font-semibold">{currentLocation.name}</p>
                <p className="text-xs text-muted-foreground">
                  {searchLat.toFixed(4)}, {searchLng.toFixed(4)}
                </p>
                {prediction?.general && (
                  <div className="pt-2 border-t">
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
        </MapContainer>
      </div>

      {/* Card flotante con AQI principal */}
      {prediction?.general && !isLoading && (
        <div className="absolute bottom-4 right-4 z-[1000]">
          <Card className="w-64 sm:w-80 shadow-2xl border-2">
            <CardHeader className="pb-3">
              <CardTitle className="text-sm flex items-center gap-2">
                <Activity className="h-4 w-4 text-orange-500" />
                Calidad del Aire
              </CardTitle>
              <CardDescription className="text-xs">
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

              {/* Estación */}
              <div className="pt-2 border-t">
                <p className="text-xs text-muted-foreground">Estación más cercana</p>
                <p className="font-medium text-sm">{prediction.station.provider}</p>
                <p className="text-xs text-muted-foreground">
                  {prediction.station.distanceKm?.toFixed(2)} km de distancia
                </p>
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

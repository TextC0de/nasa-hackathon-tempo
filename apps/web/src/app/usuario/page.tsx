"use client"

import { useState } from "react"
import dynamic from "next/dynamic"
import Image from "next/image"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { TooltipProvider } from "@/components/ui/tooltip"
import {
  MapPin,
  Activity,
  Cloud,
  Wind,
  Droplets,
  Thermometer,
  AlertCircle,
  Search,
  Loader2
} from "lucide-react"
import { trpc } from "@/lib/trpc"

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

import "leaflet/dist/leaflet.css"

export default function UsuarioPage() {
  const [latitude, setLatitude] = useState<string>("")
  const [longitude, setLongitude] = useState<string>("")
  const [searchLat, setSearchLat] = useState<number | null>(null)
  const [searchLng, setSearchLng] = useState<number | null>(null)

  // Query para obtener predicción de AQI
  const { data: prediction, isLoading, error } = trpc.predecirAqi.useQuery(
    {
      latitude: searchLat!,
      longitude: searchLng!
    },
    {
      enabled: searchLat !== null && searchLng !== null,
      retry: 2,
      staleTime: 5 * 60 * 1000 // 5 minutos
    }
  )

  // Función para buscar
  const handleSearch = () => {
    const lat = parseFloat(latitude)
    const lng = parseFloat(longitude)

    if (isNaN(lat) || isNaN(lng)) {
      alert("Por favor ingresa valores numéricos válidos")
      return
    }

    if (lat < -90 || lat > 90) {
      alert("La latitud debe estar entre -90 y 90")
      return
    }

    if (lng < -180 || lng > 180) {
      alert("La longitud debe estar entre -180 y 180")
      return
    }

    setSearchLat(lat)
    setSearchLng(lng)
  }

  // Función para obtener el color del AQI
  const getAQIColor = (aqi: number) => {
    if (aqi <= 50) return "text-green-600"
    if (aqi <= 100) return "text-yellow-600"
    if (aqi <= 150) return "text-orange-600"
    if (aqi <= 200) return "text-red-600"
    if (aqi <= 300) return "text-purple-600"
    return "text-red-800"
  }

  // Función para obtener el badge del AQI
  const getAQIBadge = (aqi: number) => {
    if (aqi <= 50) return { color: "bg-green-500", label: "Bueno" }
    if (aqi <= 100) return { color: "bg-yellow-500", label: "Moderado" }
    if (aqi <= 150) return { color: "bg-orange-500", label: "Insalubre para grupos sensibles" }
    if (aqi <= 200) return { color: "bg-red-500", label: "Insalubre" }
    if (aqi <= 300) return { color: "bg-purple-500", label: "Muy insalubre" }
    return { color: "bg-red-800", label: "Peligroso" }
  }

  return (
    <TooltipProvider>
      <div className="min-h-screen bg-background text-foreground">
        {/* Header */}
        <header className="bg-background border-b border-border px-4 py-3">
          <div className="flex items-center justify-between">
            <div className="flex items-center space-x-3">
              <div className="relative h-8 w-8">
                <Image
                  src="/atmos.svg"
                  alt="AtmOS Logo"
                  width={32}
                  height={32}
                  className="h-full w-full object-contain"
                  priority
                />
              </div>
              <div>
                <h1 className="text-lg font-semibold">AtmOS - Predicción AQI</h1>
                <p className="text-xs text-muted-foreground">Calidad del aire por ubicación</p>
              </div>
            </div>
          </div>
        </header>

        {/* Main Content */}
        <div className="container mx-auto p-4 space-y-4">
          {/* Inputs Section */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <MapPin className="h-5 w-5" />
                Buscar ubicación
              </CardTitle>
              <CardDescription>
                Ingresa las coordenadas de latitud y longitud para obtener la predicción de calidad del aire
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="latitude">Latitud</Label>
                  <Input
                    id="latitude"
                    type="number"
                    step="any"
                    placeholder="Ej: 34.0522"
                    value={latitude}
                    onChange={(e) => setLatitude(e.target.value)}
                    onKeyDown={(e) => e.key === 'Enter' && handleSearch()}
                  />
                  <p className="text-xs text-muted-foreground">Rango: -90 a 90</p>
                </div>
                <div className="space-y-2">
                  <Label htmlFor="longitude">Longitud</Label>
                  <Input
                    id="longitude"
                    type="number"
                    step="any"
                    placeholder="Ej: -118.2437"
                    value={longitude}
                    onChange={(e) => setLongitude(e.target.value)}
                    onKeyDown={(e) => e.key === 'Enter' && handleSearch()}
                  />
                  <p className="text-xs text-muted-foreground">Rango: -180 a 180</p>
                </div>
                <div className="flex items-end">
                  <Button
                    onClick={handleSearch}
                    disabled={isLoading}
                    className="w-full"
                  >
                    {isLoading ? (
                      <>
                        <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                        Buscando...
                      </>
                    ) : (
                      <>
                        <Search className="mr-2 h-4 w-4" />
                        Buscar
                      </>
                    )}
                  </Button>
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Error State */}
          {error && (
            <Card className="border-destructive">
              <CardContent className="pt-6">
                <div className="flex items-center gap-2 text-destructive">
                  <AlertCircle className="h-5 w-5" />
                  <p>Error al obtener datos: {error.message}</p>
                </div>
              </CardContent>
            </Card>
          )}

          {/* Results */}
          {prediction && searchLat !== null && searchLng !== null && (
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
              {/* Mapa */}
              <Card>
                <CardHeader>
                  <CardTitle>Mapa de Ubicación</CardTitle>
                  <CardDescription>
                    Tu ubicación: {searchLat.toFixed(4)}, {searchLng.toFixed(4)}
                  </CardDescription>
                </CardHeader>
                <CardContent>
                  <div className="h-[400px] rounded-lg overflow-hidden">
                    <MapContainer
                      center={[searchLat, searchLng]}
                      zoom={10}
                      style={{ height: "100%", width: "100%" }}
                    >
                      <TileLayer
                        attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors'
                        url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
                      />
                      <Marker position={[searchLat, searchLng]}>
                        <Popup>
                          <div className="text-sm">
                            <p className="font-semibold">Tu ubicación</p>
                            <p>Lat: {searchLat.toFixed(4)}</p>
                            <p>Lng: {searchLng.toFixed(4)}</p>
                          </div>
                        </Popup>
                      </Marker>
                    </MapContainer>
                  </div>
                </CardContent>
              </Card>

              {/* Información de la estación */}
              <Card>
                <CardHeader>
                  <CardTitle>Estación más cercana</CardTitle>
                  <CardDescription>
                    Datos de la estación de monitoreo más próxima
                  </CardDescription>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <p className="text-sm text-muted-foreground">Proveedor</p>
                      <p className="font-medium">{prediction.station.provider}</p>
                    </div>
                    <div>
                      <p className="text-sm text-muted-foreground">Distancia</p>
                      <p className="font-medium">{prediction.station.distanceKm?.toFixed(2)} km</p>
                    </div>
                    <div>
                      <p className="text-sm text-muted-foreground">Latitud</p>
                      <p className="font-medium">{prediction.station.latitude.toFixed(4)}</p>
                    </div>
                    <div>
                      <p className="text-sm text-muted-foreground">Longitud</p>
                      <p className="font-medium">{prediction.station.longitude.toFixed(4)}</p>
                    </div>
                  </div>
                </CardContent>
              </Card>

              {/* Calidad del Aire General */}
              {prediction.general && (
                <Card className="lg:col-span-2">
                  <CardHeader>
                    <CardTitle className="flex items-center gap-2">
                      <Activity className="h-5 w-5" />
                      Calidad del Aire General
                    </CardTitle>
                  </CardHeader>
                  <CardContent>
                    <div className="flex items-center justify-between">
                      <div>
                        <div className="flex items-center gap-3">
                          <span className={`text-5xl font-bold ${getAQIColor(prediction.general.aqi)}`}>
                            {prediction.general.aqi}
                          </span>
                          <div>
                            <Badge className={`${getAQIBadge(prediction.general.aqi).color} text-white`}>
                              {getAQIBadge(prediction.general.aqi).label}
                            </Badge>
                            <p className="text-sm text-muted-foreground mt-1">
                              Parámetro dominante: {prediction.general.dominantParameter}
                            </p>
                          </div>
                        </div>
                      </div>
                    </div>
                  </CardContent>
                </Card>
              )}

              {/* Datos Meteorológicos */}
              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <Cloud className="h-5 w-5" />
                    Condiciones Meteorológicas
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="grid grid-cols-2 gap-4">
                    <div className="flex items-center gap-2">
                      <Thermometer className="h-4 w-4 text-orange-500" />
                      <div>
                        <p className="text-sm text-muted-foreground">Temperatura</p>
                        <p className="font-medium">{prediction.weather.temperature}°C</p>
                      </div>
                    </div>
                    <div className="flex items-center gap-2">
                      <Wind className="h-4 w-4 text-blue-500" />
                      <div>
                        <p className="text-sm text-muted-foreground">Viento</p>
                        <p className="font-medium">{prediction.weather.windSpeed} m/s</p>
                      </div>
                    </div>
                    <div className="flex items-center gap-2">
                      <Droplets className="h-4 w-4 text-blue-600" />
                      <div>
                        <p className="text-sm text-muted-foreground">Humedad</p>
                        <p className="font-medium">{prediction.weather.relativeHumidity}%</p>
                      </div>
                    </div>
                    <div className="flex items-center gap-2">
                      <Cloud className="h-4 w-4 text-gray-500" />
                      <div>
                        <p className="text-sm text-muted-foreground">Precipitación</p>
                        <p className="font-medium">{prediction.weather.precipitation} mm</p>
                      </div>
                    </div>
                  </div>
                </CardContent>
              </Card>

              {/* Parámetros de Calidad del Aire */}
              <Card>
                <CardHeader>
                  <CardTitle>Parámetros de Calidad del Aire</CardTitle>
                  <CardDescription>Detalles por contaminante</CardDescription>
                </CardHeader>
                <CardContent className="space-y-4">
                  {/* O3 */}
                  {prediction.O3 && (
                    <div className="space-y-2">
                      <div className="flex items-center justify-between">
                        <h4 className="font-semibold">Ozono (O3)</h4>
                        <Badge className={getAQIBadge(prediction.O3.currentData.aqi).color}>
                          AQI: {prediction.O3.currentData.aqi}
                        </Badge>
                      </div>
                      <div className="grid grid-cols-2 gap-2 text-sm">
                        <div>
                          <p className="text-muted-foreground">Valor</p>
                          <p className="font-medium">{prediction.O3.currentData.value} {prediction.O3.currentData.unit}</p>
                        </div>
                        <div>
                          <p className="text-muted-foreground">Categoría</p>
                          <p className="font-medium">{prediction.O3.currentData.category}</p>
                        </div>
                        {prediction.O3.tempo?.estimatedUserValue && (
                          <div className="col-span-2">
                            <p className="text-muted-foreground">Estimación TEMPO</p>
                            <p className="font-medium">{prediction.O3.tempo.estimatedUserValue.toFixed(2)} {prediction.O3.currentData.unit}</p>
                          </div>
                        )}
                      </div>
                    </div>
                  )}

                  {/* NO2 */}
                  {prediction.NO2 && (
                    <div className="space-y-2 pt-4 border-t">
                      <div className="flex items-center justify-between">
                        <h4 className="font-semibold">Dióxido de Nitrógeno (NO2)</h4>
                        <Badge className={getAQIBadge(prediction.NO2.currentData.aqi).color}>
                          AQI: {prediction.NO2.currentData.aqi}
                        </Badge>
                      </div>
                      <div className="grid grid-cols-2 gap-2 text-sm">
                        <div>
                          <p className="text-muted-foreground">Valor</p>
                          <p className="font-medium">{prediction.NO2.currentData.value} {prediction.NO2.currentData.unit}</p>
                        </div>
                        <div>
                          <p className="text-muted-foreground">Categoría</p>
                          <p className="font-medium">{prediction.NO2.currentData.category}</p>
                        </div>
                        {prediction.NO2.tempo?.estimatedUserValue && (
                          <div className="col-span-2">
                            <p className="text-muted-foreground">Estimación TEMPO</p>
                            <p className="font-medium">{prediction.NO2.tempo.estimatedUserValue.toFixed(2)} {prediction.NO2.currentData.unit}</p>
                          </div>
                        )}
                      </div>
                    </div>
                  )}

                  {/* PM2.5 */}
                  {prediction.PM25 && (
                    <div className="space-y-2 pt-4 border-t">
                      <div className="flex items-center justify-between">
                        <h4 className="font-semibold">Material Particulado (PM2.5)</h4>
                        <Badge className={getAQIBadge(prediction.PM25.currentData.aqi).color}>
                          AQI: {prediction.PM25.currentData.aqi}
                        </Badge>
                      </div>
                      <div className="grid grid-cols-2 gap-2 text-sm">
                        <div>
                          <p className="text-muted-foreground">Valor</p>
                          <p className="font-medium">{prediction.PM25.currentData.value} {prediction.PM25.currentData.unit}</p>
                        </div>
                        <div>
                          <p className="text-muted-foreground">Categoría</p>
                          <p className="font-medium">{prediction.PM25.currentData.category}</p>
                        </div>
                      </div>
                    </div>
                  )}
                </CardContent>
              </Card>
            </div>
          )}
        </div>
      </div>
    </TooltipProvider>
  )
}

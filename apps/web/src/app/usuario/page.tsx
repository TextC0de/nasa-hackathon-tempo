"use client"

import { useState, useEffect } from "react"
import dynamic from "next/dynamic"
import Image from "next/image"
import { Button } from "@/components/ui/button"
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { TooltipProvider, Tooltip, TooltipContent, TooltipTrigger } from "@/components/ui/tooltip"
import {
  Menubar,
  MenubarContent,
  MenubarItem,
  MenubarMenu,
  MenubarSeparator,
  MenubarTrigger
} from "@/components/ui/menubar"
import {
  MapPin,
  Activity,
  Cloud,
  Wind,
  Droplets,
  Thermometer,
  AlertCircle,
  Search,
  Loader2,
  Settings,
  Code,
  Map,
  BarChart3,
  Wifi,
  WifiOff,
  RefreshCw,
  TrendingUp,
  Clock
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

// Ubicaciones de ejemplo en California
const CALIFORNIA_LOCATIONS = [
  { name: "Los Ángeles", lat: 34.0522, lng: -118.2437 },
  { name: "San Francisco", lat: 37.7749, lng: -122.4194 },
  { name: "San Diego", lat: 32.7157, lng: -117.1611 },
  { name: "Sacramento", lat: 38.5816, lng: -121.4944 },
  { name: "Fresno", lat: 36.7378, lng: -119.7871 },
  { name: "San José", lat: 37.3382, lng: -121.8863 }
] as const

type MapType = "streetmap" | "topographic" | "hybrid" | "physical"

export default function UsuarioPage() {
  // Estado por defecto: Los Ángeles, California
  const [currentLocation, setCurrentLocation] = useState<{ name: string; lat: number; lng: number }>(CALIFORNIA_LOCATIONS[0])
  const [searchLat, setSearchLat] = useState<number>(CALIFORNIA_LOCATIONS[0].lat)
  const [searchLng, setSearchLng] = useState<number>(CALIFORNIA_LOCATIONS[0].lng)

  // Estados para debug
  const [debugLat, setDebugLat] = useState<string>(CALIFORNIA_LOCATIONS[0].lat.toString())
  const [debugLng, setDebugLng] = useState<string>(CALIFORNIA_LOCATIONS[0].lng.toString())
  const [openDialog, setOpenDialog] = useState<string | null>(null)
  const [mapType, setMapType] = useState<MapType>("streetmap")

  // Query para obtener predicción de AQI
  const { data: prediction, isLoading, error, refetch } = trpc.predecirAqi.useQuery(
    {
      latitude: searchLat,
      longitude: searchLng
    },
    {
      enabled: true,
      retry: 2,
      staleTime: 5 * 60 * 1000, // 5 minutos
      refetchInterval: 5 * 60 * 1000 // Auto-refetch cada 5 minutos
    }
  )

  // Query para obtener datos TEMPO completos
  const { data: tempoData, isLoading: tempoLoading } = trpc.obtenerDatosTEMPO.useQuery(
    {
      latitud: searchLat,
      longitud: searchLng,
      usarUltimoDisponible: true
    },
    {
      enabled: true,
      retry: 2,
      staleTime: 5 * 60 * 1000,
    }
  )

  // Query para obtener datos meteorológicos completos
  const { data: weatherData, isLoading: weatherLoading } = trpc.obtenerDatosMeteorologicos.useQuery(
    {
      latitud: searchLat,
      longitud: searchLng,
      diasPrediccion: 7
    },
    {
      enabled: true,
      retry: 2,
      staleTime: 5 * 60 * 1000,
    }
  )

  // Cargar predicción inicial
  useEffect(() => {
    refetch()
  }, [searchLat, searchLng, refetch])

  // Función para cambiar ubicación desde presets
  const handleLocationChange = (location: typeof CALIFORNIA_LOCATIONS[number]) => {
    setCurrentLocation(location)
    setSearchLat(location.lat)
    setSearchLng(location.lng)
    setDebugLat(location.lat.toString())
    setDebugLng(location.lng.toString())
  }

  // Función para búsqueda manual (debug)
  const handleDebugSearch = () => {
    const lat = parseFloat(debugLat)
    const lng = parseFloat(debugLng)

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
    setCurrentLocation({ name: "Ubicación personalizada", lat, lng })
    setOpenDialog(null)
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

  // Función para obtener nivel de AQI
  const getAQILevel = (aqi: number) => {
    if (aqi <= 50) return "Bueno"
    if (aqi <= 100) return "Moderado"
    if (aqi <= 150) return "Insalubre para grupos sensibles"
    if (aqi <= 200) return "Insalubre"
    if (aqi <= 300) return "Muy insalubre"
    return "Peligroso"
  }

  return (
    <TooltipProvider>
      <div className="min-h-screen bg-background text-foreground">
        <div className="flex h-screen">
          {/* Main Content */}
          <div className="flex-1 flex flex-col overflow-hidden">
            {/* Header con métricas en tiempo real - Similar a estado/page.tsx */}
            <header className="bg-background border-b border-border px-2 py-2 sm:px-4 sm:py-3 relative z-[10000]">
              <div className="flex items-center justify-between gap-2">
                {/* Logo y métricas principales */}
                <div className="flex items-center space-x-2 sm:space-x-4 lg:space-x-6 min-w-0 flex-1">
                  {/* Logo */}
                  <div className="flex items-center space-x-1 sm:space-x-2 lg:space-x-3 flex-shrink-0">
                    <div className="relative h-5 w-5 sm:h-6 sm:w-6 lg:h-8 lg:w-8">
                      <Image
                        src="/atmos.svg"
                        alt="AtmOS Logo"
                        width={32}
                        height={32}
                        className="h-full w-full object-contain"
                        priority
                      />
                    </div>
                    <span className="text-sm font-semibold text-foreground sm:text-base lg:text-lg whitespace-nowrap">
                      AtmOS
                    </span>
                  </div>

                  {/* Métricas en tiempo real - Desktop */}
                  <div className="hidden lg:flex items-center space-x-4">
                    {/* Estado de conexión */}
                    <div className="flex items-center space-x-2">
                      {isLoading ? (
                        <RefreshCw className="h-4 w-4 animate-spin text-blue-500" />
                      ) : error ? (
                        <WifiOff className="h-4 w-4 text-red-500" />
                      ) : (
                        <Wifi className="h-4 w-4 text-green-500" />
                      )}
                      <span className="text-xs text-muted-foreground">
                        {isLoading ? "Cargando..." : error ? "Error" : "Conectado"}
                      </span>
                    </div>

                    {/* Ubicación actual */}
                    <div className="flex items-center space-x-2">
                      <MapPin className="h-4 w-4 text-blue-500" />
                      <span className="text-xs text-muted-foreground">
                        {currentLocation.name}
                      </span>
                    </div>

                    {/* AQI General */}
                    {prediction?.general && (
                      <Tooltip>
                        <TooltipTrigger asChild>
                          <div className="flex items-center space-x-2 cursor-help">
                            <Activity className="h-4 w-4 text-orange-500" />
                            <span className={`text-xs font-medium ${getAQIColor(prediction.general.aqi)}`}>
                              AQI: {prediction.general.aqi}
                            </span>
                            <Badge variant="outline" className="text-xs">
                              {getAQILevel(prediction.general.aqi)}
                            </Badge>
                          </div>
                        </TooltipTrigger>
                        <TooltipContent side="bottom">
                          <p>Índice de Calidad del Aire en {currentLocation.name}</p>
                        </TooltipContent>
                      </Tooltip>
                    )}

                    {/* Última actualización */}
                    <div className="flex items-center space-x-2">
                      <Clock className="h-4 w-4 text-gray-500" />
                      <span className="text-xs text-muted-foreground">
                        {new Date().toLocaleTimeString('es-ES', {
                          hour: '2-digit',
                          minute: '2-digit'
                        })}
                      </span>
                    </div>
                  </div>
                </div>

                {/* Métricas móviles */}
                <div className="lg:hidden flex items-center space-x-1 sm:space-x-2 min-w-0">
                  <div className="flex items-center space-x-1">
                    {isLoading ? (
                      <RefreshCw className="h-3 w-3 sm:h-4 sm:w-4 animate-spin text-blue-500" />
                    ) : error ? (
                      <WifiOff className="h-3 w-3 sm:h-4 sm:w-4 text-red-500" />
                    ) : (
                      <Wifi className="h-3 w-3 sm:h-4 sm:w-4 text-green-500" />
                    )}
                  </div>

                  {prediction?.general && (
                    <Badge variant="outline" className={`text-xs px-1 py-0 ${getAQIColor(prediction.general.aqi)}`}>
                      {prediction.general.aqi}
                    </Badge>
                  )}
                </div>

                {/* Menubar */}
                <div className="ml-auto flex-shrink-0">
                  <Menubar className="border-0 bg-transparent shadow-none">
                    {/* Menú Ubicación */}
                    <MenubarMenu>
                      <Tooltip>
                        <TooltipTrigger asChild>
                          <MenubarTrigger className="flex items-center gap-1 sm:gap-2 cursor-help px-1 sm:px-2">
                            <MapPin className="h-3 w-3 sm:h-4 sm:w-4" />
                            <span className="hidden sm:inline text-xs sm:text-sm">Ubicación</span>
                          </MenubarTrigger>
                        </TooltipTrigger>
                        <TooltipContent side="bottom">
                          <p>Cambiar ubicación</p>
                        </TooltipContent>
                      </Tooltip>
                      <MenubarContent>
                        {CALIFORNIA_LOCATIONS.map((loc) => (
                          <MenubarItem
                            key={loc.name}
                            onClick={() => handleLocationChange(loc)}
                          >
                            <MapPin className="mr-2 h-4 w-4" />
                            <span>{loc.name}</span>
                          </MenubarItem>
                        ))}
                      </MenubarContent>
                    </MenubarMenu>

                    {/* Menú Datos */}
                    <MenubarMenu>
                      <Tooltip>
                        <TooltipTrigger asChild>
                          <MenubarTrigger className="flex items-center gap-1 sm:gap-2 cursor-help px-1 sm:px-2">
                            <BarChart3 className="h-3 w-3 sm:h-4 sm:w-4" />
                            <span className="hidden sm:inline text-xs sm:text-sm">Datos</span>
                          </MenubarTrigger>
                        </TooltipTrigger>
                        <TooltipContent side="bottom">
                          <p>Ver detalles de calidad del aire</p>
                        </TooltipContent>
                      </Tooltip>
                      <MenubarContent>
                        <MenubarItem onClick={() => setOpenDialog("metrics")}>
                          <TrendingUp className="mr-2 h-4 w-4" />
                          <span>Métricas Detalladas</span>
                        </MenubarItem>
                        <MenubarItem onClick={() => setOpenDialog("tempo")}>
                          <Activity className="mr-2 h-4 w-4" />
                          <span>Datos TEMPO (Satelital)</span>
                        </MenubarItem>
                        <MenubarItem onClick={() => setOpenDialog("weather")}>
                          <Cloud className="mr-2 h-4 w-4" />
                          <span>Condiciones Meteorológicas</span>
                        </MenubarItem>
                        <MenubarItem onClick={() => setOpenDialog("pollutants")}>
                          <Activity className="mr-2 h-4 w-4" />
                          <span>Contaminantes AirNow</span>
                        </MenubarItem>
                      </MenubarContent>
                    </MenubarMenu>

                    {/* Menú Configuración */}
                    <MenubarMenu>
                      <Tooltip>
                        <TooltipTrigger asChild>
                          <MenubarTrigger className="flex items-center gap-1 sm:gap-2 cursor-help px-1 sm:px-2">
                            <Settings className="h-3 w-3 sm:h-4 sm:w-4" />
                            <span className="hidden sm:inline text-xs sm:text-sm">Config</span>
                          </MenubarTrigger>
                        </TooltipTrigger>
                        <TooltipContent side="bottom">
                          <p>Configuración y opciones avanzadas</p>
                        </TooltipContent>
                      </Tooltip>
                      <MenubarContent>
                        <MenubarItem onClick={() => setOpenDialog("debug")}>
                          <Code className="mr-2 h-4 w-4" />
                          <span>Modo Debug/Desarrollo</span>
                        </MenubarItem>
                        <MenubarSeparator />
                        <MenubarItem onClick={() => refetch()}>
                          <RefreshCw className="mr-2 h-4 w-4" />
                          <span>Actualizar Datos</span>
                        </MenubarItem>
                      </MenubarContent>
                    </MenubarMenu>
                  </Menubar>
                </div>
              </div>
            </header>

            {/* Map Content - Mapa a pantalla completa */}
            <main className="flex-1 overflow-hidden relative z-[1]">
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

                {/* Card flotante con AQI principal - Bottom right overlay */}
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
                          onClick={() => setOpenDialog("metrics")}
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
            </main>
          </div>
        </div>

        {/* Diálogos */}

        {/* Debug/Desarrollo - Coordenadas manuales */}
        <Dialog open={openDialog === "debug"} onOpenChange={(open) => !open && setOpenDialog(null)}>
          <DialogContent className="max-w-md z-[10001] mx-4">
            <DialogHeader>
              <DialogTitle className="flex items-center gap-2">
                <Code className="h-5 w-5" />
                Modo Debug / Desarrollo
              </DialogTitle>
            </DialogHeader>
            <Card>
              <CardHeader>
                <CardDescription>
                  Ingresa coordenadas personalizadas para pruebas
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="space-y-2">
                  <Label htmlFor="debug-lat">Latitud</Label>
                  <Input
                    id="debug-lat"
                    type="number"
                    step="any"
                    placeholder="Ej: 34.0522"
                    value={debugLat}
                    onChange={(e) => setDebugLat(e.target.value)}
                    onKeyDown={(e) => e.key === 'Enter' && handleDebugSearch()}
                  />
                  <p className="text-xs text-muted-foreground">Rango: -90 a 90</p>
                </div>
                <div className="space-y-2">
                  <Label htmlFor="debug-lng">Longitud</Label>
                  <Input
                    id="debug-lng"
                    type="number"
                    step="any"
                    placeholder="Ej: -118.2437"
                    value={debugLng}
                    onChange={(e) => setDebugLng(e.target.value)}
                    onKeyDown={(e) => e.key === 'Enter' && handleDebugSearch()}
                  />
                  <p className="text-xs text-muted-foreground">Rango: -180 a 180</p>
                </div>
                <Button onClick={handleDebugSearch} className="w-full">
                  <Search className="mr-2 h-4 w-4" />
                  Buscar
                </Button>
              </CardContent>
            </Card>
          </DialogContent>
        </Dialog>

        {/* Métricas Detalladas */}
        <Dialog open={openDialog === "metrics"} onOpenChange={(open) => !open && setOpenDialog(null)}>
          <DialogContent className="max-w-2xl z-[10001] mx-4 max-h-[90vh] overflow-y-auto">
            <DialogHeader>
              <DialogTitle className="flex items-center gap-2">
                <TrendingUp className="h-5 w-5" />
                Métricas Detalladas - {currentLocation.name}
              </DialogTitle>
            </DialogHeader>

            {prediction && (
              <div className="space-y-4">
                {/* AQI General */}
                {prediction.general && (
                  <Card>
                    <CardHeader>
                      <CardTitle className="text-base">Calidad del Aire General</CardTitle>
                    </CardHeader>
                    <CardContent>
                      <div className="flex items-center justify-between">
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
                    </CardContent>
                  </Card>
                )}

                {/* Estación */}
                <Card>
                  <CardHeader>
                    <CardTitle className="text-base">Estación de Monitoreo</CardTitle>
                  </CardHeader>
                  <CardContent>
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

                {/* Contaminantes */}
                <Card>
                  <CardHeader>
                    <CardTitle className="text-base">Parámetros por Contaminante</CardTitle>
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
          </DialogContent>
        </Dialog>

        {/* Condiciones Meteorológicas */}
        <Dialog open={openDialog === "weather"} onOpenChange={(open) => !open && setOpenDialog(null)}>
          <DialogContent className="max-w-2xl z-[10001] mx-4 max-h-[90vh] overflow-y-auto">
            <DialogHeader>
              <DialogTitle className="flex items-center gap-2">
                <Cloud className="h-5 w-5" />
                Condiciones Meteorológicas Completas
              </DialogTitle>
            </DialogHeader>
            {weatherLoading && (
              <div className="flex items-center justify-center py-8">
                <Loader2 className="h-8 w-8 animate-spin text-primary" />
              </div>
            )}
            {weatherData && (
              <div className="space-y-4">
                {/* Condiciones actuales desde predecirAqi */}
                {prediction?.weather && (
                  <Card>
                    <CardHeader>
                      <CardTitle className="text-base">Condiciones Actuales</CardTitle>
                      <CardDescription>Datos en tiempo real de la estación más cercana</CardDescription>
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
                )}

                {/* Info del pronóstico */}
                <Card className="bg-blue-50 dark:bg-blue-950 border-blue-200 dark:border-blue-800">
                  <CardContent className="pt-4">
                    <div className="flex items-center gap-2 mb-2">
                      <Cloud className="h-4 w-4 text-blue-600" />
                      <p className="font-semibold text-sm">Pronóstico Extendido - OpenMeteo</p>
                    </div>
                    <div className="text-xs">
                      <p className="text-muted-foreground">
                        Ubicación: {weatherData.location.latitude.toFixed(4)}, {weatherData.location.longitude.toFixed(4)}
                      </p>
                      <p className="text-muted-foreground">
                        Días de pronóstico: {weatherData.forecast_days}
                      </p>
                    </div>
                  </CardContent>
                </Card>

                {/* Datos meteorológicos detallados */}
                {weatherData.weather_data && (
                  <Card>
                    <CardHeader>
                      <CardTitle className="text-base">Parámetros Meteorológicos Avanzados</CardTitle>
                      <CardDescription>Variables críticas para modelado de calidad del aire</CardDescription>
                    </CardHeader>
                    <CardContent className="space-y-3">
                      <div className="grid grid-cols-2 gap-3 text-sm">
                        <div>
                          <p className="text-muted-foreground">Velocidad del viento (10m)</p>
                          <p className="font-medium">
                            {weatherData.weather_data.hourly?.wind_speed_10m?.[0] ?? 'N/A'} km/h
                          </p>
                        </div>
                        <div>
                          <p className="text-muted-foreground">Dirección del viento (10m)</p>
                          <p className="font-medium">
                            {weatherData.weather_data.hourly?.wind_direction_10m?.[0] ?? 'N/A'}°
                          </p>
                        </div>
                        <div>
                          <p className="text-muted-foreground">Altura capa límite</p>
                          <p className="font-medium">
                            {weatherData.weather_data.hourly?.boundary_layer_height?.[0] ?? 'N/A'} m
                          </p>
                          <p className="text-xs text-muted-foreground italic">
                            Crítico para conversión columna-superficie
                          </p>
                        </div>
                        <div>
                          <p className="text-muted-foreground">Temperatura (2m)</p>
                          <p className="font-medium">
                            {weatherData.weather_data.hourly?.temperature_2m?.[0] ?? 'N/A'}°C
                          </p>
                        </div>
                        <div>
                          <p className="text-muted-foreground">Precipitación</p>
                          <p className="font-medium">
                            {weatherData.weather_data.hourly?.precipitation?.[0] ?? 'N/A'} mm
                          </p>
                          <p className="text-xs text-muted-foreground italic">
                            Washout de contaminantes
                          </p>
                        </div>
                        <div>
                          <p className="text-muted-foreground">Humedad relativa (2m)</p>
                          <p className="font-medium">
                            {weatherData.weather_data.hourly?.relative_humidity_2m?.[0] ?? 'N/A'}%
                          </p>
                        </div>
                        <div>
                          <p className="text-muted-foreground">Presión superficial</p>
                          <p className="font-medium">
                            {weatherData.weather_data.hourly?.surface_pressure?.[0] ?? 'N/A'} hPa
                          </p>
                        </div>
                        <div>
                          <p className="text-muted-foreground">Cobertura de nubes</p>
                          <p className="font-medium">
                            {weatherData.weather_data.hourly?.cloud_cover?.[0] ?? 'N/A'}%
                          </p>
                        </div>
                      </div>
                    </CardContent>
                  </Card>
                )}
              </div>
            )}
          </DialogContent>
        </Dialog>

        {/* Contaminantes Detallados */}
        <Dialog open={openDialog === "pollutants"} onOpenChange={(open) => !open && setOpenDialog(null)}>
          <DialogContent className="max-w-2xl z-[10001] mx-4 max-h-[90vh] overflow-y-auto">
            <DialogHeader>
              <DialogTitle className="flex items-center gap-2">
                <Activity className="h-5 w-5" />
                Análisis de Contaminantes AirNow
              </DialogTitle>
            </DialogHeader>
            {prediction && (
              <div className="space-y-4">
                {/* O3 */}
                {prediction.O3 && (
                  <Card>
                    <CardHeader>
                      <CardTitle className="text-base flex items-center justify-between">
                        <span>Ozono (O3)</span>
                        <Badge className={getAQIBadge(prediction.O3.currentData.aqi).color}>
                          AQI: {prediction.O3.currentData.aqi}
                        </Badge>
                      </CardTitle>
                      <CardDescription>{prediction.O3.currentData.category}</CardDescription>
                    </CardHeader>
                    <CardContent className="space-y-3">
                      <div className="grid grid-cols-2 gap-3">
                        <div>
                          <p className="text-sm text-muted-foreground">Concentración</p>
                          <p className="font-medium">{prediction.O3.currentData.value} {prediction.O3.currentData.unit}</p>
                        </div>
                        <div>
                          <p className="text-sm text-muted-foreground">Estación</p>
                          <p className="font-medium text-sm">{prediction.O3.currentData.siteName}</p>
                        </div>
                      </div>
                      {prediction.O3.tempo && (
                        <div className="pt-3 border-t">
                          <p className="text-sm font-semibold mb-2">Datos TEMPO (Satélite)</p>
                          <div className="grid grid-cols-2 gap-3 text-sm">
                            <div>
                              <p className="text-muted-foreground">En estación</p>
                              <p className="font-medium">{prediction.O3.tempo.station?.toFixed(2)} DU</p>
                            </div>
                            <div>
                              <p className="text-muted-foreground">En tu ubicación</p>
                              <p className="font-medium">{prediction.O3.tempo.user?.toFixed(2)} DU</p>
                            </div>
                            {prediction.O3.tempo.estimatedUserValue && (
                              <div className="col-span-2">
                                <p className="text-muted-foreground">Estimación para tu ubicación</p>
                                <p className="font-medium text-base">{prediction.O3.tempo.estimatedUserValue.toFixed(2)} {prediction.O3.currentData.unit}</p>
                              </div>
                            )}
                          </div>
                        </div>
                      )}
                    </CardContent>
                  </Card>
                )}

                {/* NO2 */}
                {prediction.NO2 && (
                  <Card>
                    <CardHeader>
                      <CardTitle className="text-base flex items-center justify-between">
                        <span>Dióxido de Nitrógeno (NO2)</span>
                        <Badge className={getAQIBadge(prediction.NO2.currentData.aqi).color}>
                          AQI: {prediction.NO2.currentData.aqi}
                        </Badge>
                      </CardTitle>
                      <CardDescription>{prediction.NO2.currentData.category}</CardDescription>
                    </CardHeader>
                    <CardContent className="space-y-3">
                      <div className="grid grid-cols-2 gap-3">
                        <div>
                          <p className="text-sm text-muted-foreground">Concentración</p>
                          <p className="font-medium">{prediction.NO2.currentData.value} {prediction.NO2.currentData.unit}</p>
                        </div>
                        <div>
                          <p className="text-sm text-muted-foreground">Estación</p>
                          <p className="font-medium text-sm">{prediction.NO2.currentData.siteName}</p>
                        </div>
                      </div>
                      {prediction.NO2.tempo && (
                        <div className="pt-3 border-t">
                          <p className="text-sm font-semibold mb-2">Datos TEMPO (Satélite)</p>
                          <div className="grid grid-cols-2 gap-3 text-sm">
                            <div>
                              <p className="text-muted-foreground">En estación</p>
                              <p className="font-medium">{prediction.NO2.tempo.station?.toExponential(2)} molec/cm²</p>
                            </div>
                            <div>
                              <p className="text-muted-foreground">En tu ubicación</p>
                              <p className="font-medium">{prediction.NO2.tempo.user?.toExponential(2)} molec/cm²</p>
                            </div>
                            {prediction.NO2.tempo.estimatedUserValue && (
                              <div className="col-span-2">
                                <p className="text-muted-foreground">Estimación para tu ubicación</p>
                                <p className="font-medium text-base">{prediction.NO2.tempo.estimatedUserValue.toFixed(2)} {prediction.NO2.currentData.unit}</p>
                              </div>
                            )}
                          </div>
                        </div>
                      )}
                    </CardContent>
                  </Card>
                )}

                {/* PM2.5 */}
                {prediction.PM25 && (
                  <Card>
                    <CardHeader>
                      <CardTitle className="text-base flex items-center justify-between">
                        <span>Material Particulado (PM2.5)</span>
                        <Badge className={getAQIBadge(prediction.PM25.currentData.aqi).color}>
                          AQI: {prediction.PM25.currentData.aqi}
                        </Badge>
                      </CardTitle>
                      <CardDescription>{prediction.PM25.currentData.category}</CardDescription>
                    </CardHeader>
                    <CardContent>
                      <div className="grid grid-cols-2 gap-3">
                        <div>
                          <p className="text-sm text-muted-foreground">Concentración</p>
                          <p className="font-medium">{prediction.PM25.currentData.value} {prediction.PM25.currentData.unit}</p>
                        </div>
                        <div>
                          <p className="text-sm text-muted-foreground">Estación</p>
                          <p className="font-medium text-sm">{prediction.PM25.currentData.siteName}</p>
                        </div>
                      </div>
                    </CardContent>
                  </Card>
                )}
              </div>
            )}
          </DialogContent>
        </Dialog>

        {/* Datos TEMPO Satelitales */}
        <Dialog open={openDialog === "tempo"} onOpenChange={(open) => !open && setOpenDialog(null)}>
          <DialogContent className="max-w-3xl z-[10001] mx-4 max-h-[90vh] overflow-y-auto">
            <DialogHeader>
              <DialogTitle className="flex items-center gap-2">
                <Activity className="h-5 w-5" />
                Datos TEMPO - Satélite NASA
              </DialogTitle>
            </DialogHeader>
            {tempoLoading && (
              <div className="flex items-center justify-center py-8">
                <Loader2 className="h-8 w-8 animate-spin text-primary" />
              </div>
            )}
            {tempoData && (
              <div className="space-y-4">
                {/* Info del satélite */}
                <Card className="bg-blue-50 dark:bg-blue-950 border-blue-200 dark:border-blue-800">
                  <CardContent className="pt-4">
                    <div className="flex items-center gap-2 mb-2">
                      <Activity className="h-4 w-4 text-blue-600" />
                      <p className="font-semibold text-sm">{tempoData.satellite} - {tempoData.data_source}</p>
                    </div>
                    <p className="text-xs text-muted-foreground">{tempoData.notes}</p>
                    <div className="mt-2 text-xs">
                      <p className="text-muted-foreground">
                        Timestamp: {new Date(tempoData.timestamp).toLocaleString('es-ES')}
                      </p>
                      <p className="text-muted-foreground italic">{tempoData.timestamp_info}</p>
                    </div>
                  </CardContent>
                </Card>

                {/* NO2 */}
                {tempoData.data.NO2 && !('error' in tempoData.data.NO2) && 'description' in tempoData.data.NO2 && (
                  <Card>
                    <CardHeader>
                      <CardTitle className="text-base flex items-center justify-between">
                        <span>Dióxido de Nitrógeno (NO2)</span>
                        <Badge variant="outline" className="text-xs">
                          {tempoData.data.NO2.nivel}
                        </Badge>
                      </CardTitle>
                      <CardDescription>{tempoData.data.NO2.description}</CardDescription>
                    </CardHeader>
                    <CardContent>
                      <div className="grid grid-cols-2 gap-4">
                        <div>
                          <p className="text-sm text-muted-foreground">Valor (columnar)</p>
                          <p className="font-medium text-sm">{tempoData.data.NO2.value_formatted}</p>
                          <p className="text-xs text-muted-foreground">{tempoData.data.NO2.unit}</p>
                        </div>
                        <div>
                          <p className="text-sm text-muted-foreground">Clasificación</p>
                          <p className="font-medium">{tempoData.data.NO2.nivel}</p>
                        </div>
                      </div>
                    </CardContent>
                  </Card>
                )}

                {/* O3 */}
                {tempoData.data.O3 && !('error' in tempoData.data.O3) && 'description' in tempoData.data.O3 && (
                  <Card>
                    <CardHeader>
                      <CardTitle className="text-base flex items-center justify-between">
                        <span>Ozono (O3)</span>
                        <Badge variant="outline" className="text-xs">
                          {tempoData.data.O3.nivel}
                        </Badge>
                      </CardTitle>
                      <CardDescription>{tempoData.data.O3.description}</CardDescription>
                    </CardHeader>
                    <CardContent>
                      <div className="grid grid-cols-2 gap-4">
                        <div>
                          <p className="text-sm text-muted-foreground">Valor (columnar)</p>
                          <p className="font-medium">{tempoData.data.O3.value?.toFixed(2)}</p>
                          <p className="text-xs text-muted-foreground">{tempoData.data.O3.unit}</p>
                        </div>
                        <div>
                          <p className="text-sm text-muted-foreground">Clasificación</p>
                          <p className="font-medium">{tempoData.data.O3.nivel}</p>
                        </div>
                      </div>
                    </CardContent>
                  </Card>
                )}

                {/* HCHO */}
                {tempoData.data.HCHO && !('error' in tempoData.data.HCHO) && 'description' in tempoData.data.HCHO && (
                  <Card>
                    <CardHeader>
                      <CardTitle className="text-base flex items-center justify-between">
                        <span>Formaldehído (HCHO)</span>
                        <Badge variant="outline" className="text-xs">
                          {tempoData.data.HCHO.nivel}
                        </Badge>
                      </CardTitle>
                      <CardDescription>{tempoData.data.HCHO.description}</CardDescription>
                    </CardHeader>
                    <CardContent>
                      <div className="grid grid-cols-2 gap-4">
                        <div>
                          <p className="text-sm text-muted-foreground">Valor (columnar)</p>
                          <p className="font-medium text-sm">{tempoData.data.HCHO.value_formatted}</p>
                          <p className="text-xs text-muted-foreground">{tempoData.data.HCHO.unit}</p>
                        </div>
                        <div>
                          <p className="text-sm text-muted-foreground">En DU</p>
                          <p className="font-medium">{tempoData.data.HCHO.value_DU} DU</p>
                        </div>
                        <div className="col-span-2">
                          <p className="text-sm text-muted-foreground">Clasificación</p>
                          <p className="font-medium">{tempoData.data.HCHO.nivel}</p>
                        </div>
                      </div>
                    </CardContent>
                  </Card>
                )}

                {/* Ubicación */}
                <Card className="bg-muted/50">
                  <CardContent className="pt-4">
                    <div className="grid grid-cols-2 gap-3 text-sm">
                      <div>
                        <p className="text-muted-foreground">Latitud</p>
                        <p className="font-medium">{tempoData.location.latitude.toFixed(4)}</p>
                      </div>
                      <div>
                        <p className="text-muted-foreground">Longitud</p>
                        <p className="font-medium">{tempoData.location.longitude.toFixed(4)}</p>
                      </div>
                    </div>
                  </CardContent>
                </Card>
              </div>
            )}
          </DialogContent>
        </Dialog>
      </div>
    </TooltipProvider>
  )
}

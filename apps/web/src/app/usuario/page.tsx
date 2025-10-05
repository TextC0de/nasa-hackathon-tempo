"use client"

import { useState, useEffect } from "react"
import { TooltipProvider } from "@/components/ui/tooltip"
import { trpc } from "@/lib/trpc"
import { useMonitoringStations, type GroupedStation } from "@/hooks/use-monitoring-stations"
import { Header } from "./_components/header"
import { MapView } from "./_components/map-view"
import { DebugDialog } from "./_components/debug-dialog"
import { MetricsDialog, TEMPODialog, WeatherDialog, PollutantsDialog } from "./_components/dialogs"
import { StationDetailDialog } from "./_components/station-detail-dialog"
import { getAQIColor, getAQIBadge, getAQILevel } from "./_components/utils"

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

export default function UsuarioPage() {
  // Estado por defecto: Los Ángeles, California
  const [currentLocation, setCurrentLocation] = useState<{ name: string; lat: number; lng: number }>(CALIFORNIA_LOCATIONS[0])
  const [searchLat, setSearchLat] = useState<number>(CALIFORNIA_LOCATIONS[0].lat)
  const [searchLng, setSearchLng] = useState<number>(CALIFORNIA_LOCATIONS[0].lng)

  // Estados para debug
  const [debugLat, setDebugLat] = useState<string>(CALIFORNIA_LOCATIONS[0].lat.toString())
  const [debugLng, setDebugLng] = useState<string>(CALIFORNIA_LOCATIONS[0].lng.toString())
  const [openDialog, setOpenDialog] = useState<string | null>(null)

  // Estado para estación seleccionada
  const [selectedStation, setSelectedStation] = useState<GroupedStation | null>(null)
  const [stationDialogOpen, setStationDialogOpen] = useState(false)

  // Hook para obtener todas las estaciones de monitoreo
  const { groupedStations, isLoading: stationsLoading } = useMonitoringStations({
    centerLat: 36.7783,
    centerLng: -119.4179,
    radiusKm: 200,
    enabled: true
  })

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
  const handleLocationChange = (location: { name: string; lat: number; lng: number }) => {
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

  // Handler para click en estación
  const handleStationClick = (station: GroupedStation) => {
    console.log('📍 Estación seleccionada:', station.SiteName)
    setSelectedStation(station)
    setStationDialogOpen(true)
  }

  return (
    <TooltipProvider>
      <div className="min-h-screen bg-background text-foreground">
        <div className="flex h-screen">
          {/* Main Content */}
          <div className="flex-1 flex flex-col overflow-hidden">
            {/* Header */}
            <Header
              currentLocation={currentLocation}
              isLoading={isLoading}
              error={error}
              prediction={prediction}
              onLocationChange={handleLocationChange}
              onDialogOpen={setOpenDialog}
              onRefetch={refetch}
              getAQIColor={getAQIColor}
              getAQILevel={getAQILevel}
              locations={CALIFORNIA_LOCATIONS}
            />

            {/* Map Content */}
            <main className="flex-1 overflow-hidden relative z-[1]">
              <MapView
                searchLat={searchLat}
                searchLng={searchLng}
                currentLocation={currentLocation}
                prediction={prediction}
                isLoading={isLoading}
                error={error}
                onDialogOpen={setOpenDialog}
                getAQIColor={getAQIColor}
                getAQIBadge={getAQIBadge}
                groupedStations={groupedStations}
                onStationClick={handleStationClick}
              />
            </main>
          </div>
        </div>

        {/* Dialog de estación con datos TEMPO */}
        <StationDetailDialog
          station={selectedStation}
          open={stationDialogOpen}
          onOpenChange={setStationDialogOpen}
        />

        {/* Diálogos */}
        <DebugDialog
          open={openDialog === "debug"}
          onOpenChange={(open) => !open && setOpenDialog(null)}
          debugLat={debugLat}
          debugLng={debugLng}
          onDebugLatChange={setDebugLat}
          onDebugLngChange={setDebugLng}
          onDebugSearch={handleDebugSearch}
        />

        <MetricsDialog
          open={openDialog === "metrics"}
          onOpenChange={(open) => !open && setOpenDialog(null)}
          currentLocation={currentLocation}
          prediction={prediction}
        />

        <TEMPODialog
          open={openDialog === "tempo"}
          onOpenChange={(open) => !open && setOpenDialog(null)}
          tempoData={tempoData}
          tempoLoading={tempoLoading}
        />

        <WeatherDialog
          open={openDialog === "weather"}
          onOpenChange={(open) => !open && setOpenDialog(null)}
          weatherData={weatherData}
          weatherLoading={weatherLoading}
          prediction={prediction}
        />

        <PollutantsDialog
          open={openDialog === "pollutants"}
          onOpenChange={(open) => !open && setOpenDialog(null)}
          prediction={prediction}
        />
      </div>
    </TooltipProvider>
  )
}

"use client"

import { useState, useEffect } from "react"
import { TooltipProvider } from "@/components/ui/tooltip"
import { trpc } from "@/lib/trpc"
import { useAlertPolling } from "@/hooks/use-alert-polling"
import { Header } from "./_components/header"
import { MapView } from "./_components/map-view"
import { DebugDialog } from "./_components/debug-dialog"
import { MetricsDialog, TEMPODialog, WeatherDialog, PollutantsDialog, DataPanelDialog } from "./_components/dialogs"
import { RecommendationsPanel, RecommendationsPanelCompact } from "./_components/recommendations-panel"
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

  // Hook para polling de alertas
  const {
    alerts,
    unreadAlerts,
    newAlertsCount,
    markAsRead,
    markAllAsRead,
    isRead
  } = useAlertPolling({
    latitude: searchLat,
    longitude: searchLng,
    radiusKm: 100,
    enabled: true,
    pollingInterval: 30000 // 30 segundos
  })

  // NOTA: Los datos TEMPO ahora vienen incluidos en prediction.O3.tempo y prediction.NO2.tempo
  const tempoData = null
  const tempoLoading = false

  // Query para obtener datos meteorológicos completos
  // NOTA: Esta query fue comentada porque la procedure fue eliminada
  // Los datos meteorológicos ahora vienen incluidos en prediction.weather
  const weatherData = null
  const weatherLoading = false

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

  // Función para actualizar ubicación desde el mapa (drag)
  const handleLocationUpdate = (lat: number, lng: number) => {
    setSearchLat(lat)
    setSearchLng(lng)
    setDebugLat(lat.toString())
    setDebugLng(lng.toString())
    setCurrentLocation({ name: "Ubicación personalizada", lat, lng })
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

  return (
    <TooltipProvider>
      <div className="min-h-screen bg-background text-foreground">
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
          alerts={alerts}
          unreadAlertsCount={newAlertsCount}
          onMarkAlertAsRead={markAsRead}
          onMarkAllAlertsAsRead={markAllAsRead}
          isAlertRead={isRead}
        />

        {/* Main Layout: Desktop = Side by Side, Mobile = Stacked */}
        <div className="h-[calc(100vh-60px)]">
          <div className="h-full flex flex-col lg:flex-row">
            {/* Mapa - Ocupa todo en móvil, lado izquierdo en desktop */}
            <div className="h-[50vh] lg:h-full lg:w-[60%] relative">
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
                onLocationUpdate={handleLocationUpdate}
              />
            </div>

            {/* Panel de Recomendaciones */}
            {prediction?.general && (
              <>
                {/* Desktop: Sidebar derecho */}
                <div className="hidden lg:block lg:w-[40%] bg-muted/30 border-l border-border">
                  <div className="h-full overflow-y-auto p-6">
                    <RecommendationsPanel
                      aqi={prediction.general.aqi}
                      dominantPollutant={prediction.general.dominantParameter}
                      category={prediction.general.category}
                    />
                  </div>
                </div>

                {/* Mobile: Panel inferior */}
                <div className="lg:hidden h-[50vh] overflow-y-auto bg-background border-t border-border">
                  <div className="p-4">
                    <RecommendationsPanel
                      aqi={prediction.general.aqi}
                      dominantPollutant={prediction.general.dominantParameter}
                      category={prediction.general.category}
                    />
                  </div>
                </div>
              </>
            )}
          </div>
        </div>

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

        <DataPanelDialog
          open={openDialog === "data-panel"}
          onOpenChange={(open) => !open && setOpenDialog(null)}
          currentLocation={currentLocation}
          searchLat={searchLat}
          searchLng={searchLng}
          prediction={prediction}
          onOpenPollutantsDialog={() => setOpenDialog("pollutants")}
        />
      </div>
    </TooltipProvider>
  )
}

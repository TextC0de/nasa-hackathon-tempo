"use client"

import { useState, useEffect } from "react"
import { TooltipProvider } from "@/components/ui/tooltip"
import { trpc } from "@/lib/trpc"
import { useAlertPolling } from "@/hooks/use-alert-polling"
import { Header } from "./_components/header"
import { MapView } from "./_components/map-view"
import { DebugDialog } from "./_components/debug-dialog"
import { MetricsDialog, TEMPODialog, WeatherDialog, PollutantsDialog } from "./_components/dialogs"
import { RecommendationsPanel, RecommendationsPanelCompact } from "./_components/recommendations-panel"
import { WelcomeCard } from "./_components/welcome-card"
import { MetricsCards } from "./_components/metrics-cards"
import { QuickActions } from "./_components/quick-actions"
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
          alerts={alerts as any}
          unreadAlertsCount={newAlertsCount}
          onMarkAlertAsRead={markAsRead}
          onMarkAllAlertsAsRead={markAllAsRead}
          isAlertRead={isRead}
        />

        {/* Main Content */}
        <div className="min-h-[calc(100vh-60px)] bg-gradient-to-br from-blue-50/30 via-white to-green-50/30">
          <div className="container mx-auto px-4 py-6 space-y-8">
            
            {/* Welcome Card */}
            <WelcomeCard
              currentLocation={currentLocation}
              prediction={prediction}
              isLoading={isLoading}
              onDialogOpen={setOpenDialog}
              getAQIColor={getAQIColor}
              getAQILevel={getAQILevel}
            />

            {/* Metrics Cards */}
            <MetricsCards
              prediction={prediction}
              isLoading={isLoading}
              onDialogOpen={setOpenDialog}
              getAQIColor={getAQIColor}
            />

            {/* Quick Actions */}
            <QuickActions
              onDialogOpen={setOpenDialog}
              onRefetch={refetch}
              isLoading={isLoading}
              unreadAlertsCount={newAlertsCount}
            />

            {/* Map and Recommendations */}
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
              {/* Map */}
              <div className="lg:col-span-1">
                <div className="bg-white rounded-xl shadow-lg overflow-hidden border border-gray-200">
                  <div className="h-96 lg:h-[500px]">
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
                </div>
              </div>

              {/* Recommendations */}
              {prediction?.general && (
                <div className="lg:col-span-1">
                  <div className="bg-white rounded-xl shadow-lg border border-gray-200 h-96 lg:h-[500px] overflow-y-auto">
                    <div className="p-6">
                      <RecommendationsPanel
                        aqi={prediction.general.aqi}
                        dominantPollutant={prediction.general.dominantParameter}
                        category={prediction.general.category}
                      />
                    </div>
                  </div>
                </div>
              )}
            </div>
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
      </div>
    </TooltipProvider>
  )
}

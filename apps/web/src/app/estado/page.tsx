"use client"

import { useState } from "react"
import dynamic from "next/dynamic"
import { TooltipProvider } from "@/components/ui/tooltip"
import { useMonitoringStations, type GroupedStation } from "@/hooks/use-monitoring-stations"
import { useActiveFires, type FireDataPoint } from "@/hooks/use-active-fires"
import { useAlerts } from "@/hooks/use-alerts"
import { DashboardHeader } from "./_components/dashboard-header"
import { DashboardDialogs } from "./_components/dashboard-dialogs"
import { StationWeatherDialog } from "./_components/station-weather-dialog"
import { FireDialog } from "./_components/fire-dialog"
import { getAQIColor, getAQILevel, getAQIDetails } from "./_components/aqi-utils"

// Importar el componente del mapa dinámicamente para evitar problemas de SSR
const CaliforniaMap = dynamic(() => import("@/components/california-map").then(mod => ({ default: mod.CaliforniaMap })), {
  ssr: false,
  loading: () => (
    <div className="h-full w-full flex items-center justify-center bg-muted">
      <div className="text-center">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary mx-auto mb-2"></div>
        <p className="text-sm text-muted-foreground">Cargando mapa...</p>
      </div>
    </div>
  )
})

type MapType = "streetmap" | "topographic" | "hybrid" | "physical"

export default function Dashboard() {
  const [mapType, setMapType] = useState<MapType>("streetmap")
  const [openDialog, setOpenDialog] = useState<string | null>(null)
  const [showMonitoringStations, setShowMonitoringStations] = useState(true)
  const [showActiveFires, setShowActiveFires] = useState(true)
  const [isSubmittingAlert, setIsSubmittingAlert] = useState(false)

  // State para el Dialog de estación seleccionada
  const [selectedStation, setSelectedStation] = useState<GroupedStation | null>(null)
  const [stationDialogOpen, setStationDialogOpen] = useState(false)

  // State para el Dialog de incendio seleccionado
  const [selectedFire, setSelectedFire] = useState<FireDataPoint | null>(null)
  const [fireDialogOpen, setFireDialogOpen] = useState(false)

  // Hook para obtener datos de estaciones de monitoreo
  const { stations, airQuality, isLoading, error, stats } = useMonitoringStations({
    centerLat: 36.7783, // Centro de California
    centerLng: -119.4179,
    radiusKm: 200,
    enabled: true
  })

  // Hook para obtener datos de incendios activos
  const {
    fires,
    statistics: fireStats,
    isLoading: firesLoading,
    error: firesError
  } = useActiveFires({
    centerLat: 36.7783, // Centro de California
    centerLng: -119.4179,
    radiusKm: 200,
    enabled: true
  })

  // Hook para manejar alertas
  const { 
    alerts, 
    addAlert, 
    updateAlertStatus, 
    removeAlert, 
    getActiveAlerts 
  } = useAlerts()

  // Funciones para manejar alertas
  const handleSubmitAlert = async (alertData: any) => {
    setIsSubmittingAlert(true)
    
    try {
      // Simular envío de alerta
      await new Promise(resolve => setTimeout(resolve, 2000))
      
      // Agregar coordenadas de ejemplo si no se proporcionaron
      const alertWithCoords = {
        ...alertData,
        coordinates: alertData.coordinates || {
          lat: 36.7783 + (Math.random() - 0.5) * 0.1, // Coordenadas aleatorias cerca de California
          lng: -119.4179 + (Math.random() - 0.5) * 0.1
        }
      }
      
      addAlert(alertWithCoords)
      
      // Cerrar diálogo
      setOpenDialog(null)
      
      // Mostrar mensaje de éxito
      alert("¡Alerta enviada exitosamente! Se ha agregado al mapa.")
      
    } catch (error) {
      alert("Error al enviar la alerta. Por favor intenta nuevamente.")
    } finally {
      setIsSubmittingAlert(false)
    }
  }

  const handleResolveAlert = (alertId: string) => {
    updateAlertStatus(alertId, 'resolved')
  }

  const handleDismissAlert = (alertId: string) => {
    updateAlertStatus(alertId, 'dismissed')
  }

  // Handler para click en estación
  const handleStationClick = (station: GroupedStation) => {
    console.log('📍 [DASHBOARD] Estación seleccionada:', station.SiteName)
    setSelectedStation(station)
    setStationDialogOpen(true)
  }

  // Handler para click en incendio
  const handleFireClick = (fire: FireDataPoint) => {
    console.log('🔥 [DASHBOARD] Incendio seleccionado:', fire)
    setSelectedFire(fire)
    setFireDialogOpen(true)
  }

  return (
    <TooltipProvider>
      <div className="min-h-screen bg-background text-foreground">
        <div className="flex h-screen">
          {/* Main Content */}
          <div className="flex-1 flex flex-col overflow-hidden">
            <DashboardHeader
              isLoading={isLoading}
              error={error}
              stats={stats}
              getAQIColor={getAQIColor}
              getAQILevel={getAQILevel}
              getAQIDetails={getAQIDetails}
              setOpenDialog={setOpenDialog}
            />

            <DashboardDialogs
              openDialog={openDialog}
              setOpenDialog={setOpenDialog}
              showMonitoringStations={showMonitoringStations}
              setShowMonitoringStations={setShowMonitoringStations}
              showActiveFires={showActiveFires}
              setShowActiveFires={setShowActiveFires}
              isLoading={isLoading}
              error={error}
              stats={stats}
              fireStats={fireStats}
              getAQIColor={getAQIColor}
              getAQILevel={getAQILevel}
              handleSubmitAlert={handleSubmitAlert}
              isSubmittingAlert={isSubmittingAlert}
              getActiveAlerts={getActiveAlerts}
              handleResolveAlert={handleResolveAlert}
              handleDismissAlert={handleDismissAlert}
            />

            {/* Map Content - Solo el mapa limpio */}
            <main className="flex-1 overflow-hidden relative z-[1]">
              <div className="h-full w-full">
                <CaliforniaMap
                  className="h-full w-full"
                  mapType={mapType}
                  onMapTypeChange={(type) => setMapType(type as MapType)}
                  showMonitoringStations={showMonitoringStations}
                  showActiveFires={showActiveFires}
                  alerts={getActiveAlerts()}
                  fires={fires}
                  onStationClick={handleStationClick}
                  onFireClick={handleFireClick}
                />
              </div>
            </main>
          </div>
        </div>

        {/* Dialog de Estación con Clima */}
        <StationWeatherDialog
          station={selectedStation}
          open={stationDialogOpen}
          onOpenChange={setStationDialogOpen}
          getAQIColor={getAQIColor}
          getAQICategory={getAQIDetails}
        />
      </div>
    </TooltipProvider>
  )
}

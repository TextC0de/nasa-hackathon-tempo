"use client"

import { useState } from "react"
import dynamic from "next/dynamic"
import { TooltipProvider } from "@/components/ui/tooltip"
import { SelectedCityProvider } from "@/hooks/use-selected-city"
import { useMonitoringStations, type GroupedStation } from "@/hooks/use-monitoring-stations"
import { useActiveFires, type FireDataPoint } from "@/hooks/use-active-fires"
import { useAlerts } from "@/hooks/use-alerts"
import { useCaliforniaTEMPOOverlay } from "@/hooks/use-tempo-overlay"
import { DashboardHeader } from "./_components/dashboard-header"
import { DashboardDialogs } from "./_components/dashboard-dialogs"
import { StationWeatherDialog } from "./_components/station-weather-dialog"
import { FireDialog } from "./_components/fire-dialog"
import { TempoSidebar } from "./_components/tempo-sidebar"
import { getAQIColor, getAQILevel, getAQIDetails } from "./_components/aqi-utils"

// Import map component dynamically to avoid SSR issues
const CaliforniaMap = dynamic(() => import("@/components/california-map").then(mod => ({ default: mod.CaliforniaMap })), {
  ssr: false,
  loading: () => (
    <div className="h-full w-full flex items-center justify-center bg-muted">
      <div className="text-center">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary mx-auto mb-2"></div>
        <p className="text-sm text-muted-foreground">Loading map...</p>
      </div>
    </div>
  )
})

type MapType = "streetmap" | "topographic" | "hybrid" | "physical"

export default function EstadoOverviewPage() {
  const [mapType, setMapType] = useState<MapType>("streetmap")
  const [openDialog, setOpenDialog] = useState<string | null>(null)
  const [showMonitoringStations, setShowMonitoringStations] = useState(true)
  const [showActiveFires, setShowActiveFires] = useState(true)
  const [showTempoOverlay, setShowTempoOverlay] = useState(true)
  const [tempoOpacity, setTempoOpacity] = useState(0.7)
  const [showCityBoundaries, setShowCityBoundaries] = useState(true)
  const [currentPollutant, setCurrentPollutant] = useState<'NO2' | 'O3' | 'HCHO'>('NO2')
  const [isSubmittingAlert, setIsSubmittingAlert] = useState(false)
  const [isLoadingCities, setIsLoadingCities] = useState(true)

  // State for selected station dialog
  const [selectedStation, setSelectedStation] = useState<GroupedStation | null>(null)
  const [stationDialogOpen, setStationDialogOpen] = useState(false)

  // State for selected fire dialog
  const [selectedFire, setSelectedFire] = useState<FireDataPoint | null>(null)
  const [fireDialogOpen, setFireDialogOpen] = useState(false)

  // Hook to get monitoring stations data
  const { isLoading, error, stats } = useMonitoringStations({
    enabled: true
  })

  // Hook to get active fires data
  const { fires, statistics: fireStats, isLoading: isLoadingFires } = useActiveFires({
    centerLat: 36.7783, // California center
    centerLng: -119.4179,
    radiusKm: 200,
    enabled: true
  })

  // Hook to manage alerts
  const {
    alerts,
    addAlert,
    updateAlertStatus,
    getActiveAlerts
  } = useAlerts()

  // Hook for TEMPO overlay
  const tempoOverlay = useCaliforniaTEMPOOverlay(currentPollutant)

  // Functions to handle alerts
  const handleSubmitAlert = async (alertData: any) => {
    setIsSubmittingAlert(true)

    try {
      // Simulate alert submission
      await new Promise(resolve => setTimeout(resolve, 2000))

      // Add example coordinates if not provided
      const alertWithCoords = {
        ...alertData,
        coordinates: alertData.coordinates || {
          lat: 36.7783 + (Math.random() - 0.5) * 0.1, // Random coordinates near California
          lng: -119.4179 + (Math.random() - 0.5) * 0.1
        }
      }

      addAlert(alertWithCoords)

      // Close dialog
      setOpenDialog(null)

      // Show success message
      alert("Alert sent successfully! It has been added to the map.")
      
    } catch (error) {
      alert("Error sending alert. Please try again.")
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

  // Handler for station click
  const handleStationClick = (station: GroupedStation) => {
    console.log('📍 [DASHBOARD] Selected station:', station.SiteName)
    setSelectedStation(station)
    setStationDialogOpen(true)
  }

  // Handler for fire click
  const handleFireClick = (fire: FireDataPoint) => {
    console.log('🔥 [DASHBOARD] Selected fire:', fire)
    setSelectedFire(fire)
    setFireDialogOpen(true)
  }

  // Handler for cities loading state
  const handleCitiesLoadingChange = (loading: boolean) => {
    setIsLoadingCities(loading)
  }

  // Combined loading state: stations AND cities must be loaded
  const isLoadingMapData = isLoading || isLoadingCities

  return (
    <SelectedCityProvider>
      <TooltipProvider>
        <div className="flex flex-col h-full overflow-hidden">
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
          showTempoOverlay={showTempoOverlay}
          setShowTempoOverlay={setShowTempoOverlay}
          showCityBoundaries={showCityBoundaries}
          setShowCityBoundaries={setShowCityBoundaries}
          tempoOpacity={tempoOpacity}
          setTempoOpacity={setTempoOpacity}
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

        <div className="flex-1 overflow-hidden flex flex-col lg:flex-row">
          {/* Main Map */}
          <div className="flex-1 lg:w-[65%] relative">
            {/* Loading overlay - Stations, Cities and Fires */}
            {(isLoadingMapData || isLoadingFires) && (
              <div className="absolute inset-0 bg-background/80 backdrop-blur-sm z-[1000] flex items-center justify-center">
                <div className="bg-card rounded-lg shadow-lg p-6 border border-border max-w-sm mx-4">
                  <div className="flex flex-col items-center space-y-4">
                    <div className="relative">
                      <div className="w-16 h-16 border-4 border-primary/20 border-t-primary rounded-full animate-spin"></div>
                      <div className="absolute inset-0 flex items-center justify-center">
                        <span className="text-2xl">{isLoadingFires ? '🔥' : '🗺️'}</span>
                      </div>
                    </div>
                    <div className="text-center space-y-2">
                      <h3 className="font-semibold text-lg">
                        {isLoadingFires ? 'Loading fire data' : 'Loading map data'}
                      </h3>
                      <p className="text-sm text-muted-foreground">
                        {isLoadingFires
                          ? 'Fetching NASA FIRMS information...'
                          : 'Fetching stations and cities...'}
                      </p>
                    </div>
                    <div className="w-full bg-secondary rounded-full h-2 overflow-hidden">
                      <div className="bg-primary h-full rounded-full animate-pulse" style={{ width: '70%' }}></div>
                    </div>
                  </div>
                </div>
              </div>
            )}

            <CaliforniaMap
              className="h-full w-full"
              mapType={mapType}
              onMapTypeChange={(type) => setMapType(type as MapType)}
              showMonitoringStations={showMonitoringStations}
              showActiveFires={showActiveFires}
              showTempoOverlay={showTempoOverlay}
              tempoOpacity={tempoOpacity}
              showCityBoundaries={showCityBoundaries}
              tempoOverlayData={tempoOverlay.overlay ?? null}
              alerts={getActiveAlerts()}
              fires={fires}
              onStationClick={handleStationClick}
              onFireClick={handleFireClick}
              onCitiesLoadingChange={handleCitiesLoadingChange}
            />
          </div>

          {/* TEMPO Sidebar */}
          <div className="h-[400px] lg:h-full lg:w-[35%] border-t lg:border-t-0 lg:border-l border-border">
            <TempoSidebar
              metadata={tempoOverlay.metadata}
              satellite={tempoOverlay.satellite}
              isLoading={tempoOverlay.isLoading}
              error={tempoOverlay.error ? new Error(tempoOverlay.error.message) : null}
              onRefresh={tempoOverlay.refresh}
              onPollutantChange={setCurrentPollutant}
              currentPollutant={currentPollutant}
            />
          </div>
        </div>

      {/* Station Weather Dialog */}
      <StationWeatherDialog
        station={selectedStation}
        open={stationDialogOpen}
        onOpenChange={setStationDialogOpen}
        getAQIColor={getAQIColor}
        getAQICategory={getAQIDetails}
      />

        {/* Fire Dialog */}
        <FireDialog
          fire={selectedFire}
          open={fireDialogOpen}
          onOpenChange={setFireDialogOpen}
        />
        </div>
      </TooltipProvider>
    </SelectedCityProvider>
  )
}

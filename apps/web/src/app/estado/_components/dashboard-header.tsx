import Image from "next/image"
import { TooltipProvider } from "@/components/ui/tooltip"
import { DesktopMetrics } from "./desktop-metrics"
import { MobileMetrics } from "./mobile-metrics"
import { MenubarNavigation } from "./menubar-navigation"

interface DashboardHeaderProps {
  isLoading: boolean
  error: any
  stats: {
    active: number
    total: number
    avgAQI?: number
  } | null
  getAQIColor: (aqi: number) => string
  getAQILevel: (aqi: number) => string
  getAQIDetails: (aqi: number) => {
    emoji: string
    category: string
    description: string
    population: string
    recommendation: string
  }
  setOpenDialog: (dialog: string | null) => void
}

export function DashboardHeader({
  isLoading,
  error,
  stats,
  getAQIColor,
  getAQILevel,
  getAQIDetails,
  setOpenDialog
}: DashboardHeaderProps) {
  return (
    <TooltipProvider>
      <header className="bg-background border-b border-border px-2 py-2 sm:px-4 sm:py-3 z-[10]">
        <div className="flex items-center justify-between gap-2">
          {/* Métricas principales */}
          <div className="flex items-center space-x-2 sm:space-x-4 lg:space-x-6 min-w-0 flex-1">
            {/* Métricas en tiempo real - Desktop */}
            <DesktopMetrics
              isLoading={isLoading}
              error={error}
              stats={stats}
              getAQIColor={getAQIColor}
              getAQILevel={getAQILevel}
              getAQIDetails={getAQIDetails}
            />
          </div>

          {/* Métricas móviles - Componente optimizado */}
          <MobileMetrics
            isLoading={isLoading}
            error={error}
            stats={stats}
            getAQIColor={getAQIColor}
            getAQIDetails={getAQIDetails}
          />

          {/* Menubar con controles organizados - Responsive */}
          <MenubarNavigation setOpenDialog={setOpenDialog} />
        </div>
      </header>
    </TooltipProvider>
  )
}

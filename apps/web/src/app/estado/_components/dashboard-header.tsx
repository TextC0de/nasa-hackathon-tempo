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
              <span className="text-sm font-semibold text-foreground sm:text-base lg:text-lg whitespace-nowrap">AtmOS</span>
            </div>

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

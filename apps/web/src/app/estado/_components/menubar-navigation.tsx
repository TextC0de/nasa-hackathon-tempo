import {
  Menubar,
  MenubarContent,
  MenubarItem,
  MenubarMenu,
  MenubarSeparator,
  MenubarTrigger
} from "@/components/ui/menubar"
import { Tooltip, TooltipContent, TooltipTrigger } from "@/components/ui/tooltip"
import {
  AlertTriangle,
  MapPin,
  Layers,
  Globe,
  Menu,
  Settings,
  BarChart3,
  Calendar
} from "lucide-react"

interface MenubarNavigationProps {
  setOpenDialog: (dialog: string | null) => void
}

export function MenubarNavigation({ setOpenDialog }: MenubarNavigationProps) {
  return (
    <div className="ml-auto flex-shrink-0">
      <Menubar className="border-0 bg-transparent shadow-none">
        {/* Menú Vista */}
        <MenubarMenu>
          <Tooltip>
            <TooltipTrigger asChild>
              <MenubarTrigger className="flex items-center gap-1 sm:gap-2 cursor-help px-1 sm:px-2">
                <Globe className="h-3 w-3 sm:h-4 sm:w-4" />
                <span className="hidden sm:inline text-xs sm:text-sm">Vista</span>
              </MenubarTrigger>
            </TooltipTrigger>
            <TooltipContent side="bottom">
              <p>Opciones de visualización del mapa</p>
            </TooltipContent>
          </Tooltip>
          <MenubarContent>
            <MenubarItem onClick={() => setOpenDialog("location")}>
              <MapPin className="mr-2 h-4 w-4" />
              <span>Ubicación Actual</span>
            </MenubarItem>
            <MenubarItem onClick={() => setOpenDialog("layers")}>
              <Layers className="mr-2 h-4 w-4" />
              <span>Controles de Capas</span>
            </MenubarItem>
            <MenubarSeparator />
            <MenubarItem onClick={() => setOpenDialog("legend")}>
              <BarChart3 className="mr-2 h-4 w-4" />
              <span>Leyenda de Calidad del Aire</span>
            </MenubarItem>
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
              <p>Análisis y métricas de calidad del aire</p>
            </TooltipContent>
          </Tooltip>
          <MenubarContent>
            <MenubarItem onClick={() => setOpenDialog("historical")}>
              <Calendar className="mr-2 h-4 w-4" />
              <span>Datos Históricos</span>
            </MenubarItem>
            <MenubarItem onClick={() => setOpenDialog("metrics")}>
              <BarChart3 className="mr-2 h-4 w-4" />
              <span>Métricas en Tiempo Real</span>
            </MenubarItem>
          </MenubarContent>
        </MenubarMenu>

        {/* Menú Alertas */}
        <MenubarMenu>
          <Tooltip>
            <TooltipTrigger asChild>
              <MenubarTrigger className="flex items-center gap-1 sm:gap-2 cursor-help px-1 sm:px-2">
                <AlertTriangle className="h-3 w-3 sm:h-4 sm:w-4" />
                <span className="hidden sm:inline text-xs sm:text-sm">Alertas</span>
              </MenubarTrigger>
            </TooltipTrigger>
            <TooltipContent side="bottom">
              <p>Alertas y notificaciones de salud</p>
            </TooltipContent>
          </Tooltip>
          <MenubarContent>
            <MenubarItem onClick={() => setOpenDialog("alerts")}>
              <AlertTriangle className="mr-2 h-4 w-4" />
              <span>Alertas de Exposición</span>
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
              <p>Configuración y preferencias</p>
            </TooltipContent>
          </Tooltip>
          <MenubarContent>
            <MenubarItem onClick={() => setOpenDialog("layers")}>
              <Settings className="mr-2 h-4 w-4" />
              <span>Configuración del Mapa</span>
            </MenubarItem>
            <MenubarItem onClick={() => setOpenDialog("preferences")}>
              <Menu className="mr-2 h-4 w-4" />
              <span>Preferencias</span>
            </MenubarItem>
          </MenubarContent>
        </MenubarMenu>
      </Menubar>
    </div>
  )
}

import {
  Menubar,
  MenubarContent,
  MenubarItem,
  MenubarMenu,
  MenubarTrigger
} from "@/components/ui/menubar"
import { Tooltip, TooltipContent, TooltipTrigger } from "@/components/ui/tooltip"
import {
  Layers
} from "lucide-react"

interface MenubarNavigationProps {
  setOpenDialog: (dialog: string | null) => void
}

export function MenubarNavigation({ setOpenDialog }: MenubarNavigationProps) {
  return (
    <div className="ml-auto flex-shrink-0">
      <Menubar className="border-0 bg-transparent shadow-none">
        {/* Control de Capas - Único menú */}
        <MenubarMenu>
          <Tooltip>
            <TooltipTrigger asChild>
              <MenubarTrigger className="flex items-center gap-2 cursor-help px-3 py-2 bg-primary/10 hover:bg-primary/20 rounded-lg transition-colors">
                <Layers className="h-4 w-4" />
                <span className="text-sm font-medium">Capas del Mapa</span>
              </MenubarTrigger>
            </TooltipTrigger>
            <TooltipContent side="bottom">
              <p>Controla las capas visibles en el mapa</p>
            </TooltipContent>
          </Tooltip>
          <MenubarContent>
            <MenubarItem onClick={() => setOpenDialog("layers")}>
              <Layers className="mr-2 h-4 w-4" />
              <span>Controlar Capas</span>
            </MenubarItem>
          </MenubarContent>
        </MenubarMenu>
      </Menubar>
    </div>
  )
}

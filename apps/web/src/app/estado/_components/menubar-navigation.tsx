import { Button } from "@/components/ui/button"
import { Tooltip, TooltipContent, TooltipTrigger } from "@/components/ui/tooltip"
import { Layers } from "lucide-react"

interface MenubarNavigationProps {
  setOpenDialog: (dialog: string | null) => void
}

export function MenubarNavigation({ setOpenDialog }: MenubarNavigationProps) {
  return (
    <div className="ml-auto flex-shrink-0">
      <Tooltip>
        <TooltipTrigger asChild>
          <Button
            variant="ghost"
            onClick={() => setOpenDialog("layers")}
            className="flex items-center gap-2 px-3 py-2 bg-primary/10 hover:bg-primary/20 rounded-lg transition-colors"
          >
            <Layers className="h-4 w-4" />
            <span className="text-sm font-medium">Capas del Mapa</span>
          </Button>
        </TooltipTrigger>
        <TooltipContent side="bottom">
          <p>Controla las capas visibles en el mapa</p>
        </TooltipContent>
      </Tooltip>
    </div>
  )
}

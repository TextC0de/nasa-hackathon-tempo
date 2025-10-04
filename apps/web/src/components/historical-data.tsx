"use client"

import { cn } from "@/lib/utils"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Separator } from "@/components/ui/separator"
import { Badge } from "@/components/ui/badge"

interface HistoricalDataProps {
  className?: string
}

export function HistoricalData({ className }: HistoricalDataProps) {
  return (
    <Card className={cn(className)}>
      <CardHeader>
        <CardTitle>Datos Históricos</CardTitle>
      </CardHeader>
      <CardContent>
        {/* Gráfico usando componentes shadcn/ui */}
        <div className="relative h-40 lg:h-48 space-y-4">
          {/* Líneas de cuadrícula usando Separator */}
          <div className="space-y-4">
            <Separator className="w-full" />
            <Separator className="w-full" />
            <Separator className="w-full" />
            <Separator className="w-full" />
          </div>
          
          {/* Etiqueta del eje Y usando Badge */}
          <div className="absolute -left-4 lg:-left-6 top-1/2 transform -translate-y-1/2 -rotate-90">
            <Badge variant="outline" className="text-xs">
              ICA
            </Badge>
          </div>
          
          {/* Mensaje de estado usando Card */}
          <div className="absolute inset-0 flex items-center justify-center">
            <Card className="bg-muted/50 border-dashed">
              <CardContent className="p-4">
                <Badge variant="secondary" className="text-xs">
                  Gráfico vacío - Esperando datos
                </Badge>
              </CardContent>
            </Card>
          </div>
        </div>
      </CardContent>
    </Card>
  )
}

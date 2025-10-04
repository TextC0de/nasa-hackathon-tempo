"use client"

import { cn } from "@/lib/utils"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"

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
        {/* Gráfico de líneas */}
        <div className="relative h-40 lg:h-48">
          {/* Área del gráfico */}
          <div className="h-full relative">
            {/* Líneas de cuadrícula horizontales */}
            {[0, 1, 2, 3].map((i) => (
              <div
                key={i}
                className="absolute w-full border-t border-border"
                style={{ top: `${i * 25}%` }}
              />
            ))}
            
            {/* Gráfico vacío */}
            <svg
              className="absolute inset-0 w-full h-full"
              viewBox="0 0 100 100"
              preserveAspectRatio="none"
            >
              {/* Solo las líneas de cuadrícula, sin datos */}
            </svg>
            
            {/* Etiqueta del eje Y */}
            <div className="absolute -left-4 lg:-left-6 top-1/2 transform -translate-y-1/2 -rotate-90 text-xs text-muted-foreground">
              ICA
            </div>
          </div>
        </div>
      </CardContent>
    </Card>
  )
}

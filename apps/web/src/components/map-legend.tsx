"use client"

import { useState } from "react"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { ChevronDown, ChevronUp, Info } from "lucide-react"
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog"

const AQI_LEVELS = [
  { range: "0-50", label: "Buena", color: "#22c55e", textColor: "text-green-700" },
  { range: "51-100", label: "Moderada", color: "#eab308", textColor: "text-yellow-700" },
  { range: "101-150", label: "Insalubre (Sensibles)", color: "#f97316", textColor: "text-orange-700" },
  { range: "151-200", label: "Insalubre", color: "#ef4444", textColor: "text-red-700" },
  { range: "201-300", label: "Muy Insalubre", color: "#a855f7", textColor: "text-purple-700" },
  { range: "301-500", label: "Peligrosa", color: "#7f1d1d", textColor: "text-red-900" },
]

const MARKER_SIZES = [
  { population: "< 500K", size: "8px", label: "Pequeña" },
  { population: "500K - 1M", size: "10px", label: "Media" },
  { population: "> 1M", size: "14px", label: "Grande" },
]

export function MapLegend() {
  const [isExpanded, setIsExpanded] = useState(true)

  return (
    <div className="absolute bottom-6 right-6 z-[1000]">
      <Card className="w-64 shadow-lg border-2">
        <CardHeader className="pb-2">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <CardTitle className="text-sm font-semibold">Leyenda</CardTitle>
              <Dialog>
                <DialogTrigger asChild>
                  <Button variant="ghost" size="icon" className="h-6 w-6">
                    <Info className="h-4 w-4" />
                  </Button>
                </DialogTrigger>
                <DialogContent className="max-w-2xl">
                  <DialogHeader>
                    <DialogTitle>Cómo leer este mapa</DialogTitle>
                    <DialogDescription>
                      Guía completa para entender la visualización de calidad del aire
                    </DialogDescription>
                  </DialogHeader>
                  <div className="space-y-4">
                    <div>
                      <h3 className="font-semibold mb-2">🗺️ Polígonos de Ciudades</h3>
                      <p className="text-sm text-muted-foreground">
                        Cada ciudad está representada por un área de influencia coloreada según su nivel de AQI (Índice de Calidad del Aire).
                        Pasa el cursor sobre una ciudad para ver detalles en el panel lateral.
                      </p>
                    </div>

                    <div>
                      <h3 className="font-semibold mb-2">🎨 Colores del AQI</h3>
                      <div className="space-y-1.5">
                        {AQI_LEVELS.map((level) => (
                          <div key={level.range} className="flex items-center gap-2">
                            <div
                              className="w-6 h-6 rounded"
                              style={{ backgroundColor: level.color }}
                            />
                            <span className="text-sm">
                              <span className="font-medium">{level.range}:</span> {level.label}
                            </span>
                          </div>
                        ))}
                      </div>
                    </div>

                    <div>
                      <h3 className="font-semibold mb-2">📍 Tamaños de Marcadores</h3>
                      <p className="text-sm text-muted-foreground mb-2">
                        El tamaño del marcador representa la población de la ciudad:
                      </p>
                      <div className="space-y-1.5">
                        {MARKER_SIZES.map((marker) => (
                          <div key={marker.population} className="flex items-center gap-2">
                            <div
                              className="rounded-full bg-gray-500"
                              style={{
                                width: marker.size,
                                height: marker.size,
                              }}
                            />
                            <span className="text-sm">
                              <span className="font-medium">{marker.population}:</span> Ciudad {marker.label}
                            </span>
                          </div>
                        ))}
                      </div>
                    </div>

                    <div>
                      <h3 className="font-semibold mb-2">🖱️ Interactividad</h3>
                      <ul className="list-disc list-inside text-sm text-muted-foreground space-y-1">
                        <li><strong>Hover:</strong> Ver información rápida de la ciudad</li>
                        <li><strong>Click:</strong> Fijar ciudad para comparación detallada</li>
                        <li><strong>Panel lateral:</strong> Ver recomendaciones y datos completos</li>
                      </ul>
                    </div>

                    <div>
                      <h3 className="font-semibold mb-2">🛰️ Datos Satelitales TEMPO</h3>
                      <p className="text-sm text-muted-foreground">
                        Los datos provienen del satélite TEMPO de NASA, que mide la calidad del aire cada hora
                        con una resolución de ~8km. Los datos se complementan con mediciones terrestres de la red AirNow.
                      </p>
                    </div>
                  </div>
                </DialogContent>
              </Dialog>
            </div>
            <Button
              variant="ghost"
              size="icon"
              className="h-6 w-6"
              onClick={() => setIsExpanded(!isExpanded)}
            >
              {isExpanded ? <ChevronDown className="h-4 w-4" /> : <ChevronUp className="h-4 w-4" />}
            </Button>
          </div>
        </CardHeader>

        {isExpanded && (
          <CardContent className="space-y-3 pb-3">
            {/* Escala de Colores AQI */}
            <div>
              <p className="text-xs font-semibold text-muted-foreground mb-1.5">
                Índice de Calidad del Aire (AQI)
              </p>
              <div className="space-y-1">
                {AQI_LEVELS.map((level) => (
                  <div key={level.range} className="flex items-center gap-2">
                    <div
                      className="w-4 h-4 rounded flex-shrink-0"
                      style={{ backgroundColor: level.color }}
                    />
                    <span className="text-xs flex-1">
                      {level.range}
                    </span>
                    <span className={`text-xs font-medium ${level.textColor}`}>
                      {level.label}
                    </span>
                  </div>
                ))}
              </div>
            </div>

            {/* Tamaño de Marcadores */}
            <div className="pt-2 border-t">
              <p className="text-xs font-semibold text-muted-foreground mb-1.5">
                Tamaño = Población
              </p>
              <div className="flex items-center justify-between gap-2">
                {MARKER_SIZES.map((marker) => (
                  <div key={marker.population} className="flex flex-col items-center gap-1">
                    <div
                      className="rounded-full bg-gray-500"
                      style={{
                        width: marker.size,
                        height: marker.size,
                      }}
                    />
                    <span className="text-[9px] text-muted-foreground text-center leading-tight">
                      {marker.population}
                    </span>
                  </div>
                ))}
              </div>
            </div>

            {/* Nota */}
            <div className="pt-2 border-t">
              <p className="text-[10px] text-muted-foreground italic">
                💡 Haz hover sobre una ciudad para ver detalles
              </p>
            </div>
          </CardContent>
        )}
      </Card>
    </div>
  )
}

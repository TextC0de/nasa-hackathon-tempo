"use client"

import { useState } from "react"
import { CaliforniaMap } from "@/components/california-map"
import { Button } from "@/components/ui/button"
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog"
import { AlertTriangle, MapPin, Layers, ZoomIn, ZoomOut, Globe } from "lucide-react"

// Importar el tipo desde el componente CaliforniaMap
type MapType = "streetmap" | "topographic" | "hybrid" | "physical"

export default function Dashboard() {
  const [mapType, setMapType] = useState<MapType>("streetmap")

  return (
    <div className="min-h-screen bg-background text-foreground">
      <div className="flex h-screen">
        {/* Main Content */}
        <div className="flex-1 flex flex-col overflow-hidden">
          {/* Header con todos los controles */}
          <header className="bg-background border-b border-border px-3 py-2 sm:px-4 sm:py-3">
            <div className="flex items-center justify-between">
              {/* Logo */}
              <div className="flex items-center space-x-2 sm:space-x-3">
                <div className="flex h-6 w-6 items-center justify-center sm:h-8 sm:w-8">
                  <img
                    src="/atmos.svg"
                    alt="AtmOS Logo"
                    className="h-6 w-6 sm:h-8 sm:w-8"
                  />
                </div>
                <span className="text-base font-semibold text-foreground sm:text-lg">AtmOS</span>
              </div>
              
              {/* Controles del mapa en el header */}
              <div className="flex items-center gap-1 sm:gap-2">
                {/* Ubicación actual */}
                <Dialog>
                  <DialogTrigger asChild>
                    <Button variant="outline" size="sm" className="gap-1 sm:gap-2 px-2 sm:px-3">
                      <Globe className="h-3 w-3 sm:h-4 sm:w-4" />
                      <span className="hidden sm:inline">Ubicación</span>
                    </Button>
                  </DialogTrigger>
                  <DialogContent className="max-w-sm z-[10001] mx-4">
                    <DialogHeader>
                      <DialogTitle className="text-sm sm:text-base">Ubicación Actual</DialogTitle>
                    </DialogHeader>
                    <div className="space-y-3">
                      <div className="w-full h-24 bg-gray-100 rounded border flex items-center justify-center">
                        <span className="text-sm text-gray-500">California, USA</span>
                      </div>
                      <div className="text-xs text-muted-foreground">
                        Coordenadas: 36.7783° N, 119.4179° W
                      </div>
                    </div>
                  </DialogContent>
                </Dialog>

                {/* Controles de capas */}
                <Dialog>
                  <DialogTrigger asChild>
                    <Button variant="outline" size="sm" className="gap-1 sm:gap-2 px-2 sm:px-3">
                      <Layers className="h-3 w-3 sm:h-4 sm:w-4" />
                      <span className="hidden sm:inline">Capas</span>
                    </Button>
                  </DialogTrigger>
                  <DialogContent className="max-w-sm z-[10001] mx-4">
                    <DialogHeader>
                      <DialogTitle className="text-sm sm:text-base">Controles de Capas</DialogTitle>
                    </DialogHeader>
                    <div className="space-y-4">
                      <div>
                        <div className="text-xs font-medium text-gray-600 mb-2">Exterior</div>
                        <div className="space-y-2">
                          <label className="flex items-center space-x-2 text-sm">
                            <input type="checkbox" defaultChecked className="rounded w-4 h-4" />
                            <span>Estaciones de calidad del aire</span>
                          </label>
                          <label className="flex items-center space-x-2 text-sm">
                            <input type="checkbox" defaultChecked className="rounded w-4 h-4" />
                            <span>Incendios</span>
                          </label>
                          <label className="flex items-center space-x-2 text-sm">
                            <input type="checkbox" defaultChecked className="rounded w-4 h-4" />
                            <span>Viento</span>
                          </label>
                        </div>
        </div>

                      <div>
                        <div className="text-xs font-medium text-gray-600 mb-2">Interior</div>
                        <div className="space-y-2">
                          <label className="flex items-center space-x-2 text-sm">
                            <input type="checkbox" defaultChecked className="rounded w-4 h-4" />
                            <span>Instalaciones de aire limpio</span>
                          </label>
                          <select className="w-full text-sm border rounded px-2 py-1">
                            <option>Cualquiera</option>
                          </select>
                        </div>
                      </div>
                    </div>
                  </DialogContent>
                </Dialog>

                {/* Controles de zoom */}
                <Dialog>
                  <DialogTrigger asChild>
                    <Button variant="outline" size="sm" className="gap-1 sm:gap-2 px-2 sm:px-3">
                      <ZoomIn className="h-3 w-3 sm:h-4 sm:w-4" />
                      <span className="hidden sm:inline">Zoom</span>
                    </Button>
                  </DialogTrigger>
                  <DialogContent className="max-w-sm z-[10001] mx-4">
                    <DialogHeader>
                      <DialogTitle className="text-sm sm:text-base">Controles de Zoom</DialogTitle>
                    </DialogHeader>
                    <div className="space-y-4">
                      <div className="flex justify-center space-x-2">
                        <Button variant="outline" size="sm" className="w-12 h-12">
                          <ZoomIn className="h-4 w-4" />
                        </Button>
                        <Button variant="outline" size="sm" className="w-12 h-12">
                          <ZoomOut className="h-4 w-4" />
                        </Button>
                      </div>
                      <div className="text-center text-sm text-muted-foreground">
                        Usa los botones o la rueda del mouse para hacer zoom
                      </div>
                    </div>
                  </DialogContent>
                </Dialog>

                {/* Leyenda de calidad del aire */}
                <Dialog>
                  <DialogTrigger asChild>
                    <Button variant="outline" size="sm" className="gap-1 sm:gap-2 px-2 sm:px-3">
                      <MapPin className="h-3 w-3 sm:h-4 sm:w-4" />
                      <span className="hidden sm:inline">Leyenda</span>
                    </Button>
                  </DialogTrigger>
                  <DialogContent className="max-w-sm z-[10001] mx-4">
                    <DialogHeader>
                      <DialogTitle className="text-sm sm:text-base">Índice de Calidad del Aire</DialogTitle>
                    </DialogHeader>
                    <div className="space-y-3">
                      <div className="flex items-center space-x-2">
                        <div className="w-4 h-4 bg-green-500 rounded"></div>
                        <span className="text-sm">Bueno</span>
                      </div>
                      <div className="flex items-center space-x-2">
                        <div className="w-4 h-4 bg-yellow-500 rounded"></div>
                        <span className="text-sm">Moderado</span>
                      </div>
                      <div className="flex items-center space-x-2">
                        <div className="w-4 h-4 bg-orange-500 rounded"></div>
                        <span className="text-sm">Insalubre para grupos sensibles</span>
                      </div>
                      <div className="flex items-center space-x-2">
                        <div className="w-4 h-4 bg-red-500 rounded"></div>
                        <span className="text-sm">Insalubre</span>
                      </div>
                      <div className="flex items-center space-x-2">
                        <div className="w-4 h-4 bg-purple-500 rounded"></div>
                        <span className="text-sm">Muy insalubre</span>
                      </div>
                      <div className="flex items-center space-x-2">
                        <div className="w-4 h-4 bg-red-800 rounded"></div>
                        <span className="text-sm">Peligroso</span>
                      </div>
                    </div>
                  </DialogContent>
                </Dialog>

                {/* Alertas */}
                <Dialog>
                  <DialogTrigger asChild>
                    <Button variant="outline" size="sm" className="gap-1 sm:gap-2 px-2 sm:px-3">
                      <AlertTriangle className="h-3 w-3 sm:h-4 sm:w-4" />
                      <span className="hidden sm:inline">Alertas</span>
                    </Button>
                  </DialogTrigger>
                  <DialogContent className="max-w-sm sm:max-w-2xl z-[10001] mx-4">
                    <DialogHeader>
                      <DialogTitle className="text-sm sm:text-base">Alertas de Exposición</DialogTitle>
                    </DialogHeader>
                    <div className="space-y-3 sm:space-y-4">
                      <div className="p-3 sm:p-4 border rounded-lg bg-yellow-50 border-yellow-200">
                        <h3 className="font-semibold text-yellow-800 text-xs sm:text-sm">Advertencia de Calidad del Aire</h3>
                        <p className="text-xs sm:text-sm text-yellow-700">Nivel moderado detectado en el área norte</p>
                      </div>
                      <div className="p-3 sm:p-4 border rounded-lg bg-green-50 border-green-200">
                        <h3 className="font-semibold text-green-800 text-xs sm:text-sm">Condiciones Normales</h3>
                        <p className="text-xs sm:text-sm text-green-700">Todas las áreas dentro de parámetros seguros</p>
                      </div>
                    </div>
                  </DialogContent>
                </Dialog>
              </div>
            </div>
          </header>
          
          {/* Map Content - Solo el mapa limpio */}
          <main className="flex-1 overflow-hidden">
            <div className="h-full w-full">
              <CaliforniaMap 
                className="h-full w-full" 
                mapType={mapType} 
                onMapTypeChange={(type) => setMapType(type as MapType)}
              />
            </div>
          </main>
        </div>
      </div>
    </div>
  )
}

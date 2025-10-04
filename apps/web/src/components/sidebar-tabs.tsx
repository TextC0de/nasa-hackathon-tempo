"use client"

import { cn } from "@/lib/utils"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { Cloud } from "lucide-react"

interface SidebarTabsProps {
  className?: string
}

export function SidebarTabs({ className }: SidebarTabsProps) {
  return (
    <div className={cn("w-full", className)}>
      <Tabs defaultValue="metrics" className="w-full">
        <TabsList className="grid w-full grid-cols-2">
          <TabsTrigger value="metrics">Métricas</TabsTrigger>
          <TabsTrigger value="forecast">Pronóstico</TabsTrigger>
        </TabsList>
        
        <TabsContent value="metrics" className="space-y-4 mt-4">
          {/* ICA Card */}
          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">ICA</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-2">
                <div className="text-xl lg:text-2xl font-bold">152</div>
                <Badge variant="destructive">Insalubre</Badge>
              </div>
            </CardContent>
          </Card>

          {/* TEMPO Card */}
          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">TEMPO</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-2">
                <div className="text-xl lg:text-2xl font-bold">48 ppb</div>
                <Badge variant="default">Normal</Badge>
              </div>
            </CardContent>
          </Card>

          {/* Weather Card */}
          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Clima</CardTitle>
              <Cloud className="h-5 w-5 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="space-y-2">
                <div className="text-xl lg:text-2xl font-bold">23°C</div>
                <Badge variant="secondary">Nublado</Badge>
              </div>
            </CardContent>
          </Card>

          {/* Datos Históricos */}
          <Card>
            <CardHeader>
              <CardTitle className="text-sm font-medium">Datos Históricos</CardTitle>
            </CardHeader>
            <CardContent>
              {/* Gráfico de líneas */}
              <div className="relative h-32">
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
                  <div className="absolute -left-3 top-1/2 transform -translate-y-1/2 -rotate-90 text-xs text-muted-foreground">
                    ICA
                  </div>
                </div>
              </div>
            </CardContent>
          </Card>
        </TabsContent>
        
        <TabsContent value="forecast" className="space-y-4 mt-4">
          <Card>
            <CardHeader>
              <CardTitle className="text-sm font-medium">Pronóstico Local</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-lg lg:text-xl font-semibold">
                Calidad del Aire Moderada
              </div>
              <div className="mt-2 text-sm text-muted-foreground">
                Se espera una mejora gradual en las próximas 24 horas
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle className="text-sm font-medium">Tendencias</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-2">
                <div className="flex justify-between text-sm">
                  <span>Últimas 6h:</span>
                  <Badge variant="outline">+5%</Badge>
                </div>
                <div className="flex justify-between text-sm">
                  <span>Últimas 24h:</span>
                  <Badge variant="outline">-12%</Badge>
                </div>
                <div className="flex justify-between text-sm">
                  <span>Última semana:</span>
                  <Badge variant="outline">-8%</Badge>
                </div>
              </div>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  )
}

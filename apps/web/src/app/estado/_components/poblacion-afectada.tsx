"use client"

import { trpc } from "@/lib/trpc"
import {
  AccordionItem,
  AccordionTrigger,
  AccordionContent,
} from "@/components/ui/accordion"
import { Users, AlertCircle, MapPin } from "lucide-react"
import { Skeleton } from "@/components/ui/skeleton"
import { Badge } from "@/components/ui/badge"
import { Alert, AlertDescription } from "@/components/ui/alert"
import { ScrollArea } from "@/components/ui/scroll-area"

const getColorClass = (color: string) => {
  const colorMap: Record<string, string> = {
    green: 'bg-green-500',
    yellow: 'bg-yellow-500',
    orange: 'bg-orange-500',
    red: 'bg-red-500',
    purple: 'bg-purple-500',
    maroon: 'bg-red-900',
  }
  return colorMap[color] || 'bg-gray-500'
}

const getBorderColorClass = (color: string) => {
  const colorMap: Record<string, string> = {
    green: 'border-l-green-500',
    yellow: 'border-l-yellow-500',
    orange: 'border-l-orange-500',
    red: 'border-l-red-500',
    purple: 'border-l-purple-500',
    maroon: 'border-l-red-900',
  }
  return colorMap[color] || 'border-l-gray-500'
}

export function PoblacionAfectada() {
  const { data, isLoading, error } = trpc.obtenerPoblacionAfectada.useQuery({})

  if (isLoading) {
    return (
      <AccordionItem value="poblacion" className="border rounded-lg px-4">
        <AccordionTrigger className="hover:no-underline">
          <div className="flex items-center gap-2">
            <Users className="h-4 w-4" />
            <span className="font-semibold">Población Afectada</span>
          </div>
        </AccordionTrigger>
        <AccordionContent className="space-y-2 pt-2 pb-4">
          <Skeleton className="h-20 w-full" />
          <Skeleton className="h-40 w-full" />
        </AccordionContent>
      </AccordionItem>
    )
  }

  if (error) {
    return (
      <AccordionItem value="poblacion" className="border rounded-lg px-4">
        <AccordionTrigger className="hover:no-underline">
          <div className="flex items-center gap-2">
            <Users className="h-4 w-4" />
            <span className="font-semibold">Población Afectada</span>
          </div>
        </AccordionTrigger>
        <AccordionContent className="pt-2 pb-4">
          <Alert variant="destructive">
            <AlertCircle className="h-4 w-4" />
            <AlertDescription className="text-xs">
              Error al cargar datos de población
            </AlertDescription>
          </Alert>
        </AccordionContent>
      </AccordionItem>
    )
  }

  if (!data || data.ciudades.length === 0) {
    return (
      <AccordionItem value="poblacion" className="border rounded-lg px-4">
        <AccordionTrigger className="hover:no-underline">
          <div className="flex items-center gap-2">
            <Users className="h-4 w-4" />
            <span className="font-semibold">Población Afectada</span>
          </div>
        </AccordionTrigger>
        <AccordionContent className="pt-2 pb-4">
          <p className="text-xs text-muted-foreground">
            No hay datos disponibles
          </p>
        </AccordionContent>
      </AccordionItem>
    )
  }

  const { ciudades, estadisticas } = data

  // Calcular porcentajes
  const porcentajes = {
    buena: (estadisticas.buena / estadisticas.poblacionTotal) * 100,
    moderada: (estadisticas.moderada / estadisticas.poblacionTotal) * 100,
    insalubre_sensibles: (estadisticas.insalubre_sensibles / estadisticas.poblacionTotal) * 100,
    insalubre: (estadisticas.insalubre / estadisticas.poblacionTotal) * 100,
    muy_insalubre: (estadisticas.muy_insalubre / estadisticas.poblacionTotal) * 100,
    peligrosa: (estadisticas.peligrosa / estadisticas.poblacionTotal) * 100,
  }

  // Filtrar categorías con población > 0
  const categorias = [
    {
      label: 'Buena',
      color: 'green',
      poblacion: estadisticas.buena,
      porcentaje: porcentajes.buena,
    },
    {
      label: 'Moderada',
      color: 'yellow',
      poblacion: estadisticas.moderada,
      porcentaje: porcentajes.moderada,
    },
    {
      label: 'Insalubre (Sensibles)',
      color: 'orange',
      poblacion: estadisticas.insalubre_sensibles,
      porcentaje: porcentajes.insalubre_sensibles,
    },
    {
      label: 'Insalubre',
      color: 'red',
      poblacion: estadisticas.insalubre,
      porcentaje: porcentajes.insalubre,
    },
    {
      label: 'Muy Insalubre',
      color: 'purple',
      poblacion: estadisticas.muy_insalubre,
      porcentaje: porcentajes.muy_insalubre,
    },
    {
      label: 'Peligrosa',
      color: 'maroon',
      poblacion: estadisticas.peligrosa,
      porcentaje: porcentajes.peligrosa,
    },
  ].filter((cat) => cat.poblacion > 0)

  return (
    <AccordionItem value="poblacion" className="border rounded-lg px-4">
      <AccordionTrigger className="hover:no-underline">
        <div className="flex items-center gap-2">
          <Users className="h-4 w-4" />
          <div className="flex flex-col items-start">
            <span className="font-semibold">Población Afectada</span>
            <span className="text-xs text-muted-foreground font-normal">
              {estadisticas.poblacionTotal.toLocaleString()} personas
            </span>
          </div>
        </div>
      </AccordionTrigger>
      <AccordionContent className="space-y-4 pt-2 pb-4">
        {/* Resumen por categoría */}
        <div className="space-y-2">
          <p className="text-xs font-medium text-muted-foreground">
            Distribución de la calidad del aire:
          </p>
          {categorias.map((cat) => (
            <div
              key={cat.label}
              className="flex items-center justify-between text-xs"
            >
              <div className="flex items-center gap-2">
                <div className={`w-3 h-3 rounded-full ${getColorClass(cat.color)}`} />
                <span>{cat.label}</span>
              </div>
              <div className="flex items-center gap-2">
                <span className="text-muted-foreground">
                  {cat.poblacion.toLocaleString()}
                </span>
                <span className="text-muted-foreground font-mono text-[10px]">
                  ({cat.porcentaje.toFixed(1)}%)
                </span>
              </div>
            </div>
          ))}
        </div>

        {/* Ciudades más afectadas */}
        <div className="space-y-2">
          <p className="text-xs font-medium text-muted-foreground">
            Ciudades principales ({ciudades.length}):
          </p>
          <ScrollArea className="h-48">
            <div className="space-y-1.5 pr-3">
              {ciudades.slice(0, 15).map((ciudad, index) => (
                <div
                  key={`${ciudad.nombre}-${index}`}
                  className={`border-l-4 ${getBorderColorClass(ciudad.color || 'gray')} bg-muted/30 rounded-r p-2`}
                >
                  <div className="flex items-start justify-between gap-2">
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-1.5">
                        <MapPin className="h-3 w-3 shrink-0 text-muted-foreground" />
                        <span className="text-xs font-medium truncate">
                          {ciudad.nombre}
                        </span>
                      </div>
                      <p className="text-[10px] text-muted-foreground mt-0.5">
                        Población: {ciudad.poblacion.toLocaleString()}
                      </p>
                    </div>
                    <div className="flex flex-col items-end shrink-0">
                      <Badge
                        variant="secondary"
                        className={`${getColorClass(ciudad.color || 'gray')} text-white text-xs px-1.5 py-0`}
                      >
                        AQI {ciudad.aqi}
                      </Badge>
                      <span className="text-[9px] text-muted-foreground mt-1">
                        {ciudad.categoria}
                      </span>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </ScrollArea>
        </div>

        {/* Información adicional */}
        <div className="pt-2 border-t">
          <p className="text-[10px] text-muted-foreground">
            💡 <span className="font-medium">Análisis crítico:</span> Las áreas con mayor población y peor calidad del aire requieren atención prioritaria para medidas de salud pública.
          </p>
        </div>
      </AccordionContent>
    </AccordionItem>
  )
}

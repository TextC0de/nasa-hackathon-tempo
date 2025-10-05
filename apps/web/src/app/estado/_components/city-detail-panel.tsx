"use client"

import { useSelectedCity } from "@/hooks/use-selected-city"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { MapPin, Users, Wind } from "lucide-react"
import { motion, AnimatePresence } from "framer-motion"

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

const getColorFromAQI = (aqi: number | null): string => {
  if (!aqi) return 'gray'
  if (aqi <= 50) return 'green'
  if (aqi <= 100) return 'yellow'
  if (aqi <= 150) return 'orange'
  if (aqi <= 200) return 'red'
  if (aqi <= 300) return 'purple'
  return 'maroon'
}

const getRecommendations = (aqi: number | null) => {
  if (!aqi) return []

  if (aqi <= 50) {
    return [
      '✅ Excelente momento para actividades al aire libre',
      '✅ Calidad del aire óptima',
      '✅ Todas las actividades recomendadas'
    ]
  } else if (aqi <= 100) {
    return [
      '⚠️ Grupos sensibles deben considerar reducir exposición prolongada',
      '✅ La mayoría puede realizar actividades normales',
      '👥 Niños y adultos mayores: precaución moderada'
    ]
  } else if (aqi <= 150) {
    return [
      '🚫 Grupos sensibles: evitar ejercicio intenso al aire libre',
      '⚠️ Población general: reducir actividades prolongadas',
      '😷 Considerar uso de mascarilla si es sensible'
    ]
  } else if (aqi <= 200) {
    return [
      '🚫 Evitar ejercicio intenso al aire libre',
      '🏠 Considerar permanecer en interiores',
      '😷 Grupos sensibles deben usar protección',
      '⚠️ Toda la población puede experimentar efectos'
    ]
  } else if (aqi <= 300) {
    return [
      '🚨 Alerta de salud - evitar exposición al aire libre',
      '🏠 Permanecer en interiores con ventanas cerradas',
      '😷 Usar mascarilla si debe salir',
      '⚠️ Efectos graves en grupos sensibles'
    ]
  } else {
    return [
      '🚨 Emergencia de salud - NO salir al exterior',
      '🏠 Permanecer en interiores con purificadores de aire',
      '😷 Mascarilla N95 si debe salir (solo emergencias)',
      '⚠️ Toda la población en riesgo grave'
    ]
  }
}

export function CityDetailPanel() {
  const { hoveredCity, selectedCity } = useSelectedCity()

  // Priorizar ciudad seleccionada sobre ciudad hover
  const activeCity = selectedCity || hoveredCity

  return (
    <AnimatePresence mode="wait">
      {activeCity && (
        <motion.div
          key={activeCity.nombre}
          initial={{ opacity: 0, y: -10 }}
          animate={{ opacity: 1, y: 0 }}
          exit={{ opacity: 0, y: -10 }}
          transition={{ duration: 0.2 }}
          className="mb-4"
        >
          <Card className="border-2 shadow-lg">
            <CardHeader className="pb-3">
              <div className="flex items-start justify-between">
                <div className="flex-1">
                  <div className="flex items-center gap-2 mb-1">
                    <MapPin className="h-4 w-4 text-muted-foreground" />
                    <CardTitle className="text-lg">
                      {activeCity.nombre}
                    </CardTitle>
                    {selectedCity && (
                      <Badge variant="outline" className="text-xs">
                        Fijada
                      </Badge>
                    )}
                  </div>
                  <div className="flex items-center gap-1.5 text-sm text-muted-foreground">
                    <Users className="h-3.5 w-3.5" />
                    <span>{activeCity.poblacion.toLocaleString()} habitantes</span>
                  </div>
                </div>
                {activeCity.aqi && (
                  <Badge
                    className={`${getColorClass(getColorFromAQI(activeCity.aqi))} text-white text-lg px-3 py-1`}
                    variant="default"
                  >
                    AQI {activeCity.aqi}
                  </Badge>
                )}
              </div>
            </CardHeader>
            <CardContent className="space-y-3">
              {/* Categoría */}
              {activeCity.categoria && (
                <div className="flex items-center gap-2">
                  <Wind className="h-4 w-4 text-muted-foreground" />
                  <span className="text-sm font-medium">
                    {activeCity.categoria}
                  </span>
                </div>
              )}

              {/* Barra visual de AQI */}
              {activeCity.aqi && (
                <div className="space-y-1.5">
                  <div className="h-2 bg-muted rounded-full overflow-hidden">
                    <div
                      className={`h-full ${getColorClass(getColorFromAQI(activeCity.aqi))}`}
                      style={{
                        width: `${Math.min((activeCity.aqi / 500) * 100, 100)}%`,
                      }}
                    />
                  </div>
                  <div className="flex justify-between text-xs text-muted-foreground">
                    <span>0</span>
                    <span>50</span>
                    <span>100</span>
                    <span>150</span>
                    <span>200</span>
                    <span>300+</span>
                  </div>
                </div>
              )}

              {/* Recomendaciones */}
              {activeCity.aqi && (
                <div className="pt-2 border-t">
                  <p className="text-xs font-semibold text-muted-foreground mb-2">
                    Recomendaciones:
                  </p>
                  <div className="space-y-1.5">
                    {getRecommendations(activeCity.aqi).map((rec, idx) => (
                      <p key={idx} className="text-xs leading-relaxed">
                        {rec}
                      </p>
                    ))}
                  </div>
                </div>
              )}

              {/* Mensaje si no hay datos de AQI */}
              {!activeCity.aqi && (
                <div className="text-sm text-muted-foreground italic">
                  No hay datos de calidad del aire disponibles para esta ciudad.
                </div>
              )}
            </CardContent>
          </Card>
        </motion.div>
      )}
    </AnimatePresence>
  )
}

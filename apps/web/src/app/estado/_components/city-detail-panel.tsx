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
      '✅ Excellent time for outdoor activities',
      '✅ Optimal air quality',
      '✅ All activities recommended'
    ]
  } else if (aqi <= 100) {
    return [
      '⚠️ Sensitive groups should consider reducing prolonged exposure',
      '✅ Most people can perform normal activities',
      '👥 Children and elderly: moderate caution'
    ]
  } else if (aqi <= 150) {
    return [
      '🚫 Sensitive groups: avoid intense outdoor exercise',
      '⚠️ General population: reduce prolonged activities',
      '😷 Consider wearing mask if sensitive'
    ]
  } else if (aqi <= 200) {
    return [
      '🚫 Avoid intense outdoor exercise',
      '🏠 Consider staying indoors',
      '😷 Sensitive groups should use protection',
      '⚠️ Entire population may experience effects'
    ]
  } else if (aqi <= 300) {
    return [
      '🚨 Health alert - avoid outdoor exposure',
      '🏠 Stay indoors with windows closed',
      '😷 Wear mask if you must go out',
      '⚠️ Serious effects on sensitive groups'
    ]
  } else {
    return [
      '🚨 Health emergency - DO NOT go outside',
      '🏠 Stay indoors with air purifiers',
      '😷 N95 mask if you must go out (emergencies only)',
      '⚠️ Entire population at serious risk'
    ]
  }
}

export function CityDetailPanel() {
  const { hoveredCity, selectedCity } = useSelectedCity()

  // Prioritize selected city over hovered city
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
                        Pinned
                      </Badge>
                    )}
                  </div>
                  <div className="flex items-center gap-1.5 text-sm text-muted-foreground">
                    <Users className="h-3.5 w-3.5" />
                    <span>{activeCity.poblacion.toLocaleString()} inhabitants</span>
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
              {/* Category */}
              {activeCity.categoria && (
                <div className="flex items-center gap-2">
                  <Wind className="h-4 w-4 text-muted-foreground" />
                  <span className="text-sm font-medium">
                    {activeCity.categoria}
                  </span>
                </div>
              )}

              {/* AQI visual bar */}
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

              {/* Recommendations */}
              {activeCity.aqi && (
                <div className="pt-2 border-t">
                  <p className="text-xs font-semibold text-muted-foreground mb-2">
                    Recommendations:
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

              {/* Message if no AQI data */}
              {!activeCity.aqi && (
                <div className="text-sm text-muted-foreground italic">
                  No air quality data available for this city.
                </div>
              )}
            </CardContent>
          </Card>
        </motion.div>
      )}
    </AnimatePresence>
  )
}

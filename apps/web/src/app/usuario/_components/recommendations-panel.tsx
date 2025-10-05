"use client"

import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert"
import {
  AlertCircle,
  CheckCircle2,
  Info,
  AlertTriangle,
  XCircle,
  Activity,
  Heart,
  Home,
  Bike
} from "lucide-react"
import {
  getRecommendations,
  getAQIExplanation,
  getCategorizedRecommendations,
  getSeverityColor,
  type Recommendation
} from "@/lib/recommendations"

interface RecommendationsPanelProps {
  aqi: number
  dominantPollutant?: string
  category?: string
  className?: string
}

/**
 * Panel de Recomendaciones Inteligente
 *
 * Muestra recomendaciones personalizadas según el nivel de AQI
 * de forma visual, clara y fácil de entender
 */
export function RecommendationsPanel({
  aqi,
  dominantPollutant,
  category,
  className
}: RecommendationsPanelProps) {
  const explanation = getAQIExplanation(aqi)
  const categorized = getCategorizedRecommendations(aqi, dominantPollutant)

  // Obtener icono según severidad
  const getSeverityIcon = (severity: Recommendation['severity']) => {
    const icons = {
      success: <CheckCircle2 className="h-5 w-5 text-green-600" />,
      info: <Info className="h-5 w-5 text-blue-600" />,
      warning: <AlertTriangle className="h-5 w-5 text-orange-600" />,
      danger: <XCircle className="h-5 w-5 text-red-600" />,
      critical: <AlertCircle className="h-5 w-5 text-purple-600" />
    }
    return icons[severity]
  }

  // Obtener icono de categoría
  const getCategoryIcon = (cat: string) => {
    const icons = {
      health: <Heart className="h-4 w-4" />,
      activity: <Bike className="h-4 w-4" />,
      safety: <AlertCircle className="h-4 w-4" />,
      general: <Home className="h-4 w-4" />
    }
    return icons[cat as keyof typeof icons] || <Info className="h-4 w-4" />
  }

  return (
    <div className={className}>
      {/* Explicación Principal del AQI */}
      <Card className="border-2 shadow-lg">
        <CardHeader className="pb-4">
          <div className="flex items-center justify-between">
            <CardTitle className="text-xl flex items-center gap-2">
              <span className="text-3xl">{explanation.emoji}</span>
              <div>
                <div className="text-2xl font-bold">{explanation.level}</div>
                <CardDescription className="text-sm mt-1">
                  {explanation.shortDescription}
                </CardDescription>
              </div>
            </CardTitle>
            <Badge
              variant="outline"
              className={`text-lg px-4 py-2 font-bold ${
                aqi <= 50 ? 'bg-green-100 text-green-800 border-green-300' :
                aqi <= 100 ? 'bg-yellow-100 text-yellow-800 border-yellow-300' :
                aqi <= 150 ? 'bg-orange-100 text-orange-800 border-orange-300' :
                aqi <= 200 ? 'bg-red-100 text-red-800 border-red-300' :
                aqi <= 300 ? 'bg-purple-100 text-purple-800 border-purple-300' :
                'bg-maroon-100 text-maroon-800 border-maroon-300'
              }`}
            >
              AQI {aqi}
            </Badge>
          </div>
        </CardHeader>
        <CardContent>
          <p className="text-base text-muted-foreground leading-relaxed">
            {explanation.detailedDescription}
          </p>

          {explanation.affectedGroups && explanation.affectedGroups.length > 0 && (
            <div className="mt-4 p-3 bg-muted/50 rounded-lg">
              <p className="text-sm font-semibold mb-2 flex items-center gap-2">
                <Activity className="h-4 w-4" />
                Grupos que deben tener precaución:
              </p>
              <div className="flex flex-wrap gap-2">
                {explanation.affectedGroups.map((group, idx) => (
                  <Badge
                    key={idx}
                    variant="secondary"
                    className="text-xs"
                  >
                    {group}
                  </Badge>
                ))}
              </div>
            </div>
          )}

          {dominantPollutant && (
            <div className="mt-3 text-sm text-muted-foreground flex items-center gap-2">
              <Activity className="h-4 w-4" />
              <span>
                <strong>Contaminante principal:</strong> {dominantPollutant}
              </span>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Recomendaciones */}
      <Card className="mt-4">
        <CardHeader>
          <CardTitle className="text-lg">¿Qué debo hacer?</CardTitle>
          <CardDescription>
            Recomendaciones personalizadas para mantenerte saludable
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-3">
          {categorized.all.length === 0 ? (
            <p className="text-sm text-muted-foreground text-center py-8">
              No hay recomendaciones especiales para este nivel de AQI
            </p>
          ) : (
            categorized.all.map((rec) => (
              <Alert
                key={rec.id}
                className={`${getSeverityColor(rec.severity)} border-2`}
              >
                <div className="gap-3 w-full">
                  <div className="flex-shrink-0 mt-0.5 flex items-center gap-2 pb-2">
                    {getSeverityIcon(rec.severity)}
                      <span className="font-semibold text-sm">{rec.title}</span>
                  </div>
                  <div className="flex-1 min-w-0">
                    <AlertDescription className="text-sm">
                      {rec.description}
                    </AlertDescription>
                  </div>
                </div>
              </Alert>
            ))
          )}
        </CardContent>
      </Card>

      {/* Nota educativa */}
      <Card className="mt-4 bg-blue-50 dark:bg-blue-950 border-blue-200">
        <CardContent className="pt-4">
          <div className="flex gap-3">
            <Info className="h-5 w-5 text-blue-600 flex-shrink-0 mt-0.5" />
            <div className="text-sm text-blue-900 dark:text-blue-100">
              <p className="font-semibold mb-1">💡 ¿Cómo se calcula el AQI?</p>
              <p className="text-xs leading-relaxed">
                El Índice de Calidad del Aire (AQI) combina múltiples contaminantes (O3, NO2, PM2.5, etc.)
                en un solo número fácil de entender. Un AQI más alto significa mayor contaminación y mayor
                riesgo para la salud. Los datos provienen de estaciones terrestres EPA combinados con mediciones
                satelitales NASA TEMPO.
              </p>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  )
}

/**
 * Versión compacta del panel de recomendaciones (para vista móvil)
 */
export function RecommendationsPanelCompact({
  aqi,
  dominantPollutant,
  className
}: RecommendationsPanelProps) {
  const explanation = getAQIExplanation(aqi)
  const recommendations = getRecommendations(aqi, dominantPollutant).slice(0, 3) // Solo top 3

  return (
    <div className={className}>
      <Card className="border-2">
        <CardHeader className="pb-3">
          <div className="flex items-center gap-2">
            <span className="text-2xl">{explanation.emoji}</span>
            <div className="flex-1 min-w-0">
              <CardTitle className="text-base truncate">{explanation.level}</CardTitle>
              <CardDescription className="text-xs truncate">
                {explanation.shortDescription}
              </CardDescription>
            </div>
            <Badge
              variant="outline"
              className={`text-sm px-2 py-1 font-bold ${
                aqi <= 50 ? 'bg-green-100 text-green-800' :
                aqi <= 100 ? 'bg-yellow-100 text-yellow-800' :
                aqi <= 150 ? 'bg-orange-100 text-orange-800' :
                aqi <= 200 ? 'bg-red-100 text-red-800' :
                aqi <= 300 ? 'bg-purple-100 text-purple-800' :
                'bg-maroon-100 text-maroon-800'
              }`}
            >
              {aqi}
            </Badge>
          </div>
        </CardHeader>
        <CardContent className="space-y-2">
          {recommendations.map((rec) => (
            <div
              key={rec.id}
              className={`p-2 rounded-lg border ${getSeverityColor(rec.severity)}`}
            >
              <p className="text-xs font-semibold mb-0.5 flex items-center gap-1">
                <span>{rec.icon}</span>
                {rec.title}
              </p>
              <p className="text-xs opacity-90">
                {rec.description}
              </p>
            </div>
          ))}
        </CardContent>
      </Card>
    </div>
  )
}

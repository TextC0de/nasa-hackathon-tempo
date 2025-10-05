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
 * Smart Recommendations Panel
 *
 * Shows personalized recommendations based on AQI level
 * in a visual, clear, and easy-to-understand way
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
      <div className="pb-6">
        <div className="flex items-center justify-between mb-4">
          <div className="flex items-center gap-3">
            <span className="text-3xl">{explanation.emoji}</span>
            <div>
              <div className="text-2xl font-bold">{explanation.level}</div>
              <p className="text-sm text-muted-foreground mt-1">
                {explanation.shortDescription}
              </p>
            </div>
          </div>
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

        <p className="text-base text-muted-foreground leading-relaxed">
          {explanation.detailedDescription}
        </p>

        {explanation.affectedGroups && explanation.affectedGroups.length > 0 && (
          <div className="mt-4 p-3 bg-muted/50 rounded-lg">
            <p className="text-sm font-semibold mb-2 flex items-center gap-2">
              <Activity className="h-4 w-4" />
              Groups that should take precaution:
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
              <strong>Main pollutant:</strong> {dominantPollutant}
            </span>
          </div>
        )}
      </div>
      <div className="-mx-6 border-b"></div>

      {/* Recommendations */}
      <div className="py-6">
        <div className="mb-4">
          <h3 className="text-lg font-semibold">What should I do?</h3>
          <p className="text-sm text-muted-foreground">
            Personalized recommendations to keep you healthy
          </p>
        </div>

        <div className="space-y-3">
          {categorized.all.length === 0 ? (
            <p className="text-sm text-muted-foreground text-center py-8">
              No special recommendations for this AQI level
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
        </div>
      </div>
      <div className="-mx-6 border-b"></div>

      {/* Educational note */}
      <div className="py-6 bg-blue-50 dark:bg-blue-950 -mx-6 px-6 -mb-6">
        <div className="flex gap-3">
          <Info className="h-5 w-5 text-blue-600 flex-shrink-0 mt-0.5" />
          <div className="text-sm text-blue-900 dark:text-blue-100">
            <p className="font-semibold mb-1">💡 How is AQI calculated?</p>
            <p className="text-xs leading-relaxed">
              The Air Quality Index (AQI) combines multiple pollutants (O3, NO2, PM2.5, etc.)
              into a single easy-to-understand number. A higher AQI means more pollution and greater
              health risk. Data comes from EPA ground stations combined with NASA TEMPO
              satellite measurements.
            </p>
          </div>
        </div>
      </div>
    </div>
  )
}

/**
 * Compact version of recommendations panel (for mobile view)
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

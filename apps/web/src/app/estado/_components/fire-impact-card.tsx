import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Alert, AlertDescription } from "@/components/ui/alert"
import { AlertTriangle, CheckCircle, Info, TrendingDown, TrendingUp, Minus } from "lucide-react"

interface FireImpactCardProps {
  impact?: {
    baselineAvg: number | null
    currentValue: number | null
    peakValue: number | null
    currentIncrease: string
    peakIncrease: string
    trend: 'improving' | 'worsening' | 'stable'
    unit: string
  }
  interpretation?: {
    status: string
    recommendation: string
    alertLevel: 'low' | 'moderate' | 'high' | 'critical'
    pollutant: string
  }
  fireInfo?: {
    detectionTimeLocal: string
    frp: number
  }
  isLoading?: boolean
}

export function FireImpactCard({
  impact,
  interpretation,
  fireInfo,
  isLoading = false,
}: FireImpactCardProps) {
  if (isLoading) {
    return (
      <Card>
        <CardHeader>
          <CardTitle>Air Quality Impact Analysis</CardTitle>
          <CardDescription>Loading data...</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="space-y-3">
            <div className="h-16 bg-muted animate-pulse rounded" />
            <div className="h-24 bg-muted animate-pulse rounded" />
          </div>
        </CardContent>
      </Card>
    )
  }

  if (!impact || !interpretation) {
    return (
      <Card>
        <CardHeader>
          <CardTitle>Air Quality Impact Analysis</CardTitle>
          <CardDescription>No data available</CardDescription>
        </CardHeader>
        <CardContent>
          <Alert>
            <Info className="h-4 w-4" />
            <AlertDescription>
              Could not obtain pollution data for this fire.
              This may be because the fire is outside TEMPO coverage range
              or there are no recent measurements available.
            </AlertDescription>
          </Alert>
        </CardContent>
      </Card>
    )
  }

  // Determine colors and styles based on alert level
  const alertLevelConfig = {
    low: {
      color: 'text-green-700 dark:text-green-400',
      bgColor: 'bg-green-100 dark:bg-green-900/20',
      badgeVariant: 'default' as const,
      icon: CheckCircle,
    },
    moderate: {
      color: 'text-yellow-700 dark:text-yellow-400',
      bgColor: 'bg-yellow-100 dark:bg-yellow-900/20',
      badgeVariant: 'default' as const,
      icon: Info,
    },
    high: {
      color: 'text-orange-700 dark:text-orange-400',
      bgColor: 'bg-orange-100 dark:bg-orange-900/20',
      badgeVariant: 'destructive' as const,
      icon: AlertTriangle,
    },
    critical: {
      color: 'text-red-700 dark:text-red-400',
      bgColor: 'bg-red-100 dark:bg-red-900/20',
      badgeVariant: 'destructive' as const,
      icon: AlertTriangle,
    },
  }

  const config = alertLevelConfig[interpretation.alertLevel]
  const Icon = config.icon

  // Trend icon
  const TrendIcon = impact.trend === 'improving' ? TrendingDown : impact.trend === 'worsening' ? TrendingUp : Minus
  const trendColor = impact.trend === 'improving' ? 'text-green-600' : impact.trend === 'worsening' ? 'text-red-600' : 'text-gray-600'

  return (
    <Card>
      <CardHeader>
        <div className="flex items-center justify-between">
          <div>
            <CardTitle>Air Quality Impact</CardTitle>
            <CardDescription>
              {interpretation.pollutant} since fire detection
            </CardDescription>
          </div>
          <Badge variant={config.badgeVariant} className="text-xs">
            {interpretation.alertLevel.toUpperCase()}
          </Badge>
        </div>
      </CardHeader>
      <CardContent className="space-y-4">
        {/* Current Status - Large and Prominent */}
        <div className={`${config.bgColor} rounded-lg p-4 border-2 ${config.color.replace('text-', 'border-')}`}>
          <div className="flex items-start gap-3">
            <Icon className={`h-6 w-6 ${config.color} flex-shrink-0 mt-1`} />
            <div className="flex-1">
              <div className="flex items-center gap-2 mb-2">
                <span className="text-4xl font-bold">{impact.currentIncrease}%</span>
                <TrendIcon className={`h-6 w-6 ${trendColor}`} />
              </div>
              <p className={`font-medium ${config.color}`}>
                {interpretation.status}
              </p>
              {fireInfo && (
                <p className="text-sm text-muted-foreground mt-1">
                  Fire detected: {fireInfo.detectionTimeLocal}
                </p>
              )}
            </div>
          </div>
        </div>

        {/* Detailed Metrics */}
        <div className="grid grid-cols-2 gap-3 text-sm">
          <div className="p-3 bg-muted/30 rounded-lg">
            <div className="text-muted-foreground mb-1">Pollution peak</div>
            <div className="font-semibold text-lg">+{impact.peakIncrease}%</div>
          </div>
          <div className="p-3 bg-muted/30 rounded-lg">
            <div className="text-muted-foreground mb-1">Trend</div>
            <div className={`font-semibold text-lg ${trendColor} flex items-center gap-1`}>
              <TrendIcon className="h-4 w-4" />
              {impact.trend === 'improving' ? 'Improving' : impact.trend === 'worsening' ? 'Worsening' : 'Stable'}
            </div>
          </div>
          {impact.baselineAvg !== null && (
            <div className="p-3 bg-muted/30 rounded-lg">
              <div className="text-muted-foreground mb-1">Baseline (before)</div>
              <div className="font-semibold text-sm truncate">
                {(impact.baselineAvg / 1e15).toFixed(2)} × 10¹⁵
              </div>
            </div>
          )}
          {impact.currentValue !== null && (
            <div className="p-3 bg-muted/30 rounded-lg">
              <div className="text-muted-foreground mb-1">Now</div>
              <div className="font-semibold text-sm truncate">
                {(impact.currentValue / 1e15).toFixed(2)} × 10¹⁵
              </div>
            </div>
          )}
        </div>

        {/* Recommendation */}
        <Alert className={`border-2 ${config.color.replace('text-', 'border-')}`}>
          <Icon className={`h-4 w-4 ${config.color}`} />
          <AlertDescription className={config.color}>
            <strong>Recommendation:</strong> {interpretation.recommendation}
          </AlertDescription>
        </Alert>

        {/* Additional fire info */}
        {fireInfo && fireInfo.frp > 0 && (
          <div className="text-xs text-muted-foreground border-t pt-3">
            <div className="flex justify-between">
              <span>Radiative power (FRP):</span>
              <span className="font-medium">{fireInfo.frp.toFixed(1)} MW</span>
            </div>
            {fireInfo.frp > 100 && (
              <p className="mt-1 text-orange-600 dark:text-orange-400">
                ⚠️ High intensity fire
              </p>
            )}
          </div>
        )}
      </CardContent>
    </Card>
  )
}

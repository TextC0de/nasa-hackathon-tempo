"use client"

import { Card, CardContent } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { 
  Activity, 
  Thermometer, 
  Droplets, 
  Wind, 
  Eye, 
  TrendingUp,
  TrendingDown,
  Minus,
  AlertTriangle,
  CheckCircle
} from "lucide-react"
import { motion } from "framer-motion"
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip"

interface MetricsCardsProps {
  prediction: any
  isLoading: boolean
  onDialogOpen: (dialog: string) => void
  getAQIColor: (aqi: number) => string
}

export function MetricsCards({ prediction, isLoading, onDialogOpen, getAQIColor }: MetricsCardsProps) {
  const getTrendIcon = (trend: string) => {
    switch (trend?.toLowerCase()) {
      case 'up':
      case 'increasing':
        return <TrendingUp className="h-4 w-4 text-red-500" />
      case 'down':
      case 'decreasing':
        return <TrendingDown className="h-4 w-4 text-green-500" />
      default:
        return <Minus className="h-4 w-4 text-gray-500" />
    }
  }

  const getAQIStatus = (aqi: number) => {
    if (aqi <= 50) return { 
      status: "Excelente", 
      icon: <CheckCircle className="h-4 w-4 text-green-500" />,
      bgColor: "bg-green-50",
      borderColor: "border-green-200",
      textColor: "text-green-700"
    }
    if (aqi <= 100) return { 
      status: "Buena", 
      icon: <CheckCircle className="h-4 w-4 text-green-500" />,
      bgColor: "bg-green-50",
      borderColor: "border-green-200",
      textColor: "text-green-700"
    }
    if (aqi <= 150) return { 
      status: "Moderada", 
      icon: <AlertTriangle className="h-4 w-4 text-yellow-500" />,
      bgColor: "bg-yellow-50",
      borderColor: "border-yellow-200",
      textColor: "text-yellow-700"
    }
    if (aqi <= 200) return { 
      status: "No saludable", 
      icon: <AlertTriangle className="h-4 w-4 text-orange-500" />,
      bgColor: "bg-orange-50",
      borderColor: "border-orange-200",
      textColor: "text-orange-700"
    }
    return { 
      status: "Peligroso", 
      icon: <AlertTriangle className="h-4 w-4 text-red-500" />,
      bgColor: "bg-red-50",
      borderColor: "border-red-200",
      textColor: "text-red-700"
    }
  }

  const aqiStatus = prediction?.general?.aqi ? getAQIStatus(prediction.general.aqi) : null

  const metrics = [
    {
      title: "AQI General",
      value: prediction?.general?.aqi || "---",
      unit: "",
      icon: <Activity className="h-5 w-5" />,
      color: prediction?.general?.aqi ? getAQIColor(prediction.general.aqi) : "text-gray-500",
      bgColor: aqiStatus?.bgColor || "bg-gray-50",
      borderColor: aqiStatus?.borderColor || "border-gray-200",
      status: aqiStatus?.status,
      statusIcon: aqiStatus?.icon,
      trend: prediction?.general?.trend,
      description: "Índice de Calidad del Aire"
    },
    {
      title: "PM2.5",
      value: prediction?.pm25?.concentration || "---",
      unit: "μg/m³",
      icon: <Droplets className="h-5 w-5" />,
      color: prediction?.pm25?.aqi ? getAQIColor(prediction.pm25.aqi) : "text-gray-500",
      bgColor: "bg-blue-50",
      borderColor: "border-blue-200",
      trend: prediction?.pm25?.trend,
      description: "Partículas finas"
    },
    {
      title: "PM10",
      value: prediction?.pm10?.concentration || "---",
      unit: "μg/m³",
      icon: <Eye className="h-5 w-5" />,
      color: prediction?.pm10?.aqi ? getAQIColor(prediction.pm10.aqi) : "text-gray-500",
      bgColor: "bg-purple-50",
      borderColor: "border-purple-200",
      trend: prediction?.pm10?.trend,
      description: "Partículas gruesas"
    },
    {
      title: "NO₂",
      value: prediction?.no2?.concentration || "---",
      unit: "ppb",
      icon: <Wind className="h-5 w-5" />,
      color: prediction?.no2?.aqi ? getAQIColor(prediction.no2.aqi) : "text-gray-500",
      bgColor: "bg-orange-50",
      borderColor: "border-orange-200",
      trend: prediction?.no2?.trend,
      description: "Dióxido de nitrógeno"
    }
  ]

  return (
    <TooltipProvider>
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.5, delay: 0.2 }}
        className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4"
      >
        {metrics.map((metric, index) => (
          <motion.div
            key={metric.title}
            initial={{ opacity: 0, scale: 0.9 }}
            animate={{ opacity: 1, scale: 1 }}
            transition={{ duration: 0.3, delay: 0.3 + index * 0.1 }}
          >
            <Tooltip>
              <TooltipTrigger asChild>
                <Card className={`${metric.bgColor} ${metric.borderColor} border-2 hover:shadow-lg transition-all duration-200 cursor-pointer group`}>
                  <CardContent className="p-4">
                    <div className="flex items-center justify-between mb-3">
                      <div className="flex items-center gap-2">
                        <div className={`p-2 rounded-lg ${metric.bgColor} group-hover:scale-110 transition-transform duration-200`}>
                          {metric.icon}
                        </div>
                        <div>
                          <h3 className="font-semibold text-gray-900 text-sm">{metric.title}</h3>
                          {metric.description && (
                            <p className="text-xs text-gray-600">{metric.description}</p>
                          )}
                        </div>
                      </div>
                      {metric.statusIcon && (
                        <div className="flex items-center gap-1">
                          {metric.statusIcon}
                          {metric.status && (
                            <span className="text-xs font-medium text-gray-700">
                              {metric.status}
                            </span>
                          )}
                        </div>
                      )}
                    </div>
                    
                    <div className="space-y-2">
                      <div className="flex items-baseline gap-2">
                        <span className={`text-2xl font-bold ${metric.color}`}>
                          {isLoading ? "---" : metric.value}
                        </span>
                        {metric.unit && (
                          <span className="text-sm text-gray-600">{metric.unit}</span>
                        )}
                      </div>
                      
                      {metric.trend && (
                        <div className="flex items-center gap-1">
                          {getTrendIcon(metric.trend)}
                          <span className="text-xs text-gray-600 capitalize">
                            {metric.trend}
                          </span>
                        </div>
                      )}
                    </div>
                  </CardContent>
                </Card>
              </TooltipTrigger>
              <TooltipContent>
                <p>Click para ver detalles completos</p>
              </TooltipContent>
            </Tooltip>
          </motion.div>
        ))}
      </motion.div>
    </TooltipProvider>
  )
}

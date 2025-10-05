"use client"

import { Card, CardContent } from "@/components/ui/card"
import { 
  Activity, 
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
    }
  ]

  return (
    <TooltipProvider>
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.5, delay: 0.2 }}
        className="flex justify-center"
      >
        {metrics.map((metric, index) => (
          <motion.div
            key={metric.title}
            initial={{ opacity: 0, scale: 0.9 }}
            animate={{ opacity: 1, scale: 1 }}
            transition={{ duration: 0.3, delay: 0.3 + index * 0.1 }}
            className="w-full max-w-lg"
          >
            <Tooltip>
              <TooltipTrigger asChild>
                <Card className="relative overflow-hidden bg-gradient-to-br from-white via-gray-50 to-blue-50 border-0 shadow-xl hover:shadow-2xl transition-all duration-300 cursor-pointer group">
                  {/* Efectos de fondo decorativos */}
                  <div className="absolute inset-0 bg-gradient-to-r from-blue-500/5 to-green-500/5" />
                  <div className="absolute top-0 right-0 w-24 h-24 bg-gradient-to-bl from-blue-500/10 to-transparent rounded-full -translate-y-12 translate-x-12" />
                  <div className="absolute bottom-0 left-0 w-20 h-20 bg-gradient-to-tr from-green-500/10 to-transparent rounded-full translate-y-10 -translate-x-10" />
                  
                  <CardContent className="relative p-6">
                    {/* Header */}
                    <div className="flex items-center justify-between mb-6">
                      <div className="flex items-center gap-4">
                        <div className="p-3 rounded-xl bg-gradient-to-br from-blue-500 to-blue-600 text-white shadow-lg group-hover:scale-110 group-hover:rotate-3 transition-all duration-300">
                          {metric.icon}
                        </div>
                        <div>
                          <h3 className="text-lg font-bold text-gray-900 group-hover:text-blue-700 transition-colors duration-200">
                            {metric.title}
                          </h3>
                          {metric.description && (
                            <p className="text-sm text-gray-600 mt-1">{metric.description}</p>
                          )}
                        </div>
                      </div>
                      
                      {metric.statusIcon && (
                        <div className="flex items-center gap-2 px-3 py-2 rounded-full bg-white/80 backdrop-blur-sm shadow-sm">
                          {metric.statusIcon}
                          {metric.status && (
                            <span className="text-sm font-semibold text-gray-700">
                              {metric.status}
                            </span>
                          )}
                        </div>
                      )}
                    </div>
                    
                    {/* Valor principal */}
                    <div className="text-center space-y-3">
                      <div className="flex items-center justify-center gap-3">
                        <span className={`text-5xl font-bold ${metric.color} drop-shadow-sm`}>
                          {isLoading ? (
                            <div className="animate-pulse bg-gray-300 rounded-lg h-12 w-20"></div>
                          ) : (
                            metric.value
                          )}
                        </span>
                        {metric.unit && (
                          <span className="text-lg text-gray-600 font-medium">{metric.unit}</span>
                        )}
                      </div>
                      
                      {/* Trend indicator */}
                      {metric.trend && (
                        <div className="flex items-center justify-center gap-2 px-4 py-2 rounded-full bg-white/60 backdrop-blur-sm border border-white/50 shadow-sm">
                          {getTrendIcon(metric.trend)}
                          <span className="text-sm font-medium text-gray-700 capitalize">
                            {metric.trend}
                          </span>
                        </div>
                      )}
                      
                      {/* Loading indicator */}
                      {isLoading && (
                        <div className="flex items-center justify-center gap-2 text-blue-600">
                          <div className="animate-spin rounded-full h-4 w-4 border-2 border-blue-600 border-t-transparent" />
                          <span className="text-sm font-medium">Actualizando datos...</span>
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

"use client"

import { Card, CardContent } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { 
  Sun, 
  Cloud, 
  Wind, 
  Thermometer, 
  Droplets, 
  Eye,
  Activity,
  MapPin,
  Clock,
  TrendingUp
} from "lucide-react"
import { motion } from "framer-motion"

interface WelcomeCardProps {
  currentLocation: { name: string; lat: number; lng: number }
  prediction: any
  isLoading: boolean
  onDialogOpen: (dialog: string) => void
  getAQIColor: (aqi: number) => string
  getAQILevel: (aqi: number) => string
}

export function WelcomeCard({ 
  currentLocation, 
  prediction, 
  isLoading, 
  onDialogOpen,
  getAQIColor,
  getAQILevel 
}: WelcomeCardProps) {
  const getWeatherIcon = (condition: string) => {
    switch (condition?.toLowerCase()) {
      case 'sunny':
      case 'clear':
        return <Sun className="h-6 w-6 text-yellow-500" />
      case 'cloudy':
      case 'overcast':
        return <Cloud className="h-6 w-6 text-gray-500" />
      default:
        return <Eye className="h-6 w-6 text-blue-500" />
    }
  }

  const getHealthRecommendation = (aqi: number) => {
    if (aqi <= 50) return { text: "Excellent air quality", color: "text-green-600", icon: "😊" }
    if (aqi <= 100) return { text: "Good air quality", color: "text-green-500", icon: "😌" }
    if (aqi <= 150) return { text: "Moderate quality", color: "text-yellow-500", icon: "😐" }
    if (aqi <= 200) return { text: "Unhealthy for sensitive groups", color: "text-orange-500", icon: "😷" }
    if (aqi <= 300) return { text: "Unhealthy", color: "text-red-500", icon: "😷" }
    return { text: "Hazardous", color: "text-red-600", icon: "⚠️" }
  }

  const recommendation = prediction?.general?.aqi ? getHealthRecommendation(prediction.general.aqi) : null

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.5 }}
    >
      <Card className="relative overflow-hidden bg-gradient-to-br from-blue-50 via-white to-green-50 border-0 shadow-lg">
        {/* Decorative background */}
        <div className="absolute inset-0 bg-gradient-to-r from-blue-500/5 to-green-500/5" />
        <div className="absolute top-0 right-0 w-32 h-32 bg-gradient-to-bl from-blue-500/10 to-transparent rounded-full -translate-y-16 translate-x-16" />
        <div className="absolute bottom-0 left-0 w-24 h-24 bg-gradient-to-tr from-green-500/10 to-transparent rounded-full translate-y-12 -translate-x-12" />

        <CardContent className="relative p-6">
          <div className="flex flex-col lg:flex-row lg:items-center lg:justify-between gap-6">
            {/* Main information */}
            <div className="flex-1 space-y-4">
              {/* Greeting and location */}
              <div className="space-y-2">
                <div className="flex items-center gap-2">
                  <h1 className="text-2xl font-bold text-gray-900">
                    Hello! 👋
                  </h1>
                  <Badge variant="outline" className="bg-blue-50 text-blue-700 border-blue-200">
                    <MapPin className="h-3 w-3 mr-1" />
                    {currentLocation.name}
                  </Badge>
                </div>
                <p className="text-gray-600">
                  Here's a summary of the air quality in your location
                </p>
              </div>

              {/* Current status */}
              {prediction?.general && (
                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
                  {/* Main AQI */}
                  <motion.div
                    initial={{ scale: 0.9 }}
                    animate={{ scale: 1 }}
                    transition={{ delay: 0.2 }}
                    className="bg-white/70 backdrop-blur-sm rounded-xl p-4 border border-white/50 shadow-sm"
                  >
                    <div className="flex items-center justify-between mb-2">
                      <div className="flex items-center gap-2">
                        <Activity className="h-5 w-5 text-blue-600" />
                        <span className="text-sm font-medium text-gray-700">Current AQI</span>
                      </div>
                      {recommendation && (
                        <span className="text-lg">{recommendation.icon}</span>
                      )}
                    </div>
                    <div className={`text-3xl font-bold ${getAQIColor(prediction.general.aqi)}`}>
                      {prediction.general.aqi}
                    </div>
                    <div className={`text-sm font-medium ${getAQIColor(prediction.general.aqi)}`}>
                      {getAQILevel(prediction.general.aqi)}
                    </div>
                  </motion.div>

                  {/* Health recommendation */}
                  {recommendation && (
                    <motion.div
                      initial={{ scale: 0.9 }}
                      animate={{ scale: 1 }}
                      transition={{ delay: 0.3 }}
                      className="bg-white/70 backdrop-blur-sm rounded-xl p-4 border border-white/50 shadow-sm"
                    >
                      <div className="flex items-center gap-2 mb-2">
                        <TrendingUp className="h-5 w-5 text-green-600" />
                        <span className="text-sm font-medium text-gray-700">Recommendation</span>
                      </div>
                      <p className={`text-sm font-medium ${recommendation.color}`}>
                        {recommendation.text}
                      </p>
                    </motion.div>
                  )}

                  {/* Last update */}
                  <motion.div
                    initial={{ scale: 0.9 }}
                    animate={{ scale: 1 }}
                    transition={{ delay: 0.4 }}
                    className="bg-white/70 backdrop-blur-sm rounded-xl p-4 border border-white/50 shadow-sm"
                  >
                    <div className="flex items-center gap-2 mb-2">
                      <Clock className="h-5 w-5 text-gray-600" />
                      <span className="text-sm font-medium text-gray-700">Updated</span>
                    </div>
                    <p className="text-sm text-gray-600">
                      {new Date().toLocaleTimeString('en-US', {
                        hour: '2-digit',
                        minute: '2-digit'
                      })}
                    </p>
                  </motion.div>
                </div>
              )}

              {/* Status message */}
              {isLoading && (
                <div className="flex items-center gap-2 text-blue-600">
                  <div className="animate-spin rounded-full h-4 w-4 border-2 border-blue-600 border-t-transparent" />
                  <span className="text-sm">Updating data...</span>
                </div>
              )}
            </div>

            {/* Quick actions */}
            <div className="flex flex-col gap-3 lg:min-w-[200px]">
              <Button
                onClick={() => onDialogOpen("metrics")}
                className="w-full bg-gradient-to-r from-blue-600 to-blue-700 hover:from-blue-700 hover:to-blue-800 text-white shadow-lg hover:shadow-xl transition-all duration-200"
              >
                <Activity className="h-4 w-4 mr-2" />
                View Metrics
              </Button>

              <Button
                onClick={() => onDialogOpen("weather")}
                variant="outline"
                className="w-full bg-white/80 hover:bg-white border-blue-200 hover:border-blue-300 text-blue-700 hover:text-blue-800 shadow-sm hover:shadow-md transition-all duration-200"
              >
                <Cloud className="h-4 w-4 mr-2" />
                Forecast
              </Button>

              <Button
                onClick={() => onDialogOpen("pollutants")}
                variant="outline"
                className="w-full bg-white/80 hover:bg-white border-green-200 hover:border-green-300 text-green-700 hover:text-green-800 shadow-sm hover:shadow-md transition-all duration-200"
              >
                <Droplets className="h-4 w-4 mr-2" />
                Pollutants
              </Button>
            </div>
          </div>
        </CardContent>
      </Card>
    </motion.div>
  )
}

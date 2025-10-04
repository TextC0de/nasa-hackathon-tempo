"use client"

import React from 'react'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { Alert, AlertDescription } from "@/components/ui/alert"
import { 
  AlertTriangle, 
  MapPin, 
  Clock, 
  CheckCircle, 
  XCircle,
  Phone,
  Mail
} from "lucide-react"
import { Alert as AlertType } from '@/hooks/use-alerts'

interface ActiveAlertsProps {
  alerts: AlertType[]
  onResolveAlert: (alertId: string) => void
  onDismissAlert: (alertId: string) => void
}

export function ActiveAlerts({ alerts, onResolveAlert, onDismissAlert }: ActiveAlertsProps) {
  const getUrgencyColor = (urgency: AlertType['urgency']) => {
    switch (urgency) {
      case 'low': return 'bg-blue-100 text-blue-800 border-blue-200'
      case 'medium': return 'bg-yellow-100 text-yellow-800 border-yellow-200'
      case 'high': return 'bg-orange-100 text-orange-800 border-orange-200'
      case 'critical': return 'bg-red-100 text-red-800 border-red-200'
      default: return 'bg-gray-100 text-gray-800 border-gray-200'
    }
  }

  const getUrgencyIcon = (urgency: AlertType['urgency']) => {
    switch (urgency) {
      case 'low': return 'ℹ️'
      case 'medium': return '⚠️'
      case 'high': return '🚨'
      case 'critical': return '🔥'
      default: return '📢'
    }
  }

  const getCategoryLabel = (category: string) => {
    const labels: Record<string, string> = {
      'air-quality': 'Calidad del Aire',
      'station-malfunction': 'Estación No Funciona',
      'data-error': 'Error en Datos',
      'health-concern': 'Preocupación de Salud',
      'environmental': 'Problema Ambiental',
      'other': 'Otro'
    }
    return labels[category] || category
  }

  if (alerts.length === 0) {
    return (
      <Card className="border-green-200 bg-green-50">
        <CardContent className="pt-6">
          <div className="flex items-center gap-2 text-green-800">
            <CheckCircle className="h-5 w-5" />
            <span className="font-medium">No hay alertas activas</span>
          </div>
          <p className="text-sm text-green-700 mt-1">
            Todas las estaciones funcionan correctamente
          </p>
        </CardContent>
      </Card>
    )
  }

  return (
    <div className="space-y-3">
      {alerts.map((alert) => (
        <Card key={alert.id} className={`border-l-4 ${getUrgencyColor(alert.urgency)}`}>
          <CardHeader className="pb-3">
            <div className="flex items-start justify-between">
              <div className="flex items-center gap-2">
                <span className="text-lg">{getUrgencyIcon(alert.urgency)}</span>
                <CardTitle className="text-sm font-semibold">
                  {alert.title}
                </CardTitle>
              </div>
              <Badge variant="outline" className={getUrgencyColor(alert.urgency)}>
                {alert.urgency.toUpperCase()}
              </Badge>
            </div>
            <CardDescription className="text-xs">
              {getCategoryLabel(alert.category)}
            </CardDescription>
          </CardHeader>
          
          <CardContent className="pt-0">
            <div className="space-y-2">
              <p className="text-sm text-gray-700">
                {alert.description}
              </p>
              
              {alert.location && (
                <div className="flex items-center gap-1 text-xs text-gray-600">
                  <MapPin className="h-3 w-3" />
                  <span>{alert.location}</span>
                </div>
              )}
              
              <div className="flex items-center gap-1 text-xs text-gray-500">
                <Clock className="h-3 w-3" />
                <span>
                  {alert.createdAt.toLocaleString('es-ES', {
                    day: '2-digit',
                    month: '2-digit',
                    year: 'numeric',
                    hour: '2-digit',
                    minute: '2-digit'
                  })}
                </span>
              </div>
              
              {alert.contact && (
                <div className="flex items-center gap-1 text-xs text-gray-600">
                  <Mail className="h-3 w-3" />
                  <span>{alert.contact}</span>
                </div>
              )}
              
              <div className="flex gap-2 pt-2">
                <Button
                  size="sm"
                  variant="outline"
                  onClick={() => onResolveAlert(alert.id)}
                  className="text-xs h-7"
                >
                  <CheckCircle className="h-3 w-3 mr-1" />
                  Resolver
                </Button>
                <Button
                  size="sm"
                  variant="outline"
                  onClick={() => onDismissAlert(alert.id)}
                  className="text-xs h-7"
                >
                  <XCircle className="h-3 w-3 mr-1" />
                  Descartar
                </Button>
              </div>
            </div>
          </CardContent>
        </Card>
      ))}
    </div>
  )
}

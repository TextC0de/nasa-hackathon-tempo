"use client"

import { useState } from "react"
import { Bell, AlertTriangle, AlertCircle, Info, Flame, X } from "lucide-react"
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { ScrollArea } from "@/components/ui/scroll-area"
import { cn } from "@/lib/utils"

interface Alert {
  id: string
  type: 'air_quality' | 'fire' | 'weather'
  severity: 'info' | 'warning' | 'danger' | 'critical'
  title: string
  message: string
  location: {
    name: string
    lat: number
    lng: number
  }
  timestamp: string
  distanceKm?: number
  aqi?: number
  createdBy?: string
}

interface AlertsBellProps {
  alerts: Alert[]
  unreadCount: number
  onMarkAsRead: (alertId: string) => void
  onMarkAllAsRead: () => void
  isRead: (alertId: string) => boolean
}

// Obtener icono según tipo de alerta
function getAlertIcon(type: Alert['type']) {
  switch (type) {
    case 'air_quality':
      return AlertCircle
    case 'fire':
      return Flame
    case 'weather':
      return Info
    default:
      return Bell
  }
}

// Obtener color según severidad
function getSeverityColor(severity: Alert['severity']) {
  switch (severity) {
    case 'info':
      return 'text-blue-600 bg-blue-50 dark:bg-blue-950'
    case 'warning':
      return 'text-yellow-600 bg-yellow-50 dark:bg-yellow-950'
    case 'danger':
      return 'text-red-600 bg-red-50 dark:bg-red-950'
    case 'critical':
      return 'text-purple-600 bg-purple-50 dark:bg-purple-950'
    default:
      return 'text-gray-600 bg-gray-50 dark:bg-gray-950'
  }
}

// Formatear tiempo relativo
function getTimeAgo(timestamp: string): string {
  const now = new Date()
  const past = new Date(timestamp)
  const diffMs = now.getTime() - past.getTime()
  const diffMins = Math.floor(diffMs / 60000)

  if (diffMins < 1) return 'Ahora'
  if (diffMins < 60) return `Hace ${diffMins} min`

  const diffHours = Math.floor(diffMins / 60)
  if (diffHours < 24) return `Hace ${diffHours}h`

  const diffDays = Math.floor(diffHours / 24)
  return `Hace ${diffDays}d`
}

export function AlertsBell({
  alerts,
  unreadCount,
  onMarkAsRead,
  onMarkAllAsRead,
  isRead
}: AlertsBellProps) {
  const [open, setOpen] = useState(false)

  const handleAlertClick = (alertId: string) => {
    onMarkAsRead(alertId)
  }

  const handleMarkAllRead = () => {
    onMarkAllAsRead()
  }

  return (
    <DropdownMenu open={open} onOpenChange={setOpen}>
      <DropdownMenuTrigger asChild>
        <Button
          variant="ghost"
          size="icon"
          className="relative"
          aria-label={`Notificaciones${unreadCount > 0 ? ` - ${unreadCount} nuevas` : ''}`}
        >
          <Bell className="h-5 w-5" />
          {unreadCount > 0 && (
            <span className="absolute -top-1 -right-1 flex h-5 w-5 items-center justify-center">
              <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-red-400 opacity-75"></span>
              <span className="relative inline-flex items-center justify-center rounded-full h-5 w-5 bg-red-600 text-[10px] font-bold text-white">
                {unreadCount > 9 ? '9+' : unreadCount}
              </span>
            </span>
          )}
        </Button>
      </DropdownMenuTrigger>

      <DropdownMenuContent
        align="end"
        className="w-[380px] p-0"
        sideOffset={8}
      >
        {/* Header */}
        <div className="flex items-center justify-between px-4 py-3 border-b bg-muted/50">
          <div className="flex items-center gap-2">
            <Bell className="h-4 w-4" />
            <h3 className="font-semibold text-sm">Alertas</h3>
            {unreadCount > 0 && (
              <Badge variant="destructive" className="h-5 px-1.5 text-xs">
                {unreadCount}
              </Badge>
            )}
          </div>
          {alerts.length > 0 && unreadCount > 0 && (
            <Button
              variant="ghost"
              size="sm"
              className="h-7 px-2 text-xs"
              onClick={handleMarkAllRead}
            >
              Marcar todas leídas
            </Button>
          )}
        </div>

        {/* Lista de alertas */}
        <ScrollArea className="h-[400px]">
          {alerts.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-12 px-4 text-center">
              <Bell className="h-12 w-12 text-muted-foreground/20 mb-3" />
              <p className="text-sm font-medium text-muted-foreground">
                No hay alertas activas
              </p>
              <p className="text-xs text-muted-foreground mt-1">
                Te notificaremos cuando haya alertas en tu área
              </p>
            </div>
          ) : (
            <div className="divide-y">
              {alerts.map((alert) => {
                const Icon = getAlertIcon(alert.type)
                const unread = !isRead(alert.id)

                return (
                  <button
                    key={alert.id}
                    onClick={() => handleAlertClick(alert.id)}
                    className={cn(
                      "w-full text-left px-4 py-3 hover:bg-muted/50 transition-colors",
                      unread && "bg-blue-50/50 dark:bg-blue-950/20"
                    )}
                  >
                    <div className="flex gap-3">
                      {/* Icono */}
                      <div className={cn(
                        "flex-shrink-0 mt-0.5 p-2 rounded-lg",
                        getSeverityColor(alert.severity)
                      )}>
                        <Icon className="h-4 w-4" />
                      </div>

                      {/* Contenido */}
                      <div className="flex-1 min-w-0">
                        <div className="flex items-start justify-between gap-2 mb-1">
                          <h4 className={cn(
                            "text-sm font-semibold line-clamp-1",
                            unread && "font-bold"
                          )}>
                            {alert.title}
                          </h4>
                          {unread && (
                            <div className="flex-shrink-0 w-2 h-2 rounded-full bg-blue-600 mt-1.5" />
                          )}
                        </div>

                        <p className="text-xs text-muted-foreground line-clamp-2 mb-2">
                          {alert.message}
                        </p>

                        <div className="flex items-center gap-2 text-xs text-muted-foreground">
                          <span>{alert.location.name}</span>
                          {alert.distanceKm !== undefined && (
                            <>
                              <span>•</span>
                              <span>{Number(alert.distanceKm).toFixed(1)} km</span>
                            </>
                          )}
                          {alert.aqi && (
                            <>
                              <span>•</span>
                              <Badge
                                variant="outline"
                                className={cn(
                                  "h-5 px-1.5 text-xs",
                                  alert.aqi <= 50 && "bg-green-100 text-green-800 border-green-300",
                                  alert.aqi > 50 && alert.aqi <= 100 && "bg-yellow-100 text-yellow-800 border-yellow-300",
                                  alert.aqi > 100 && "bg-red-100 text-red-800 border-red-300"
                                )}
                              >
                                AQI {alert.aqi}
                              </Badge>
                            </>
                          )}
                        </div>

                        <div className="flex items-center justify-between mt-2">
                          <span className="text-xs text-muted-foreground">
                            {getTimeAgo(alert.timestamp)}
                          </span>
                          {alert.createdBy && (
                            <span className="text-xs text-muted-foreground">
                              {alert.createdBy}
                            </span>
                          )}
                        </div>
                      </div>
                    </div>
                  </button>
                )
              })}
            </div>
          )}
        </ScrollArea>

        {/* Footer */}
        {alerts.length > 0 && (
          <div className="px-4 py-2 border-t bg-muted/50">
            <p className="text-xs text-muted-foreground text-center">
              Mostrando alertas activas en un radio de 100 km
            </p>
          </div>
        )}
      </DropdownMenuContent>
    </DropdownMenu>
  )
}

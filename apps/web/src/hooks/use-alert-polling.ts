"use client"

import { useEffect, useState, useCallback } from "react"
import { trpc } from "@/lib/trpc"

interface AlertPollingOptions {
  latitude: number
  longitude: number
  radiusKm?: number
  enabled?: boolean
  pollingInterval?: number // en ms
}

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

const STORAGE_KEY = 'atmos_read_alerts'

/**
 * Hook para polling de alertas con localStorage para tracking de leídas
 */
export function useAlertPolling({
  latitude,
  longitude,
  radiusKm = 100,
  enabled = true,
  pollingInterval = 30000 // 30 segundos por defecto
}: AlertPollingOptions) {
  const [readAlerts, setReadAlerts] = useState<Set<string>>(new Set())
  const [newAlertsCount, setNewAlertsCount] = useState(0)

  // Cargar alertas leídas desde localStorage
  useEffect(() => {
    try {
      const stored = localStorage.getItem(STORAGE_KEY)
      if (stored) {
        const parsed = JSON.parse(stored)
        setReadAlerts(new Set(parsed))
      }
    } catch (error) {
      console.error('Error loading read alerts from localStorage:', error)
    }
  }, [])

  // Query con polling
  const { data, isLoading, error, refetch } = trpc.obtenerAlertasActivas.useQuery(
    {
      latitude,
      longitude,
      radiusKm
    },
    {
      enabled,
      refetchInterval: enabled ? pollingInterval : false,
      refetchOnWindowFocus: true,
      staleTime: pollingInterval / 2
    }
  )

  // Calcular alertas no leídas
  useEffect(() => {
    if (data?.alerts) {
      const unreadCount = data.alerts.filter(
        alert => !readAlerts.has(alert.id)
      ).length
      setNewAlertsCount(unreadCount)
    }
  }, [data, readAlerts])

  // Marcar alerta como leída
  const markAsRead = useCallback((alertId: string) => {
    setReadAlerts(prev => {
      const updated = new Set(prev)
      updated.add(alertId)

      // Guardar en localStorage
      try {
        localStorage.setItem(STORAGE_KEY, JSON.stringify(Array.from(updated)))
      } catch (error) {
        console.error('Error saving to localStorage:', error)
      }

      return updated
    })
  }, [])

  // Marcar todas como leídas
  const markAllAsRead = useCallback(() => {
    if (data?.alerts) {
      const allIds = data.alerts.map(a => a.id)
      setReadAlerts(prev => {
        const updated = new Set([...prev, ...allIds])

        try {
          localStorage.setItem(STORAGE_KEY, JSON.stringify(Array.from(updated)))
        } catch (error) {
          console.error('Error saving to localStorage:', error)
        }

        return updated
      })
    }
  }, [data])

  // Limpiar alertas antiguas del localStorage (más de 7 días)
  useEffect(() => {
    if (data?.alerts) {
      const activeIds = new Set(data.alerts.map(a => a.id))

      setReadAlerts(prev => {
        const cleaned = new Set(
          Array.from(prev).filter(id => activeIds.has(id))
        )

        if (cleaned.size !== prev.size) {
          try {
            localStorage.setItem(STORAGE_KEY, JSON.stringify(Array.from(cleaned)))
          } catch (error) {
            console.error('Error cleaning localStorage:', error)
          }
        }

        return cleaned
      })
    }
  }, [data])

  return {
    alerts: data?.alerts ?? [],
    unreadAlerts: data?.alerts?.filter(a => !readAlerts.has(a.id)) ?? [],
    newAlertsCount,
    totalCount: data?.count ?? 0,
    isLoading,
    error,
    refetch,
    markAsRead,
    markAllAsRead,
    isRead: (alertId: string) => readAlerts.has(alertId)
  }
}

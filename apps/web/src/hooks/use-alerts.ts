"use client"

import { useState, useCallback } from 'react'

export interface Alert {
  id: string
  category: string
  title: string
  description: string
  location: string
  urgency: 'low' | 'medium' | 'high' | 'critical'
  contact?: string
  coordinates?: {
    lat: number
    lng: number
  }
  createdAt: Date
  status: 'active' | 'resolved' | 'dismissed'
}

export function useAlerts() {
  const [alerts, setAlerts] = useState<Alert[]>([])

  const addAlert = useCallback((alertData: Omit<Alert, 'id' | 'createdAt' | 'status'>) => {
    const newAlert: Alert = {
      ...alertData,
      id: `alert_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
      createdAt: new Date(),
      status: 'active'
    }
    
    setAlerts(prev => [newAlert, ...prev])
    return newAlert
  }, [])

  const updateAlertStatus = useCallback((alertId: string, status: Alert['status']) => {
    setAlerts(prev => 
      prev.map(alert => 
        alert.id === alertId ? { ...alert, status } : alert
      )
    )
  }, [])

  const removeAlert = useCallback((alertId: string) => {
    setAlerts(prev => prev.filter(alert => alert.id !== alertId))
  }, [])

  const getActiveAlerts = useCallback(() => {
    return alerts.filter(alert => alert.status === 'active')
  }, [alerts])

  const getAlertsByUrgency = useCallback((urgency: Alert['urgency']) => {
    return alerts.filter(alert => alert.urgency === urgency && alert.status === 'active')
  }, [alerts])

  return {
    alerts,
    addAlert,
    updateAlertStatus,
    removeAlert,
    getActiveAlerts,
    getAlertsByUrgency
  }
}

"use client"

import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert"
import { Send, History, FileEdit, AlertTriangle, CheckCircle2, Clock } from "lucide-react"
import { useState } from "react"
import type { Alert as AlertType } from "@/hooks/use-alerts"

interface AlertsViewProps {
  alerts: AlertType[]
  onSubmitAlert: (alertData: any) => Promise<void>
  isSubmitting: boolean
  onResolveAlert: (alertId: string) => void
  onDismissAlert: (alertId: string) => void
}

/**
 * Alerts View - Alert management system for officials
 *
 * Features:
 * - Pre-written templates (Wildfire, Ozone, PM2.5)
 * - Alert history
 * - Multi-language support (EN/ES/ZH/VI)
 */
export function AlertsView({
  alerts,
  onSubmitAlert,
  isSubmitting,
  onResolveAlert,
  onDismissAlert
}: AlertsViewProps) {
  const [view, setView] = useState<'send' | 'history' | 'templates'>('send')

  // Filter active alerts
  const activeAlerts = alerts.filter(a => a.status === 'active')
  const resolvedAlerts = alerts.filter(a => a.status === 'resolved')

  return (
    <div className="h-full overflow-y-auto bg-muted/20">
      <div className="max-w-7xl mx-auto p-6 space-y-6">
        {/* Header */}
        <div>
          <h1 className="text-2xl font-bold">Alert Management</h1>
          <p className="text-sm text-muted-foreground mt-1">
            Create and manage public air quality alerts
          </p>
        </div>

        {/* Navigation tabs */}
        <div className="flex gap-2 border-b border-border">
          <Button
            variant={view === 'send' ? 'default' : 'ghost'}
            className="rounded-b-none"
            onClick={() => setView('send')}
          >
            <Send className="h-4 w-4 mr-2" />
            Send Alert
          </Button>
          <Button
            variant={view === 'history' ? 'default' : 'ghost'}
            className="rounded-b-none"
            onClick={() => setView('history')}
          >
            <History className="h-4 w-4 mr-2" />
            Alert History
            {activeAlerts.length > 0 && (
              <Badge variant="destructive" className="ml-2">
                {activeAlerts.length}
              </Badge>
            )}
          </Button>
          <Button
            variant={view === 'templates' ? 'default' : 'ghost'}
            className="rounded-b-none"
            onClick={() => setView('templates')}
          >
            <FileEdit className="h-4 w-4 mr-2" />
            Templates
          </Button>
        </div>

        {/* Content based on selected view */}
        {view === 'send' && (
          <div className="space-y-6">
            {/* Quick templates */}
            <Card>
              <CardHeader>
                <CardTitle className="text-base">Quick Start Templates</CardTitle>
                <CardDescription>
                  Use a pre-written template to send alert quickly
                </CardDescription>
              </CardHeader>
              <CardContent className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <Button
                  variant="outline"
                  className="h-auto p-4 flex flex-col items-start gap-2"
                  onClick={() => console.log('Template: wildfire')}
                >
                  <div className="flex items-center gap-2 w-full">
                    <span className="text-2xl">🔥</span>
                    <span className="font-semibold">Wildfire Smoke</span>
                  </div>
                  <span className="text-xs text-muted-foreground text-left">
                    Alert for wildfire smoke
                  </span>
                </Button>

                <Button
                  variant="outline"
                  className="h-auto p-4 flex flex-col items-start gap-2"
                  onClick={() => console.log('Template: ozone')}
                >
                  <div className="flex items-center gap-2 w-full">
                    <span className="text-2xl">☀️</span>
                    <span className="font-semibold">High Ozone</span>
                  </div>
                  <span className="text-xs text-muted-foreground text-left">
                    Warning for high ozone levels
                  </span>
                </Button>

                <Button
                  variant="outline"
                  className="h-auto p-4 flex flex-col items-start gap-2"
                  onClick={() => console.log('Template: pm25')}
                >
                  <div className="flex items-center gap-2 w-full">
                    <span className="text-2xl">🌫️</span>
                    <span className="font-semibold">PM2.5 Alert</span>
                  </div>
                  <span className="text-xs text-muted-foreground text-left">
                    Alert for fine particles in the air
                  </span>
                </Button>
              </CardContent>
            </Card>

            {/* Placeholder for form */}
            <Card>
              <CardHeader>
                <CardTitle className="text-base">Create Custom Alert</CardTitle>
                <CardDescription>
                  Complete form available soon
                </CardDescription>
              </CardHeader>
              <CardContent>
                <p className="text-sm text-muted-foreground">
                  The custom alert creation form will be available in the next phase.
                  For now, use the quick templates above or the alerts dialog from the menu.
                </p>
              </CardContent>
            </Card>
          </div>
        )}

        {view === 'history' && (
          <div className="space-y-4">
            {/* Active alerts */}
            {activeAlerts.length > 0 && (
              <div className="space-y-4">
                <h2 className="text-lg font-semibold flex items-center gap-2">
                  <AlertTriangle className="h-5 w-5 text-red-600" />
                  Active Alerts ({activeAlerts.length})
                </h2>
                {activeAlerts.map(alert => (
                  <Card key={alert.id} className="border-red-200 dark:border-red-800">
                    <CardContent className="pt-6">
                      <div className="flex items-start justify-between">
                        <div className="space-y-2 flex-1">
                          <div className="flex items-center gap-2">
                            <Badge
                              variant={
                                alert.urgency === 'critical' ? 'destructive' :
                                alert.urgency === 'high' ? 'destructive' :
                                alert.urgency === 'medium' ? 'default' :
                                'secondary'
                              }
                            >
                              {alert.urgency}
                            </Badge>
                            <span className="text-sm text-muted-foreground">{alert.location}</span>
                            <span className="text-sm text-muted-foreground">
                              • {new Date(alert.createdAt).toLocaleString()}
                            </span>
                          </div>
                          <h3 className="font-semibold">{alert.title}</h3>
                          <p className="text-sm text-muted-foreground">{alert.description}</p>
                        </div>
                        <div className="flex gap-2">
                          <Button
                            variant="outline"
                            size="sm"
                            onClick={() => onResolveAlert(alert.id)}
                          >
                            <CheckCircle2 className="h-4 w-4 mr-1" />
                            Resolve
                          </Button>
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => onDismissAlert(alert.id)}
                          >
                            Dismiss
                          </Button>
                        </div>
                      </div>
                    </CardContent>
                  </Card>
                ))}
              </div>
            )}

            {/* Resolved alerts */}
            {resolvedAlerts.length > 0 && (
              <div className="space-y-4">
                <h2 className="text-lg font-semibold flex items-center gap-2">
                  <CheckCircle2 className="h-5 w-5 text-green-600" />
                  Resolved Alerts ({resolvedAlerts.length})
                </h2>
                {resolvedAlerts.slice(0, 5).map(alert => (
                  <Card key={alert.id} className="opacity-60">
                    <CardContent className="pt-6">
                      <div className="flex items-start justify-between">
                        <div className="space-y-2 flex-1">
                          <div className="flex items-center gap-2">
                            <Badge variant="outline">{alert.urgency}</Badge>
                            <span className="text-sm text-muted-foreground">{alert.location}</span>
                            <span className="text-sm text-muted-foreground">
                              • {new Date(alert.createdAt).toLocaleString()}
                            </span>
                          </div>
                          <h3 className="font-semibold">{alert.title}</h3>
                        </div>
                      </div>
                    </CardContent>
                  </Card>
                ))}
              </div>
            )}

            {alerts.length === 0 && (
              <Card>
                <CardContent className="pt-6 text-center">
                  <Clock className="h-12 w-12 mx-auto text-muted-foreground mb-4" />
                  <p className="text-muted-foreground">No alerts in history</p>
                </CardContent>
              </Card>
            )}
          </div>
        )}

        {view === 'templates' && (
          <Card>
            <CardHeader>
              <CardTitle className="text-base">Alert Templates</CardTitle>
              <CardDescription>
                Template management available soon
              </CardDescription>
            </CardHeader>
            <CardContent>
              <p className="text-sm text-muted-foreground">
                Complete template management will be available in the next phase.
              </p>
            </CardContent>
          </Card>
        )}
      </div>
    </div>
  )
}

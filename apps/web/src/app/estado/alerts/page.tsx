"use client"

import { CreateAlertForm } from "./_components/create-alert-form"
import { trpc } from "@/lib/trpc"
import { Card, CardContent } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { AlertTriangle, CheckCircle2, Loader2 } from "lucide-react"

export default function AlertsPage() {
  // Queries
  const { data, isLoading, refetch } = trpc.listarAlertas.useQuery({
    status: undefined, // All alerts
    limit: 50
  })

  // Mutations
  const crearAlerta = trpc.crearAlerta.useMutation({
    onSuccess: () => {
      refetch()
      alert("✅ Alert created successfully!")
    },
    onError: (error) => {
      alert(`❌ Error creating alert: ${error.message}`)
    }
  })

  const actualizarAlerta = trpc.actualizarAlerta.useMutation({
    onSuccess: () => {
      refetch()
    }
  })

  const handleSubmitAlert = async (formData: any) => {
    await crearAlerta.mutateAsync({
      title: formData.title,
      description: formData.description,
      urgency: formData.urgency,
      latitude: formData.latitude,
      longitude: formData.longitude,
      locationName: formData.locationName,
      alertType: formData.alertType
    })
  }

  const alerts = data?.alerts || []
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

        {/* Create Alert Form */}
        <CreateAlertForm
          onSubmit={handleSubmitAlert}
          isSubmitting={crearAlerta.isPending}
        />

        {/* Active Alerts */}
        {isLoading ? (
          <div className="flex items-center justify-center py-12">
            <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
          </div>
        ) : activeAlerts.length > 0 ? (
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
                            alert.urgency === 'critical' || alert.urgency === 'high'
                              ? 'destructive'
                              : 'default'
                          }
                        >
                          {alert.urgency}
                        </Badge>
                        <span className="text-sm text-muted-foreground">
                          {alert.locationName || 'Unknown location'}
                        </span>
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
                        onClick={() => actualizarAlerta.mutate({ id: alert.id, status: 'resolved' })}
                        disabled={actualizarAlerta.isPending}
                      >
                        <CheckCircle2 className="h-4 w-4 mr-1" />
                        Resolve
                      </Button>
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => actualizarAlerta.mutate({ id: alert.id, status: 'dismissed' })}
                        disabled={actualizarAlerta.isPending}
                      >
                        Dismiss
                      </Button>
                    </div>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        ) : null}

        {/* Resolved Alerts */}
        {resolvedAlerts.length > 0 && (
          <div className="space-y-4">
            <h2 className="text-lg font-semibold flex items-center gap-2">
              <CheckCircle2 className="h-5 w-5 text-green-600" />
              Recently Resolved ({resolvedAlerts.length})
            </h2>
            {resolvedAlerts.slice(0, 3).map(alert => (
              <Card key={alert.id} className="opacity-60">
                <CardContent className="pt-6">
                  <div className="flex items-start justify-between">
                    <div className="space-y-2 flex-1">
                      <div className="flex items-center gap-2">
                        <Badge variant="outline">{alert.urgency}</Badge>
                        <span className="text-sm text-muted-foreground">
                          {alert.locationName || 'Unknown location'}
                        </span>
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
      </div>
    </div>
  )
}

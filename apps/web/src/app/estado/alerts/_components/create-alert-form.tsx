"use client"

import { useState } from "react"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Textarea } from "@/components/ui/textarea"
import { Label } from "@/components/ui/label"
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"
import { ALERT_TEMPLATES, type AlertTemplate } from "./alert-templates"
import { Loader2, MapPin } from "lucide-react"
import dynamic from "next/dynamic"

// Importar mapa dinámicamente
const CaliforniaMap = dynamic(
  () => import("@/components/california-map").then(mod => ({ default: mod.CaliforniaMap })),
  { ssr: false }
)

interface CreateAlertFormProps {
  onSubmit: (data: {
    title: string
    description: string
    urgency: 'low' | 'medium' | 'high' | 'critical'
    latitude: number
    longitude: number
    locationName?: string
    alertType?: 'wildfire' | 'ozone' | 'pm25' | 'custom'
    language: 'en' | 'es' | 'zh' | 'vi'
  }) => Promise<void>
  isSubmitting: boolean
}

export function CreateAlertForm({ onSubmit, isSubmitting }: CreateAlertFormProps) {
  const [selectedTemplate, setSelectedTemplate] = useState<AlertTemplate | null>(null)
  const [language, setLanguage] = useState<'en' | 'es' | 'zh' | 'vi'>('en')
  const [formData, setFormData] = useState({
    title: '',
    description: '',
    urgency: 'medium' as 'low' | 'medium' | 'high' | 'critical',
    latitude: 36.7783,
    longitude: -119.4179,
    locationName: 'California',
    alertType: undefined as 'wildfire' | 'ozone' | 'pm25' | 'custom' | undefined,
    radiusKm: 50 // Radio de cobertura en km
  })

  // Handler para click en el mapa
  const handleMapClick = (e: any) => {
    const { lat, lng } = e.latlng
    setFormData({
      ...formData,
      latitude: lat,
      longitude: lng
    })
  }

  const handleTemplateSelect = (template: AlertTemplate) => {
    setSelectedTemplate(template)
    const content = template.content[language]
    setFormData({
      ...formData,
      title: content.title,
      description: content.description,
      urgency: template.urgency,
      alertType: template.alertType
    })
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    await onSubmit({
      ...formData,
      language
    })
    // Reset form
    setFormData({
      title: '',
      description: '',
      urgency: 'medium',
      latitude: 36.7783,
      longitude: -119.4179,
      locationName: 'California',
      alertType: undefined,
      radiusKm: 50
    })
    setSelectedTemplate(null)
  }

  return (
    <div className="space-y-6">
      {/* Quick Templates */}
      <Card>
        <CardHeader>
          <CardTitle className="text-base">Quick Start Templates</CardTitle>
          <CardDescription>
            Click a template to auto-fill the form
          </CardDescription>
        </CardHeader>
        <CardContent className="grid grid-cols-1 md:grid-cols-3 gap-4">
          {ALERT_TEMPLATES.map(template => (
            <Button
              key={template.id}
              variant={selectedTemplate?.id === template.id ? "default" : "outline"}
              className="h-auto p-4 flex flex-col items-start gap-2"
              onClick={() => handleTemplateSelect(template)}
            >
              <div className="flex items-center gap-2 w-full">
                <span className="text-2xl">{template.emoji}</span>
                <span className="font-semibold">{template.name}</span>
              </div>
              <span className="text-xs text-muted-foreground text-left">
                {template.content.en.title}
              </span>
            </Button>
          ))}
        </CardContent>
      </Card>

      {/* Alert Form */}
      <Card>
        <CardHeader>
          <CardTitle className="text-base">Alert Details</CardTitle>
          <CardDescription>
            Customize the alert before sending
          </CardDescription>
        </CardHeader>
        <CardContent>
          <form onSubmit={handleSubmit} className="space-y-4">
            {/* Language Selector */}
            <div className="space-y-2">
              <Label htmlFor="language">Language</Label>
              <Select
                value={language}
                onValueChange={(value) => {
                  setLanguage(value as 'en' | 'es' | 'zh' | 'vi')
                  // Update content if template selected
                  if (selectedTemplate) {
                    const content = selectedTemplate.content[value as 'en' | 'es' | 'zh' | 'vi']
                    setFormData({
                      ...formData,
                      title: content.title,
                      description: content.description
                    })
                  }
                }}
              >
                <SelectTrigger id="language">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="en">English</SelectItem>
                  <SelectItem value="es">Español</SelectItem>
                  <SelectItem value="zh">中文</SelectItem>
                  <SelectItem value="vi">Tiếng Việt</SelectItem>
                </SelectContent>
              </Select>
            </div>

            {/* Title */}
            <div className="space-y-2">
              <Label htmlFor="title">Title *</Label>
              <Input
                id="title"
                value={formData.title}
                onChange={(e) => setFormData({ ...formData, title: e.target.value })}
                placeholder="Alert title"
                required
              />
            </div>

            {/* Description */}
            <div className="space-y-2">
              <Label htmlFor="description">Description *</Label>
              <Textarea
                id="description"
                value={formData.description}
                onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                placeholder="Detailed description"
                rows={4}
                required
              />
            </div>

            {/* Urgency */}
            <div className="space-y-2">
              <Label htmlFor="urgency">Urgency Level *</Label>
              <Select
                value={formData.urgency}
                onValueChange={(value) => setFormData({ ...formData, urgency: value as any })}
              >
                <SelectTrigger id="urgency">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="low">Low</SelectItem>
                  <SelectItem value="medium">Medium</SelectItem>
                  <SelectItem value="high">High</SelectItem>
                  <SelectItem value="critical">Critical</SelectItem>
                </SelectContent>
              </Select>
            </div>

            {/* Location Name */}
            <div className="space-y-2">
              <Label htmlFor="locationName">Location Name</Label>
              <Input
                id="locationName"
                value={formData.locationName}
                onChange={(e) => setFormData({ ...formData, locationName: e.target.value })}
                placeholder="e.g., Los Angeles County"
              />
            </div>

            {/* Alert Coverage Area - Map Picker */}
            <div className="space-y-2">
              <Label>Alert Coverage Area *</Label>
              <Card>
                <CardContent className="p-4 space-y-4">
                  <div>
                    <p className="text-sm text-muted-foreground mb-2">
                      Click on the map to set the alert center point
                    </p>
                    <div className="h-96 border rounded-lg overflow-hidden relative">
                      <CaliforniaMap
                        className="h-full w-full"
                        mapType="streetmap"
                        showMonitoringStations={false}
                        showActiveFires={false}
                        alerts={[
                          {
                            id: 'preview',
                            category: formData.alertType || 'custom',
                            title: formData.title || 'Alert Preview',
                            description: formData.description,
                            urgency: formData.urgency,
                            status: 'active',
                            coordinates: {
                              lat: formData.latitude,
                              lng: formData.longitude
                            },
                            location: formData.locationName,
                            createdAt: new Date()
                          }
                        ]}
                        fires={[]}
                        onMapClick={handleMapClick}
                        initialCenter={[formData.latitude, formData.longitude]}
                        initialZoom={8}
                      />
                    </div>
                  </div>

                  {/* Coverage Radius Slider */}
                  <div className="space-y-2">
                    <div className="flex items-center justify-between">
                      <Label htmlFor="radius" className="text-sm">
                        Coverage Radius: <span className="font-semibold">{formData.radiusKm} km</span>
                      </Label>
                      <span className="text-xs text-muted-foreground">
                        ~{(formData.radiusKm * 0.621371).toFixed(1)} miles
                      </span>
                    </div>
                    <input
                      id="radius"
                      type="range"
                      min="5"
                      max="200"
                      step="5"
                      value={formData.radiusKm}
                      onChange={(e) => setFormData({ ...formData, radiusKm: parseInt(e.target.value) })}
                      className="w-full h-2 bg-muted rounded-lg appearance-none cursor-pointer accent-primary"
                    />
                    <div className="flex justify-between text-xs text-muted-foreground">
                      <span>5 km</span>
                      <span>50 km</span>
                      <span>100 km</span>
                      <span>200 km</span>
                    </div>
                  </div>

                  {/* Location Info */}
                  <div className="p-3 bg-muted/50 rounded-lg">
                    <div className="flex items-start gap-2">
                      <MapPin className="h-4 w-4 mt-0.5 text-primary" />
                      <div className="flex-1 space-y-1">
                        <p className="text-sm font-medium">
                          {formData.locationName || 'California'}
                        </p>
                        <p className="text-xs text-muted-foreground">
                          Center: {formData.latitude.toFixed(4)}°, {formData.longitude.toFixed(4)}°
                        </p>
                        <p className="text-xs text-muted-foreground">
                          Area coverage: ~{(Math.PI * formData.radiusKm * formData.radiusKm).toFixed(0)} km²
                        </p>
                      </div>
                    </div>
                  </div>
                </CardContent>
              </Card>
            </div>

            {/* Submit Button */}
            <Button
              type="submit"
              className="w-full"
              disabled={isSubmitting}
            >
              {isSubmitting ? (
                <>
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  Sending Alert...
                </>
              ) : (
                'Send Alert'
              )}
            </Button>
          </form>
        </CardContent>
      </Card>
    </div>
  )
}

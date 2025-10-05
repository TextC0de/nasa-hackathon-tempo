"use client"

import { useState } from "react"
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog"
import { Card, CardContent, CardDescription, CardHeader } from "@/components/ui/card"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Button } from "@/components/ui/button"
import { Code, Search } from "lucide-react"

interface DebugDialogProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  debugLat: string
  debugLng: string
  onDebugLatChange: (lat: string) => void
  onDebugLngChange: (lng: string) => void
  onDebugSearch: () => void
}

export function DebugDialog({
  open,
  onOpenChange,
  debugLat,
  debugLng,
  onDebugLatChange,
  onDebugLngChange,
  onDebugSearch
}: DebugDialogProps) {
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-md z-[10001] mx-4">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Code className="h-5 w-5" />
            Debug / Development Mode
          </DialogTitle>
        </DialogHeader>
        <Card>
          <CardHeader>
            <CardDescription>
              Enter custom coordinates for testing
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="debug-lat">Latitude</Label>
              <Input
                id="debug-lat"
                type="number"
                step="any"
                placeholder="e.g., 34.0522"
                value={debugLat}
                onChange={(e) => onDebugLatChange(e.target.value)}
                onKeyDown={(e) => e.key === 'Enter' && onDebugSearch()}
              />
              <p className="text-xs text-muted-foreground">Range: -90 to 90</p>
            </div>
            <div className="space-y-2">
              <Label htmlFor="debug-lng">Longitude</Label>
              <Input
                id="debug-lng"
                type="number"
                step="any"
                placeholder="e.g., -118.2437"
                value={debugLng}
                onChange={(e) => onDebugLngChange(e.target.value)}
                onKeyDown={(e) => e.key === 'Enter' && onDebugSearch()}
              />
              <p className="text-xs text-muted-foreground">Range: -180 to 180</p>
            </div>
            <Button onClick={onDebugSearch} className="w-full">
              <Search className="mr-2 h-4 w-4" />
              Search
            </Button>
          </CardContent>
        </Card>
      </DialogContent>
    </Dialog>
  )
}

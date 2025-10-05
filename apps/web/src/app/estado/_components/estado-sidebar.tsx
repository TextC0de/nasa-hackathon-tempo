"use client"

import { cn } from "@/lib/utils"
import {
  LayoutDashboard,
  TrendingUp,
  Clock,
  Bell,
  Settings
} from "lucide-react"
import { Button } from "@/components/ui/button"
import { Separator } from "@/components/ui/separator"
import { Avatar, AvatarImage, AvatarFallback } from "@/components/ui/avatar"
import Link from "next/link"
import { usePathname } from "next/navigation"

interface EstadoSidebarProps {
  className?: string
}

const navigation = [
  { href: "/estado", name: "Overview", icon: LayoutDashboard, description: "Mapa y estado general" },
  { href: "/estado/history", name: "History", icon: Clock, description: "Análisis histórico" },
  { href: "/estado/alerts", name: "Alerts", icon: Bell, description: "Gestión de alertas" },
]

export function EstadoSidebar({ className }: EstadoSidebarProps) {
  const pathname = usePathname()
  return (
    <div className={cn("flex h-full w-64 flex-col bg-background border-r border-border", className)}>
      {/* Logo */}
      <div className="flex h-16 shrink-0 items-center px-6">
        <div className="flex items-center space-x-3">
          <Avatar className="h-8 w-8">
            <AvatarImage src="/atmos.svg" alt="AtmOS" />
            <AvatarFallback className="text-xs font-semibold">AT</AvatarFallback>
          </Avatar>
          <div className="flex flex-col">
            <span className="text-sm font-semibold text-foreground">AtmOS</span>
            <span className="text-xs text-muted-foreground">Estado Dashboard</span>
          </div>
        </div>
      </div>

      <Separator />

      {/* Navigation */}
      <nav className="flex-1 px-3 py-4">
        <div className="flex flex-col gap-y-1">
          {navigation.map((item) => {
            const isActive = pathname === item.href
            return (
              <Button
                key={item.href}
                variant={isActive ? "secondary" : "ghost"}
                className={cn(
                  "w-full justify-start gap-x-3 px-3 py-2 h-auto font-normal",
                  isActive && "bg-secondary"
                )}
                asChild
              >
                <Link href={item.href}>
                  <item.icon className="h-4 w-4 shrink-0" />
                  <div className="flex flex-col items-start">
                    <span className="text-sm font-medium">{item.name}</span>
                    <span className="text-xs text-muted-foreground">{item.description}</span>
                  </div>
                </Link>
              </Button>
            )
          })}
        </div>
      </nav>

      <Separator />

      {/* Bottom actions */}
      <div className="px-3 py-4">
        <Button
          variant="ghost"
          className="w-full justify-start gap-x-3 px-3 py-2 h-auto"
        >
          <Settings className="h-4 w-4 shrink-0" />
          <span className="text-sm">Settings</span>
        </Button>
      </div>
    </div>
  )
}

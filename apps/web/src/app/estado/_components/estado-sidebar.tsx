"use client"

import { cn } from "@/lib/utils"
import {
  LayoutDashboard,
  Clock,
  Bell,
  Settings,
  Shield
} from "lucide-react"
import { Separator } from "@/components/ui/separator"
import { Avatar, AvatarImage, AvatarFallback } from "@/components/ui/avatar"
import Link from "next/link"
import { usePathname } from "next/navigation"

interface EstadoSidebarProps {
  className?: string
}

// Tipos para navegación
interface NavigationItem {
  href: string
  name: string
  icon: React.ComponentType<{ className?: string }>
}

const navigation: NavigationItem[] = [
  { href: "/estado", name: "Overview", icon: LayoutDashboard },
  { href: "/estado/history", name: "History", icon: Clock },
  { href: "/estado/alerts", name: "Alerts", icon: Bell },
  { href: "/estado/reportes", name: "Admin Reportes", icon: Shield },
]

export function EstadoSidebar({ className }: EstadoSidebarProps) {
  const pathname = usePathname()

  return (
    <div
      className={cn(
        "group fixed left-0 top-0 h-screen z-50",
        "w-16 hover:w-64",
        "bg-background border-r border-border",
        "transition-all duration-200 ease-in-out",
        "hover:shadow-xl",
        className
      )}
    >
      {/* Logo */}
      <div className="px-2 py-4">
        <div className="flex items-center gap-x-3 px-3">
          <img
            src="/atmos.svg"
            alt="AtmOS"
            className="h-5 w-5 shrink-0"
          />
          <div className="flex flex-col opacity-0 group-hover:opacity-100 transition-opacity duration-150 overflow-hidden whitespace-nowrap">
            <span className="text-sm font-semibold text-foreground">AtmOS</span>
          </div> 
        </div>
      </div>

      <Separator />

      {/* Navigation */}
      <nav className="flex-1 px-2 py-4">
        <div className="flex flex-col gap-y-1">
          {navigation.map((item) => {
            const isActive = pathname === item.href
            const Icon = item.icon

            return (
              <Link
                key={item.href}
                href={item.href!}
                className={cn(
                  "flex items-center gap-x-3 px-3 py-3 rounded-md",
                  "transition-colors duration-150",
                  "hover:bg-accent hover:text-accent-foreground",
                  isActive && "bg-secondary text-secondary-foreground"
                )}
              >
                <Icon className="h-5 w-5 shrink-0" />
                <span className="text-sm font-medium opacity-0 group-hover:opacity-100 transition-opacity duration-150 overflow-hidden whitespace-nowrap">
                  {item.name}
                </span>
              </Link>
            )
          })}
        </div>
      </nav>

      <Separator />

      {/* Bottom actions */}
      <div className="px-2 py-4">
        <button
          className={cn(
            "flex items-center gap-x-3 px-3 py-3 rounded-md w-full",
            "transition-colors duration-150",
            "hover:bg-accent hover:text-accent-foreground"
          )}
        >
          <Settings className="h-5 w-5 shrink-0" />
          <span className="text-sm opacity-0 group-hover:opacity-100 transition-opacity duration-150 overflow-hidden whitespace-nowrap">
            Settings
          </span>
        </button>
      </div>
    </div>
  )
}

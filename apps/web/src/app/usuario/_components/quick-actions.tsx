"use client"

import { Button } from "@/components/ui/button"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { 
  FileText, 
  MapPin, 
  AlertTriangle, 
  TrendingUp, 
  Settings,
  Heart,
  Share2,
  Download,
  RefreshCw,
  Bell,
  BarChart3
} from "lucide-react"
import Link from "next/link"
import { motion } from "framer-motion"
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip"

interface QuickActionsProps {
  onDialogOpen: (dialog: string) => void
  onRefetch: () => void
  isLoading: boolean
  unreadAlertsCount?: number
}

export function QuickActions({ onDialogOpen, onRefetch, isLoading, unreadAlertsCount = 0 }: QuickActionsProps) {
  const actions = [
    {
      title: "Report Pollution",
      description: "Report a pollution incident",
      icon: <AlertTriangle className="h-5 w-5" />,
      href: "/usuario/reportes",
      color: "bg-red-500 hover:bg-red-600",
      bgColor: "bg-red-50",
      borderColor: "border-red-200",
      textColor: "text-red-700"
    },
    {
      title: "View Reports",
      description: "Manage your reports",
      icon: <FileText className="h-5 w-5" />,
      href: "/usuario/reportes",
      color: "bg-blue-500 hover:bg-blue-600",
      bgColor: "bg-blue-50",
      borderColor: "border-blue-200",
      textColor: "text-blue-700"
    },
    {
      title: "Detailed Analysis",
      description: "Complete metrics and trends",
      icon: <BarChart3 className="h-5 w-5" />,
      action: () => onDialogOpen("metrics"),
      color: "bg-green-500 hover:bg-green-600",
      bgColor: "bg-green-50",
      borderColor: "border-green-200",
      textColor: "text-green-700"
    },
    {
      title: "Forecast",
      description: "Weather predictions",
      icon: <TrendingUp className="h-5 w-5" />,
      action: () => onDialogOpen("weather"),
      color: "bg-purple-500 hover:bg-purple-600",
      bgColor: "bg-purple-50",
      borderColor: "border-purple-200",
      textColor: "text-purple-700"
    }
  ]

  return (
    <TooltipProvider>
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.5, delay: 0.4 }}
        className="space-y-6"
      >
        {/* Main actions */}
        <Card className="border-0 shadow-lg bg-gradient-to-br from-white via-gray-50 to-blue-50">
          <CardHeader className="pb-4">
            <div className="flex items-center justify-between">
              <CardTitle className="text-lg font-bold text-gray-900 flex items-center gap-2">
                <Settings className="h-5 w-5 text-blue-600" />
                Quick Actions
              </CardTitle>
              <Button
                onClick={onRefetch}
                disabled={isLoading}
                variant="outline"
                size="sm"
                className="bg-white/80 hover:bg-white border-blue-200 hover:border-blue-300"
              >
                <RefreshCw className={`h-4 w-4 mr-2 ${isLoading ? 'animate-spin' : ''}`} />
                Refresh
              </Button>
            </div>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              {actions.map((action, index) => (
                <motion.div
                  key={action.title}
                  initial={{ opacity: 0, scale: 0.9 }}
                  animate={{ opacity: 1, scale: 1 }}
                  transition={{ duration: 0.3, delay: 0.5 + index * 0.1 }}
                >
                  <Tooltip>
                    <TooltipTrigger asChild>
                      {action.href ? (
                        <Link href={action.href}>
                          <Card className={`${action.bgColor} ${action.borderColor} border-2 hover:shadow-lg transition-all duration-200 cursor-pointer group h-full`}>
                            <CardContent className="p-4">
                              <div className="flex items-start gap-3">
                                <div className={`p-3 rounded-lg ${action.color} text-white group-hover:scale-110 transition-transform duration-200`}>
                                  {action.icon}
                                </div>
                                <div className="flex-1">
                                  <h3 className={`font-semibold ${action.textColor} group-hover:underline`}>
                                    {action.title}
                                  </h3>
                                  <p className="text-sm text-gray-600 mt-1">
                                    {action.description}
                                  </p>
                                </div>
                              </div>
                            </CardContent>
                          </Card>
                        </Link>
                      ) : (
                        <Card 
                          onClick={action.action}
                          className={`${action.bgColor} ${action.borderColor} border-2 hover:shadow-lg transition-all duration-200 cursor-pointer group h-full`}
                        >
                          <CardContent className="p-4">
                            <div className="flex items-start gap-3">
                              <div className={`p-3 rounded-lg ${action.color} text-white group-hover:scale-110 transition-transform duration-200`}>
                                {action.icon}
                              </div>
                              <div className="flex-1">
                                <h3 className={`font-semibold ${action.textColor} group-hover:underline`}>
                                  {action.title}
                                </h3>
                                <p className="text-sm text-gray-600 mt-1">
                                  {action.description}
                                </p>
                              </div>
                            </div>
                          </CardContent>
                        </Card>
                      )}
                    </TooltipTrigger>
                    <TooltipContent>
                      <p>Click to {action.href ? 'navigate' : 'open'}</p>
                    </TooltipContent>
                  </Tooltip>
                </motion.div>
              ))}
            </div>
          </CardContent>
        </Card>

        {/* Secondary actions */}
        <div className="flex flex-wrap gap-3">
          <Button
            variant="outline"
            size="sm"
            className="bg-white/80 hover:bg-white border-green-200 hover:border-green-300 text-green-700 hover:text-green-800"
          >
            <Heart className="h-4 w-4 mr-2" />
            Favorites
          </Button>

          <Button
            variant="outline"
            size="sm"
            className="bg-white/80 hover:bg-white border-blue-200 hover:border-blue-300 text-blue-700 hover:text-blue-800"
          >
            <Share2 className="h-4 w-4 mr-2" />
            Share
          </Button>

          <Button
            variant="outline"
            size="sm"
            className="bg-white/80 hover:bg-white border-purple-200 hover:border-purple-300 text-purple-700 hover:text-purple-800"
          >
            <Download className="h-4 w-4 mr-2" />
            Export
          </Button>

          {unreadAlertsCount > 0 && (
            <Button
              variant="outline"
              size="sm"
              className="bg-red-50 hover:bg-red-100 border-red-200 hover:border-red-300 text-red-700 hover:text-red-800 relative"
            >
              <Bell className="h-4 w-4 mr-2" />
              Alerts
              <Badge variant="destructive" className="ml-2 h-5 w-5 p-0 flex items-center justify-center text-xs">
                {unreadAlertsCount}
              </Badge>
            </Button>
          )}
        </div>
      </motion.div>
    </TooltipProvider>
  )
}

"use client"

import dynamic from "next/dynamic"

const HistoryView = dynamic(
  () => import("./_components/history-view").then(mod => ({ default: mod.HistoryView })),
  {
    ssr: false,
    loading: () => (
      <div className="flex items-center justify-center h-screen">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
      </div>
    )
  }
)

export default function HistoryPage() {
  return (
    <HistoryView
      latitude={36.7783}
      longitude={-119.4179}
    />
  )
}

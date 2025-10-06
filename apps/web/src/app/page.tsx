"use client"

import Link from "next/link"
import { Users, FlaskConical, Github } from "lucide-react"

export default function HomePage() {
  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 via-blue-50/30 to-slate-100 flex items-center justify-center p-4 relative">
      <div className="w-full max-w-6xl">
        {/* Header */}
        <div className="text-center mb-12">
          <h1 className="text-5xl md:text-6xl font-bold text-foreground mb-4 tracking-tight">
            TEMPO Air Quality
          </h1>
          <p className="text-lg md:text-xl text-muted-foreground">
            Choose your mode to get started
          </p>
        </div>

        {/* Mode Selection Cards */}
        <div className="grid md:grid-cols-2 gap-6 md:gap-8">

          {/* User Mode */}
          <Link href="/usuario">
            <div className="group relative bg-card border border-border rounded-2xl p-8 md:p-12 hover:shadow-xl hover:border-blue-300 transition-all duration-300 cursor-pointer overflow-hidden h-full">
              {/* Gradient overlay on hover */}
              <div className="absolute inset-0 bg-gradient-to-br from-blue-50 to-cyan-50 opacity-0 group-hover:opacity-100 transition-opacity duration-300" />

              <div className="relative z-10 flex flex-col items-center text-center space-y-6">
                {/* Icon */}
                <div className="w-24 h-24 rounded-full bg-blue-100 flex items-center justify-center group-hover:scale-110 transition-transform duration-300">
                  <Users className="w-12 h-12 text-blue-600" />
                </div>

                {/* Title */}
                <h2 className="text-3xl md:text-4xl font-bold text-foreground">
                  User Mode
                </h2>

                {/* Description */}
                <p className="text-base md:text-lg text-muted-foreground max-w-sm">
                  Check air quality in your area, get personalized recommendations, and stay informed about pollution levels
                </p>

                {/* Call to action */}
                <div className="pt-4">
                  <span className="inline-flex items-center text-blue-600 font-medium group-hover:text-blue-700 transition-colors">
                    Get Started
                    <svg className="ml-2 w-5 h-5 group-hover:translate-x-1 transition-transform" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
                    </svg>
                  </span>
                </div>
              </div>
            </div>
          </Link>

          {/* Scientist Mode */}
          <Link href="/estado">
            <div className="group relative bg-card border border-border rounded-2xl p-8 md:p-12 hover:shadow-xl hover:border-purple-300 transition-all duration-300 cursor-pointer overflow-hidden h-full">
              {/* Gradient overlay on hover */}
              <div className="absolute inset-0 bg-gradient-to-br from-purple-50 to-pink-50 opacity-0 group-hover:opacity-100 transition-opacity duration-300" />

              <div className="relative z-10 flex flex-col items-center text-center space-y-6">
                {/* Icon */}
                <div className="w-24 h-24 rounded-full bg-purple-100 flex items-center justify-center group-hover:scale-110 transition-transform duration-300">
                  <FlaskConical className="w-12 h-12 text-purple-600" />
                </div>

                {/* Title */}
                <h2 className="text-3xl md:text-4xl font-bold text-foreground">
                  Scientist Mode
                </h2>

                {/* Description */}
                <p className="text-base md:text-lg text-muted-foreground max-w-sm">
                  Access advanced analytics, detailed data visualizations, and comprehensive environmental monitoring tools
                </p>

                {/* Call to action */}
                <div className="pt-4">
                  <span className="inline-flex items-center text-purple-600 font-medium group-hover:text-purple-700 transition-colors">
                    Get Started
                    <svg className="ml-2 w-5 h-5 group-hover:translate-x-1 transition-transform" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
                    </svg>
                  </span>
                </div>
              </div>
            </div>
          </Link>
        </div>

        {/* Footer note */}
        <div className="text-center mt-12 space-y-4">
          <p className="text-sm text-muted-foreground">
            Powered by NASA TEMPO satellite data
          </p>

          {/* GitHub Link */}
          <a
            href="https://github.com/TextC0de/nasa-hackathon-tempo"
            target="_blank"
            rel="noopener noreferrer"
            className="inline-flex items-center gap-2 text-sm text-muted-foreground hover:text-foreground transition-colors group"
          >
            <Github className="w-5 h-5 group-hover:scale-110 transition-transform" />
            <span className="underline-offset-4 group-hover:underline">
              View on GitHub
            </span>
          </a>
        </div>
      </div>

      {/* GitHub Corner Badge (optional) */}
      <a
        href="https://github.com/TextC0de/nasa-hackathon-tempo"
        target="_blank"
        rel="noopener noreferrer"
        className="absolute top-0 right-0 p-4 text-muted-foreground hover:text-foreground transition-colors"
        aria-label="View source on GitHub"
      >
        <Github className="w-8 h-8 md:w-10 md:h-10" />
      </a>
    </div>
  )
}

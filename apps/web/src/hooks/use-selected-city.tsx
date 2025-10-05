"use client"

import { createContext, useContext, useState, ReactNode } from 'react'

export interface CityData {
  nombre: string
  poblacion: number
  aqi: number | null
  categoria: string | null
  lat: number
  lng: number
}

interface SelectedCityContextType {
  // Ciudad actualmente con hover
  hoveredCity: CityData | null
  setHoveredCity: (city: CityData | null) => void

  // Ciudad seleccionada (click)
  selectedCity: CityData | null
  setSelectedCity: (city: CityData | null) => void
}

const SelectedCityContext = createContext<SelectedCityContextType | undefined>(undefined)

export function SelectedCityProvider({ children }: { children: ReactNode }) {
  const [hoveredCity, setHoveredCity] = useState<CityData | null>(null)
  const [selectedCity, setSelectedCity] = useState<CityData | null>(null)

  return (
    <SelectedCityContext.Provider
      value={{
        hoveredCity,
        setHoveredCity,
        selectedCity,
        setSelectedCity,
      }}
    >
      {children}
    </SelectedCityContext.Provider>
  )
}

export function useSelectedCity() {
  const context = useContext(SelectedCityContext)
  if (context === undefined) {
    throw new Error('useSelectedCity must be used within a SelectedCityProvider')
  }
  return context
}

import { publicProcedure } from '../trpc'
import { z } from 'zod'

const inputSchema = z.object({
  // Opcional: filtrar por nivel de AQI mínimo
  minimoNivelAQI: z.number().min(0).max(500).optional(),
})

// Principales ciudades de California con coordenadas aproximadas
const CIUDADES_CALIFORNIA = [
  { nombre: 'Los Angeles', lat: 34.0522, lng: -118.2437, poblacion: 3898747 },
  { nombre: 'San Diego', lat: 32.7157, lng: -117.1611, poblacion: 1386932 },
  { nombre: 'San Jose', lat: 37.3382, lng: -121.8863, poblacion: 1013240 },
  { nombre: 'San Francisco', lat: 37.7749, lng: -122.4194, poblacion: 873965 },
  { nombre: 'Fresno', lat: 36.7378, lng: -119.7871, poblacion: 542107 },
  { nombre: 'Sacramento', lat: 38.5816, lng: -121.4944, poblacion: 524943 },
  { nombre: 'Long Beach', lat: 33.7701, lng: -118.1937, poblacion: 466742 },
  { nombre: 'Oakland', lat: 37.8044, lng: -122.2712, poblacion: 440646 },
  { nombre: 'Bakersfield', lat: 35.3733, lng: -119.0187, poblacion: 403455 },
  { nombre: 'Anaheim', lat: 33.8366, lng: -117.9143, poblacion: 346824 },
  { nombre: 'Santa Ana', lat: 33.7455, lng: -117.8677, poblacion: 310227 },
  { nombre: 'Riverside', lat: 33.9806, lng: -117.3755, poblacion: 314998 },
  { nombre: 'Stockton', lat: 37.9577, lng: -121.2908, poblacion: 320804 },
  { nombre: 'Irvine', lat: 33.6846, lng: -117.8265, poblacion: 307670 },
  { nombre: 'Chula Vista', lat: 32.6401, lng: -117.0842, poblacion: 275487 },
]

// Función para categorizar AQI
function categorizarAQI(aqi: number): {
  categoria: string
  color: string
  severidad: 'Buena' | 'Moderada' | 'Insalubre para grupos sensibles' | 'Insalubre' | 'Muy insalubre' | 'Peligrosa'
} {
  if (aqi <= 50) {
    return { categoria: 'Buena', color: 'green', severidad: 'Buena' }
  } else if (aqi <= 100) {
    return { categoria: 'Moderada', color: 'yellow', severidad: 'Moderada' }
  } else if (aqi <= 150) {
    return {
      categoria: 'Insalubre para grupos sensibles',
      color: 'orange',
      severidad: 'Insalubre para grupos sensibles',
    }
  } else if (aqi <= 200) {
    return { categoria: 'Insalubre', color: 'red', severidad: 'Insalubre' }
  } else if (aqi <= 300) {
    return { categoria: 'Muy insalubre', color: 'purple', severidad: 'Muy insalubre' }
  } else {
    return { categoria: 'Peligrosa', color: 'maroon', severidad: 'Peligrosa' }
  }
}

export const obtenerPoblacionAfectadaProcedure = publicProcedure
  .input(inputSchema)
  .query(async ({ input, ctx }) => {
    const airnowApiKey = ctx.env.AIRNOW_API_KEY

    console.log('📊 [POBLACIÓN AFECTADA] Obteniendo datos de AQI para ciudades principales...')

    // Obtener AQI para cada ciudad
    const ciudadesConAQI = await Promise.allSettled(
      CIUDADES_CALIFORNIA.map(async (ciudad) => {
        try {
          // Llamar a AirNow API para obtener AQI actual
          const url = `https://www.airnowapi.org/aq/observation/latLong/current/?format=application/json&latitude=${ciudad.lat}&longitude=${ciudad.lng}&distance=50&API_KEY=${airnowApiKey}`

          const response = await fetch(url)

          if (!response.ok) {
            console.warn(`⚠️  No se pudo obtener AQI para ${ciudad.nombre}`)
            return {
              ...ciudad,
              aqi: null,
              categoria: null,
              color: null,
              severidad: null,
            }
          }

          const data = (await response.json()) as Array<{
            AQI: number
            Category: { Name: string }
            ParameterName: string
          }>

          // Tomar el AQI más alto de todos los parámetros
          const aqiMax = data.length > 0 ? Math.max(...data.map((d) => d.AQI)) : null

          if (aqiMax === null) {
            return {
              ...ciudad,
              aqi: null,
              categoria: null,
              color: null,
              severidad: null,
            }
          }

          const clasificacion = categorizarAQI(aqiMax)

          return {
            ...ciudad,
            aqi: aqiMax,
            categoria: clasificacion.categoria,
            color: clasificacion.color,
            severidad: clasificacion.severidad,
          }
        } catch (error) {
          console.error(`❌ Error obteniendo AQI para ${ciudad.nombre}:`, error)
          return {
            ...ciudad,
            aqi: null,
            categoria: null,
            color: null,
            severidad: null,
          }
        }
      })
    )

    // Procesar resultados
    const ciudadesValidas = ciudadesConAQI
      .filter((result) => result.status === 'fulfilled')
      .map((result) => (result as PromiseFulfilledResult<any>).value)
      .filter((ciudad) => ciudad.aqi !== null)

    // Ordenar por AQI descendente
    ciudadesValidas.sort((a, b) => (b.aqi || 0) - (a.aqi || 0))

    // Calcular estadísticas de población afectada
    const estadisticas = {
      poblacionTotal: 0,
      buena: 0,
      moderada: 0,
      insalubre_sensibles: 0,
      insalubre: 0,
      muy_insalubre: 0,
      peligrosa: 0,
    }

    ciudadesValidas.forEach((ciudad) => {
      estadisticas.poblacionTotal += ciudad.poblacion

      if (!ciudad.aqi) return

      if (ciudad.aqi <= 50) {
        estadisticas.buena += ciudad.poblacion
      } else if (ciudad.aqi <= 100) {
        estadisticas.moderada += ciudad.poblacion
      } else if (ciudad.aqi <= 150) {
        estadisticas.insalubre_sensibles += ciudad.poblacion
      } else if (ciudad.aqi <= 200) {
        estadisticas.insalubre += ciudad.poblacion
      } else if (ciudad.aqi <= 300) {
        estadisticas.muy_insalubre += ciudad.poblacion
      } else {
        estadisticas.peligrosa += ciudad.poblacion
      }
    })

    // Aplicar filtro si se especificó
    let ciudadesFiltradas = ciudadesValidas
    if (input.minimoNivelAQI) {
      ciudadesFiltradas = ciudadesValidas.filter(
        (ciudad) => (ciudad.aqi || 0) >= input.minimoNivelAQI!
      )
    }

    console.log(`✅ [POBLACIÓN AFECTADA] ${ciudadesValidas.length} ciudades procesadas`)
    console.log(
      `   Población total monitoreada: ${estadisticas.poblacionTotal.toLocaleString()}`
    )

    return {
      ciudades: ciudadesFiltradas,
      estadisticas,
      timestamp: new Date().toISOString(),
      totalCiudades: ciudadesFiltradas.length,
    }
  })

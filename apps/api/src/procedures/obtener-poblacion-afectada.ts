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

    // ============ DEBUG LOGS ============
    console.log('🔍 [DEBUG] AIRNOW_API_KEY configurada:', airnowApiKey ? 'SÍ' : 'NO')
    console.log('🔍 [DEBUG] AIRNOW_API_KEY completa:', airnowApiKey)
    console.log('🔍 [DEBUG] ctx.env completo:', JSON.stringify(ctx.env, null, 2))
    // ====================================

    // Generar cache key única basada en la hora (datos de AirNow se actualizan cada hora)
    const now = new Date()
    const hourTimestamp = `${now.getUTCFullYear()}-${String(now.getUTCMonth() + 1).padStart(2, '0')}-${String(now.getUTCDate()).padStart(2, '0')}T${String(now.getUTCHours()).padStart(2, '0')}`
    const cacheKey = `poblacion-afectada-v2:${hourTimestamp}:${input.minimoNivelAQI || 0}`
    const cacheUrl = new URL(`https://cache.internal/${cacheKey}`)

    console.log('📊 [POBLACIÓN AFECTADA] Obteniendo datos de AQI para ciudades principales...')
    console.log('🔑 Cache key:', cacheKey)

    const startTime = Date.now()

    // Intentar leer del cache de Cloudflare primero
    try {
      const cachedResponse = await ctx.cache.match(cacheUrl)
      if (cachedResponse) {
        const cachedData = await cachedResponse.json()
        const cacheTime = Date.now() - startTime
        console.log(`✅ [POBLACIÓN AFECTADA] Datos obtenidos del cache de Cloudflare en ${cacheTime}ms`)
        console.log(`   ${(cachedData as any).ciudades?.length || 0} ciudades en cache`)
        return cachedData
      }
      console.log('⚠️  [POBLACIÓN AFECTADA] No hay cache, consultando AirNow API...')
      console.log('   ⏱️  Esto tomará ~7 segundos (15 ciudades con delay de 500ms)')
    } catch (error) {
      console.warn('⚠️  [POBLACIÓN AFECTADA] Error al leer cache, continuando con API:', error)
    }

    // Función helper para delay
    const delay = (ms: number) => new Promise(resolve => setTimeout(resolve, ms))

    // Obtener AQI para cada ciudad CON DELAY para respetar rate limit
    // AirNow permite ~500 req/hora = ~8 req/minuto = 1 req cada 7-8 segundos
    // Usamos 500ms de delay para ser conservadores
    const ciudadesConAQI: PromiseSettledResult<any>[] = []

    for (let i = 0; i < CIUDADES_CALIFORNIA.length; i++) {
      const ciudad = CIUDADES_CALIFORNIA[i]

      // Agregar delay entre llamadas (excepto la primera)
      if (i > 0) {
        await delay(500) // 500ms entre llamadas = máximo 2 req/segundo
      }

      try {
        // Llamar a AirNow API para obtener AQI actual
        const url = `https://www.airnowapi.org/aq/observation/latLong/current/?format=application/json&latitude=${ciudad.lat}&longitude=${ciudad.lng}&distance=50&API_KEY=${airnowApiKey}`

        console.log(`🔄 [POBLACIÓN] Consultando AQI para ${ciudad.nombre}...`)
        console.log(`🔍 [DEBUG] URL completa: ${url}`)

        const response = await fetch(url)

        console.log(`📡 [POBLACIÓN] Respuesta para ${ciudad.nombre}: ${response.status} ${response.statusText}`)

        if (!response.ok) {
          const errorText = await response.text()
          console.warn(`⚠️  [POBLACIÓN] No se pudo obtener AQI para ${ciudad.nombre} (${response.status})`)
          console.warn(`🔍 [DEBUG] Error text:`, errorText)
          if (response.status === 429) {
            console.warn(`   ⏱️  Rate limit excedido, esperando...`)
          }
          ciudadesConAQI.push({
            status: 'fulfilled',
            value: {
              ...ciudad,
              aqi: null,
              categoria: null,
              color: null,
              severidad: null,
            }
          })
          continue
        }

        const data = (await response.json()) as Array<{
          AQI: number
          Category: { Name: string }
          ParameterName: string
        }>

        console.log(`✅ [POBLACIÓN] Datos recibidos para ${ciudad.nombre}: ${data.length} parámetros`)
        console.log(`🔍 [DEBUG] Datos completos:`, JSON.stringify(data, null, 2))
        if (data.length > 0) {
          console.log(`   AQI values: ${data.map(d => `${d.ParameterName}=${d.AQI}`).join(', ')}`)
        }

        // Tomar el AQI más alto de todos los parámetros
        const aqiMax = data.length > 0 ? Math.max(...data.map((d) => d.AQI)) : null

        if (aqiMax === null) {
          console.warn(`⚠️  [POBLACIÓN] No hay datos de AQI para ${ciudad.nombre}`)
          console.warn(`🔍 [DEBUG] Array de datos vacío o inválido`)
          ciudadesConAQI.push({
            status: 'fulfilled',
            value: {
              ...ciudad,
              aqi: null,
              categoria: null,
              color: null,
              severidad: null,
            }
          })
          continue
        }

        const clasificacion = categorizarAQI(aqiMax)

        console.log(`✅ [POBLACIÓN] ${ciudad.nombre}: AQI ${aqiMax} (${clasificacion.categoria})`)

        ciudadesConAQI.push({
          status: 'fulfilled',
          value: {
            ...ciudad,
            aqi: aqiMax,
            categoria: clasificacion.categoria,
            color: clasificacion.color,
            severidad: clasificacion.severidad,
          }
        })
      } catch (error) {
        console.error(`❌ [POBLACIÓN] Error obteniendo AQI para ${ciudad.nombre}:`, error)
        if (error instanceof Error) {
          console.error(`   Message: ${error.message}`)
        }
        ciudadesConAQI.push({
          status: 'fulfilled',
          value: {
            ...ciudad,
            aqi: null,
            categoria: null,
            color: null,
            severidad: null,
          }
        })
      }
    }

    // Procesar resultados
    console.log(`🔍 [DEBUG] Total resultados obtenidos: ${ciudadesConAQI.length}`)

    const ciudadesConAQIData = ciudadesConAQI
      .filter((result) => result.status === 'fulfilled')
      .map((result) => (result as PromiseFulfilledResult<any>).value)

    console.log(`🔍 [DEBUG] Ciudades fulfilled: ${ciudadesConAQIData.length}`)
    console.log(`🔍 [DEBUG] Datos de todas las ciudades:`, JSON.stringify(ciudadesConAQIData.map(c => ({ nombre: c.nombre, aqi: c.aqi })), null, 2))

    const ciudadesValidas = ciudadesConAQIData.filter((ciudad) => ciudad.aqi !== null)

    console.log(`🔍 [DEBUG] Ciudades con AQI válido: ${ciudadesValidas.length}`)

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

    const elapsedTime = Date.now() - startTime
    console.log(`✅ [POBLACIÓN AFECTADA] ${ciudadesValidas.length} ciudades procesadas en ${elapsedTime}ms`)
    console.log(
      `   Población total monitoreada: ${estadisticas.poblacionTotal.toLocaleString()}`
    )

    const result = {
      ciudades: ciudadesFiltradas,
      estadisticas,
      timestamp: new Date().toISOString(),
      totalCiudades: ciudadesFiltradas.length,
    }

    // Guardar en cache de Cloudflare (TTL: 1 hora = 3600 segundos)
    try {
      const cacheResponse = new Response(JSON.stringify(result), {
        headers: {
          'Content-Type': 'application/json',
          'Cache-Control': 'public, max-age=3600', // 1 hora
          'CDN-Cache-Control': 'public, max-age=3600',
        },
      })

      // waitUntil permite guardar en cache sin bloquear la respuesta
      if (ctx.waitUntil) {
        ctx.waitUntil(ctx.cache.put(cacheUrl, cacheResponse.clone()))
        console.log('💾 [POBLACIÓN AFECTADA] Datos guardados en cache de Cloudflare (async)')
      } else {
        await ctx.cache.put(cacheUrl, cacheResponse)
        console.log('💾 [POBLACIÓN AFECTADA] Datos guardados en cache de Cloudflare (sync)')
      }
    } catch (error) {
      console.warn('⚠️  [POBLACIÓN AFECTADA] Error al guardar en cache:', error)
      // No fallar si el cache no funciona, solo logear el error
    }

    return result
  })

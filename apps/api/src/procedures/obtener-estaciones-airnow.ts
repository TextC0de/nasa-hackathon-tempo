import { z } from 'zod'
import { publicProcedure } from '../trpc'
import { AirNowClient } from '@atmos/airnow-client'
import { dividirBboxEnChunks, type BoundingBox } from '../utils/geo-chunking'

export const obtenerEstacionesAirNowProcedure = publicProcedure
  .input(
    z.object({
      bbox: z.object({
        minLatitude: z.number().min(-90).max(90),
        maxLatitude: z.number().min(-90).max(90),
        minLongitude: z.number().min(-180).max(180),
        maxLongitude: z.number().min(-180).max(180),
      })
    })
  )
.query(async ({ input, ctx }) => {
    const { bbox } = input

    // Generar fechas dinámicamente (última hora completa)
    const now = new Date()
    const endDate = new Date(now.getFullYear(), now.getMonth(), now.getDate(), now.getHours())
    const startDate = new Date(endDate)
    startDate.setHours(startDate.getHours() - 1)

    const formatDate = (date: Date) => {
      const year = date.getFullYear()
      const month = String(date.getMonth() + 1).padStart(2, '0')
      const day = String(date.getDate()).padStart(2, '0')
      const hour = String(date.getHours()).padStart(2, '0')
      return `${year}-${month}-${day}T${hour}`
    }

    // Generar cache key única basada en bbox + fecha/hora (solo año-mes-día-hora)
    // Datos de AirNow se actualizan cada hora, así que cacheamos por hora completa
    // NO incluir minutos/segundos para que el cache sea reutilizable durante toda la hora
    const hourTimestamp = `${endDate.getUTCFullYear()}-${String(endDate.getUTCMonth() + 1).padStart(2, '0')}-${String(endDate.getUTCDate()).padStart(2, '0')}T${String(endDate.getUTCHours()).padStart(2, '0')}`
    const cacheKey = `airnow-stations:${bbox.minLatitude.toFixed(2)},${bbox.minLongitude.toFixed(2)},${bbox.maxLatitude.toFixed(2)},${bbox.maxLongitude.toFixed(2)}:${hourTimestamp}`
    const cacheUrl = new URL(`https://cache.internal/${cacheKey}`)

    console.log('🔍 [AIRNOW] === SOLICITUD DE ESTACIONES ===')
    console.log('📦 BoundingBox recibido desde UI:', bbox)
    console.log('📅 Fechas:', {
      start: formatDate(startDate),
      end: formatDate(endDate)
    })
    console.log('🔑 Cache key:', cacheKey)

    // Intentar leer del cache de Cloudflare primero
    try {
      const cachedResponse = await ctx.cache.match(cacheUrl)
      if (cachedResponse) {
        const cachedData = await cachedResponse.json()
        console.log('✅ [AIRNOW] Datos obtenidos del cache de Cloudflare')
        console.log(`📊 [AIRNOW] Estaciones en cache: ${cachedData.length}`)
        return cachedData
      }
      console.log('⚠️  [AIRNOW] No hay cache, consultando AirNow API...')
    } catch (error) {
      console.warn('⚠️  [AIRNOW] Error al leer cache, continuando con API:', error)
    }

    const airnowClient = new AirNowClient({ apiKey: 'DA9ADC07-8368-4CA1-8B46-6C3A13D6BA1D' })

    try {
      // ESTRATEGIA: Intentar primero con bbox completo (AirNow no documenta límite de km²)
      // Si falla por tamaño, usar chunking conservador de 100km (rate limit: 500 req/hora)

      console.log(`🔄 [AIRNOW] Intentando consulta con bbox completo...`)

      const stations = await airnowClient.getMonitoringSites(
        bbox,
        {
          startDate: formatDate(startDate),
          endDate: formatDate(endDate),
          parameters: 'NO2,PM25,O3,PM10,SO2,CO,HCHO',
        }
      )

      console.log(`✅ [AIRNOW] Estaciones recibidas: ${stations?.length || 0}`)

      if (stations && stations.length > 0) {
        console.log('📊 [AIRNOW] Primeras 3 estaciones:')
        stations.slice(0, 3).forEach((station, idx) => {
          console.log(`  ${idx + 1}. ${station.SiteName}:`, {
            coords: [station.Latitude, station.Longitude],
            AQI: station.AQI,
            Parameter: station.Parameter
          })
        })

        // Análisis de coordenadas únicas
        const uniqueCoords = new Set(
          stations.map(s => `${s.Latitude.toFixed(4)},${s.Longitude.toFixed(4)}`)
        )
        console.log(`🗺️  [AIRNOW] Ubicaciones físicas: ${uniqueCoords.size}`)
      }

      const result = stations || []

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
          console.log('💾 [AIRNOW] Datos guardados en cache de Cloudflare (async)')
        } else {
          await ctx.cache.put(cacheUrl, cacheResponse)
          console.log('💾 [AIRNOW] Datos guardados en cache de Cloudflare (sync)')
        }
      } catch (error) {
        console.warn('⚠️  [AIRNOW] Error al guardar en cache:', error)
        // No fallar si el cache no funciona, solo logear el error
      }

      return result
    } catch (error: any) {
      // Si falla bbox completo (400 = bbox muy grande, 429 = rate limit), intentar chunking
      const shouldRetryWithChunks =
        error.message?.includes('400') ||
        error.message?.includes('Invalid request') ||
        error.message?.includes('too large') ||
        error.message?.includes('exceeded')

      if (shouldRetryWithChunks) {
        console.warn(`⚠️  [AIRNOW] Bbox completo falló (posiblemente muy grande), intentando chunking...`)

        // Dividir en chunks de 100km (mucho más conservador que 20km)
        const chunks = dividirBboxEnChunks(bbox, 100)
        console.log(`📦 [AIRNOW] Dividido en ${chunks.length} chunks de 100km`)

        if (chunks.length > 500) {
          throw new Error(
            `Área demasiado grande: ${chunks.length} chunks excede límite de 500 req/hora de AirNow. ` +
            `Reduce el área o aumenta el tamaño de chunk.`
          )
        }

        // Consultar chunks con delay para respetar rate limit
        const allStations: any[] = []
        const BATCH_SIZE = 50 // Procesar en lotes de 50 para evitar saturar

        for (let i = 0; i < chunks.length; i += BATCH_SIZE) {
          const batch = chunks.slice(i, i + BATCH_SIZE)
          console.log(`🔄 [AIRNOW] Procesando lote ${Math.floor(i / BATCH_SIZE) + 1}/${Math.ceil(chunks.length / BATCH_SIZE)}...`)

          const batchResults = await Promise.all(
            batch.map(async (chunk) => {
              try {
                return await airnowClient.getMonitoringSites(chunk, {
                  startDate: formatDate(startDate),
                  endDate: formatDate(endDate),
                  parameters: 'NO2,PM25,O3,PM10,SO2,CO,HCHO',
                })
              } catch (err) {
                console.error(`❌ Chunk falló:`, err)
                return []
              }
            })
          )

          allStations.push(...batchResults.flat())

          // Pequeño delay entre lotes
          if (i + BATCH_SIZE < chunks.length) {
            await new Promise(resolve => setTimeout(resolve, 1000))
          }
        }

        // Deduplicar
        const uniqueStations = new Map()
        allStations.forEach(station => {
          const key = `${station.Latitude?.toFixed(6)}-${station.Longitude?.toFixed(6)}-${station.SiteName}-${station.Parameter}`
          if (!uniqueStations.has(key)) {
            uniqueStations.set(key, station)
          }
        })

        const deduplicated = Array.from(uniqueStations.values())
        console.log(`✅ [AIRNOW] Estaciones únicas (chunked): ${deduplicated.length}`)

        // Guardar resultado chunked en cache también
        try {
          const cacheResponse = new Response(JSON.stringify(deduplicated), {
            headers: {
              'Content-Type': 'application/json',
              'Cache-Control': 'public, max-age=3600', // 1 hora
              'CDN-Cache-Control': 'public, max-age=3600',
            },
          })

          if (ctx.waitUntil) {
            ctx.waitUntil(ctx.cache.put(cacheUrl, cacheResponse.clone()))
            console.log('💾 [AIRNOW] Datos chunked guardados en cache de Cloudflare (async)')
          } else {
            await ctx.cache.put(cacheUrl, cacheResponse)
            console.log('💾 [AIRNOW] Datos chunked guardados en cache de Cloudflare (sync)')
          }
        } catch (cacheError) {
          console.warn('⚠️  [AIRNOW] Error al guardar en cache (chunked):', cacheError)
        }

        return deduplicated
      }

      console.error('❌ [AIRNOW] Error al obtener estaciones:', error)
      throw error
    }
  })

import { z } from 'zod'
import { publicProcedure } from '../trpc'
import { sql } from 'drizzle-orm'
import { aqStations } from '@atmos/database'
import { AirNowClient } from '@atmos/airnow-client'
import { OpenMeteoClient, HourlyVariable } from '@atmos/openmeteo-client'
import { TEMPOService } from '@atmos/earthdata-imageserver-client'

/**
 * Procedure: predecir-aqi
 *
 * Predice la calidad del aire en una ubicación específica usando:
 * 1. Búsqueda de estación AQ más cercana (PostgreSQL PostGIS)
 * 2. Datos actuales de AirNow para esa estación
 * 3. Datos meteorológicos de OpenMeteo para esa ubicación
 * 4. Modelo de forecasting (TODO: integrar modelo de advección)
 */
export const predecirAqiProcedure = publicProcedure
  .input(
    z.object({
      latitude: z.number().min(-90).max(90),
      longitude: z.number().min(-180).max(180),
    })
  )
  .query(async ({ input, ctx }) => {
    const { latitude, longitude } = input

    // =====================================================
    // 1. BUSCAR ESTACIÓN MÁS CERCANA
    // =====================================================
    console.log(`📍 Buscando estación más cercana a (${latitude}, ${longitude})...`)

    // Usar PostGIS ST_Distance para encontrar la estación más cercana
    // ST_Distance con geography devuelve metros
    const nearestStation = await ctx.db
      .select({
        id: aqStations.id,
        provider: aqStations.provider,
        parameter: aqStations.parameter,
        // Extraer lat/lon de la columna geometry
        latitude: sql<number>`ST_Y(${aqStations.location})`.as('latitude'),
        longitude: sql<number>`ST_X(${aqStations.location})`.as('longitude'),
        // Calcular distancia en kilómetros usando PostGIS ST_Distance con geography
        // geography cast convierte automáticamente a esfera y devuelve metros
        distance: sql<number>`
          ST_Distance(
            ${aqStations.location}::geography,
            ST_SetSRID(ST_MakePoint(${longitude}, ${latitude}), 4326)::geography
          ) / 1000
        `.as('distance'),
      })
      .from(aqStations)
      .orderBy(sql`distance ASC`)
      .limit(1)

    if (!nearestStation || nearestStation.length === 0) {
      throw new Error('No se encontró ninguna estación en la base de datos')
    }

    const station = nearestStation[0]
    console.log(`   ✓ Estación encontrada: ${station.provider} a ${station.distance?.toFixed(2)} km`)

    // =====================================================
    // 2. OBTENER DATOS ACTUALES DE AIRNOW (MONITORING SITES)
    // =====================================================
    console.log(`📊 Obteniendo datos de AirNow...`)

    const airNowClient = new AirNowClient({
      apiKey: ctx.env.AIRNOW_API_KEY,
    })

    // Crear bounding box pequeño alrededor de la estación (±0.5° ~ 55km)
    const latOffset = 0.5
    const lngOffset = 0.5

    // Obtener hora actual para el rango de tiempo
    const now = new Date()
    const endTime = new Date(now.getTime() + 60 * 60 * 1000) // +1 hora
    const startDate = `${now.getUTCFullYear()}-${String(now.getUTCMonth() + 1).padStart(2, '0')}-${String(now.getUTCDate()).padStart(2, '0')}T${String(now.getUTCHours()).padStart(2, '0')}`
    const endDate = `${endTime.getUTCFullYear()}-${String(endTime.getUTCMonth() + 1).padStart(2, '0')}-${String(endTime.getUTCDate()).padStart(2, '0')}T${String(endTime.getUTCHours()).padStart(2, '0')}`

    // Obtener datos de monitoring sites (incluye Value, Unit, RawConcentration, etc.)
    const currentAirQuality = await airNowClient.getMonitoringSites(
      {
        minLongitude: station.longitude - lngOffset,
        minLatitude: station.latitude - latOffset,
        maxLongitude: station.longitude + lngOffset,
        maxLatitude: station.latitude + latOffset,
      },
      {
        startDate,
        endDate,
        parameters: 'O3,NO2,PM25',
        dataType: 'B',
        verbose: 1,
        monitorType: 2,
        includerawconcentrations: 1,
      }
    )

    console.log(`   ✓ ${currentAirQuality.length} observaciones obtenidas`)

    // =====================================================
    // 3. OBTENER DATOS DE TEMPO (O3 y NO2)
    // =====================================================
    console.log(`🛰️  Obteniendo datos de TEMPO...`)

    const tempoService = new TEMPOService()

    // Obtener TEMPO en la estación y en la ubicación del usuario
    let o3Tempo: { station: number | null; user: number | null; ratio: number | null } = {
      station: null,
      user: null,
      ratio: null,
    }
    let no2Tempo: { station: number | null; user: number | null; ratio: number | null } = {
      station: null,
      user: null,
      ratio: null,
    }

    try {
      // O3 TEMPO
      const [o3Station, o3User] = await Promise.all([
        tempoService.getO3AtPoint({
          location: { latitude: station.latitude, longitude: station.longitude },
          timestamp: now,
        }).catch(() => null),
        tempoService.getO3AtPoint({
          location: { latitude, longitude },
          timestamp: now,
        }).catch(() => null),
      ])

      o3Tempo.station = o3Station?.value ?? null
      o3Tempo.user = o3User?.value ?? null

      console.log(`   ✓ O3 TEMPO - Estación: ${o3Tempo.station}, Usuario: ${o3Tempo.user}`)
    } catch (error) {
      console.log(`   ⚠ Error obteniendo O3 TEMPO: ${error}`)
    }

    try {
      // NO2 TEMPO
      const [no2Station, no2User] = await Promise.all([
        tempoService.getNO2AtPoint({
          location: { latitude: station.latitude, longitude: station.longitude },
          timestamp: now,
        }).catch(() => null),
        tempoService.getNO2AtPoint({
          location: { latitude, longitude },
          timestamp: now,
        }).catch(() => null),
      ])

      no2Tempo.station = no2Station?.value ?? null
      no2Tempo.user = no2User?.value ?? null

      console.log(`   ✓ NO2 TEMPO - Estación: ${no2Tempo.station}, Usuario: ${no2Tempo.user}`)
    } catch (error) {
      console.log(`   ⚠ Error obteniendo NO2 TEMPO: ${error}`)
    }

    // =====================================================
    // 4. OBTENER DATOS METEOROLÓGICOS DE OPENMETEO
    // =====================================================
    console.log(`🌤️  Obteniendo datos meteorológicos...`)

    const openMeteoClient = new OpenMeteoClient()

    const forecastData = await openMeteoClient.getForecast(
      {
        latitude: station.latitude,
        longitude: station.longitude,
      },
      {
        hourly: [
          HourlyVariable.TEMPERATURE_2M,
          HourlyVariable.WIND_SPEED_10M,
          HourlyVariable.WIND_DIRECTION_10M,
          HourlyVariable.RELATIVE_HUMIDITY_2M,
          HourlyVariable.PRECIPITATION,
        ],
      }
    )

    const weather = openMeteoClient.getWeatherAtTime(forecastData, new Date())

    if (!weather) {
      throw new Error('No se pudo obtener el clima actual')
    }

    console.log(`   ✓ Clima obtenido: ${weather.temperature}°C, viento ${weather.windSpeed} m/s`)

    // =====================================================
    // 5. ORGANIZAR DATOS POR PARÁMETRO Y CALCULAR PROPORCIÓN TEMPO
    // =====================================================

    // Buscar datos para cada parámetro (MonitoringSite usa 'Parameter' no 'ParameterName')
    const o3Data = currentAirQuality.find((obs) => obs.Parameter.toUpperCase().includes('O3'))
    const no2Data = currentAirQuality.find((obs) => obs.Parameter.toUpperCase().includes('NO2'))
    const pm25Data = currentAirQuality.find((obs) => obs.Parameter.toUpperCase().includes('PM2.5'))

    // NOTA IMPORTANTE: Las proporciones tienen sentido limitado porque:
    // - TEMPO mide columna troposférica (integral vertical)
    // - AirNow mide concentración superficial (ground level)
    // La proporción solo sirve como proxy aproximado para downscaling espacial

    // Calcular proporción O3: estación_real / tempo_estación
    if (o3Data && o3Tempo.station && o3Tempo.station > 0) {
      // Usar Value (concentración real) si está disponible y > 0, sino usar AQI
      // TEMPO O3 está en DU (columna), AirNow en ppb/ppm (superficie)
      // La proporción es dimensional pero sirve para downscaling espacial relativo
      const o3_station_value = o3Data.Value > 0 ? o3Data.Value : o3Data.AQI
      o3Tempo.ratio = o3_station_value / o3Tempo.station
      const unit = o3Data.Value > 0 ? o3Data.Unit : 'AQI'
      console.log(`   ✓ Proporción O3: ${o3Tempo.ratio.toFixed(6)} (${unit}/DU - proxy espacial)`)
    }

    // Calcular proporción NO2: estación_real / tempo_estación
    if (no2Data && no2Tempo.station && no2Tempo.station > 0) {
      // TEMPO NO2 está en moléculas/cm² (columna), AirNow en ppb/ugm3 (superficie)
      // Usar Value (concentración real) si está disponible y > 0, sino usar AQI
      const no2_station_value = no2Data.Value > 0 ? no2Data.Value : no2Data.AQI
      no2Tempo.ratio = no2_station_value / no2Tempo.station
      const unit = no2Data.Value > 0 ? no2Data.Unit : 'AQI'
      console.log(`   ✓ Proporción NO2: ${no2Tempo.ratio.toFixed(6)} (${unit}/molec·cm⁻² - proxy espacial)`)
    }

    // Helper para crear forecast mock
    const createForecast = (currentValue: number) => ({
      t1h: currentValue,
      t2h: currentValue,
      t3h: currentValue,
    })

    console.log(`✅ Predicción generada`)

    // =====================================================
    // 6. CALCULAR AQI GENERAL (EL PEOR DE TODOS)
    // =====================================================
    const allAqis = [o3Data?.AQI, no2Data?.AQI, pm25Data?.AQI].filter((aqi) => aqi != null) as number[]
    const generalAqi = allAqis.length > 0 ? Math.max(...allAqis) : null
    const worstParameter = generalAqi
      ? currentAirQuality.find((obs) => obs.AQI === generalAqi)
      : null

    // Mapeo de categorías AQI (1-6 a nombres)
    const getCategoryName = (categoryNum: number): string => {
      const categories = ['Good', 'Moderate', 'Unhealthy for Sensitive Groups', 'Unhealthy', 'Very Unhealthy', 'Hazardous']
      return categories[categoryNum - 1] || 'Unknown'
    }

    // =====================================================
    // 7. RETORNAR RESULTADO
    // =====================================================
    return {
      station: {
        id: station.id,
        provider: station.provider,
        latitude: station.latitude,
        longitude: station.longitude,
        distanceKm: station.distance,
      },
      weather: {
        temperature: weather.temperature,
        windSpeed: weather.windSpeed,
        windDirection: weather.windDirection,
        relativeHumidity: weather.relativeHumidity,
        precipitation: weather.precipitation,
      },
      general: generalAqi
        ? {
            aqi: generalAqi,
            category: getCategoryName(worstParameter?.Category ?? 0),
            dominantParameter: worstParameter?.Parameter,
          }
        : null,
      O3: o3Data
        ? {
            currentData: {
              aqi: o3Data.AQI,
              category: getCategoryName(o3Data.Category),
              value: o3Data.Value,
              unit: o3Data.Unit,
              rawConcentration: o3Data.RawConcentration,
              utc: o3Data.UTC,
              parameterName: o3Data.Parameter,
              siteName: o3Data.SiteName,
            },
            tempo: {
              station: o3Tempo.station,
              user: o3Tempo.user,
              ratio: o3Tempo.ratio,
              // Estimación basada en TEMPO si hay proporción
              estimatedUserValue: o3Tempo.ratio && o3Tempo.user
                ? o3Tempo.ratio * o3Tempo.user
                : null,
            },
            forecast: {
              horizons: [
                { hoursAhead: 1, predictedAQI: createForecast(o3Data.AQI).t1h },
                { hoursAhead: 2, predictedAQI: createForecast(o3Data.AQI).t2h },
                { hoursAhead: 3, predictedAQI: createForecast(o3Data.AQI).t3h },
              ],
            },
          }
        : null,
      NO2: no2Data
        ? {
            currentData: {
              aqi: no2Data.AQI,
              category: getCategoryName(no2Data.Category),
              value: no2Data.Value,
              unit: no2Data.Unit,
              rawConcentration: no2Data.RawConcentration,
              utc: no2Data.UTC,
              parameterName: no2Data.Parameter,
              siteName: no2Data.SiteName,
            },
            tempo: {
              station: no2Tempo.station,
              user: no2Tempo.user,
              ratio: no2Tempo.ratio,
              // Estimación basada en TEMPO si hay proporción
              estimatedUserValue: no2Tempo.ratio && no2Tempo.user
                ? no2Tempo.ratio * no2Tempo.user
                : null,
            },
            forecast: {
              horizons: [
                { hoursAhead: 1, predictedAQI: createForecast(no2Data.AQI).t1h },
                { hoursAhead: 2, predictedAQI: createForecast(no2Data.AQI).t2h },
                { hoursAhead: 3, predictedAQI: createForecast(no2Data.AQI).t3h },
              ],
            },
          }
        : null,
      PM25: pm25Data
        ? {
            currentData: {
              aqi: pm25Data.AQI,
              category: getCategoryName(pm25Data.Category),
              value: pm25Data.Value,
              unit: pm25Data.Unit,
              rawConcentration: pm25Data.RawConcentration,
              utc: pm25Data.UTC,
              parameterName: pm25Data.Parameter,
              siteName: pm25Data.SiteName,
            },
            tempo: null, // PM2.5 no tiene datos TEMPO
            forecast: {
              horizons: [
                { hoursAhead: 1, predictedAQI: createForecast(pm25Data.AQI).t1h },
                { hoursAhead: 2, predictedAQI: createForecast(pm25Data.AQI).t2h },
                { hoursAhead: 3, predictedAQI: createForecast(pm25Data.AQI).t3h },
              ],
            },
          }
        : null,
    }
  })

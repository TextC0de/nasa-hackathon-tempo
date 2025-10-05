import { z } from 'zod'
import { publicProcedure } from '../trpc'
import { sql } from 'drizzle-orm'

/**
 * Procedure: obtener-historico-aqi
 *
 * Obtiene datos históricos de AQI para una ubicación y rango de fechas.
 * Usa la tabla granular `aqi_measurements` con agregación SQL nativa (GROUP BY).
 *
 * Granularidad automática:
 * - <= 7 días: datos por hora
 * - > 7 días: datos por día
 */
export const obtenerHistoricoAqiProcedure = publicProcedure
  .input(
    z.object({
      latitude: z.number().min(-90).max(90),
      longitude: z.number().min(-180).max(180),
      // Fechas de inicio y fin
      startDate: z.string().datetime(),
      endDate: z.string().datetime(),
      // Granularidad de agregación
      granularity: z.enum(['hourly', 'daily', 'weekly', 'monthly']).default('daily'),
      // Radio de búsqueda en km (default 50km)
      radiusKm: z.number().min(1).max(200).default(50),
    })
  )
  .query(async ({ input, ctx }) => {
    try {
    const { latitude, longitude, startDate: startDateStr, endDate: endDateStr, granularity, radiusKm } = input

    const startDate = new Date(startDateStr)
    const endDate = new Date(endDateStr)

    console.log(`📈 Obteniendo histórico de AQI para (${latitude}, ${longitude})`)
    console.log(`   Rango: ${startDate.toISOString()} → ${endDate.toISOString()}`)
    console.log(`   Granularidad: ${granularity}, Radio: ${radiusKm} km`)

    // Calcular bounding box para el radio especificado
    // 1 grado de latitud ≈ 111 km
    // 1 grado de longitud ≈ 111 km * cos(latitude)
    const latDelta = radiusKm / 111
    const lngDelta = radiusKm / (111 * Math.cos(latitude * Math.PI / 180))

    const latMin = latitude - latDelta
    const latMax = latitude + latDelta
    const lngMin = longitude - lngDelta
    const lngMax = longitude + lngDelta

    console.log(`   Bounding box: (${latMin.toFixed(2)}, ${lngMin.toFixed(2)}) → (${latMax.toFixed(2)}, ${lngMax.toFixed(2)})`)

    let data: any[]
    let datetruncExpression: string

    // Determinar expresión DATE_TRUNC según granularidad
    switch (granularity) {
      case 'hourly':
        datetruncExpression = 'hour'
        console.log(`   Granularidad: POR HORA (SQL GROUP BY)`)
        break
      case 'daily':
        datetruncExpression = 'day'
        console.log(`   Granularidad: POR DÍA (SQL GROUP BY)`)
        break
      case 'weekly':
        datetruncExpression = 'week'
        console.log(`   Granularidad: POR SEMANA (SQL GROUP BY)`)
        break
      case 'monthly':
        datetruncExpression = 'month'
        console.log(`   Granularidad: POR MES (SQL GROUP BY)`)
        break
    }

    if (granularity === 'hourly') {

      // Agregación SQL nativa por hora
      const rawData = await ctx.db.execute<{
        timestamp: string
        aqi_avg: number
        aqi_min: number
        aqi_max: number
        o3_avg: number | null
        no2_avg: number | null
        pm25_avg: number | null
        samples_count: number
      }>(sql`
        SELECT
          DATE_TRUNC('hour', timestamp)::text as timestamp,
          AVG(aqi)::numeric as aqi_avg,
          MIN(aqi)::numeric as aqi_min,
          MAX(aqi)::numeric as aqi_max,
          AVG(CASE WHEN parameter = 'O3' THEN value END)::numeric as o3_avg,
          AVG(CASE WHEN parameter = 'NO2' THEN value END)::numeric as no2_avg,
          AVG(CASE WHEN parameter = 'PM25' THEN value END)::numeric as pm25_avg,
          COUNT(*)::integer as samples_count
        FROM aqi_measurements
        WHERE
          lat BETWEEN ${latMin} AND ${latMax}
          AND lng BETWEEN ${lngMin} AND ${lngMax}
          AND timestamp >= ${startDate.toISOString()}
          AND timestamp <= ${endDate.toISOString()}
        GROUP BY DATE_TRUNC('hour', timestamp)
        ORDER BY DATE_TRUNC('hour', timestamp) ASC
        LIMIT 500
      `)

      console.log(`   ✓ ${rawData.length} registros agregados encontrados`)

      data = rawData.map(row => ({
        timestamp: row.timestamp,
        aqi_avg: Number(row.aqi_avg),
        aqi_min: Number(row.aqi_min),
        aqi_max: Number(row.aqi_max),
        o3_avg: row.o3_avg ? Number(row.o3_avg) : null,
        no2_avg: row.no2_avg ? Number(row.no2_avg) : null,
        pm25_avg: row.pm25_avg ? Number(row.pm25_avg) : null,
        dominant_pollutant: null, // TODO: Calcular con MODE() si es necesario
      }))
    } else {
      // Agregación para daily, weekly, monthly
      const rawData = await ctx.db.execute<{
        timestamp: string
        aqi_avg: number
        aqi_min: number
        aqi_max: number
        o3_avg: number | null
        no2_avg: number | null
        pm25_avg: number | null
        samples_count: number
        good_hours: number
        moderate_hours: number
        unhealthy_sensitive_hours: number
        unhealthy_hours: number
      }>(sql`
        SELECT
          DATE_TRUNC('${sql.raw(datetruncExpression)}', timestamp)::text as timestamp,
          AVG(aqi)::numeric as aqi_avg,
          MIN(aqi)::numeric as aqi_min,
          MAX(aqi)::numeric as aqi_max,
          AVG(CASE WHEN parameter = 'O3' THEN value END)::numeric as o3_avg,
          AVG(CASE WHEN parameter = 'NO2' THEN value END)::numeric as no2_avg,
          AVG(CASE WHEN parameter = 'PM25' THEN value END)::numeric as pm25_avg,
          COUNT(*)::integer as samples_count,
          SUM(CASE WHEN aqi <= 50 THEN 1 ELSE 0 END)::integer as good_hours,
          SUM(CASE WHEN aqi > 50 AND aqi <= 100 THEN 1 ELSE 0 END)::integer as moderate_hours,
          SUM(CASE WHEN aqi > 100 AND aqi <= 150 THEN 1 ELSE 0 END)::integer as unhealthy_sensitive_hours,
          SUM(CASE WHEN aqi > 150 AND aqi <= 200 THEN 1 ELSE 0 END)::integer as unhealthy_hours
        FROM aqi_measurements
        WHERE
          lat BETWEEN ${latMin} AND ${latMax}
          AND lng BETWEEN ${lngMin} AND ${lngMax}
          AND timestamp >= ${startDate.toISOString()}
          AND timestamp <= ${endDate.toISOString()}
        GROUP BY DATE_TRUNC('${sql.raw(datetruncExpression)}', timestamp)
        ORDER BY DATE_TRUNC('${sql.raw(datetruncExpression)}', timestamp) ASC
        LIMIT 1000
      `)

      console.log(`   ✓ ${rawData.length} registros agregados encontrados`)

      data = rawData.map(row => ({
        timestamp: row.timestamp,
        aqi_avg: Number(row.aqi_avg),
        aqi_min: Number(row.aqi_min),
        aqi_max: Number(row.aqi_max),
        o3_avg: row.o3_avg ? Number(row.o3_avg) : null,
        no2_avg: row.no2_avg ? Number(row.no2_avg) : null,
        pm25_avg: row.pm25_avg ? Number(row.pm25_avg) : null,
        dominant_pollutant: null,
        good_hours: row.good_hours,
        moderate_hours: row.moderate_hours,
        unhealthy_sensitive_hours: row.unhealthy_sensitive_hours,
        unhealthy_hours: row.unhealthy_hours,
        very_unhealthy_hours: 0, // No calculado aún
        hazardous_hours: 0, // No calculado aún
      }))
    }

    // Calcular estadísticas
    if (data.length === 0) {
      console.log(`   ⚠️  No hay datos históricos para esta ubicación`)
      return {
        granularity: granularity as 'hourly' | 'daily' | 'weekly' | 'monthly',
        data: [],
        stats: null,
        trend: null,
      }
    }

    const aqiValues = data.map(d => d.aqi_avg).filter(v => v != null)
    const stats = {
      avg: aqiValues.reduce((a, b) => a + b, 0) / aqiValues.length,
      min: Math.min(...aqiValues),
      max: Math.max(...aqiValues),
      count: data.length,
    }

    // Calcular tendencia (comparar primera mitad vs segunda mitad)
    const midpoint = Math.floor(data.length / 2)
    const firstHalf = aqiValues.slice(0, midpoint)
    const secondHalf = aqiValues.slice(midpoint)

    const firstAvg = firstHalf.reduce((a, b) => a + b, 0) / firstHalf.length
    const secondAvg = secondHalf.reduce((a, b) => a + b, 0) / secondHalf.length

    const trendPct = ((secondAvg - firstAvg) / firstAvg) * 100

    let trendDirection: 'improving' | 'worsening' | 'stable' = 'stable'
    if (trendPct < -5) trendDirection = 'improving'
    else if (trendPct > 5) trendDirection = 'worsening'

    console.log(`✅ Histórico obtenido (${granularity}):`)
    console.log(`   Registros: ${data.length}`)
    console.log(`   AQI promedio: ${stats.avg.toFixed(1)}`)
    console.log(`   Tendencia: ${trendDirection} (${trendPct > 0 ? '+' : ''}${trendPct.toFixed(1)}%)`)

    // Formatear mensaje de tendencia con más detalle
    const trendMessage = (() => {
      const firstHalfAvg = firstAvg.toFixed(1)
      const secondHalfAvg = secondAvg.toFixed(1)

      if (trendDirection === 'improving') {
        return `Mejorando: La segunda mitad del período (AQI ${secondHalfAvg}) muestra un ${Math.abs(trendPct).toFixed(1)}% menos de contaminación que la primera mitad (AQI ${firstHalfAvg})`
      } else if (trendDirection === 'worsening') {
        return `Empeorando: La segunda mitad del período (AQI ${secondHalfAvg}) muestra un ${trendPct.toFixed(1)}% más de contaminación que la primera mitad (AQI ${firstHalfAvg})`
      } else {
        return `Estable: La calidad del aire se mantiene consistente durante todo el período (AQI promedio ${stats.avg.toFixed(1)})`
      }
    })()

    return {
      granularity: granularity as 'hourly' | 'daily' | 'weekly' | 'monthly',
      data,
      stats,
      trend: {
        direction: trendDirection,
        percentageChange: trendPct,
        message: trendMessage
      },
    }
    } catch (e) {
        console.error(e)
    }
  })

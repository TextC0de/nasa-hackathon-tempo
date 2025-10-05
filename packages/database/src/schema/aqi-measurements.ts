import { pgTable, serial, varchar, integer, timestamp, real, index, uniqueIndex } from 'drizzle-orm/pg-core'
import { createTimestampColumns } from '../shared/base'

/**
 * AQI Measurements - Raw Individual Readings
 *
 * Almacena mediciones individuales de cada estación por parámetro.
 * Proporciona granularidad completa para análisis detallado.
 *
 * Casos de uso:
 * - Comparar estaciones específicas
 * - Detectar outliers
 * - Validación científica
 * - Debugging de agregaciones
 * - Recalcular AQI con nuevas fórmulas
 *
 * Retention: 7-30 días (depende de storage disponible)
 */
export const aqiMeasurements = pgTable(
  'aqi_measurements',
  {
    id: serial('id').primaryKey(),

    // Estación que hizo la medición
    station_id: integer('station_id').notNull(), // FK a aq_stations.id

    // Ubicación (desnormalizado para queries rápidos sin JOIN)
    lat: real('lat').notNull(),
    lng: real('lng').notNull(),

    // Timestamp de la medición
    timestamp: timestamp('timestamp', { withTimezone: true }).notNull(),

    // Parámetro medido
    parameter: varchar('parameter', {
      length: 10,
      enum: ['O3', 'NO2', 'PM25', 'PM10', 'SO2', 'CO']
    }).notNull(),

    // Valores de la medición
    value: real('value').notNull(), // Concentración raw
    unit: varchar('unit', { length: 50 }).notNull(), // 'PPB', 'UG/M3', 'Micrograms/cubic meter (LC)', etc.
    aqi: integer('aqi').notNull(), // AQI calculado por EPA para este parámetro
    category: integer('category').notNull(), // 1=Good, 2=Moderate, etc.

    // Metadata de la estación (snapshot)
    site_name: varchar('site_name', { length: 255 }),
    agency_name: varchar('agency_name', { length: 255 }),
    provider: varchar('provider', { length: 50 }).notNull().default('airnow'), // 'airnow', 'purpleair', etc.

    // Calidad de la medición
    quality_flag: varchar('quality_flag', { length: 10 }), // 'valid', 'preliminary', 'invalid'
    raw_concentration: real('raw_concentration'), // Si difiere de 'value'

    ...createTimestampColumns(),
  },
  (table) => ({
    // Índice principal: búsquedas por estación + parámetro + tiempo
    stationParamTimeIdx: index('aqi_meas_station_param_time_idx')
      .on(table.station_id, table.parameter, table.timestamp),

    // Índice geográfico + tiempo (para búsquedas espaciales)
    locationTimeIdx: index('aqi_meas_location_time_idx')
      .on(table.lat, table.lng, table.timestamp),

    // Índice solo por timestamp (para cleanup/purge)
    timestampIdx: index('aqi_meas_timestamp_idx').on(table.timestamp),

    // Índice por parámetro (para queries tipo "todos los O3 en las últimas 24h")
    parameterIdx: index('aqi_meas_parameter_idx').on(table.parameter),

    // UNIQUE constraint: una estación no puede tener 2 mediciones del mismo parámetro a la misma hora
    uniqueMeasurement: uniqueIndex('aqi_meas_unique_idx')
      .on(table.station_id, table.parameter, table.timestamp),
  })
)

// Tipos TypeScript
export type AqiMeasurement = typeof aqiMeasurements.$inferSelect
export type NewAqiMeasurement = typeof aqiMeasurements.$inferInsert

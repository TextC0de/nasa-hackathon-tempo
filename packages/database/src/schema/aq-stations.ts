import { pgTable, serial, doublePrecision, varchar, index } from 'drizzle-orm/pg-core'
import { createTimestampColumns } from '../shared/base'

/**
 * Air Quality Stations
 *
 * Catálogo de estaciones de monitoreo de calidad del aire
 * Soporta múltiples proveedores (AirNow, EPA, etc.)
 */
export const aqStations = pgTable(
  'aq_stations',
  {
    // Primary key
    id: serial('id').primaryKey(),

    // Proveedor de datos
    provider: varchar('provider', { length: 50 }).notNull(), // 'airnow', 'epa', etc.

    // Geolocalización
    latitude: doublePrecision('latitude').notNull(),
    longitude: doublePrecision('longitude').notNull(),

    // Parámetro medido
    parameter: varchar('parameter', { length: 20, enum: ['o2', 'ozone', 'pm2.5'] }).notNull(), // 'ozone', 'no2', 'pm2.5', etc.

    // Timestamps
    ...createTimestampColumns(),
  },
  (table) => ({
    // Índice espacial para búsquedas por ubicación
    spatialIdx: index('aq_stations_spatial_idx').on(table.latitude, table.longitude),

    // Índice por proveedor
    providerIdx: index('aq_stations_provider_idx').on(table.provider),

    // Índice por parámetro
    parameterIdx: index('aq_stations_parameter_idx').on(table.parameter),

    // Índice compuesto para búsquedas por proveedor + parámetro
    providerParamIdx: index('aq_stations_provider_param_idx').on(table.provider, table.parameter),
  })
)

// Tipos TypeScript inferidos de Drizzle
export type AqStation = typeof aqStations.$inferSelect
export type NewAqStation = typeof aqStations.$inferInsert

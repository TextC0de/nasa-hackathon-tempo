import { pgTable, serial, varchar, index, customType } from 'drizzle-orm/pg-core'
import { createTimestampColumns } from '../shared/base'

// PostGIS geometry type para almacenar puntos geográficos
const geometry = customType<{ data: { type: 'Point', coordinates: [number, number] }, driverData: string }>({
  dataType() {
    return 'geometry(Point, 4326)'
  },
})

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

    // Geolocalización - PostGIS geometry point
    location: geometry('location').notNull(),

    // Parámetro medido
    parameter: varchar('parameter', { length: 20, enum: ['o2', 'ozone', 'pm2.5'] }).notNull(), // 'ozone', 'no2', 'pm2.5', etc.

    // Timestamps
    ...createTimestampColumns(),
  },
  (table) => ({
    // Índice espacial PostGIS GIST para búsquedas por ubicación
    // NOTA: En SQL raw sería: CREATE INDEX aq_stations_location_idx ON aq_stations USING GIST (location);
    spatialIdx: index('aq_stations_location_idx').using('gist', table.location),

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

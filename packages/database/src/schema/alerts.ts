import { pgTable, serial, varchar, text, timestamp, customType, index } from 'drizzle-orm/pg-core'
import { createTimestampColumns } from '../shared/base'

// PostGIS geometry type para almacenar puntos geográficos
const geometry = customType<{ data: { type: 'Point', coordinates: [number, number] }, driverData: string }>({
  dataType() {
    return 'geometry(Point, 4326)'
  },
})

/**
 * Air Quality Alerts
 *
 * Sistema de alertas para funcionarios de calidad del aire.
 * Permite crear, gestionar y trackear alertas públicas.
 */
export const alerts = pgTable(
  'alerts',
  {
    // Primary key
    id: serial('id').primaryKey(),

    // Información de la alerta
    title: varchar('title', { length: 255 }).notNull(),
    description: text('description').notNull(),

    // Nivel de urgencia
    urgency: varchar('urgency', {
      length: 20,
      enum: ['low', 'medium', 'high', 'critical']
    }).notNull().default('medium'),

    // Ubicación afectada
    location: geometry('location').notNull(),
    locationName: varchar('location_name', { length: 255 }), // e.g., "Los Angeles County"

    // Estado de la alerta
    status: varchar('status', {
      length: 20,
      enum: ['active', 'resolved', 'dismissed']
    }).notNull().default('active'),

    // Tipo de alerta (basado en templates)
    alertType: varchar('alert_type', {
      length: 50,
      enum: ['wildfire', 'ozone', 'pm25', 'custom']
    }),

    // Metadatos
    resolvedAt: timestamp('resolved_at', { withTimezone: true }),
    dismissedAt: timestamp('dismissed_at', { withTimezone: true }),

    // Timestamps
    ...createTimestampColumns(),
  },
  (table) => ({
    // Índice espacial para búsquedas por ubicación
    spatialIdx: index('alerts_location_idx').using('gist', table.location),

    // Índice por estado (para queries de alertas activas)
    statusIdx: index('alerts_status_idx').on(table.status),

    // Índice por urgencia
    urgencyIdx: index('alerts_urgency_idx').on(table.urgency),

    // Índice por tipo de alerta
    typeIdx: index('alerts_type_idx').on(table.alertType),

    // Índice compuesto para queries comunes (alertas activas por urgencia)
    statusUrgencyIdx: index('alerts_status_urgency_idx').on(table.status, table.urgency),

    // Índice temporal para ordenar por fecha de creación
    createdAtIdx: index('alerts_created_at_idx').on(table.createdAt),
  })
)

// Tipos TypeScript inferidos de Drizzle
export type Alert = typeof alerts.$inferSelect
export type NewAlert = typeof alerts.$inferInsert

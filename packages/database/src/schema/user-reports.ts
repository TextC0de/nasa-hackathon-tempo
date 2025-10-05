import { pgTable, text, timestamp, uuid, decimal, pgEnum } from "drizzle-orm/pg-core";

// Enum para gravedad del reporte
export const gravedadEnum = pgEnum('gravedad', ['low', 'intermediate', 'critical']);

// Enum para tipo de incidente
export const tipoIncidenteEnum = pgEnum('tipo_incidente', ['fire', 'smoke', 'dust']);

export const userReports = pgTable('user_reports', {
  id: uuid('id').defaultRandom().primaryKey(),
  email: text('email').notNull(),
  latitud: decimal('latitud', { precision: 10, scale: 7 }).notNull(),
  longitud: decimal('longitud', { precision: 10, scale: 7 }).notNull(),
  descripcion: text('descripcion'),
  gravedad: gravedadEnum('gravedad').notNull(),
  tipo: tipoIncidenteEnum('tipo').notNull(),
  fechaReporte: timestamp('fecha_reporte', { withTimezone: true }).notNull().defaultNow(),
  createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
  updatedAt: timestamp('updated_at', { withTimezone: true }).notNull().defaultNow(),
});

export type UserReport = typeof userReports.$inferSelect;
export type NewUserReport = typeof userReports.$inferInsert;

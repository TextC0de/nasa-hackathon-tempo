import {
  pgTable,
  uuid,
  doublePrecision,
  varchar,
  date,
  time,
  real,
  index,
} from "drizzle-orm/pg-core";
import { createTimestampColumns } from "../shared/base";

/**
 * FIRMS Fire Data Points
 *
 * Almacena detecciones de incendios activos de NASA FIRMS
 * Fuentes: MODIS, VIIRS (SNPP, NOAA-20, NOAA-21), Landsat
 *
 * Índices:
 * - Espacial: (latitude, longitude) para búsquedas por bbox
 * - Temporal: (acq_date, acq_time) para búsquedas por rango de fechas
 * - Compuesto: (acq_date, satellite, confidence) para análisis
 */
export const firmsFirePoints = pgTable(
  "firms_fire_points",
  {
    // Primary key
    id: uuid("id").defaultRandom().primaryKey(),

    // Geolocalización
    latitude: doublePrecision("latitude").notNull(),
    longitude: doublePrecision("longitude").notNull(),

    // Información temporal
    acqDate: date("acq_date", { mode: "string" }).notNull(), // YYYY-MM-DD
    acqTime: time("acq_time", { withTimezone: false }).notNull(), // HHMM UTC

    // Información del satélite/sensor
    satellite: varchar("satellite", { length: 50 }).notNull(), // 'Suomi-NPP', 'NOAA-20', 'Terra', 'Aqua'
    source: varchar("source", { length: 50 }).notNull(), // 'VIIRS_SNPP_NRT', 'MODIS_NRT', etc.

    // Métricas de fuego
    brightness: real("brightness").notNull(), // Temperatura de brillo (Kelvin)
    frp: real("frp").notNull(), // Fire Radiative Power (MW)

    // Metadata de calidad
    confidence: varchar("confidence", { length: 20 }).notNull(), // MODIS: 0-100, VIIRS: 'l'/'n'/'h'
    daynight: varchar("daynight", { length: 1 }).notNull(), // 'D' o 'N'
    version: varchar("version", { length: 10 }).notNull(), // Versión del algoritmo

    // Datos adicionales (JSON para flexibilidad)
    // scan, track, bright_t31, etc. (depende del sensor)
    additionalData: varchar("additional_data", { length: 1000 }), // JSON string

    // Timestamps
    ...createTimestampColumns(),
  },
  (table) => ({
    // Índice espacial para búsquedas por bounding box
    spatialIdx: index("firms_spatial_idx").on(table.latitude, table.longitude),

    // Índice temporal para búsquedas por fecha/hora
    temporalIdx: index("firms_temporal_idx").on(table.acqDate, table.acqTime),

    // Índice compuesto para análisis por fecha + satélite
    dateSourceIdx: index("firms_date_source_idx").on(
      table.acqDate,
      table.satellite,
    ),

    // Índice para filtrar por confianza
    confidenceIdx: index("firms_confidence_idx").on(table.confidence),

    // Índice para FRP (útil para encontrar incendios grandes)
    frpIdx: index("firms_frp_idx").on(table.frp),
  }),
);

/**
 * FIRMS Fire Aggregations
 *
 * Tabla de agregaciones pre-calculadas para análisis rápido
 * Se actualiza periódicamente desde firms_fire_points
 *
 * Ejemplos:
 * - Total fires por día/región
 * - FRP promedio/máximo por día
 * - Distribución de confianza
 */
export const firmsAggregations = pgTable(
  "firms_aggregations",
  {
    id: uuid("id").defaultRandom().primaryKey(),

    // Período de agregación
    aggregationDate: date("aggregation_date", { mode: "string" }).notNull(),

    // Región (bbox)
    bboxWest: doublePrecision("bbox_west").notNull(),
    bboxSouth: doublePrecision("bbox_south").notNull(),
    bboxEast: doublePrecision("bbox_east").notNull(),
    bboxNorth: doublePrecision("bbox_north").notNull(),

    // Fuente de datos
    source: varchar("source", { length: 50 }).notNull(),

    // Estadísticas
    totalFires: real("total_fires").notNull(),
    averageFrp: real("average_frp").notNull(),
    maxFrp: real("max_frp").notNull(),
    totalFrp: real("total_frp").notNull(),

    // Distribución por confianza
    confidenceHigh: real("confidence_high").notNull(),
    confidenceNominal: real("confidence_nominal").notNull(),
    confidenceLow: real("confidence_low").notNull(),

    // Distribución día/noche
    daytimeFires: real("daytime_fires").notNull(),
    nighttimeFires: real("nighttime_fires").notNull(),

    // Timestamps
    ...createTimestampColumns(),
  },
  (table) => ({
    // Índice para búsquedas por fecha + región
    dateRegionIdx: index("firms_agg_date_region_idx").on(
      table.aggregationDate,
      table.source,
    ),
  }),
);

// Tipos TypeScript inferidos de Drizzle
export type FirmsFirePoint = typeof firmsFirePoints.$inferSelect;
export type NewFirmsFirePoint = typeof firmsFirePoints.$inferInsert;
export type FirmsAggregation = typeof firmsAggregations.$inferSelect;
export type NewFirmsAggregation = typeof firmsAggregations.$inferInsert;

import {
  pgTable,
  uuid,
  doublePrecision,
  varchar,
  date,
  integer,
  index,
} from "drizzle-orm/pg-core";
import { createTimestampColumns } from "../shared/base";

/**
 * AirNow Observations
 *
 * Almacena observaciones de calidad del aire de EPA AirNow API
 * Incluye: O3, PM2.5, PM10, CO, NO2, SO2
 *
 * Índices:
 * - Espacial: (latitude, longitude) para búsquedas por ubicación
 * - Temporal: (date_observed, hour_observed) para series temporales
 * - Parámetro: (parameter_name) para filtrar por contaminante
 */
export const airnowObservations = pgTable(
  "airnow_observations",
  {
    // Primary key
    id: uuid("id").defaultRandom().primaryKey(),

    // Información temporal
    dateObserved: date("date_observed", { mode: "string" }).notNull(), // YYYY-MM-DD
    hourObserved: integer("hour_observed").notNull(), // 0-23
    localTimeZone: varchar("local_time_zone", { length: 10 }).notNull(), // 'PST', 'EST', etc.

    // Geolocalización (estación de monitoreo)
    latitude: doublePrecision("latitude").notNull(),
    longitude: doublePrecision("longitude").notNull(),

    // Ubicación administrativa
    reportingArea: varchar("reporting_area", { length: 100 }).notNull(), // Nombre del área
    stateCode: varchar("state_code", { length: 2 }).notNull(), // 'CA', 'NY', etc.

    // Parámetro medido
    parameterName: varchar("parameter_name", { length: 20 }).notNull(), // 'O3', 'PM2.5', 'NO2', etc.

    // Valor AQI
    aqi: integer("aqi").notNull(), // 0-500+

    // Categoría AQI
    categoryNumber: integer("category_number").notNull(), // 1-6
    categoryName: varchar("category_name", { length: 50 }).notNull(), // 'Good', 'Moderate', etc.

    // Timestamps
    ...createTimestampColumns(),
  },
  (table) => ({
    // Índice espacial para búsquedas por ubicación
    spatialIdx: index("airnow_obs_spatial_idx").on(
      table.latitude,
      table.longitude,
    ),

    // Índice temporal para series temporales
    temporalIdx: index("airnow_obs_temporal_idx").on(
      table.dateObserved,
      table.hourObserved,
    ),

    // Índice por parámetro para filtrar por contaminante
    parameterIdx: index("airnow_obs_parameter_idx").on(table.parameterName),

    // Índice compuesto para queries comunes (fecha + parámetro + región)
    dateParamStateIdx: index("airnow_obs_date_param_state_idx").on(
      table.dateObserved,
      table.parameterName,
      table.stateCode,
    ),

    // Índice para categoría AQI (útil para alertas)
    categoryIdx: index("airnow_obs_category_idx").on(table.categoryNumber),
  }),
);

/**
 * AirNow Forecasts
 *
 * Almacena pronósticos de calidad del aire
 * Similar a observaciones pero incluye fecha de emisión
 */
export const airnowForecasts = pgTable(
  "airnow_forecasts",
  {
    // Primary key
    id: uuid("id").defaultRandom().primaryKey(),

    // Información temporal
    dateForecast: date("date_forecast", { mode: "string" }).notNull(), // Fecha pronosticada
    dateIssue: date("date_issue", { mode: "string" }).notNull(), // Fecha de emisión

    // Geolocalización
    latitude: doublePrecision("latitude").notNull(),
    longitude: doublePrecision("longitude").notNull(),

    // Ubicación administrativa
    reportingArea: varchar("reporting_area", { length: 100 }).notNull(),
    stateCode: varchar("state_code", { length: 2 }).notNull(),

    // Parámetro
    parameterName: varchar("parameter_name", { length: 20 }).notNull(),

    // Valor AQI pronosticado
    aqi: integer("aqi").notNull(),

    // Categoría AQI
    categoryNumber: integer("category_number").notNull(),
    categoryName: varchar("category_name", { length: 50 }).notNull(),

    // Discusión del forecast (opcional)
    discussion: varchar("discussion", { length: 2000 }),

    // Timestamps
    ...createTimestampColumns(),
  },
  (table) => ({
    // Índice temporal para búsquedas por fecha de pronóstico
    forecastDateIdx: index("airnow_fc_forecast_date_idx").on(
      table.dateForecast,
    ),

    // Índice por fecha de emisión
    issueDateIdx: index("airnow_fc_issue_date_idx").on(table.dateIssue),

    // Índice espacial
    spatialIdx: index("airnow_fc_spatial_idx").on(
      table.latitude,
      table.longitude,
    ),

    // Índice por parámetro
    parameterIdx: index("airnow_fc_parameter_idx").on(table.parameterName),

    // Índice compuesto
    dateForecastParamIdx: index("airnow_fc_date_forecast_param_idx").on(
      table.dateForecast,
      table.parameterName,
    ),
  }),
);

/**
 * AirNow Stations
 *
 * Catálogo de estaciones de monitoreo
 * Se actualiza cuando se detectan nuevas estaciones en observaciones
 */
export const airnowStations = pgTable(
  "airnow_stations",
  {
    // Primary key
    id: uuid("id").defaultRandom().primaryKey(),

    // Geolocalización
    latitude: doublePrecision("latitude").notNull(),
    longitude: doublePrecision("longitude").notNull(),

    // Ubicación administrativa
    reportingArea: varchar("reporting_area", { length: 100 }).notNull(),
    stateCode: varchar("state_code", { length: 2 }).notNull(),

    // Parámetros que mide esta estación
    parameters: varchar("parameters", { length: 200 }).notNull(), // JSON array: ['O3', 'PM2.5', 'NO2']

    // Última observación
    lastObservationDate: date("last_observation_date", { mode: "string" }),

    // Timestamps
    ...createTimestampColumns(),
  },
  (table) => ({
    // Índice espacial
    spatialIdx: index("airnow_stations_spatial_idx").on(
      table.latitude,
      table.longitude,
    ),

    // Índice por estado
    stateIdx: index("airnow_stations_state_idx").on(table.stateCode),

    // Índice único por ubicación + área de reporte
    uniqueLocationIdx: index("airnow_stations_unique_location_idx").on(
      table.latitude,
      table.longitude,
      table.reportingArea,
    ),
  }),
);

// Tipos TypeScript inferidos de Drizzle
export type AirnowObservation = typeof airnowObservations.$inferSelect;
export type NewAirnowObservation = typeof airnowObservations.$inferInsert;
export type AirnowForecast = typeof airnowForecasts.$inferSelect;
export type NewAirnowForecast = typeof airnowForecasts.$inferInsert;
export type AirnowStation = typeof airnowStations.$inferSelect;
export type NewAirnowStation = typeof airnowStations.$inferInsert;

/**
 * Tipos base para el motor de forecasting de calidad del aire
 *
 * Este módulo define las estructuras de datos principales usadas en todo el sistema:
 * - Datos meteorológicos (viento, temperatura, PBL)
 * - Grids de contaminantes (NO2, PM2.5)
 * - Mediciones de estaciones terrestres (EPA)
 * - Resultados de pronósticos
 * - Métricas de validación
 */

// ============================================================================
// TIPOS BÁSICOS
// ============================================================================

/**
 * Punto geográfico con latitud y longitud
 */
export interface GeoPoint {
  /** Latitud en grados (-90 a 90) */
  latitude: number;
  /** Longitud en grados (-180 a 180) */
  longitude: number;
}

/**
 * Contaminante atmosférico
 */
export type Pollutant = 'NO2' | 'O3' | 'PM25';

// ============================================================================
// DATOS METEOROLÓGICOS
// ============================================================================

/**
 * Condiciones meteorológicas en un momento y lugar específico
 *
 * Estos datos son críticos para el modelo de advección:
 * - wind_speed y wind_direction determinan el transporte de contaminantes
 * - pbl_height afecta la dilución vertical (capa límite planetaria)
 * - precipitation causa remoción de partículas (washout)
 * - temperature afecta reacciones químicas
 */
export interface WeatherConditions {
  /** Velocidad del viento en m/s */
  wind_speed: number;

  /** Dirección del viento en grados (0° = Norte, 90° = Este) */
  wind_direction: number;

  /** Altura de la capa límite planetaria en metros (típicamente 500-2000m) */
  pbl_height: number;

  /** Temperatura en °C */
  temperature: number;

  /** Precipitación en mm */
  precipitation: number;

  /** Timestamp de la medición */
  timestamp: Date;
}

// ============================================================================
// GRIDS Y CELDAS
// ============================================================================

/**
 * Celda individual en un grid de advección
 *
 * Cada celda representa un área geográfica pequeña (~2km x 2km) y puede contener:
 * - no2_column: Columna de NO2 de TEMPO (molecules/cm²) - dato satelital
 * - no2_surface: Concentración de NO2 en superficie (ppb) - calculado desde column
 */
export interface GridCell {
  /** Latitud del centro de la celda */
  latitude: number;

  /** Longitud del centro de la celda */
  longitude: number;

  /** Densidad de columna de NO2 desde TEMPO (molecules/cm²) */
  no2_column?: number;

  /** Concentración de NO2 en superficie (ppb) calculado desde column */
  no2_surface?: number;

  /** @deprecated - PM2.5 ya no se usa, migramos a NO2 */
  pm25?: number;

  /** @deprecated - pm25_surface ya no se usa, migramos a no2_surface */
  pm25_surface?: number;
}

/**
 * Grid completo de advección para un área geográfica
 *
 * Un grid típico para Los Angeles (50km radius) contiene ~2,700 celdas.
 * Cada hora, el grid se "mueve" según el viento (advección).
 */
export interface AdvectionGrid {
  /** Array de celdas que componen el grid */
  cells: GridCell[];

  /** Límites geográficos del grid */
  bounds: {
    north: number;
    south: number;
    east: number;
    west: number;
  };

  /** Resolución del grid en grados (típicamente 0.02° ≈ 2km) */
  resolution: number;

  /** Timestamp de los datos en el grid */
  timestamp: Date;
}

// ============================================================================
// MEDICIONES TERRESTRES
// ============================================================================

/**
 * Medición de una estación terrestre de EPA
 *
 * Estas son las mediciones "ground truth" contra las cuales validamos
 * nuestros pronósticos. EPA tiene miles de estaciones en USA.
 */
export interface GroundMeasurement {
  /** Latitud de la estación */
  latitude: number;

  /** Longitud de la estación */
  longitude: number;

  /** Parámetro medido: 'PM25', 'NO2', 'O3' */
  parameter: string;

  /** Valor medido */
  value: number;

  /** Unidad de medición (ej: 'µg/m³', 'ppb') */
  unit: string;

  /** Timestamp de la medición */
  timestamp: Date;

  /** Estado (ej: 'California') */
  state: string;

  /** Condado (ej: 'Los Angeles') */
  county: string;
}

// ============================================================================
// DATOS DE FUEGOS
// ============================================================================

/**
 * Detección de fuego activo desde FIRMS (Fire Information for Resource Management System)
 *
 * Fuentes satelitales: MODIS, VIIRS
 * Los fuegos emiten grandes cantidades de PM2.5 que son transportadas por el viento
 */
export interface Fire {
  /** Latitud del fuego */
  latitude: number;

  /** Longitud del fuego */
  longitude: number;

  /** Temperatura de brillo en Kelvin (mayor = fuego más intenso) */
  brightness: number;

  /** Fire Radiative Power en MW (proxy para intensidad de emisiones) */
  frp: number;

  /** Confianza de la detección: 'l' (low), 'n' (nominal), 'h' (high) */
  confidence: string;

  /** Fecha de adquisición (YYYY-MM-DD) */
  acq_date: string;

  /** Hora de adquisición (HHMM) */
  acq_time: string;

  /** Satélite que detectó el fuego */
  satellite: string;
}

// ============================================================================
// RESULTADOS DE PRONÓSTICOS
// ============================================================================

/**
 * Resultado de un pronóstico de contaminante
 *
 * Representa la predicción de concentración de un contaminante
 * en un lugar y tiempo futuro específico.
 */
export interface ForecastResult {
  /** Ubicación del pronóstico */
  location: GeoPoint;

  /** Contaminante pronosticado */
  pollutant: Pollutant;

  /** Timestamp del pronóstico (tiempo futuro predicho) */
  timestamp: Date;

  /** Horas de anticipación (1 = +1h, 3 = +3h) */
  hours_ahead: number;

  /** Valor pronosticado */
  value: number;

  /** Unidad del valor (µg/m³ para PM2.5, ppb para gases) */
  unit: string;

  /** Confianza del pronóstico (0-1, disminuye con horizonte) */
  confidence: number;

  /** Método usado: 'advection' (nuestro modelo) o 'persistence' (baseline) */
  method: 'advection' | 'persistence';

  /** Componentes del cálculo (para debugging/análisis) */
  components?: {
    /** Valor base calculado desde NO2 column */
    base_value: number;
    /** Contribución de fuegos cercanos */
    fire_contribution: number;
    /** Factor de remoción por precipitación (0-1) */
    washout_factor: number;
    /** Corrección de sesgo usando datos históricos */
    bias_correction: number;
  };
}

/**
 * Grid completo de pronósticos
 *
 * Representa el pronóstico para toda un área geográfica,
 * conteniendo predicciones para múltiples celdas.
 */
export interface ForecastGrid {
  /** Grid base */
  grid: AdvectionGrid;

  /** Horas de anticipación */
  hours_ahead: number;

  /** Confianza global del grid */
  confidence: number;

  /** Timestamp cuando se hizo el pronóstico (T=0) */
  forecast_base_time: Date;

  /** Método usado */
  method: 'advection' | 'persistence';
}

// ============================================================================
// TENDENCIAS TEMPORALES
// ============================================================================

/**
 * Tendencias temporales calculadas desde datos históricos (T-3h → T=0)
 *
 * Estas tendencias ayudan a mejorar los pronósticos al detectar si
 * la contaminación está aumentando, disminuyendo, o estable.
 */
export interface TemporalTrends {
  /** Tendencia de NO2 column (molecules/cm²/hour) */
  no2_trend: number;

  /** Tendencia de NO2 surface (ppb/hour) - calculado desde no2_trend */
  no2_surface_trend: number;

  /** Estabilidad del viento (0-1, donde 1 = muy estable) */
  wind_stability: number;

  /** Tasa de crecimiento de fuegos (MW/hour) */
  fire_growth_rate: number;

  /** Número de snapshots usados para calcular tendencia */
  sample_count: number;

  /** @deprecated - pm25_trend ya no se usa, migramos a no2_surface_trend */
  pm25_trend?: number;
}

// ============================================================================
// VALIDACIÓN
// ============================================================================

/**
 * Métricas de validación para evaluar calidad de pronósticos
 *
 * Estas métricas comparan pronósticos vs mediciones reales de EPA:
 * - MAE: Error absoluto promedio (mismo unit que datos)
 * - RMSE: Raíz del error cuadrático medio (penaliza errores grandes)
 * - R²: Coeficiente de determinación (0-1, qué tan bien explica varianza)
 * - Bias: Error sistemático promedio (sobre/subestimación)
 */
export interface ValidationMetrics {
  /** Mean Absolute Error */
  mae: number;

  /** Root Mean Squared Error */
  rmse: number;

  /** R² coefficient (0-1) */
  r2: number;

  /** Mean bias (positive = overestimation) */
  bias: number;

  /** Número de muestras usadas */
  count: number;
}

/**
 * Muestra individual de comparación pronóstico vs real
 */
export interface ComparisonSample {
  /** Valor pronosticado */
  predicted: number;

  /** Valor real medido */
  actual: number;

  /** Error (predicted - actual) */
  error: number;

  /** Error porcentual */
  error_percent: number;

  /** Timestamp del dato */
  timestamp: Date;

  /** Ubicación */
  location: GeoPoint;

  /** Contaminante */
  pollutant: Pollutant;

  /** Horas de anticipación */
  hours_ahead: number;
}

/**
 * Resultado completo de validación para un horizonte específico
 */
export interface HorizonValidation {
  /** Horizonte en horas (1, 2, 3, etc.) */
  horizon: number;

  /** Métricas calculadas */
  metrics: ValidationMetrics;

  /** Skill score vs persistence model (0-1, >0 = mejor que baseline) */
  skill_score: number;

  /** Muestras individuales (para análisis detallado) */
  samples: ComparisonSample[];
}

// ============================================================================
// FACTORES DE CALIBRACIÓN
// ============================================================================

/**
 * Factores de calibración para el modelo de advección
 *
 * Estos factores se ajustan mediante calibración usando datos históricos.
 * Los rangos vienen de literatura científica y experimentos.
 */
export interface AdvectionFactors {
  /**
   * Factor de conversión de NO2 column a superficie
   * Rango: 0.5 - 1.2
   * Depende de PBL height y perfil vertical
   */
  no2_column_to_surface: number;

  /**
   * Factor de conversión de PM index a superficie
   * Rango: 0.2 - 0.8
   */
  pm_index_to_surface: number;

  /**
   * Altura de referencia de PBL en metros
   * Rango: 500 - 1200m
   * Usada para normalizar conversiones
   */
  pbl_reference: number;

  /**
   * Factor de escala para FRP de fuegos
   * Rango: 50 - 200
   * Convierte MW a µg/m³
   */
  fire_frp_scaling: number;

  /**
   * Exponente de decaimiento con distancia para fuegos
   * Rango: 1.5 - 3.0
   * Mayor = decae más rápido con distancia
   */
  fire_distance_decay: number;

  /**
   * Tasa de remoción por precipitación (washout)
   * Rango: 0.1 - 0.4
   * Mayor = más remoción por lluvia
   */
  washout_rate: number;

  /**
   * Peso de corrección de sesgo
   * Rango: 0.0 - 1.0
   * Qué tanto ajustar basado en errores pasados
   */
  bias_correction_weight: number;
}

/**
 * Factores calibrados con datos reales TEMPO + EPA
 *
 * Calibración through-origin (sin bias artificial) con 401 pares:
 * - Factor NO2: 1.8749 (through-origin regression)
 * - Intercept: 0 (forzado - físicamente correcto)
 * - MAE: 6.95 ppb (12.9% mejora vs baseline)
 * - R² = 0.3559 (correlación moderada)
 *
 * Through-origin asegura que NO2 column = 0 → NO2 surface = 0
 * sin necesidad de bias corrections artificiales.
 */
export const DEFAULT_FACTORS: AdvectionFactors = {
  no2_column_to_surface: 1.8749, // Through-origin calibrado (era 0.3388)
  pm_index_to_surface: 0.4,
  pbl_reference: 800,
  fire_frp_scaling: 1.0,
  fire_distance_decay: 2.5,
  washout_rate: 0.2,
  bias_correction_weight: 0.0, // No usar bias artificial
};

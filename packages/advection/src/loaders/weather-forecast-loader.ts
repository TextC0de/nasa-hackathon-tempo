/**
 * Loader de pronósticos meteorológicos
 *
 * Este módulo simula pronósticos de clima usando datos históricos.
 *
 * En validación: Usamos datos históricos "como si fueran" un forecast
 * En producción: Llamaríamos a OpenMeteo Forecast API
 */

import type { WeatherConditions } from '../types';

// ============================================================================
// TIPOS
// ============================================================================

/**
 * Pronóstico meteorológico para múltiples horizontes temporales
 *
 * Ejemplo: Si hacemos forecast a las 14:00 para T+1h, T+2h, T+3h:
 * - base_time = 14:00 (cuando se hace el pronóstico)
 * - forecasts[0] = condiciones a las 15:00 (T+1h)
 * - forecasts[1] = condiciones a las 16:00 (T+2h)
 * - forecasts[2] = condiciones a las 17:00 (T+3h)
 */
export interface WeatherForecast {
  /** Tiempo base (T=0, cuando se hace el pronóstico) */
  base_time: Date;

  /** Ubicación del pronóstico */
  location: {
    latitude: number;
    longitude: number;
  };

  /** Condiciones pronosticadas para cada horizonte */
  forecasts: WeatherConditions[];

  /** Horizontes en horas (ej: [1, 2, 3]) */
  forecast_horizons: number[];
}

// ============================================================================
// FUNCIONES PRINCIPALES
// ============================================================================

/**
 * Obtiene un pronóstico meteorológico desde datos históricos
 *
 * Esta función simula un forecast retornando datos futuros del dataset histórico.
 * En producción, llamaría a una API real de pronósticos como OpenMeteo Forecast.
 *
 * @param historicalData - Dataset completo de clima histórico
 * @param baseTime - Tiempo cuando se hace el pronóstico (T=0)
 * @param horizons - Horizontes de pronóstico en horas (ej: [1, 2, 3])
 * @param location - Ubicación para metadata
 * @returns Objeto de pronóstico o null si falta data
 *
 * @example
 * ```typescript
 * // Simular forecast hecho a las 14:00 para T+1h, T+2h, T+3h
 * const baseTime = new Date('2024-01-15T14:00:00Z');
 * const forecast = getWeatherForecast(
 *   weatherData,
 *   baseTime,
 *   [1, 2, 3],
 *   { latitude: 34.05, longitude: -118.24 }
 * );
 *
 * // Usar el pronóstico para advección
 * const grid_t1 = advectGrid(grid_t0, forecast.forecasts[0], 1); // T+1h
 * const grid_t2 = advectGrid(grid_t1, forecast.forecasts[1], 1); // T+2h
 * ```
 */
export function getWeatherForecast(
  historicalData: WeatherConditions[],
  baseTime: Date,
  horizons: number[],
  location: { latitude: number; longitude: number }
): WeatherForecast | null {
  if (horizons.length === 0) {
    return null;
  }

  // Ordenar horizontes cronológicamente
  const sortedHorizons = [...horizons].sort((a, b) => a - b);

  const forecasts: WeatherConditions[] = [];

  // Para cada horizonte, buscar datos históricos correspondientes
  for (const horizon of sortedHorizons) {
    // Calcular tiempo objetivo para este horizonte
    const targetTime = new Date(baseTime.getTime() + horizon * 3600000);

    // Buscar condición más cercana en datos históricos
    const forecastCondition = getClosestWeatherFromHistory(
      historicalData,
      targetTime,
      60 // Máximo 60 minutos de diferencia
    );

    if (!forecastCondition) {
      // Si no encontramos data para algún horizonte, retornar null
      return null;
    }

    forecasts.push(forecastCondition);
  }

  return {
    base_time: baseTime,
    location,
    forecasts,
    forecast_horizons: sortedHorizons,
  };
}

/**
 * Obtiene datos históricos para análisis de tendencias temporales
 *
 * Retorna clima desde T-Nh hasta T=0 (ej: T-3h, T-2h, T-1h, T=0)
 * Útil para calcular si viento/contaminación está aumentando o disminuyendo.
 *
 * @param historicalData - Dataset completo de clima histórico
 * @param baseTime - Tiempo actual (T=0)
 * @param hoursBack - Cuántas horas atrás ir (ej: 3 para T-3h → T=0)
 * @returns Array de condiciones del pasado al presente
 *
 * @example
 * ```typescript
 * // Obtener T-3h, T-2h, T-1h, T=0
 * const historical = getHistoricalWeather(weatherData, baseTime, 3);
 * // historical[0] = T-3h (más antiguo)
 * // historical[3] = T=0 (actual)
 *
 * // Calcular tendencia de viento
 * const windTrend = (historical[3].wind_speed - historical[0].wind_speed) / 3;
 * console.log(`Viento ${windTrend > 0 ? 'aumentando' : 'disminuyendo'}`);
 * ```
 */
export function getHistoricalWeather(
  historicalData: WeatherConditions[],
  baseTime: Date,
  hoursBack: number
): WeatherConditions[] {
  const historical: WeatherConditions[] = [];

  // Ir desde T-Nh hasta T=0
  for (let h = -hoursBack; h <= 0; h++) {
    const targetTime = new Date(baseTime.getTime() + h * 3600000);

    const condition = getClosestWeatherFromHistory(
      historicalData,
      targetTime,
      60 // Máximo 60 minutos de diferencia
    );

    if (condition) {
      historical.push(condition);
    }
  }

  return historical;
}

/**
 * Valida que un pronóstico sea completo y válido
 *
 * @param forecast - Pronóstico a validar
 * @returns true si el pronóstico es válido
 */
export function isValidForecast(forecast: WeatherForecast | null): boolean {
  if (!forecast) {
    return false;
  }

  // Verificar que haya data para todos los horizontes
  if (forecast.forecasts.length !== forecast.forecast_horizons.length) {
    return false;
  }

  // Verificar que todos los pronósticos tengan datos válidos
  for (const f of forecast.forecasts) {
    if (
      isNaN(f.wind_speed) ||
      isNaN(f.wind_direction) ||
      isNaN(f.pbl_height) ||
      f.wind_speed < 0 ||
      f.pbl_height <= 0
    ) {
      return false;
    }
  }

  return true;
}

// ============================================================================
// FUNCIONES DE ANÁLISIS
// ============================================================================

/**
 * Calcula métricas de calidad de pronóstico
 *
 * Compara pronóstico vs real para entender precisión del forecast meteorológico.
 * Útil para detectar si el forecast de clima es confiable.
 *
 * @param forecast - Condiciones pronosticadas
 * @param actual - Condiciones reales que ocurrieron
 * @returns Métricas de error
 */
export function calculateForecastQuality(
  forecast: WeatherConditions,
  actual: WeatherConditions
): {
  wind_speed_error: number; // m/s
  wind_direction_error: number; // grados
  temperature_error: number; // celsius
  pbl_height_error: number; // metros
} {
  return {
    wind_speed_error: Math.abs(forecast.wind_speed - actual.wind_speed),
    wind_direction_error: calculateAngleDifference(
      forecast.wind_direction,
      actual.wind_direction
    ),
    temperature_error: Math.abs(forecast.temperature - actual.temperature),
    pbl_height_error: Math.abs(forecast.pbl_height - actual.pbl_height),
  };
}

// ============================================================================
// FUNCIONES AUXILIARES
// ============================================================================

/**
 * Busca la condición meteorológica más cercana a un tiempo objetivo
 *
 * @param historicalData - Dataset histórico completo
 * @param targetTime - Tiempo objetivo
 * @param maxDeltaMinutes - Máxima diferencia aceptable en minutos
 * @returns Condición más cercana o null
 */
function getClosestWeatherFromHistory(
  historicalData: WeatherConditions[],
  targetTime: Date,
  maxDeltaMinutes: number
): WeatherConditions | null {
  let closest: WeatherConditions | null = null;
  let minDelta = Infinity;

  for (const condition of historicalData) {
    const delta = Math.abs(condition.timestamp.getTime() - targetTime.getTime());
    const deltaMinutes = delta / (1000 * 60);

    if (deltaMinutes <= maxDeltaMinutes && delta < minDelta) {
      minDelta = delta;
      closest = condition;
    }
  }

  return closest;
}

/**
 * Calcula la diferencia angular mínima entre dos direcciones
 *
 * Maneja el wrapping circular (ej: 350° y 10° están solo 20° apart)
 *
 * @param angle1 - Primera dirección en grados
 * @param angle2 - Segunda dirección en grados
 * @returns Diferencia angular en grados (0-180)
 */
function calculateAngleDifference(angle1: number, angle2: number): number {
  const diff = Math.abs(angle1 - angle2);
  return diff > 180 ? 360 - diff : diff;
}

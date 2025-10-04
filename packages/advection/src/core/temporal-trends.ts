/**
 * Motor de análisis de tendencias temporales
 *
 * Este módulo calcula tendencias desde datos históricos (T-3h → T=0)
 * para mejorar los pronósticos al detectar patrones de cambio.
 *
 * Ejemplo: Si NO2 está aumentando +2e15 molecules/cm²/hora,
 * podemos ajustar el forecast para reflejar esta tendencia ascendente.
 */

import type {
  TemporalTrends,
  WeatherConditions,
  AdvectionGrid,
  Fire
} from '../types';

// ============================================================================
// FUNCIONES PRINCIPALES
// ============================================================================

/**
 * Calcula tendencias temporales desde snapshots históricos
 *
 * Analiza cómo han cambiado las condiciones desde T-Nh hasta T=0:
 * - ¿NO2 está aumentando o disminuyendo?
 * - ¿Viento es estable o cambiante?
 * - ¿Fuegos están creciendo?
 * - ¿PM2.5 mejorando o empeorando?
 *
 * @param grids - Grids de TEMPO históricos (T-3h, T-2h, T-1h, T=0)
 * @param weatherHistory - Condiciones meteorológicas históricas
 * @param fireHistory - Fuegos históricos (opcional)
 * @returns Tendencias calculadas
 *
 * @example
 * ```typescript
 * // Cargar datos históricos
 * const grids = [
 *   loadTEMPOGridAtTime(T_minus_3h, ...),
 *   loadTEMPOGridAtTime(T_minus_2h, ...),
 *   loadTEMPOGridAtTime(T_minus_1h, ...),
 *   loadTEMPOGridAtTime(T_0, ...)
 * ];
 *
 * const trends = calculateTemporalTrends(grids, weatherHistory);
 *
 * if (trends.no2_trend > 0) {
 *   console.log('NO2 está aumentando - forecast ajustado al alza');
 * }
 * ```
 */
export function calculateTemporalTrends(
  grids: AdvectionGrid[],
  weatherHistory: WeatherConditions[],
  fireHistory?: Fire[][]
): TemporalTrends {
  if (grids.length < 2) {
    // No hay suficientes datos para calcular tendencia
    return {
      no2_trend: 0,
      pm25_trend: 0,
      wind_stability: 0.5,
      fire_growth_rate: 0,
      sample_count: grids.length
    };
  }

  // Ordenar por timestamp (viejo a nuevo)
  const sortedGrids = [...grids].sort((a, b) =>
    a.timestamp.getTime() - b.timestamp.getTime()
  );

  // Calcular tendencia de NO2 column
  const no2Trend = calculateNO2Trend(sortedGrids);

  // Calcular tendencia de NO2 surface desde column
  // IMPORTANTE: Usar mismo factor que conversión NO2 column→surface (2e-16 * 1.8749)
  // Esto convierte molecules/cm²/hora → ppb/hora
  const no2SurfaceTrend = no2Trend * 2e-16 * 1.8749; // Usar factor calibrado through-origin

  // Calcular estabilidad del viento
  const windStability = calculateWindStability(weatherHistory);

  // Calcular crecimiento de fuegos
  const fireGrowthRate = fireHistory
    ? calculateFireGrowthRate(fireHistory)
    : 0;

  return {
    no2_trend: no2Trend,
    no2_surface_trend: no2SurfaceTrend,
    wind_stability: windStability,
    fire_growth_rate: fireGrowthRate,
    sample_count: sortedGrids.length
  };
}

/**
 * Aplica tendencias temporales a un pronóstico
 *
 * Ajusta el forecast basándose en tendencias detectadas.
 * Si NO2 está aumentando, proyectamos que seguirá aumentando.
 *
 * @param baseForecast - Valor base pronosticado (sin tendencias)
 * @param trends - Tendencias calculadas
 * @param hoursAhead - Horizonte de pronóstico
 * @returns Valor ajustado con tendencias
 *
 * @example
 * ```typescript
 * const baseNO2 = 25; // ppb
 * const trends = { no2_surface_trend: 2.0, ... }; // +2 ppb/hora
 * const adjusted = applyTrendsToForecast(baseNO2, trends, 3); // T+3h
 * // adjusted = 25 + (2.0 * 3 * 0.7) = 29.2 ppb
 * // Factor 0.7 = asumimos tendencia se debilita con tiempo
 * ```
 */
export function applyTrendsToForecast(
  baseForecast: number,
  trends: TemporalTrends,
  hoursAhead: number
): number {
  // Factor de decaimiento: tendencias se debilitan con horizonte
  // Pero para horizontes cortos (1-3h), la tendencia es bastante persistente
  // Reducimos el decaimiento para que las tendencias tengan más peso
  const decayFactor = Math.exp(-hoursAhead * 0.08); // Era 0.15, ahora 0.08 (más lento)

  // Aplicar tendencia de NO2 surface
  const trendAdjustment = trends.no2_surface_trend * hoursAhead * decayFactor;

  return baseForecast + trendAdjustment;
}

// ============================================================================
// CÁLCULOS DE TENDENCIAS ESPECÍFICAS
// ============================================================================

/**
 * Calcula tendencia de NO2 column desde grids históricos
 *
 * Usa regresión lineal simple sobre promedios de los grids.
 *
 * @param grids - Grids ordenados cronológicamente (viejo a nuevo)
 * @returns Tendencia en molecules/cm²/hora
 */
function calculateNO2Trend(grids: AdvectionGrid[]): number {
  if (grids.length < 2) {
    return 0;
  }

  // Calcular promedio de NO2 para cada grid
  const dataPoints = grids.map(grid => {
    const no2Values = grid.cells
      .map(cell => cell.no2_column)
      .filter(v => v !== undefined) as number[];

    if (no2Values.length === 0) {
      return { time: grid.timestamp.getTime(), no2: 0 };
    }

    const avgNO2 = no2Values.reduce((sum, v) => sum + v, 0) / no2Values.length;

    return {
      time: grid.timestamp.getTime(),
      no2: avgNO2
    };
  });

  // Regresión lineal simple
  const n = dataPoints.length;

  // Normalizar tiempos a horas desde el primer punto
  const t0 = dataPoints[0].time;
  const times = dataPoints.map(p => (p.time - t0) / (1000 * 3600)); // horas
  const values = dataPoints.map(p => p.no2);

  const meanTime = times.reduce((s, t) => s + t, 0) / n;
  const meanValue = values.reduce((s, v) => s + v, 0) / n;

  let numerator = 0;
  let denominator = 0;

  for (let i = 0; i < n; i++) {
    numerator += (times[i] - meanTime) * (values[i] - meanValue);
    denominator += (times[i] - meanTime) ** 2;
  }

  // Slope = tendencia en molecules/cm²/hora
  const slope = denominator !== 0 ? numerator / denominator : 0;

  return slope;
}

/**
 * Calcula estabilidad del viento desde historial meteorológico
 *
 * Viento estable = dirección y velocidad consistentes
 * Viento inestable = cambios frecuentes
 *
 * @param weatherHistory - Historial meteorológico (T-Nh a T=0)
 * @returns Estabilidad (0-1, donde 1 = muy estable)
 */
function calculateWindStability(weatherHistory: WeatherConditions[]): number {
  if (weatherHistory.length < 2) {
    return 0.5; // Default medio
  }

  // Ordenar por timestamp
  const sorted = [...weatherHistory].sort((a, b) =>
    a.timestamp.getTime() - b.timestamp.getTime()
  );

  // Calcular variabilidad de velocidad
  const speeds = sorted.map(w => w.wind_speed);
  const meanSpeed = speeds.reduce((s, v) => s + v, 0) / speeds.length;
  const speedVariance =
    speeds.reduce((s, v) => s + (v - meanSpeed) ** 2, 0) / speeds.length;
  const speedStd = Math.sqrt(speedVariance);

  // Calcular variabilidad de dirección (más complejo por wrapping circular)
  const directions = sorted.map(w => w.wind_direction);
  const directionChanges: number[] = [];

  for (let i = 1; i < directions.length; i++) {
    const change = calculateAngleDifference(directions[i - 1], directions[i]);
    directionChanges.push(change);
  }

  const meanDirectionChange =
    directionChanges.reduce((s, c) => s + c, 0) / directionChanges.length;

  // Estabilidad: menor variabilidad = mayor estabilidad
  // Normalizamos speed_std por mean_speed y direction_change por 180°
  const speedStability = Math.max(0, 1 - speedStd / (meanSpeed + 1));
  const directionStability = Math.max(0, 1 - meanDirectionChange / 90);

  // Promedio ponderado (dirección es más importante para advección)
  const stability = 0.3 * speedStability + 0.7 * directionStability;

  return Math.max(0, Math.min(1, stability));
}

/**
 * Calcula tasa de crecimiento de fuegos
 *
 * Compara FRP (Fire Radiative Power) total entre snapshots.
 *
 * @param fireHistory - Historial de fuegos (array de arrays)
 * @returns Tasa de crecimiento en MW/hora
 */
function calculateFireGrowthRate(fireHistory: Fire[][]): number {
  if (fireHistory.length < 2) {
    return 0;
  }

  // Calcular FRP total para cada snapshot
  const frpTotals = fireHistory.map(fires => {
    return fires.reduce((sum, fire) => sum + fire.frp, 0);
  });

  // Asumir snapshots están separados uniformemente en tiempo
  const hoursSpan = fireHistory.length - 1; // Si tenemos 4 snapshots, span = 3 horas

  if (hoursSpan === 0) {
    return 0;
  }

  // Calcular cambio total dividido por horas
  const totalChange = frpTotals[frpTotals.length - 1] - frpTotals[0];
  const growthRate = totalChange / hoursSpan;

  return growthRate;
}

// ============================================================================
// UTILIDADES
// ============================================================================

/**
 * Calcula diferencia angular mínima (maneja wrapping circular)
 */
function calculateAngleDifference(angle1: number, angle2: number): number {
  const diff = Math.abs(angle1 - angle2);
  return diff > 180 ? 360 - diff : diff;
}

/**
 * Verifica si las tendencias son confiables
 *
 * Tendencias con pocos samples o alta variabilidad son menos confiables.
 *
 * @param trends - Tendencias calculadas
 * @returns Confianza (0-1)
 */
export function getTrendConfidence(trends: TemporalTrends): number {
  // Más samples = más confianza
  const sampleConfidence = Math.min(1, trends.sample_count / 4);

  // Viento estable = más confianza en advección
  const windConfidence = trends.wind_stability;

  // Promedio
  return (sampleConfidence + windConfidence) / 2;
}

/**
 * Genera descripción textual de tendencias (para reportes)
 *
 * @param trends - Tendencias calculadas
 * @returns Descripción en español
 */
export function describeTrends(trends: TemporalTrends): string {
  const parts: string[] = [];

  // NO2 column trend
  if (Math.abs(trends.no2_trend) > 1e14) {
    const direction = trends.no2_trend > 0 ? 'aumentando' : 'disminuyendo';
    const rate = Math.abs(trends.no2_trend).toExponential(1);
    parts.push(`NO2 column ${direction} a ${rate} molecules/cm²/hora`);
  } else {
    parts.push('NO2 column estable');
  }

  // NO2 surface trend
  if (Math.abs(trends.no2_surface_trend) > 0.5) {
    const direction = trends.no2_surface_trend > 0 ? 'aumentando' : 'disminuyendo';
    const rate = Math.abs(trends.no2_surface_trend).toFixed(1);
    parts.push(`NO2 surface ${direction} a ${rate} ppb/hora`);
  } else {
    parts.push('NO2 surface estable');
  }

  // Wind stability
  if (trends.wind_stability > 0.7) {
    parts.push('Viento muy estable');
  } else if (trends.wind_stability > 0.4) {
    parts.push('Viento moderadamente estable');
  } else {
    parts.push('Viento variable');
  }

  // Fire growth
  if (trends.fire_growth_rate > 10) {
    parts.push(`Fuegos creciendo (+${trends.fire_growth_rate.toFixed(0)} MW/hora)`);
  } else if (trends.fire_growth_rate < -10) {
    parts.push(`Fuegos disminuyendo (${trends.fire_growth_rate.toFixed(0)} MW/hora)`);
  }

  return parts.join('; ');
}

/**
 * Motor principal de advección con grids
 *
 * Este es el motor central del sistema de forecasting. Integra:
 * - Grids TEMPO (NO2 column density)
 * - Tendencias temporales (T-3h → T=0)
 * - Dispersión de humo (emisiones NOx)
 * - Advección física (transporte por viento)
 * - Conversión NO2 column → NO2 surface
 *
 * Flujo completo:
 * 1. Carga grid TEMPO at T=0
 * 2. Calcula tendencias desde T-3h a T=0
 * 3. Agrega emisiones de fuegos (NOx)
 * 4. Advecta grid hacia T+1h, T+2h, T+3h usando wind forecasts
 * 5. Aplica tendencias y ajustes
 * 6. Retorna grids de forecasts
 */

import type {
  AdvectionGrid,
  GridCell,
  WeatherConditions,
  Fire,
  AdvectionFactors,
  TemporalTrends,
  ForecastGrid
} from '../types';

import { addSmokeDispersionToGrid } from './smoke-dispersion';
import { calculateTemporalTrends, applyTrendsToForecast } from './temporal-trends';

// ============================================================================
// TIPOS
// ============================================================================

/**
 * Inputs para forecasting de grid
 */
export interface GridForecastInputs {
  /** Grids históricos (T-3h, T-2h, T-1h, T=0) */
  historicalGrids: AdvectionGrid[];

  /** Weather histórico (para calcular tendencias) */
  historicalWeather: WeatherConditions[];

  /** Weather forecasts para cada horizonte */
  weatherForecasts: WeatherConditions[]; // [T+1h, T+2h, T+3h]

  /** Horizonte de forecast en horas */
  forecast_horizons: number[]; // [1, 2, 3]

  /** Fuegos activos (opcional) */
  fires?: Fire[];

  /** Factores de calibración */
  factors: AdvectionFactors;
}

/**
 * Resultado de forecasting de grid
 */
export interface GridForecastResult {
  /** Grids pronosticados para cada horizonte */
  forecast_grids: ForecastGrid[];

  /** Tendencias calculadas desde históricos */
  trends: TemporalTrends;

  /** Tiempo base del forecast (T=0) */
  base_time: Date;

  /** Estadísticas por horizonte */
  statistics: Array<{
    horizon: number;
    mean_no2: number;
    max_no2: number;
    cells_count: number;
  }>;
}

// ============================================================================
// FUNCIÓN PRINCIPAL
// ============================================================================

/**
 * Genera forecast de grid completo para múltiples horizontes
 *
 * Este es el punto de entrada principal del motor de forecasting.
 *
 * @param inputs - Todos los inputs necesarios
 * @returns Forecast de grids para cada horizonte
 *
 * @example
 * ```typescript
 * const result = forecastGridMultiHorizon({
 *   historicalGrids: [grid_t_minus_3, grid_t_minus_2, grid_t_minus_1, grid_t0],
 *   historicalWeather: [weather_t_minus_3, ..., weather_t0],
 *   weatherForecasts: [weather_t1, weather_t2, weather_t3],
 *   forecast_horizons: [1, 2, 3],
 *   fires: activeFires,
 *   factors: DEFAULT_FACTORS
 * });
 *
 * // result.forecast_grids[0] = grid para T+1h
 * // result.forecast_grids[1] = grid para T+2h
 * // result.forecast_grids[2] = grid para T+3h
 * ```
 */
export function forecastGridMultiHorizon(
  inputs: GridForecastInputs
): GridForecastResult {
  const {
    historicalGrids,
    historicalWeather,
    weatherForecasts,
    forecast_horizons,
    fires,
    factors
  } = inputs;

  // 1. Calcular tendencias temporales desde históricos
  const trends = calculateTemporalTrends(
    historicalGrids,
    historicalWeather,
    [] // fireHistory no disponible por ahora
  );

  // 2. Obtener grid inicial (T=0)
  const currentGrid = historicalGrids[historicalGrids.length - 1];
  const baseTime = currentGrid.timestamp;

  // 3. Convertir NO2 column a NO2 surface
  let workingGrid = convertNO2ColumnToSurface(currentGrid, historicalWeather[historicalWeather.length - 1], factors);

  // DEBUG: Log valores detallados para entender conversión
  const no2ColumnValues = workingGrid.cells.map(c => c.no2_column).filter(v => v !== undefined) as number[];
  const no2SurfaceValues = workingGrid.cells.map(c => c.no2_surface).filter(v => v !== undefined) as number[];

  if (no2ColumnValues.length > 0 && no2SurfaceValues.length > 0) {
    const columnMin = Math.min(...no2ColumnValues);
    const columnMax = Math.max(...no2ColumnValues);
    const columnAvg = no2ColumnValues.reduce((s,v)=>s+v,0)/no2ColumnValues.length;
    const surfaceMin = Math.min(...no2SurfaceValues);
    const surfaceMax = Math.max(...no2SurfaceValues);
    const surfaceAvg = no2SurfaceValues.reduce((s,v)=>s+v,0)/no2SurfaceValues.length;

    console.log(`   🔬 Conversión NO2 column→surface (${workingGrid.cells.length} celdas):`);
    console.log(`     NO2 column:  min=${columnMin.toExponential(2)}, max=${columnMax.toExponential(2)}, avg=${columnAvg.toExponential(2)} molecules/cm²`);
    console.log(`     NO2 surface: min=${surfaceMin.toFixed(2)}, max=${surfaceMax.toFixed(2)}, avg=${surfaceAvg.toFixed(2)} ppb`);
    console.log(`     Factor usado: ${(2e-16 * factors.no2_column_to_surface).toExponential(2)}`);
  }

  // 4. Agregar contribución de fuegos (emisiones NOx)
  if (fires && fires.length > 0) {
    const beforeFires = workingGrid.cells.map(c => c.no2_surface).filter(v => v !== undefined) as number[];
    const maxBefore = Math.max(...beforeFires);
    const avgBefore = beforeFires.reduce((s,v)=>s+v,0)/beforeFires.length;

    console.log(`   🔥 Agregando ${fires.length} fuegos activos...`);
    console.log(`     FRP total: ${fires.reduce((s,f)=>s+f.frp,0).toFixed(1)} MW`);

    workingGrid = addSmokeDispersionToGrid(
      fires,
      workingGrid,
      historicalWeather[historicalWeather.length - 1],
      factors
    );

    const afterFires = workingGrid.cells.map(c => c.no2_surface).filter(v => v !== undefined) as number[];
    const maxAfter = Math.max(...afterFires);
    const avgAfter = afterFires.reduce((s,v)=>s+v,0)/afterFires.length;
    const deltaMax = maxAfter - maxBefore;
    const deltaAvg = avgAfter - avgBefore;

    console.log(`     NO2 después fuegos: max=${maxAfter.toFixed(2)} (+${deltaMax.toFixed(2)}), avg=${avgAfter.toFixed(2)} (+${deltaAvg.toFixed(2)}) ppb`);
  } else {
    console.log(`   🔥 Sin fuegos activos`);
  }

  // 5. Advectar grid para cada horizonte
  const forecastGrids: ForecastGrid[] = [];
  const statistics: GridForecastResult['statistics'] = [];

  for (let i = 0; i < forecast_horizons.length; i++) {
    const horizon = forecast_horizons[i];
    const weatherForecast = weatherForecasts[i];

    if (!weatherForecast) {
      continue; // Skip si no hay weather forecast
    }

    // Advectar 1 hora desde el grid anterior
    workingGrid = advectGrid(workingGrid, weatherForecast, 1);

    // Aplicar tendencias temporales
    const beforeTrends = workingGrid.cells.map(c => c.no2_surface).filter(v => v !== undefined) as number[];
    workingGrid = applyTrendsToGrid(workingGrid, trends, horizon);
    const afterTrends = workingGrid.cells.map(c => c.no2_surface).filter(v => v !== undefined) as number[];

    console.log(`     T+${horizon}h: NO2 max=${Math.max(...afterTrends).toFixed(2)} ppb (después trends, era ${Math.max(...beforeTrends).toFixed(2)})`);

    // Aplicar deposición seca (NO2 se deposita en superficies)
    if (weatherForecast.precipitation > 0) {
      workingGrid = applyPrecipitationWashout(
        workingGrid,
        weatherForecast.precipitation,
        factors
      );
    }

    // Calcular confianza (decrece con horizonte)
    const confidence = Math.max(0.3, 0.9 - horizon * 0.1);

    // Crear ForecastGrid
    const forecastGrid: ForecastGrid = {
      grid: workingGrid,
      hours_ahead: horizon,
      confidence,
      forecast_base_time: baseTime,
      method: 'advection'
    };

    forecastGrids.push(forecastGrid);

    // Calcular estadísticas
    const no2Values = workingGrid.cells
      .map(c => c.no2_surface)
      .filter(v => v !== undefined) as number[];

    statistics.push({
      horizon,
      mean_no2: no2Values.reduce((s, v) => s + v, 0) / no2Values.length || 0,
      max_no2: Math.max(...no2Values, 0),
      cells_count: no2Values.length
    });
  }

  return {
    forecast_grids: forecastGrids,
    trends,
    base_time: baseTime,
    statistics
  };
}

// ============================================================================
// FUNCIONES DE ADVECCIÓN
// ============================================================================

/**
 * Advecta un grid según el viento
 *
 * Mueve cada celda del grid en la dirección y velocidad del viento.
 *
 * @param grid - Grid a advectar
 * @param weather - Condiciones meteorológicas
 * @param hours - Horas de advección
 * @returns Grid advectado
 */
export function advectGrid(
  grid: AdvectionGrid,
  weather: WeatherConditions,
  hours: number
): AdvectionGrid {
  const { wind_speed, wind_direction } = weather;

  // Convertir dirección de viento a radianes
  // Wind direction: meteorological (de donde viene)
  // Necesitamos dirección hacia donde VA el viento
  const windRadians = ((wind_direction + 180) * Math.PI) / 180;

  // Calcular desplazamiento en km
  const distanceKm = wind_speed * 3.6 * hours; // m/s → km/h * hours

  // Calcular desplazamiento en lat/lon
  const deltaLat = (distanceKm * Math.cos(windRadians)) / 111; // ~111 km/degree
  const avgLat = grid.cells[0]?.latitude || 0;
  const deltaLon =
    (distanceKm * Math.sin(windRadians)) /
    (111 * Math.cos((avgLat * Math.PI) / 180));

  // Advectar cada celda
  const advectedCells: GridCell[] = grid.cells.map(cell => ({
    ...cell,
    latitude: cell.latitude + deltaLat,
    longitude: cell.longitude + deltaLon
  }));

  // Actualizar bounds
  const lats = advectedCells.map(c => c.latitude);
  const lons = advectedCells.map(c => c.longitude);

  return {
    cells: advectedCells,
    bounds: {
      north: Math.max(...lats),
      south: Math.min(...lats),
      east: Math.max(...lons),
      west: Math.min(...lons)
    },
    resolution: grid.resolution,
    timestamp: new Date(grid.timestamp.getTime() + hours * 3600000)
  };
}

// ============================================================================
// CONVERSIONES Y TRANSFORMACIONES
// ============================================================================

/**
 * Calcula factor de ciclo diurno para NO2
 *
 * NO2 tiene un ciclo diurno marcado debido a fotoquímica:
 * - Noche (20:00-06:00): Acumulación (sin fotólisis) → factor > 1.0
 * - Mañana (06:00-10:00): Pico de tráfico → factor máximo ≈ 1.2
 * - Día (10:00-16:00): Fotólisis activa → factor < 1.0
 * - Tarde (16:00-20:00): Segundo pico de tráfico → factor ≈ 1.1
 *
 * @param localHour - Hora local (0-23)
 * @returns Factor multiplicativo (0.8-1.2)
 */
function getDiurnalNO2Factor(localHour: number): number {
  // Basado en observaciones EPA de ciclos diurnos de NO2
  // Ver: https://www.epa.gov/no2-pollution/basic-information-about-no2

  if (localHour >= 6 && localHour < 10) {
    // Mañana: rush hour + PBL bajo
    return 1.15;
  } else if (localHour >= 10 && localHour < 16) {
    // Día: fotólisis activa + PBL alto
    return 0.85;
  } else if (localHour >= 16 && localHour < 20) {
    // Tarde: segundo rush hour
    return 1.1;
  } else {
    // Noche: acumulación sin fotólisis
    return 1.0;
  }
}

/**
 * Convierte NO2 column density a NO2 surface concentration
 *
 * Usa PBL height para estimar distribución vertical.
 *
 * Conversión basada en literatura:
 * - 1e16 molecules/cm² ≈ 20-50 ppb NO2 en superficie
 * - Factor típico: 2e-16 ppb per molecules/cm²
 *
 * @param grid - Grid con NO2 column
 * @param weather - Condiciones meteorológicas
 * @param factors - Factores de calibración
 * @returns Grid con NO2 surface en ppb
 */
function convertNO2ColumnToSurface(
  grid: AdvectionGrid,
  weather: WeatherConditions,
  factors: AdvectionFactors
): AdvectionGrid {
  const cells = grid.cells.map(cell => {
    if (!cell.no2_column) {
      return { ...cell, no2_surface: 0 };
    }

    // Conversión NO2 column → surface
    // IMPORTANTE: NO2 column viene en molecules/cm²
    // Valores típicos TEMPO: 1e15 - 5e16 molecules/cm²

    // Factor de conversión empírico basado en literatura
    // 1e16 molecules/cm² ≈ 20-50 ppb NO2 surface
    // Usamos factor conservador de 2e-16
    let no2_surface = cell.no2_column * 2e-16 * factors.no2_column_to_surface;

    // Ajustar por PBL height (menor PBL = mayor concentración surface)
    // Relación física: concentración inversamente proporcional a altura de mezcla
    // Pero NO es inversamente lineal - usar función más suave
    const pblHeight = Math.max(weather.pbl_height, 300);
    const pblFactor = Math.sqrt(factors.pbl_reference / pblHeight); // raíz cuadrada en vez de lineal
    no2_surface *= pblFactor;

    // Ciclo diurno de NO2 (fotoquímica)
    // NO2 + luz solar → NO + O
    // Durante el día: fotólisis reduce NO2
    // Durante la noche: acumulación de NO2 (sin fotólisis + emisiones)
    const hour = weather.timestamp.getUTCHours();
    const localHour = (hour - 8 + 24) % 24; // UTC-8 para LA
    const diurnalFactor = getDiurnalNO2Factor(localHour);
    no2_surface *= diurnalFactor;

    // SANITY CHECK: NO2 normal está entre 0-200 ppb
    // Valores >200 ppb son extremadamente altos (eventos excepcionales)
    if (no2_surface > 200) {
      console.warn(`   ⚠️  NO2 surface muy alto: ${no2_surface.toFixed(1)} ppb desde column=${cell.no2_column.toExponential(2)}, capping a 200`);
      no2_surface = 200;
    }

    return {
      ...cell,
      no2_surface
    };
  });

  return {
    ...grid,
    cells
  };
}

/**
 * Aplica tendencias temporales a un grid
 *
 * Ajusta NO2 de cada celda basándose en tendencias detectadas.
 *
 * @param grid - Grid a ajustar
 * @param trends - Tendencias calculadas
 * @param hoursAhead - Horizonte de forecast
 * @returns Grid con tendencias aplicadas
 */
function applyTrendsToGrid(
  grid: AdvectionGrid,
  trends: TemporalTrends,
  hoursAhead: number
): AdvectionGrid {
  const cells = grid.cells.map(cell => {
    if (!cell.no2_surface) {
      return cell;
    }

    const adjustedNO2 = applyTrendsToForecast(
      cell.no2_surface,
      trends,
      hoursAhead
    );

    return {
      ...cell,
      no2_surface: Math.max(0, adjustedNO2) // Asegurar no negativo
    };
  });

  return {
    ...grid,
    cells
  };
}

/**
 * Aplica deposición seca y húmeda de NO2
 *
 * NO2 se deposita en superficies (deposición seca) y se remueve por lluvia (deposición húmeda).
 * El efecto es menor que para PM2.5 porque NO2 es gas, no partícula.
 *
 * @param grid - Grid a ajustar
 * @param precipitation - Precipitación en mm
 * @param factors - Factores de calibración
 * @returns Grid con deposición aplicada
 */
function applyPrecipitationWashout(
  grid: AdvectionGrid,
  precipitation: number,
  factors: AdvectionFactors
): AdvectionGrid {
  if (precipitation <= 0) {
    return grid;
  }

  // Factor de remoción: exponencial con precipitación
  // Nota: NO2 es gas, no se remueve tanto como PM2.5
  // Usamos la mitad del washout_rate
  const washoutFactor = Math.exp(-precipitation * factors.washout_rate * 0.5);

  const cells = grid.cells.map(cell => ({
    ...cell,
    no2_surface: cell.no2_surface ? cell.no2_surface * washoutFactor : cell.no2_surface
  }));

  return {
    ...grid,
    cells
  };
}

// ============================================================================
// UTILIDADES
// ============================================================================

/**
 * Extrae valor de NO2 en una ubicación específica desde un grid
 *
 * Usa interpolación con celdas cercanas.
 *
 * @param grid - Grid de forecast
 * @param location - Ubicación objetivo
 * @returns NO2 surface interpolado (ppb) o null
 */
export function extractNO2AtLocation(
  grid: AdvectionGrid,
  location: { latitude: number; longitude: number }
): number | null {
  // Encontrar 4 celdas más cercanas
  const distances = grid.cells
    .map(cell => ({
      cell,
      distance: Math.sqrt(
        (cell.latitude - location.latitude) ** 2 +
          (cell.longitude - location.longitude) ** 2
      )
    }))
    .sort((a, b) => a.distance - b.distance)
    .slice(0, 4);

  if (distances.length === 0) {
    return null;
  }

  // Interpolación con inverse distance weighting
  let totalWeight = 0;
  let weightedSum = 0;

  for (const { cell, distance } of distances) {
    if (!cell.no2_surface) continue;

    const weight = 1 / (distance + 0.0001); // Evitar división por cero
    weightedSum += cell.no2_surface * weight;
    totalWeight += weight;
  }

  if (totalWeight === 0) {
    return null;
  }

  let result = weightedSum / totalWeight;

  // SANITY CHECK FINAL: NO2 debe estar en rango 0-200 ppb
  if (result > 200) {
    console.warn(`   ⚠️  NO2 interpolado muy alto: ${result.toFixed(1)} ppb, capping a 200`);
    result = 200;
  }

  return result;
}

/**
 * Genera resumen textual de forecast (para logging)
 *
 * @param result - Resultado de forecast
 * @returns Descripción en español
 */
export function describeForecast(result: GridForecastResult): string {
  const lines: string[] = [];

  lines.push(`Forecast generado desde: ${result.base_time.toISOString()}`);
  lines.push(`Tendencias: ${result.trends.no2_trend > 0 ? 'Aumento' : 'Disminución'} de ${Math.abs(result.trends.no2_trend).toExponential(2)} molecules/cm²/hora`);

  for (const stat of result.statistics) {
    lines.push(
      `T+${stat.horizon}h: NO2 promedio = ${stat.mean_no2.toFixed(1)} ppb, máximo = ${stat.max_no2.toFixed(1)} ppb`
    );
  }

  return lines.join('\n');
}

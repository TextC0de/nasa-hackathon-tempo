/**
 * Extractor de features para Machine Learning
 *
 * Convierte grids de advección + metadata en features tabulares
 * para entrenar modelos de ML (XGBoost, Random Forest, etc.)
 */

import type {
  AdvectionGrid,
  GridCell,
  WeatherConditions,
  TemporalTrends,
  GeoPoint
} from '../types';

// ============================================================================
// TIPOS
// ============================================================================

/**
 * Feature vector completo para ML
 *
 * ~65 features que capturan:
 * - Información espacial (vecindarios, upwind, downwind, direcciones)
 * - Meteorología (viento, PBL, temperatura)
 * - Temporal (hora, día, tendencias)
 * - Predicción física (del modelo de advección)
 */
export interface MLFeatures {
  // ==========================================
  // CENTRO (4 features)
  // ==========================================
  no2_column_center: number;
  no2_surface_center: number;
  lat: number;
  lon: number;

  // ==========================================
  // VECINDARIOS (12 features)
  // ==========================================
  no2_avg_5km: number;
  no2_max_5km: number;
  no2_min_5km: number;
  no2_std_5km: number;

  no2_avg_10km: number;
  no2_max_10km: number;
  no2_min_10km: number;
  no2_std_10km: number;

  no2_avg_20km: number;
  no2_max_20km: number;
  no2_min_20km: number;
  no2_std_20km: number;

  // ==========================================
  // UPWIND (9 features)
  // ==========================================
  no2_upwind_10km_avg: number;
  no2_upwind_10km_max: number;
  no2_upwind_10km_std: number;

  no2_upwind_20km_avg: number;
  no2_upwind_20km_max: number;
  no2_upwind_20km_std: number;

  no2_upwind_30km_avg: number;
  no2_upwind_30km_max: number;
  no2_upwind_30km_std: number;

  // ==========================================
  // DOWNWIND (3 features)
  // ==========================================
  no2_downwind_10km_avg: number;
  no2_downwind_10km_max: number;
  no2_downwind_10km_std: number;

  // ==========================================
  // DIRECCIONES CARDINALES (8 features)
  // ==========================================
  no2_north_10km: number;
  no2_north_std_10km: number;
  no2_east_10km: number;
  no2_east_std_10km: number;
  no2_south_10km: number;
  no2_south_std_10km: number;
  no2_west_10km: number;
  no2_west_std_10km: number;

  // ==========================================
  // GRADIENTES ESPACIALES (4 features)
  // ==========================================
  gradient_NS: number;
  gradient_EW: number;
  gradient_upwind_downwind: number;
  gradient_center_avg: number;

  // ==========================================
  // METEOROLOGÍA (8 features)
  // ==========================================
  wind_speed: number;
  wind_direction: number;
  wind_u: number;
  wind_v: number;
  pbl_height: number;
  temperature: number;
  precipitation: number;
  pbl_normalized: number;

  // ==========================================
  // TENDENCIAS TEMPORALES (5 features)
  // ==========================================
  no2_trend: number;
  no2_surface_trend: number;
  wind_stability: number;
  fire_growth_rate: number;
  trend_sample_count: number;

  // ==========================================
  // TEMPORAL (6 features)
  // ==========================================
  hour: number;
  day_of_week: number;
  is_weekend: number;
  is_rush_hour: number;
  month: number;
  horizon: number;

  // ==========================================
  // PREDICCIÓN FÍSICA (1 feature)
  // ==========================================
  physics_prediction: number;
}

/**
 * Sample completo: features + target
 */
export interface MLSample {
  features: MLFeatures;
  target: number; // NO2 surface real (EPA)
}

// ============================================================================
// FUNCIÓN PRINCIPAL
// ============================================================================

/**
 * Extrae features de ML desde un grid de advección
 *
 * @param location - Ubicación donde predecir
 * @param grid - Grid de advección con NO2 column y surface
 * @param weather - Condiciones meteorológicas
 * @param trends - Tendencias temporales
 * @param horizon - Horizonte de predicción (1, 2, 3 horas)
 * @returns Feature vector para ML
 */
export function extractMLFeatures(
  location: GeoPoint,
  grid: AdvectionGrid,
  weather: WeatherConditions,
  trends: TemporalTrends,
  horizon: number
): MLFeatures {
  // 1. Celda central
  const centerCell = findNearestCell(grid, location);

  // 2. Vecindarios múltiples
  const neighbors_5km = getCellsInRadius(grid, location, 5);
  const neighbors_10km = getCellsInRadius(grid, location, 10);
  const neighbors_20km = getCellsInRadius(grid, location, 20);

  // 3. Upwind (de donde VIENE contaminación)
  const upwind_10km = getUpwindCells(grid, location, weather, 10, 5);
  const upwind_20km = getUpwindCells(grid, location, weather, 20, 5);
  const upwind_30km = getUpwindCells(grid, location, weather, 30, 5);

  // 4. Downwind (hacia donde VA)
  const downwind_10km = getDownwindCells(grid, location, weather, 10, 5);

  // 5. Direcciones cardinales
  const north_10km = getCellsInDirection(grid, location, 0, 10, 5);
  const east_10km = getCellsInDirection(grid, location, 90, 10, 5);
  const south_10km = getCellsInDirection(grid, location, 180, 10, 5);
  const west_10km = getCellsInDirection(grid, location, 270, 10, 5);

  // 6. Calcular estadísticas
  const hour = weather.timestamp.getUTCHours();
  const localHour = (hour - 8 + 24) % 24; // UTC-8 para LA

  return {
    // Centro
    no2_column_center: centerCell?.no2_column || 0,
    no2_surface_center: centerCell?.no2_surface || 0,
    lat: location.latitude,
    lon: location.longitude,

    // Vecindarios
    no2_avg_5km: avgNO2Column(neighbors_5km),
    no2_max_5km: maxNO2Column(neighbors_5km),
    no2_min_5km: minNO2Column(neighbors_5km),
    no2_std_5km: stdNO2Column(neighbors_5km),

    no2_avg_10km: avgNO2Column(neighbors_10km),
    no2_max_10km: maxNO2Column(neighbors_10km),
    no2_min_10km: minNO2Column(neighbors_10km),
    no2_std_10km: stdNO2Column(neighbors_10km),

    no2_avg_20km: avgNO2Column(neighbors_20km),
    no2_max_20km: maxNO2Column(neighbors_20km),
    no2_min_20km: minNO2Column(neighbors_20km),
    no2_std_20km: stdNO2Column(neighbors_20km),

    // Upwind
    no2_upwind_10km_avg: avgNO2Column(upwind_10km),
    no2_upwind_10km_max: maxNO2Column(upwind_10km),
    no2_upwind_10km_std: stdNO2Column(upwind_10km),

    no2_upwind_20km_avg: avgNO2Column(upwind_20km),
    no2_upwind_20km_max: maxNO2Column(upwind_20km),
    no2_upwind_20km_std: stdNO2Column(upwind_20km),

    no2_upwind_30km_avg: avgNO2Column(upwind_30km),
    no2_upwind_30km_max: maxNO2Column(upwind_30km),
    no2_upwind_30km_std: stdNO2Column(upwind_30km),

    // Downwind
    no2_downwind_10km_avg: avgNO2Column(downwind_10km),
    no2_downwind_10km_max: maxNO2Column(downwind_10km),
    no2_downwind_10km_std: stdNO2Column(downwind_10km),

    // Direcciones cardinales
    no2_north_10km: avgNO2Column(north_10km),
    no2_north_std_10km: stdNO2Column(north_10km),
    no2_east_10km: avgNO2Column(east_10km),
    no2_east_std_10km: stdNO2Column(east_10km),
    no2_south_10km: avgNO2Column(south_10km),
    no2_south_std_10km: stdNO2Column(south_10km),
    no2_west_10km: avgNO2Column(west_10km),
    no2_west_std_10km: stdNO2Column(west_10km),

    // Gradientes espaciales
    gradient_NS: (avgNO2Column(north_10km) - avgNO2Column(south_10km)) / 20000, // per meter
    gradient_EW: (avgNO2Column(east_10km) - avgNO2Column(west_10km)) / 20000,
    gradient_upwind_downwind: (avgNO2Column(upwind_10km) - avgNO2Column(downwind_10km)) / 20000,
    gradient_center_avg: ((centerCell?.no2_column || 0) - avgNO2Column(neighbors_10km)) / 10000,

    // Meteorología
    wind_speed: weather.wind_speed,
    wind_direction: weather.wind_direction,
    wind_u: weather.wind_speed * Math.cos((weather.wind_direction * Math.PI) / 180),
    wind_v: weather.wind_speed * Math.sin((weather.wind_direction * Math.PI) / 180),
    pbl_height: weather.pbl_height,
    temperature: weather.temperature,
    precipitation: weather.precipitation,
    pbl_normalized: weather.pbl_height / 800,

    // Tendencias
    no2_trend: trends.no2_trend,
    no2_surface_trend: trends.no2_surface_trend,
    wind_stability: trends.wind_stability,
    fire_growth_rate: trends.fire_growth_rate,
    trend_sample_count: trends.sample_count,

    // Temporal
    hour: localHour,
    day_of_week: weather.timestamp.getUTCDay(),
    is_weekend: weather.timestamp.getUTCDay() >= 5 ? 1 : 0,
    is_rush_hour: (localHour >= 6 && localHour <= 9) || (localHour >= 16 && localHour <= 19) ? 1 : 0,
    month: weather.timestamp.getUTCMonth(),
    horizon: horizon,

    // Predicción física (MUY IMPORTANTE)
    physics_prediction: centerCell?.no2_surface || 0,
  };
}

// ============================================================================
// FUNCIONES AUXILIARES - BÚSQUEDA ESPACIAL
// ============================================================================

/**
 * Encuentra la celda más cercana a una ubicación
 */
function findNearestCell(grid: AdvectionGrid, location: GeoPoint): GridCell | null {
  let nearest: GridCell | null = null;
  let minDist = Infinity;

  for (const cell of grid.cells) {
    const dist = haversineDistance(
      location.latitude,
      location.longitude,
      cell.latitude,
      cell.longitude
    );

    if (dist < minDist) {
      minDist = dist;
      nearest = cell;
    }
  }

  return nearest;
}

/**
 * Obtiene celdas dentro de un radio
 */
function getCellsInRadius(
  grid: AdvectionGrid,
  center: GeoPoint,
  radiusKm: number
): GridCell[] {
  const cells: GridCell[] = [];

  for (const cell of grid.cells) {
    const dist = haversineDistance(
      center.latitude,
      center.longitude,
      cell.latitude,
      cell.longitude
    );

    if (dist <= radiusKm) {
      cells.push(cell);
    }
  }

  return cells;
}

/**
 * Obtiene celdas upwind (de donde VIENE el viento)
 *
 * @param center - Ubicación central
 * @param weather - Condiciones meteorológicas
 * @param distanceKm - Distancia upwind en km
 * @param radiusKm - Radio de búsqueda alrededor del punto upwind
 */
function getUpwindCells(
  grid: AdvectionGrid,
  center: GeoPoint,
  weather: WeatherConditions,
  distanceKm: number,
  radiusKm: number
): GridCell[] {
  // Viento viene DE wind_direction, entonces upwind está EN esa dirección
  const upwindLocation = moveLocation(center, weather.wind_direction, distanceKm);
  return getCellsInRadius(grid, upwindLocation, radiusKm);
}

/**
 * Obtiene celdas downwind (hacia donde VA el viento)
 */
function getDownwindCells(
  grid: AdvectionGrid,
  center: GeoPoint,
  weather: WeatherConditions,
  distanceKm: number,
  radiusKm: number
): GridCell[] {
  // Viento va HACIA wind_direction + 180
  const downwindDirection = (weather.wind_direction + 180) % 360;
  const downwindLocation = moveLocation(center, downwindDirection, distanceKm);
  return getCellsInRadius(grid, downwindLocation, radiusKm);
}

/**
 * Obtiene celdas en una dirección cardinal específica
 *
 * @param bearing - Dirección en grados (0=N, 90=E, 180=S, 270=W)
 */
function getCellsInDirection(
  grid: AdvectionGrid,
  center: GeoPoint,
  bearing: number,
  distanceKm: number,
  radiusKm: number
): GridCell[] {
  const targetLocation = moveLocation(center, bearing, distanceKm);
  return getCellsInRadius(grid, targetLocation, radiusKm);
}

/**
 * Mueve una ubicación en una dirección y distancia
 */
function moveLocation(
  location: GeoPoint,
  bearing: number,
  distanceKm: number
): GeoPoint {
  const R = 6371; // Radio de la Tierra en km
  const bearingRad = (bearing * Math.PI) / 180;
  const lat1 = (location.latitude * Math.PI) / 180;
  const lon1 = (location.longitude * Math.PI) / 180;

  const lat2 = Math.asin(
    Math.sin(lat1) * Math.cos(distanceKm / R) +
      Math.cos(lat1) * Math.sin(distanceKm / R) * Math.cos(bearingRad)
  );

  const lon2 =
    lon1 +
    Math.atan2(
      Math.sin(bearingRad) * Math.sin(distanceKm / R) * Math.cos(lat1),
      Math.cos(distanceKm / R) - Math.sin(lat1) * Math.sin(lat2)
    );

  return {
    latitude: (lat2 * 180) / Math.PI,
    longitude: (lon2 * 180) / Math.PI,
  };
}

/**
 * Calcula distancia haversine entre dos puntos (en km)
 */
function haversineDistance(
  lat1: number,
  lon1: number,
  lat2: number,
  lon2: number
): number {
  const R = 6371; // Radio de la Tierra en km
  const dLat = ((lat2 - lat1) * Math.PI) / 180;
  const dLon = ((lon2 - lon1) * Math.PI) / 180;

  const a =
    Math.sin(dLat / 2) * Math.sin(dLat / 2) +
    Math.cos((lat1 * Math.PI) / 180) *
      Math.cos((lat2 * Math.PI) / 180) *
      Math.sin(dLon / 2) *
      Math.sin(dLon / 2);

  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
  return R * c;
}

// ============================================================================
// FUNCIONES AUXILIARES - ESTADÍSTICAS
// ============================================================================

function avgNO2Column(cells: GridCell[]): number {
  const values = cells.map(c => c.no2_column).filter(v => v !== undefined) as number[];
  if (values.length === 0) return 0;
  return values.reduce((s, v) => s + v, 0) / values.length;
}

function maxNO2Column(cells: GridCell[]): number {
  const values = cells.map(c => c.no2_column).filter(v => v !== undefined) as number[];
  if (values.length === 0) return 0;
  return Math.max(...values);
}

function minNO2Column(cells: GridCell[]): number {
  const values = cells.map(c => c.no2_column).filter(v => v !== undefined) as number[];
  if (values.length === 0) return 0;
  return Math.min(...values);
}

function stdNO2Column(cells: GridCell[]): number {
  const values = cells.map(c => c.no2_column).filter(v => v !== undefined) as number[];
  if (values.length === 0) return 0;

  const avg = values.reduce((s, v) => s + v, 0) / values.length;
  const variance = values.reduce((s, v) => s + (v - avg) ** 2, 0) / values.length;
  return Math.sqrt(variance);
}

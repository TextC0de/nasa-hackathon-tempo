/**
 * Core advection model
 * Implements atmospheric transport physics for pollutant forecasting
 */

import type {
  AdvectionFactors,
  WeatherConditions,
  Fire,
  AdvectionGrid,
  ForecastResult,
  GroundMeasurement,
} from '../types';


/**
 * Punto geográfico (lat, lng)
 */
interface GeoPoint {
    latitude: number;
    longitude: number;
}

/**
 * Advect a grid based on wind
 * Moves pollutants according to wind speed and direction
 */
export function advectGrid(
  grid: AdvectionGrid,
  weather: WeatherConditions,
  hours: number
): AdvectionGrid {
  const { wind_speed, wind_direction } = weather;

  // Convert wind direction to radians (0° = North, 90° = East)
  const windRadians = ((wind_direction - 180) * Math.PI) / 180;

  // Calculate displacement in km
  const distanceKm = (wind_speed * 3.6 * hours); // m/s to km/h * hours

  // Calculate lat/lon displacement
  const deltaLat = (distanceKm * Math.cos(windRadians)) / 111; // ~111 km per degree latitude
  const deltaLon =
    (distanceKm * Math.sin(windRadians)) /
    (111 * Math.cos((grid.cells[0]?.latitude || 0) * (Math.PI / 180)));

  // Advect each cell
  const advectedCells = grid.cells.map((cell) => ({
    ...cell,
    latitude: cell.latitude + deltaLat,
    longitude: cell.longitude + deltaLon,
  }));

  return {
    ...grid,
    cells: advectedCells,
    timestamp: new Date(grid.timestamp.getTime() + hours * 3600000),
  };
}

/**
 * Convert NO2 column density to surface concentration
 * Uses PBL height to estimate vertical distribution
 */
export function columnToSurface(
  columnDensity: number, // molecules/cm²
  pblHeight: number, // meters
  factors: AdvectionFactors
): number {
  // Convert column to surface using empirical factor
  const surfaceConcentration =
    columnDensity *
    factors.no2_column_to_surface *
    (factors.pbl_reference / pblHeight);

  // Convert molecules/cm² to ppb (rough approximation)
  // 1e15 molecules/cm² ≈ 1 ppb at surface
  return surfaceConcentration / 1e15;
}

/**
 * Calculate fire impact on PM2.5
 * Based on Fire Radiative Power and distance
 */
export function calculateFireImpact(
  fires: Fire[],
  location: GeoPoint,
  factors: AdvectionFactors
): number {
  let totalImpact = 0;

  for (const fire of fires) {
    const distance = getDistanceKm(
      location.latitude,
      location.longitude,
      fire.latitude,
      fire.longitude
    );

    // Avoid division by zero
    const distanceFactor = Math.max(distance, 0.1);

    // Weight decreases with distance (distance decay)
    const weight = 1 / Math.pow(distanceFactor, factors.fire_distance_decay);

    // Impact proportional to FRP
    const impact = fire.frp * factors.fire_frp_scaling * weight;
    totalImpact += impact;
  }

  return totalImpact;
}

/**
 * Calculate washout factor from precipitation
 * Exponential decay based on precipitation rate
 */
export function calculateWashout(
  precipitation: number, // mm
  factors: AdvectionFactors
): number {
  if (precipitation <= 0) {
    return 1.0;
  }

  // Exponential decay with precipitation
  return Math.exp(-precipitation * factors.washout_rate);
}

/**
 * Calculate bias correction using ground truth
 * Adjusts forecast based on recent observations
 */
export function calculateBiasCorrection(
  predicted: number,
  groundTruth: GroundMeasurement | null,
  factors: AdvectionFactors
): number {
  if (!groundTruth) {
    return 0;
  }

  const bias = groundTruth.value - predicted;
  return bias * factors.bias_correction_weight;
}

/**
 * Main advection forecast function
 * Combines all components to produce a forecast
 */
export function forecastAdvection(
  location: GeoPoint,
  no2Column: number, // molecules/cm²
  weather: WeatherConditions,
  fires: Fire[],
  groundTruth: GroundMeasurement | null,
  factors: AdvectionFactors,
  hoursAhead: number
): ForecastResult {
  // 1. Convert column to surface
  const no2Surface = columnToSurface(no2Column, weather.pbl_height, factors);

  // 2. Calculate fire contribution to PM2.5
  const fireContribution = calculateFireImpact(fires, location, factors);

  // 3. Apply washout
  const washoutFactor = calculateWashout(weather.precipitation, factors);

  // 4. Base PM2.5 (simplified: assume correlation with NO2)
  const pm25Base = no2Surface * factors.pm_index_to_surface * 10; // rough scaling

  // 5. Calculate bias correction
  const biasCorrection = calculateBiasCorrection(
    pm25Base,
    groundTruth,
    factors
  );

  // 6. Final forecast
  const pm25Forecast =
    (pm25Base + fireContribution) * washoutFactor + biasCorrection;

  // 7. Confidence decreases with forecast horizon
  const baseConfidence = 0.9;
  const confidence = Math.max(
    0.3,
    baseConfidence - hoursAhead * 0.05
  );

  return {
    location,
    pollutant: 'PM25',
    timestamp: new Date(weather.timestamp.getTime() + hoursAhead * 3600000),
    hours_ahead: hoursAhead,
    value: Math.max(0, pm25Forecast), // Ensure non-negative
    unit: 'µg/m³',
    confidence,
    method: 'advection',
    components: {
      base_value: pm25Base,
      fire_contribution: fireContribution,
      washout_factor: washoutFactor,
      bias_correction: biasCorrection,
    },
  };
}

/**
 * Persistence forecast (baseline comparison)
 * Simply uses the last observation
 */
export function forecastPersistence(
  location: GeoPoint,
  groundTruth: GroundMeasurement,
  hoursAhead: number
): ForecastResult {
  // Confidence decreases faster with persistence
  const confidence = Math.max(0.2, 0.8 - hoursAhead * 0.08);

  return {
    location,
    pollutant: 'PM25',
    timestamp: new Date(
      groundTruth.timestamp.getTime() + hoursAhead * 3600000
    ),
    hours_ahead: hoursAhead,
    value: groundTruth.value,
    unit: groundTruth.unit,
    confidence,
    method: 'persistence',
  };
}

/**
 * Calculate distance between two points in km (Haversine)
 */
function getDistanceKm(
  lat1: number,
  lon1: number,
  lat2: number,
  lon2: number
): number {
  const R = 6371; // Earth radius in km
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

/**
 * Interpolate grid value at specific location
 * Uses bilinear interpolation
 */
export function interpolateGridValue(
  grid: AdvectionGrid,
  location: GeoPoint
): number | null {
  // Find nearest cells
  const nearestCells = grid.cells
    .map((cell) => ({
      cell,
      distance: getDistanceKm(
        location.latitude,
        location.longitude,
        cell.latitude,
        cell.longitude
      ),
    }))
    .sort((a, b) => a.distance - b.distance)
    .slice(0, 4);

  if (nearestCells.length === 0) {
    return null;
  }

  // Inverse distance weighting
  let totalWeight = 0;
  let weightedSum = 0;

  for (const { cell, distance } of nearestCells) {
    if (cell.value === undefined) continue;

    const weight = 1 / (distance + 0.001); // Avoid division by zero
    weightedSum += cell.value * weight;
    totalWeight += weight;
  }

  return totalWeight > 0 ? weightedSum / totalWeight : null;
}

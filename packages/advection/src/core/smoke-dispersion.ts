/**
 * Modelo de dispersión de emisiones de fuegos (Fire Emissions Dispersion Model)
 *
 * Este módulo modela cómo las emisiones NOx de fuegos se dispersan en la atmósfera
 * y afectan la concentración de NO2 en áreas downwind (viento abajo).
 *
 * Los incendios forestales emiten grandes cantidades de:
 * - NOx (NO + NO2) desde combustión
 * - HCHO (formaldehído) - marcador de biomass burning
 * - PM2.5 y otros contaminantes
 *
 * Usa un modelo Gaussian plume simplificado que considera:
 * - Dirección y velocidad del viento
 * - Altura de capa límite planetaria (PBL)
 * - Intensidad del fuego (FRP - Fire Radiative Power)
 * - Dispersión atmosférica
 */

import type {
  Fire,
  WeatherConditions,
  AdvectionGrid,
  GridCell,
  GeoPoint,
  AdvectionFactors
} from '../types';

// ============================================================================
// TIPOS
// ============================================================================

/**
 * Pluma de emisiones generada por un fuego
 */
export interface SmokePlume {
  /** Ubicación del fuego (fuente) */
  source: GeoPoint;

  /** Fire Radiative Power en MW */
  frp: number;

  /** Tasa de emisión de NOx estimada (ppb/hora) */
  nox_emission_rate: number;

  /** Celdas afectadas por la pluma con sus concentraciones */
  affected_cells: Array<{
    latitude: number;
    longitude: number;
    no2_contribution: number; // ppb
    distance_from_source_km: number;
  }>;

  /** Condiciones meteorológicas usadas */
  weather: WeatherConditions;
}

// ============================================================================
// FUNCIONES PRINCIPALES
// ============================================================================

/**
 * Modela dispersión de emisiones NOx desde fuegos hacia un grid
 *
 * Para cada fuego, calcula cómo sus emisiones NOx se dispersan por el viento
 * y agrega NO2 a las celdas del grid afectadas.
 *
 * @param fires - Fuegos activos
 * @param grid - Grid donde agregar contribuciones de NOx
 * @param weather - Condiciones meteorológicas
 * @param factors - Factores de calibración
 * @returns Grid con NO2 agregado por emisiones de fuegos
 *
 * @example
 * ```typescript
 * const gridWithFires = addSmokeDispersionToGrid(
 *   fires,
 *   tempoGrid,
 *   weather,
 *   factors
 * );
 *
 * // Ahora cada celda tiene no2_surface incrementado por emisiones de fuegos
 * ```
 */
export function addSmokeDispersionToGrid(
  fires: Fire[],
  grid: AdvectionGrid,
  weather: WeatherConditions,
  factors: AdvectionFactors
): AdvectionGrid {
  if (fires.length === 0) {
    return grid;
  }

  // Calcular pluma para cada fuego
  const plumes = fires.map(fire =>
    calculateSmokePlume(fire, grid.cells, weather, factors)
  );

  // Clonar grid
  const newGrid: AdvectionGrid = {
    ...grid,
    cells: grid.cells.map(cell => ({ ...cell }))
  };

  // Agregar contribución de cada pluma a las celdas
  for (const plume of plumes) {
    for (const affected of plume.affected_cells) {
      // Encontrar celda correspondiente en grid
      const cellIndex = newGrid.cells.findIndex(
        c =>
          Math.abs(c.latitude - affected.latitude) < 0.001 &&
          Math.abs(c.longitude - affected.longitude) < 0.001
      );

      if (cellIndex !== -1) {
        const currentNO2 = newGrid.cells[cellIndex].no2_surface || 0;
        newGrid.cells[cellIndex].no2_surface = currentNO2 + affected.no2_contribution;
      }
    }
  }

  return newGrid;
}

/**
 * Calcula pluma de emisiones NOx desde un fuego individual
 *
 * Usa modelo Gaussian plume para determinar dispersión downwind.
 *
 * @param fire - Fuego fuente
 * @param gridCells - Celdas del grid a evaluar
 * @param weather - Condiciones meteorológicas
 * @param factors - Factores de calibración
 * @returns Pluma con celdas afectadas
 */
export function calculateSmokePlume(
  fire: Fire,
  gridCells: GridCell[],
  weather: WeatherConditions,
  factors: AdvectionFactors
): SmokePlume {
  // Estimar tasa de emisión de NOx desde FRP
  // FRP (MW) → NOx (ppb/hora)
  // Literatura: Incendios forestales emiten ~1-10 g NOx per kg biomass quemada
  // FRP alto → más emisiones NOx
  // Factor conservador para obtener ppb razonables
  const emissionRate = fire.frp * factors.fire_frp_scaling * 0.001; // ppb/hora

  const affectedCells: SmokePlume['affected_cells'] = [];

  // Para cada celda, calcular si está downwind y cuánto humo recibe
  for (const cell of gridCells) {
    const contribution = calculatePlumeContribution(
      { latitude: fire.latitude, longitude: fire.longitude },
      { latitude: cell.latitude, longitude: cell.longitude },
      emissionRate,
      weather,
      factors
    );

    if (contribution > 0.1) {
      // Solo incluir contribuciones significativas (>0.1 ppb)
      const distance = getDistanceKm(
        fire.latitude,
        fire.longitude,
        cell.latitude,
        cell.longitude
      );

      affectedCells.push({
        latitude: cell.latitude,
        longitude: cell.longitude,
        no2_contribution: contribution,
        distance_from_source_km: distance
      });
    }
  }

  return {
    source: { latitude: fire.latitude, longitude: fire.longitude },
    frp: fire.frp,
    nox_emission_rate: emissionRate,
    affected_cells: affectedCells,
    weather
  };
}

/**
 * Calcula contribución de NO2 en un punto receptor
 *
 * Usa modelo Gaussian plume con dispersión horizontal y vertical.
 *
 * @param source - Ubicación del fuego
 * @param receptor - Ubicación del receptor (celda)
 * @param emissionRate - Tasa de emisión (ppb/hora)
 * @param weather - Condiciones meteorológicas
 * @param factors - Factores de calibración
 * @returns Concentración de NO2 en receptor (ppb)
 */
function calculatePlumeContribution(
  source: GeoPoint,
  receptor: GeoPoint,
  emissionRate: number,
  weather: WeatherConditions,
  factors: AdvectionFactors
): number {
  // Calcular vector desde source a receptor
  const dlat = receptor.latitude - source.latitude;
  const dlon = receptor.longitude - source.longitude;

  // Convertir viento de meteorological (de donde viene) a vector (hacia donde va)
  // Wind direction 0° = from North, así que viento va hacia South (180°)
  const windRadians = ((weather.wind_direction + 180) * Math.PI) / 180;

  // Calcular componentes del viento
  const windLat = Math.cos(windRadians);
  const windLon = Math.sin(windRadians);

  // Calcular distancia downwind (paralela al viento)
  // Dot product de vector receptor con vector viento
  const downwindDistance = dlat * windLat + dlon * windLon;

  // Si receptor está upwind (contra el viento), no hay contribución
  if (downwindDistance <= 0) {
    return 0;
  }

  // Calcular distancia crosswind (perpendicular al viento)
  const crosswindDistance = Math.abs(dlat * windLon - dlon * windLat);

  // Convertir a km
  const downwindKm = downwindDistance * 111;
  const crosswindKm = crosswindDistance * 111;

  // Parámetros de dispersión Gaussiana
  // σy (crosswind) y σz (vertical) aumentan con distancia
  const stabilityClass = getStabilityClass(weather);
  const sigmaY = calculateSigmaY(downwindKm, stabilityClass);
  const sigmaZ = calculateSigmaZ(downwindKm, stabilityClass);

  // Modelo Gaussian plume (simplified, ground-level concentration)
  // C = (Q / (2π * u * σy * σz)) * exp(-0.5 * (y/σy)²) * exp(-0.5 * (H/σz)²)
  // donde:
  //   Q = emission rate
  //   u = wind speed
  //   y = crosswind distance
  //   H = effective height (asumimos 0 para ground-level)

  const windSpeed = Math.max(weather.wind_speed, 1.0); // Mínimo 1 m/s

  // Factor de dispersión
  const dispersión = (2 * Math.PI * windSpeed * sigmaY * sigmaZ);

  if (dispersión === 0) {
    return 0;
  }

  // Exponencial crosswind
  const expCrosswind = Math.exp(-0.5 * (crosswindKm / sigmaY) ** 2);

  // Exponencial vertical (asumimos ground-level, H=0)
  const expVertical = 1.0;

  // Concentración
  let concentration = (emissionRate / dispersión) * expCrosswind * expVertical;

  // Decay con distancia (factor adicional de realismo)
  const decayFactor = 1 / Math.pow(downwindKm + 1, factors.fire_distance_decay * 0.5);
  concentration *= decayFactor;

  // Aplicar washout si hay precipitación
  if (weather.precipitation > 0) {
    const washoutFactor = Math.exp(-weather.precipitation * factors.washout_rate);
    concentration *= washoutFactor;
  }

  // SANITY CHECK: Contribución de un solo fuego no debería exceder 50 ppb NO2
  if (concentration > 50) {
    console.warn(`   ⚠️  Contribución NOx de fuego muy alta: ${concentration.toFixed(1)} ppb, capping a 50`);
    concentration = 50;
  }

  return Math.max(0, concentration);
}

// ============================================================================
// FUNCIONES AUXILIARES
// ============================================================================

/**
 * Determina clase de estabilidad atmosférica
 *
 * Basado en wind speed y hour of day (simplificado).
 * Clases: A (muy inestable) a F (muy estable)
 *
 * @param weather - Condiciones meteorológicas
 * @returns Clase de estabilidad ('A' a 'F')
 */
function getStabilityClass(weather: WeatherConditions): string {
  // Simplificación: usar solo wind speed
  // En realidad depende de radiación solar, cloud cover, etc.

  if (weather.wind_speed < 2) {
    return 'E'; // Estable (baja dispersión)
  } else if (weather.wind_speed < 4) {
    return 'D'; // Neutral
  } else if (weather.wind_speed < 6) {
    return 'C'; // Moderadamente inestable
  } else {
    return 'B'; // Inestable (alta dispersión)
  }
}

/**
 * Calcula σy (dispersión crosswind)
 *
 * Basado en Pasquill-Gifford dispersion parameters.
 *
 * @param downwindKm - Distancia downwind en km
 * @param stabilityClass - Clase de estabilidad
 * @returns σy en km
 */
function calculateSigmaY(downwindKm: number, stabilityClass: string): number {
  // Coeficientes para Pasquill-Gifford (simplificados)
  // σy = a * x^b, donde x = distancia downwind en km
  const coefficients: Record<string, { a: number; b: number }> = {
    'A': { a: 0.22, b: 0.894 },
    'B': { a: 0.16, b: 0.894 },
    'C': { a: 0.11, b: 0.894 },
    'D': { a: 0.08, b: 0.894 },
    'E': { a: 0.06, b: 0.894 },
    'F': { a: 0.04, b: 0.894 }
  };

  const { a, b } = coefficients[stabilityClass] || coefficients['D'];
  return a * Math.pow(downwindKm, b);
}

/**
 * Calcula σz (dispersión vertical)
 *
 * @param downwindKm - Distancia downwind en km
 * @param stabilityClass - Clase de estabilidad
 * @returns σz en km
 */
function calculateSigmaZ(downwindKm: number, stabilityClass: string): number {
  // Coeficientes para Pasquill-Gifford (simplificados)
  const coefficients: Record<string, { a: number; b: number }> = {
    'A': { a: 0.20, b: 0.894 },
    'B': { a: 0.12, b: 0.894 },
    'C': { a: 0.08, b: 0.894 },
    'D': { a: 0.06, b: 0.894 },
    'E': { a: 0.03, b: 0.894 },
    'F': { a: 0.016, b: 0.894 }
  };

  const { a, b } = coefficients[stabilityClass] || coefficients['D'];
  return a * Math.pow(downwindKm, b);
}

/**
 * Calcula distancia entre dos puntos en km (Haversine)
 */
function getDistanceKm(
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

/**
 * Genera resumen de plumas de emisiones (para logging/debugging)
 *
 * @param plumes - Plumas de emisiones
 * @returns Descripción textual
 */
export function describePlumes(plumes: SmokePlume[]): string {
  if (plumes.length === 0) {
    return 'Sin fuegos activos';
  }

  const totalAffectedCells = plumes.reduce(
    (sum, p) => sum + p.affected_cells.length,
    0
  );

  const totalEmissions = plumes.reduce(
    (sum, p) => sum + p.nox_emission_rate,
    0
  );

  return `${plumes.length} fuegos activos, ${totalAffectedCells} celdas afectadas, emisiones NOx totales: ${totalEmissions.toFixed(1)} ppb/hora`;
}

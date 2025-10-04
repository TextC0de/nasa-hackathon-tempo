/**
 * TEMPO data loader for advection
 * Loads NO2 column density from TEMPO satellite data
 */

import type { GridCell, AdvectionGrid } from '../types';

/**
 * TEMPO grid query options
 */
export interface TEMPOGridQuery {
  /** Geographic bounding box */
  bbox: {
    north: number;
    south: number;
    east: number;
    west: number;
  };
  /** Timestamp (Date or ISO string) */
  timestamp: Date | string;
  /** Grid resolution in degrees (default: 0.1 ≈ 11km) */
  resolution?: number;
}

/**
 * Create a bounding box around a point with given radius
 *
 * @param lat - Latitude
 * @param lon - Longitude
 * @param radiusKm - Radius in kilometers
 * @returns Bounding box
 */
export function createBboxAroundPoint(
  lat: number,
  lon: number,
  radiusKm: number
): { north: number; south: number; east: number; west: number } {
  // Approximate: 1 degree latitude ≈ 111 km
  const deltaLat = radiusKm / 111;

  // Longitude varies with latitude
  const deltaLon = radiusKm / (111 * Math.cos((lat * Math.PI) / 180));

  return {
    north: lat + deltaLat,
    south: lat - deltaLat,
    east: lon + deltaLon,
    west: lon - deltaLon,
  };
}

/**
 * Create a grid of points for TEMPO query
 *
 * @param bbox - Bounding box
 * @param resolution - Grid resolution in degrees
 * @returns Array of grid points
 */
export function createGrid(
  bbox: { north: number; south: number; east: number; west: number },
  resolution: number = 0.1
): Array<{ latitude: number; longitude: number }> {
  const points: Array<{ latitude: number; longitude: number }> = [];

  for (let lat = bbox.south; lat <= bbox.north; lat += resolution) {
    for (let lon = bbox.west; lon <= bbox.east; lon += resolution) {
      points.push({ latitude: lat, longitude: lon });
    }
  }

  return points;
}

/**
 * Mock TEMPO NO2 data loader (placeholder for API integration)
 *
 * In production, this would:
 * 1. Use @atmos/earthdata-imageserver-client to query TEMPO API
 * 2. Or parse NetCDF files from scripts/data/tempo/
 *
 * For now, returns a simplified grid structure.
 *
 * @param query - TEMPO grid query parameters
 * @returns Promise<AdvectionGrid> with NO2 column density
 */
export async function loadTEMPOGrid(
  query: TEMPOGridQuery
): Promise<AdvectionGrid> {
  const resolution = query.resolution || 0.1;
  const timestamp =
    query.timestamp instanceof Date
      ? query.timestamp
      : new Date(query.timestamp);

  // Create grid points
  const gridPoints = createGrid(query.bbox, resolution);

  // TODO: Integrate with @atmos/earthdata-imageserver-client
  // const tempo = new TEMPOService();
  // const cells = await Promise.all(
  //   gridPoints.map(async (point) => {
  //     try {
  //       const data = await tempo.getNO2AtPoint({
  //         location: point,
  //         timestamp
  //       });
  //       return {
  //         ...point,
  //         no2_column: data.value,
  //         value: data.value
  //       };
  //     } catch {
  //       return { ...point, no2_column: null, value: null };
  //     }
  //   })
  // );

  // For now: Return mock grid with null values (to be filled by API)
  const cells: GridCell[] = gridPoints.map((point) => ({
    latitude: point.latitude,
    longitude: point.longitude,
    no2_column: undefined, // Will be populated by TEMPO API
    pm_index: undefined,
    value: undefined,
  }));

  return {
    cells,
    bounds: query.bbox,
    resolution,
    timestamp,
  };
}

/**
 * Calculate grid statistics
 *
 * @param grid - Advection grid
 * @returns Statistics object
 */
export function calculateGridStatistics(grid: AdvectionGrid): {
  no2_column: { mean: number; max: number; min: number; count: number };
  coverage: number; // Percentage of cells with valid data
} {
  const validCells = grid.cells.filter(
    (c) => c.no2_column !== undefined && c.no2_column !== null
  );

  if (validCells.length === 0) {
    return {
      no2_column: { mean: 0, max: 0, min: 0, count: 0 },
      coverage: 0,
    };
  }

  const values = validCells.map((c) => c.no2_column!);

  return {
    no2_column: {
      mean: values.reduce((s, v) => s + v, 0) / values.length,
      max: Math.max(...values),
      min: Math.min(...values),
      count: validCells.length,
    },
    coverage: (validCells.length / grid.cells.length) * 100,
  };
}

/**
 * Interpolate NO2 column at a specific location from grid
 *
 * Uses inverse distance weighting (IDW) interpolation
 *
 * @param grid - Advection grid
 * @param lat - Target latitude
 * @param lon - Target longitude
 * @returns Interpolated NO2 column density or null
 */
export function interpolateNO2AtPoint(
  grid: AdvectionGrid,
  lat: number,
  lon: number
): number | null {
  // Find nearest cells with data
  const cellsWithData = grid.cells.filter(
    (c) => c.no2_column !== undefined && c.no2_column !== null
  );

  if (cellsWithData.length === 0) {
    return null;
  }

  // Calculate distances
  const cellsWithDistance = cellsWithData.map((cell) => ({
    cell,
    distance: Math.sqrt(
      Math.pow(cell.latitude - lat, 2) + Math.pow(cell.longitude - lon, 2)
    ),
  }));

  // Sort by distance
  cellsWithDistance.sort((a, b) => a.distance - b.distance);

  // If very close to a cell, use that value
  if (cellsWithDistance[0].distance < 0.001) {
    return cellsWithDistance[0].cell.no2_column!;
  }

  // Inverse distance weighting (use 4 nearest neighbors)
  const neighbors = cellsWithDistance.slice(0, 4);
  let weightedSum = 0;
  let totalWeight = 0;

  for (const { cell, distance } of neighbors) {
    const weight = 1 / (distance + 0.0001); // Add small value to avoid division by zero
    weightedSum += cell.no2_column! * weight;
    totalWeight += weight;
  }

  return totalWeight > 0 ? weightedSum / totalWeight : null;
}

/**
 * Helper: Create default TEMPO query for a location
 *
 * @param lat - Latitude
 * @param lon - Longitude
 * @param timestamp - Timestamp
 * @param radiusKm - Radius in km (default: 50)
 * @returns TEMPOGridQuery
 */
export function createTEMPOQueryForLocation(
  lat: number,
  lon: number,
  timestamp: Date,
  radiusKm: number = 50
): TEMPOGridQuery {
  return {
    bbox: createBboxAroundPoint(lat, lon, radiusKm),
    timestamp,
    resolution: 0.1, // ~11km resolution
  };
}

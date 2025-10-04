/**
 * Loader de grids completos de TEMPO
 *
 * A diferencia de tempo-netcdf-loader que extrae un solo punto interpolado,
 * este loader extrae el grid COMPLETO de NO2 column density para un área.
 *
 * Ejemplo: Para Los Angeles (50km radius) obtenemos ~2,700 celdas
 * Cada celda tiene ~2km x 2km de resolución
 */

import { execSync } from 'child_process';
import { existsSync, readdirSync } from 'fs';
import { join } from 'path';
import type { AdvectionGrid } from '../types';

// ============================================================================
// TIPOS
// ============================================================================

/**
 * Resultado de extracción de grid TEMPO
 */
export interface TEMPOGridResult {
  /** Si la extracción fue exitosa */
  success: boolean;

  /** Timestamp de los datos TEMPO */
  timestamp: Date;

  /** Nombre del archivo NetCDF */
  file: string;

  /** Centro del área de interés */
  center: {
    latitude: number;
    longitude: number;
  };

  /** Radio usado para filtrar celdas (km) */
  radius_km: number;

  /** Grid de celdas con NO2 column */
  grid: {
    /** Celdas individuales */
    cells: Array<{
      latitude: number;
      longitude: number;
      no2_column: number; // molecules/cm²
      distance_from_center_km: number;
    }>;

    /** Número total de celdas */
    cell_count: number;

    /** Límites geográficos del grid */
    bounds: {
      north: number;
      south: number;
      east: number;
      west: number;
    };

    /** Resolución aproximada en grados */
    resolution_degrees: number;
  };

  /** Unidades de NO2 column */
  units: string;

  /** Estadísticas del grid */
  statistics: {
    mean: number;
    median: number;
    std: number;
    min: number;
    max: number;
  };

  /** Metadata adicional */
  metadata: {
    no2_path: string;
    grid_shape: number[];
  };

  /** Error si lo hubo */
  error?: string;
}

// ============================================================================
// FUNCIONES PRINCIPALES
// ============================================================================

/**
 * Carga un grid completo de TEMPO desde un archivo NetCDF
 *
 * Esta función llama al script Python extract-tempo-grid-h5py.py
 * que extrae TODAS las celdas dentro del radius especificado.
 *
 * @param ncFile - Path al archivo NetCDF de TEMPO
 * @param centerLat - Latitud del centro del área
 * @param centerLon - Longitud del centro del área
 * @param radiusKm - Radio en km (default: 50km)
 * @returns Resultado con grid completo o error
 *
 * @example
 * ```typescript
 * const gridResult = loadTEMPOGrid(
 *   'TEMPO_NO2_L3_20240115T141610Z.nc',
 *   34.05,   // Los Angeles
 *   -118.24,
 *   50       // 50km radius
 * );
 *
 * if (gridResult.success) {
 *   console.log(`Grid cargado: ${gridResult.grid.cell_count} celdas`);
 *   console.log(`NO2 promedio: ${gridResult.statistics.mean.toExponential(2)}`);
 * }
 * ```
 */
export function loadTEMPOGrid(
  ncFile: string,
  centerLat: number,
  centerLon: number,
  radiusKm: number = 50
): TEMPOGridResult {
  if (!existsSync(ncFile)) {
    return createErrorResult(
      ncFile,
      centerLat,
      centerLon,
      radiusKm,
      `Archivo no encontrado: ${ncFile}`
    );
  }

  try {
    // Encontrar script Python
    const scriptPath = join(process.cwd(), 'scripts/extract-tempo-grid-h5py.py');

    if (!existsSync(scriptPath)) {
      throw new Error(`Script Python no encontrado: ${scriptPath}`);
    }

    // Llamar script Python
    const command = `python3 "${scriptPath}" "${ncFile}" ${centerLat} ${centerLon} ${radiusKm}`;
    const output = execSync(command, {
      encoding: 'utf-8',
      maxBuffer: 50 * 1024 * 1024 // 50MB buffer (grids son más grandes que puntos)
    });

    // Parsear JSON
    const result = JSON.parse(output);

    if (result.error) {
      return createErrorResult(
        ncFile,
        centerLat,
        centerLon,
        radiusKm,
        result.error
      );
    }

    // Convertir timestamp string a Date
    return {
      ...result,
      timestamp: new Date(result.timestamp),
      success: true
    };

  } catch (error) {
    const err = error as Error;
    return createErrorResult(
      ncFile,
      centerLat,
      centerLon,
      radiusKm,
      err.message
    );
  }
}

/**
 * Carga grid TEMPO para un timestamp específico
 *
 * Encuentra automáticamente el archivo más cercano al timestamp dado.
 *
 * @param timestamp - Timestamp objetivo
 * @param centerLat - Latitud del centro
 * @param centerLon - Longitud del centro
 * @param tempoDir - Directorio con archivos TEMPO
 * @param radiusKm - Radio en km
 * @returns Grid result o null si no hay archivo cercano
 *
 * @example
 * ```typescript
 * const grid = loadTEMPOGridAtTime(
 *   new Date('2024-01-15T14:00:00Z'),
 *   34.05,
 *   -118.24,
 *   './data/tempo',
 *   50
 * );
 * ```
 */
export function loadTEMPOGridAtTime(
  timestamp: Date,
  centerLat: number,
  centerLon: number,
  tempoDir: string,
  radiusKm: number = 50
): TEMPOGridResult | null {
  const ncFile = findClosestTEMPOFile(timestamp, tempoDir);

  if (!ncFile) {
    return null;
  }

  return loadTEMPOGrid(ncFile, centerLat, centerLon, radiusKm);
}

/**
 * Convierte TEMPOGridResult al formato AdvectionGrid estándar
 *
 * Esto permite usar el grid TEMPO directamente con las funciones de advección.
 *
 * @param tempoResult - Resultado de loadTEMPOGrid
 * @returns AdvectionGrid compatible con motor de advección
 *
 * @example
 * ```typescript
 * const tempoResult = loadTEMPOGrid(...);
 * const advGrid = toAdvectionGrid(tempoResult);
 *
 * // Ahora podemos hacer advección
 * const advectedGrid = advectGrid(advGrid, weather, 1);
 * ```
 */
export function toAdvectionGrid(tempoResult: TEMPOGridResult): AdvectionGrid {
  return {
    cells: tempoResult.grid.cells.map(cell => ({
      latitude: cell.latitude,
      longitude: cell.longitude,
      no2_column: cell.no2_column
    })),
    bounds: tempoResult.grid.bounds,
    resolution: tempoResult.grid.resolution_degrees,
    timestamp: tempoResult.timestamp
  };
}

/**
 * Lista todos los timestamps disponibles en un directorio TEMPO
 *
 * Útil para saber qué datos tenemos disponibles para validación.
 *
 * @param tempoDir - Directorio con archivos TEMPO
 * @returns Array de timestamps ordenados cronológicamente
 */
export function getAvailableTEMPOTimestamps(tempoDir: string): Date[] {
  if (!existsSync(tempoDir)) {
    return [];
  }

  const files = readdirSync(tempoDir).filter(f => f.endsWith('.nc'));

  const timestamps = files.map(file => {
    const match = file.match(/(\d{8}T\d{6}Z)/);
    if (!match) return null;

    const timeStr = match[1];
    return new Date(
      timeStr.substring(0, 4) + '-' +
      timeStr.substring(4, 6) + '-' +
      timeStr.substring(6, 11) + ':' +
      timeStr.substring(11, 13) + ':' +
      timeStr.substring(13, 15) + 'Z'
    );
  }).filter(t => t !== null) as Date[];

  timestamps.sort((a, b) => a.getTime() - b.getTime());
  return timestamps;
}

// ============================================================================
// FUNCIONES AUXILIARES
// ============================================================================

/**
 * Encuentra el archivo TEMPO más cercano a un timestamp
 *
 * @param timestamp - Timestamp objetivo
 * @param tempoDir - Directorio con archivos TEMPO
 * @returns Path completo al archivo o null
 */
function findClosestTEMPOFile(
  timestamp: Date,
  tempoDir: string
): string | null {
  if (!existsSync(tempoDir)) {
    return null;
  }

  const files = readdirSync(tempoDir).filter(f => f.endsWith('.nc'));

  if (files.length === 0) {
    return null;
  }

  // Parsear timestamps de filenames
  // Formato: TEMPO_NO2_L3_V03_20240110T151610Z_S004.nc
  const filesWithTime = files.map(file => {
    const match = file.match(/(\d{8}T\d{6}Z)/);
    if (!match) return null;

    const timeStr = match[1];
    const fileTime = new Date(
      timeStr.substring(0, 4) + '-' +
      timeStr.substring(4, 6) + '-' +
      timeStr.substring(6, 11) + ':' +
      timeStr.substring(11, 13) + ':' +
      timeStr.substring(13, 15) + 'Z'
    );

    return {
      file,
      time: fileTime,
      delta: Math.abs(fileTime.getTime() - timestamp.getTime())
    };
  }).filter(x => x !== null) as Array<{file: string; time: Date; delta: number}>;

  if (filesWithTime.length === 0) {
    return null;
  }

  // Ordenar por delta y retornar más cercano
  filesWithTime.sort((a, b) => a.delta - b.delta);
  return join(tempoDir, filesWithTime[0].file);
}

/**
 * Crea un resultado de error con estructura consistente
 */
function createErrorResult(
  ncFile: string,
  centerLat: number,
  centerLon: number,
  radiusKm: number,
  errorMsg: string
): TEMPOGridResult {
  return {
    success: false,
    timestamp: new Date(),
    file: ncFile,
    center: {
      latitude: centerLat,
      longitude: centerLon
    },
    radius_km: radiusKm,
    grid: {
      cells: [],
      cell_count: 0,
      bounds: {
        north: 0,
        south: 0,
        east: 0,
        west: 0
      },
      resolution_degrees: 0
    },
    units: 'molecules/cm²',
    statistics: {
      mean: 0,
      median: 0,
      std: 0,
      min: 0,
      max: 0
    },
    metadata: {
      no2_path: '',
      grid_shape: []
    },
    error: errorMsg
  };
}

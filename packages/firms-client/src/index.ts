/**
 * @atmos/firms-client
 *
 * SDK oficial para NASA FIRMS API
 * (Fire Information for Resource Management System)
 *
 * Proporciona acceso a datos de incendios activos en tiempo real
 * desde satélites MODIS, VIIRS, y Landsat.
 *
 * @example
 * ```typescript
 * import { FIRMSClient } from '@atmos/firms-client';
 *
 * const firms = new FIRMSClient({ mapKey: 'tu-map-key-32-chars' });
 *
 * // Obtener incendios activos en California
 * const fires = await firms.getFiresInRegion({
 *   west: -125,
 *   south: 32,
 *   east: -114,
 *   north: 42
 * }, {
 *   source: 'VIIRS_SNPP_NRT',
 *   dayRange: 1
 * });
 *
 * console.log(`Total fires: ${fires.count}`);
 * fires.fires.forEach(fire => {
 *   console.log(`Fire at ${fire.latitude}, ${fire.longitude} - FRP: ${fire.frp} MW`);
 * });
 * ```
 */

// Export main client
export { FIRMSClient } from './firms-client.js';
import { FIRMSClient } from './firms-client.js';

// Export all types
export type {
  FIRMSCredentials,
  FIRMSSource,
  BoundingBox,
  FIRMSQueryOptions,
  FireDataPoint,
  FireDataResponse,
  FireStatistics,
  DataAvailabilityOptions,
  DataAvailability,
} from './types.js';

// Export errors
export {
  FIRMSError,
  FIRMSAuthError,
  FIRMSRateLimitError,
} from './types.js';

// Export utilities
export {
  parseFireCSV,
  normalizeConfidence,
  validateBoundingBox,
  formatDateForAPI,
} from './utils/csv-parser.js';

/**
 * Helper: Crear cliente FIRMS
 *
 * @param mapKey - MAP_KEY de 32 caracteres (obtener en https://firms.modaps.eosdis.nasa.gov/api/map_key/)
 * @returns Cliente FIRMS
 *
 * @example
 * ```typescript
 * import { createFIRMSClient } from '@atmos/firms-client';
 *
 * const firms = createFIRMSClient('tu-map-key-32-chars');
 * const fires = await firms.getFiresInRegion({ west: -125, south: 32, east: -114, north: 42 });
 * ```
 */
export function createFIRMSClient(mapKey: string): FIRMSClient {
  return new FIRMSClient({ mapKey });
}

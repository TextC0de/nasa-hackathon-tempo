/**
 * Loaders de datos para EPA, TEMPO, y OpenMeteo
 *
 * Este módulo expone funciones para cargar datos desde diferentes fuentes:
 * - EPA: Mediciones terrestres de calidad del aire (ground truth)
 * - TEMPO: Columnas de NO2 desde satélite (grids completos o puntos)
 * - OpenMeteo: Datos meteorológicos históricos
 * - Weather Forecast: Pronósticos meteorológicos (simulados desde históricos para validación)
 */

// Loaders de datos terrestres (EPA)
export * from './epa-loader';

// Loaders de clima
export * from './openmeteo-loader';
export * from './weather-forecast-loader';

// Loaders de TEMPO (satélite NO2)
// Single point interpolation
export {
  type TEMPOData,
  findClosestTEMPOFile,
  loadTEMPOData,
  loadTEMPODataAtTime
} from './tempo-netcdf-loader';

// Full grid extraction
export {
  type TEMPOGridResult,
  loadTEMPOGrid,
  loadTEMPOGridAtTime,
  toAdvectionGrid,
  getAvailableTEMPOTimestamps
} from './tempo-grid-loader';

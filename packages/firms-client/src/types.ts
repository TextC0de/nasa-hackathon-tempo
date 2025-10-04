/**
 * Tipos TypeScript para NASA FIRMS API
 *
 * API oficial: https://firms.modaps.eosdis.nasa.gov
 */

/**
 * Credenciales FIRMS
 *
 * MAP_KEY: API key de 32 caracteres (obtener en https://firms.modaps.eosdis.nasa.gov/api/map_key/)
 * - Gratuito
 * - Rate limit: 5000 transacciones cada 10 minutos
 */
export interface FIRMSCredentials {
  mapKey: string;
}

/**
 * Fuentes de datos FIRMS disponibles
 *
 * - MODIS_NRT: MODIS Near Real-Time (Terra + Aqua)
 * - MODIS_SP: MODIS Standard Processing
 * - VIIRS_NOAA20_NRT: VIIRS NOAA-20 Near Real-Time
 * - VIIRS_NOAA21_NRT: VIIRS NOAA-21 Near Real-Time
 * - VIIRS_SNPP_NRT: VIIRS S-NPP Near Real-Time
 * - LANDSAT_NRT: Landsat Near Real-Time
 */
export type FIRMSSource =
  | 'MODIS_NRT'
  | 'MODIS_SP'
  | 'VIIRS_NOAA20_NRT'
  | 'VIIRS_NOAA21_NRT'
  | 'VIIRS_SNPP_NRT'
  | 'LANDSAT_NRT';

/**
 * Bounding box geográfico
 */
export interface BoundingBox {
  west: number;  // Longitud oeste (-180 a 180)
  south: number; // Latitud sur (-90 a 90)
  east: number;  // Longitud este (-180 a 180)
  north: number; // Latitud norte (-90 a 90)
}

/**
 * Opciones de consulta FIRMS /area/
 */
export interface FIRMSQueryOptions {
  /**
   * Fuente de datos (sensor)
   * @default 'VIIRS_SNPP_NRT'
   */
  source?: FIRMSSource;

  /**
   * Número de días hacia atrás desde hoy (1-10)
   * @default 1
   */
  dayRange?: number;

  /**
   * Fecha específica en formato YYYY-MM-DD
   * Si se proporciona, ignora dayRange
   */
  date?: string;
}

/**
 * Dato de incendio activo (raw CSV row)
 *
 * Campos comunes a todos los sensores
 */
export interface FireDataPoint {
  /** Latitud (-90 a 90) */
  latitude: number;

  /** Longitud (-180 a 180) */
  longitude: number;

  /** Temperatura de brillo (Kelvin) */
  brightness: number;

  /** Fecha de adquisición (YYYY-MM-DD) */
  acq_date: string;

  /** Hora de adquisición (HHMM UTC) */
  acq_time: string;

  /** Satélite (ej: 'Suomi-NPP', 'NOAA-20', 'Terra', 'Aqua') */
  satellite: string;

  /** Confianza (MODIS: 0-100, VIIRS: 'l'/'n'/'h', Landsat: 'low'/'medium'/'high') */
  confidence: number | string;

  /** Versión del algoritmo */
  version: string;

  /** FRP - Fire Radiative Power (MW) */
  frp: number;

  /** Tipo de detección (día/noche) */
  daynight: 'D' | 'N';

  // Campos adicionales dependientes del sensor
  [key: string]: string | number;
}

/**
 * Respuesta de datos de incendios
 */
export interface FireDataResponse {
  /** Lista de incendios detectados */
  fires: FireDataPoint[];

  /** Número total de incendios */
  count: number;

  /** Metadata de la consulta */
  metadata: {
    source: FIRMSSource;
    bbox: BoundingBox;
    dayRange?: number;
    date?: string;
    requestedAt: Date;
  };
}

/**
 * Estadísticas de incendios en una región
 */
export interface FireStatistics {
  /** Total de incendios */
  totalFires: number;

  /** FRP promedio (MW) */
  averageFRP: number;

  /** FRP máximo (MW) */
  maxFRP: number;

  /** FRP total (MW) */
  totalFRP: number;

  /** Distribución por confianza */
  confidenceDistribution: {
    high: number;
    nominal: number;
    low: number;
  };

  /** Distribución día/noche */
  daynightDistribution: {
    day: number;
    night: number;
  };
}

/**
 * Opciones de disponibilidad de datos
 */
export interface DataAvailabilityOptions {
  /**
   * Fuente de datos (sensor)
   */
  source: FIRMSSource;

  /**
   * Año (YYYY) o rango de años (YYYY-YYYY)
   */
  year?: string;

  /**
   * Mes (1-12)
   */
  month?: number;

  /**
   * Día (1-31)
   */
  day?: number;
}

/**
 * Información de disponibilidad de datos
 */
export interface DataAvailability {
  source: FIRMSSource;
  availableDates: string[];
}

/**
 * Errores FIRMS
 */
export class FIRMSError extends Error {
  constructor(
    message: string,
    public statusCode?: number,
    public details?: string
  ) {
    super(message);
    this.name = 'FIRMSError';
  }
}

/**
 * Error de autenticación
 */
export class FIRMSAuthError extends FIRMSError {
  constructor(message: string = 'Invalid MAP_KEY') {
    super(message, 401);
    this.name = 'FIRMSAuthError';
  }
}

/**
 * Error de rate limit
 */
export class FIRMSRateLimitError extends FIRMSError {
  constructor(message: string = 'Rate limit exceeded (5000 requests per 10 minutes)') {
    super(message, 429);
    this.name = 'FIRMSRateLimitError';
  }
}

/**
 * Core type definitions for advection and forecasting
 */

type Pollutant = 'NO2' | 'O3' | 'PM25';

/**
 * Punto geográfico (lat, lng)
 */
interface GeoPoint {
    latitude: number;
    longitude: number;
}

/**
 * Advection model factors (heuristics)
 */
export interface AdvectionFactors {
  /** NO2 column to surface conversion factor (0.5-1.2) */
  no2_column_to_surface: number;

  /** PM index to surface conversion factor (0.2-0.8) */
  pm_index_to_surface: number;

  /** Reference PBL height in meters (500-1200) */
  pbl_reference: number;

  /** Fire FRP scaling factor (50-200) */
  fire_frp_scaling: number;

  /** Fire distance decay exponent (1.5-3.0) */
  fire_distance_decay: number;

  /** Precipitation washout rate (0.1-0.4) */
  washout_rate: number;

  /** Bias correction weight (0.0-1.0) */
  bias_correction_weight: number;
}

/**
 * Default factors based on literature
 */
export const DEFAULT_FACTORS: AdvectionFactors = {
  no2_column_to_surface: 0.8,
  pm_index_to_surface: 0.4,
  pbl_reference: 800,
  fire_frp_scaling: 100,
  fire_distance_decay: 2.5,
  washout_rate: 0.2,
  bias_correction_weight: 0.5,
};

/**
 * Weather data for advection calculation
 */
export interface WeatherConditions {
  wind_speed: number; // m/s
  wind_direction: number; // degrees
  pbl_height: number; // meters
  temperature: number; // celsius
  precipitation: number; // mm
  timestamp: Date;
}

/**
 * Fire data from FIRMS
 */
export interface Fire {
  latitude: number;
  longitude: number;
  brightness: number; // Kelvin
  frp: number; // Fire Radiative Power (MW)
  confidence: string; // 'n' (nominal), 'h' (high), 'l' (low)
  acq_date: string;
  acq_time: string;
  satellite: string;
}

/**
 * EPA ground station measurement
 */
export interface GroundMeasurement {
  latitude: number;
  longitude: number;
  parameter: string; // 'NO2', 'PM25', 'O3'
  value: number;
  unit: string;
  timestamp: Date;
  state: string;
  county: string;
}

/**
 * Forecast result
 */
export interface ForecastResult {
  location: GeoPoint;
  pollutant: Pollutant;
  timestamp: Date;
  hours_ahead: number;
  value: number; // µg/m³ or ppb
  unit: string;
  confidence: number; // 0-1
  method: 'advection' | 'persistence';
  components?: {
    base_value: number;
    fire_contribution: number;
    washout_factor: number;
    bias_correction: number;
  };
}

/**
 * Grid cell for advection
 */
export interface GridCell {
  latitude: number;
  longitude: number;
  no2_column?: number; // molecules/cm²
  pm_index?: number;
  value?: number;
}

/**
 * Advection grid
 */
export interface AdvectionGrid {
  cells: GridCell[];
  bounds: {
    north: number;
    south: number;
    east: number;
    west: number;
  };
  resolution: number; // degrees
  timestamp: Date;
}

/**
 * Validation metrics
 */
export interface ValidationMetrics {
  mae: number; // Mean Absolute Error
  rmse: number; // Root Mean Squared Error
  r2: number; // R² coefficient
  bias: number; // Mean bias
  count: number; // Number of samples
}

/**
 * Comparison sample for validation
 */
export interface ComparisonSample {
  predicted: number;
  actual: number;
  timestamp: Date;
  location: GeoPoint;
  pollutant: Pollutant;
}

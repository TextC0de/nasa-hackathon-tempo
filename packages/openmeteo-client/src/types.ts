/**
 * Open-Meteo API Types
 *
 * Tipos TypeScript para trabajar con Open-Meteo Historical Archive & Forecast APIs
 */

/**
 * Punto geográfico (latitud, longitud)
 */
export interface GeoPoint {
  /** Latitud en grados (-90 a 90) */
  latitude: number;
  /** Longitud en grados (-180 a 180) */
  longitude: number;
}

/**
 * Variables meteorológicas disponibles - Hourly
 */
export enum HourlyVariable {
  /** Temperature at 2 meters (°C) */
  TEMPERATURE_2M = 'temperature_2m',
  /** Relative humidity at 2 meters (%) */
  RELATIVE_HUMIDITY_2M = 'relative_humidity_2m',
  /** Dewpoint at 2 meters (°C) */
  DEWPOINT_2M = 'dewpoint_2m',
  /** Apparent temperature (°C) */
  APPARENT_TEMPERATURE = 'apparent_temperature',
  /** Precipitation (rain + showers + snow) (mm) */
  PRECIPITATION = 'precipitation',
  /** Rain (mm) */
  RAIN = 'rain',
  /** Snowfall (cm) */
  SNOWFALL = 'snowfall',
  /** Snow depth (m) */
  SNOW_DEPTH = 'snow_depth',
  /** Weather code */
  WEATHER_CODE = 'weather_code',
  /** Sea level pressure (hPa) */
  PRESSURE_MSL = 'pressure_msl',
  /** Surface pressure (hPa) */
  SURFACE_PRESSURE = 'surface_pressure',
  /** Cloud cover total (%) */
  CLOUD_COVER = 'cloud_cover',
  /** Cloud cover at low level (%) */
  CLOUD_COVER_LOW = 'cloud_cover_low',
  /** Cloud cover at mid level (%) */
  CLOUD_COVER_MID = 'cloud_cover_mid',
  /** Cloud cover at high level (%) */
  CLOUD_COVER_HIGH = 'cloud_cover_high',
  /** Visibility (m) */
  VISIBILITY = 'visibility',
  /** Evapotranspiration (mm) */
  EVAPOTRANSPIRATION = 'evapotranspiration',
  /** Wind speed at 10 meters (m/s) - CRITICAL para advección */
  WIND_SPEED_10M = 'windspeed_10m',
  /** Wind speed at 80 meters (m/s) */
  WIND_SPEED_80M = 'windspeed_80m',
  /** Wind speed at 120 meters (m/s) */
  WIND_SPEED_120M = 'windspeed_120m',
  /** Wind direction at 10 meters (°) - CRITICAL para advección */
  WIND_DIRECTION_10M = 'winddirection_10m',
  /** Wind direction at 80 meters (°) */
  WIND_DIRECTION_80M = 'winddirection_80m',
  /** Wind direction at 120 meters (°) */
  WIND_DIRECTION_120M = 'winddirection_120m',
  /** Wind gusts at 10 meters (m/s) */
  WIND_GUSTS_10M = 'wind_gusts_10m',
  /** Shortwave radiation (W/m²) */
  SHORTWAVE_RADIATION = 'shortwave_radiation',
  /** Direct solar radiation (W/m²) */
  DIRECT_RADIATION = 'direct_radiation',
  /** Diffuse solar radiation (W/m²) */
  DIFFUSE_RADIATION = 'diffuse_radiation',
  /** Direct normal irradiance (W/m²) */
  DIRECT_NORMAL_IRRADIANCE = 'direct_normal_irradiance',
  /** Global tilted irradiance (W/m²) */
  GLOBAL_TILTED_IRRADIANCE = 'global_tilted_irradiance',
  /** Terrestrial radiation (W/m²) */
  TERRESTRIAL_RADIATION = 'terrestrial_radiation',
  /** Shortwave radiation instant (W/m²) */
  SHORTWAVE_RADIATION_INSTANT = 'shortwave_radiation_instant',
  /** Diffuse radiation instant (W/m²) */
  DIFFUSE_RADIATION_INSTANT = 'diffuse_radiation_instant',
  /** Direct radiation instant (W/m²) */
  DIRECT_RADIATION_INSTANT = 'direct_radiation_instant',
  /** Direct normal irradiance instant (W/m²) */
  DIRECT_NORMAL_IRRADIANCE_INSTANT = 'direct_normal_irradiance_instant',
  /** Global tilted irradiance instant (W/m²) */
  GLOBAL_TILTED_IRRADIANCE_INSTANT = 'global_tilted_irradiance_instant',
  /** Terrestrial radiation instant (W/m²) */
  TERRESTRIAL_RADIATION_INSTANT = 'terrestrial_radiation_instant',
  /** Soil temperature at 0cm (°C) */
  SOIL_TEMPERATURE_0CM = 'soil_temperature_0cm',
  /** Soil moisture at 0-1cm (m³/m³) */
  SOIL_MOISTURE_0_TO_1CM = 'soil_moisture_0_to_1cm',
  /** CRITICAL: Boundary layer height (m) - Necesario para column to surface conversion */
  BOUNDARY_LAYER_HEIGHT = 'boundary_layer_height',
}

/**
 * Variables meteorológicas - Daily
 */
export enum DailyVariable {
  /** Weather code */
  WEATHER_CODE = 'weather_code',
  /** Maximum temperature (°C) */
  TEMPERATURE_2M_MAX = 'temperature_2m_max',
  /** Minimum temperature (°C) */
  TEMPERATURE_2M_MIN = 'temperature_2m_min',
  /** Mean temperature (°C) */
  TEMPERATURE_2M_MEAN = 'temperature_2m_mean',
  /** Maximum apparent temperature (°C) */
  APPARENT_TEMPERATURE_MAX = 'apparent_temperature_max',
  /** Minimum apparent temperature (°C) */
  APPARENT_TEMPERATURE_MIN = 'apparent_temperature_min',
  /** Mean apparent temperature (°C) */
  APPARENT_TEMPERATURE_MEAN = 'apparent_temperature_mean',
  /** Sunrise time */
  SUNRISE = 'sunrise',
  /** Sunset time */
  SUNSET = 'sunset',
  /** Daylight duration (s) */
  DAYLIGHT_DURATION = 'daylight_duration',
  /** Sunshine duration (s) */
  SUNSHINE_DURATION = 'sunshine_duration',
  /** Precipitation sum (mm) */
  PRECIPITATION_SUM = 'precipitation_sum',
  /** Rain sum (mm) */
  RAIN_SUM = 'rain_sum',
  /** Snowfall sum (cm) */
  SNOWFALL_SUM = 'snowfall_sum',
  /** Precipitation hours */
  PRECIPITATION_HOURS = 'precipitation_hours',
  /** Maximum wind speed (m/s) */
  WIND_SPEED_10M_MAX = 'windspeed_10m_max',
  /** Maximum wind gusts (m/s) */
  WIND_GUSTS_10M_MAX = 'wind_gusts_10m_max',
  /** Dominant wind direction (°) */
  WIND_DIRECTION_10M_DOMINANT = 'winddirection_10m_dominant',
  /** Shortwave radiation sum (MJ/m²) */
  SHORTWAVE_RADIATION_SUM = 'shortwave_radiation_sum',
  /** Reference evapotranspiration (mm) */
  ET0_FAO_EVAPOTRANSPIRATION = 'et0_fao_evapotranspiration',
}

/**
 * Opciones para consultas históricas (Archive API)
 */
export interface HistoricalWeatherOptions {
  /** Fecha de inicio (YYYY-MM-DD) */
  startDate: string;
  /** Fecha de fin (YYYY-MM-DD) */
  endDate: string;
  /** Variables hourly a obtener */
  hourly?: HourlyVariable[];
  /** Variables daily a obtener */
  daily?: DailyVariable[];
  /** Timezone (default: 'auto') */
  timezone?: string;
  /** Elevation in meters (optional, will be auto-detected if not provided) */
  elevation?: number;
  /** Temperature unit ('celsius' | 'fahrenheit') */
  temperatureUnit?: 'celsius' | 'fahrenheit';
  /** Wind speed unit ('kmh' | 'ms' | 'mph' | 'kn') */
  windspeedUnit?: 'kmh' | 'ms' | 'mph' | 'kn';
  /** Precipitation unit ('mm' | 'inch') */
  precipitationUnit?: 'mm' | 'inch';
}

/**
 * Opciones para consultas de forecast
 */
export interface ForecastWeatherOptions {
  /** Variables hourly a obtener */
  hourly?: HourlyVariable[];
  /** Variables daily a obtener */
  daily?: DailyVariable[];
  /** Días de forecast (1-16) */
  forecastDays?: number;
  /** Días de archivo pasado (0-92) */
  pastDays?: number;
  /** Timezone (default: 'auto') */
  timezone?: string;
  /** Temperature unit */
  temperatureUnit?: 'celsius' | 'fahrenheit';
  /** Wind speed unit */
  windspeedUnit?: 'kmh' | 'ms' | 'mph' | 'kn';
  /** Precipitation unit */
  precipitationUnit?: 'mm' | 'inch';
}

/**
 * Unidades de datos hourly
 */
export interface HourlyUnits {
  time?: string;
  temperature_2m?: string;
  relative_humidity_2m?: string;
  dewpoint_2m?: string;
  apparent_temperature?: string;
  precipitation?: string;
  rain?: string;
  snowfall?: string;
  snow_depth?: string;
  weather_code?: string;
  pressure_msl?: string;
  surface_pressure?: string;
  cloud_cover?: string;
  visibility?: string;
  evapotranspiration?: string;
  windspeed_10m?: string;
  winddirection_10m?: string;
  wind_gusts_10m?: string;
  boundary_layer_height?: string;
  [key: string]: string | undefined;
}

/**
 * Datos hourly
 */
export interface HourlyData {
  /** Array de timestamps ISO 8601 */
  time: string[];
  /** Temperature at 2m (°C) */
  temperature_2m?: number[];
  /** Relative humidity (%) */
  relative_humidity_2m?: number[];
  /** Dewpoint (°C) */
  dewpoint_2m?: number[];
  /** Apparent temperature (°C) */
  apparent_temperature?: number[];
  /** Precipitation (mm) */
  precipitation?: number[];
  /** Rain (mm) */
  rain?: number[];
  /** Snowfall (cm) */
  snowfall?: number[];
  /** Snow depth (m) */
  snow_depth?: number[];
  /** Weather code */
  weather_code?: number[];
  /** Sea level pressure (hPa) */
  pressure_msl?: number[];
  /** Surface pressure (hPa) */
  surface_pressure?: number[];
  /** Cloud cover (%) */
  cloud_cover?: number[];
  /** Visibility (m) */
  visibility?: number[];
  /** Evapotranspiration (mm) */
  evapotranspiration?: number[];
  /** Wind speed at 10m (m/s) - CRITICAL */
  windspeed_10m?: number[];
  /** Wind direction at 10m (°) - CRITICAL */
  winddirection_10m?: number[];
  /** Wind gusts (m/s) */
  wind_gusts_10m?: number[];
  /** Boundary layer height (m) - CRITICAL */
  boundary_layer_height?: number[];
  /** Dynamic properties for additional variables */
  [key: string]: string[] | number[] | undefined;
}

/**
 * Unidades de datos daily
 */
export interface DailyUnits {
  time?: string;
  weather_code?: string;
  temperature_2m_max?: string;
  temperature_2m_min?: string;
  temperature_2m_mean?: string;
  precipitation_sum?: string;
  rain_sum?: string;
  snowfall_sum?: string;
  windspeed_10m_max?: string;
  wind_gusts_10m_max?: string;
  winddirection_10m_dominant?: string;
  [key: string]: string | undefined;
}

/**
 * Datos daily
 */
export interface DailyData {
  /** Array de fechas (YYYY-MM-DD) */
  time: string[];
  /** Weather code */
  weather_code?: number[];
  /** Max temperature (°C) */
  temperature_2m_max?: number[];
  /** Min temperature (°C) */
  temperature_2m_min?: number[];
  /** Mean temperature (°C) */
  temperature_2m_mean?: number[];
  /** Sunrise (ISO 8601) */
  sunrise?: string[];
  /** Sunset (ISO 8601) */
  sunset?: string[];
  /** Precipitation sum (mm) */
  precipitation_sum?: number[];
  /** Rain sum (mm) */
  rain_sum?: number[];
  /** Snowfall sum (cm) */
  snowfall_sum?: number[];
  /** Max wind speed (m/s) */
  windspeed_10m_max?: number[];
  /** Max wind gusts (m/s) */
  wind_gusts_10m_max?: number[];
  /** Dominant wind direction (°) */
  winddirection_10m_dominant?: number[];
  /** Dynamic properties */
  [key: string]: string[] | number[] | undefined;
}

/**
 * Respuesta de Historical Archive API
 */
export interface HistoricalWeatherResponse {
  /** Latitud */
  latitude: number;
  /** Longitud */
  longitude: number;
  /** Elevation en metros */
  elevation: number;
  /** Generación del tiempo (ISO 8601) */
  generationtime_ms: number;
  /** UTC offset en segundos */
  utc_offset_seconds: number;
  /** Timezone string */
  timezone: string;
  /** Timezone abbreviation */
  timezone_abbreviation: string;
  /** Datos hourly (si se solicitaron) */
  hourly?: HourlyData;
  /** Unidades hourly */
  hourly_units?: HourlyUnits;
  /** Datos daily (si se solicitaron) */
  daily?: DailyData;
  /** Unidades daily */
  daily_units?: DailyUnits;
}

/**
 * Respuesta de Forecast API
 */
export interface ForecastWeatherResponse {
  /** Latitud */
  latitude: number;
  /** Longitud */
  longitude: number;
  /** Elevation en metros */
  elevation: number;
  /** Generación del tiempo (ms) */
  generationtime_ms: number;
  /** UTC offset en segundos */
  utc_offset_seconds: number;
  /** Timezone string */
  timezone: string;
  /** Timezone abbreviation */
  timezone_abbreviation: string;
  /** Datos hourly (si se solicitaron) */
  hourly?: HourlyData;
  /** Unidades hourly */
  hourly_units?: HourlyUnits;
  /** Datos daily (si se solicitaron) */
  daily?: DailyData;
  /** Unidades daily */
  daily_units?: DailyUnits;
}

/**
 * Error de Open-Meteo API
 */
export interface OpenMeteoError {
  error: boolean;
  reason: string;
}

/**
 * Weather snapshot en un momento específico
 */
export interface WeatherSnapshot {
  /** Timestamp */
  time: Date;
  /** Temperature (°C) */
  temperature?: number;
  /** Wind speed (m/s) */
  windSpeed?: number;
  /** Wind direction (°) */
  windDirection?: number;
  /** Precipitation (mm) */
  precipitation?: number;
  /** Boundary layer height (m) - CRÍTICO */
  boundaryLayerHeight?: number;
  /** Surface pressure (hPa) */
  surfacePressure?: number;
  /** Cloud cover (%) */
  cloudCover?: number;
  /** Relative humidity (%) */
  relativeHumidity?: number;
}

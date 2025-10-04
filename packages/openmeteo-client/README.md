# @atmos/openmeteo-client

Cliente TypeScript para **Open-Meteo API** - Historical weather data y forecast para advection modeling y análisis atmosférico.

## Features

- 🌍 **Global Coverage** - Datos meteorológicos worldwide
- 📅 **Historical Archive** - 1940 hasta presente, hourly resolution
- 🔮 **Forecast** - 16 días hacia adelante
- 🌬️ **Wind Fields** - Wind speed y direction para advección
- 📏 **Boundary Layer Height** - Crítico para column-to-surface conversion
- 💰 **100% FREE** - No API key requerida
- 🚀 **Rate Limit** - 10,000 requests/día (suficiente para research)

## Installation

```bash
pnpm add @atmos/openmeteo-client
```

## Usage

### Datos Históricos (para validation)

```typescript
import { OpenMeteoClient, HourlyVariable } from '@atmos/openmeteo-client';

const client = new OpenMeteoClient();

// Obtener weather data histórico
const weather = await client.getHistoricalWeather(
  { latitude: 34.05, longitude: -118.24 }, // Los Angeles
  {
    startDate: '2024-01-01',
    endDate: '2024-01-31',
    hourly: [
      HourlyVariable.WIND_SPEED_10M,
      HourlyVariable.WIND_DIRECTION_10M,
      HourlyVariable.BOUNDARY_LAYER_HEIGHT,
      HourlyVariable.PRECIPITATION,
      HourlyVariable.TEMPERATURE_2M,
      HourlyVariable.SURFACE_PRESSURE,
    ],
  }
);

console.log(`Wind: ${weather.hourly?.windspeed_10m?.[0]} m/s`);
console.log(`Direction: ${weather.hourly?.winddirection_10m?.[0]}°`);
console.log(`PBL Height: ${weather.hourly?.boundary_layer_height?.[0]} m`);
```

### Forecast (para producción)

```typescript
// Obtener pronóstico 7 días
const forecast = await client.getForecast(
  { latitude: 34.05, longitude: -118.24 },
  {
    forecastDays: 7,
    hourly: [
      HourlyVariable.WIND_SPEED_10M,
      HourlyVariable.WIND_DIRECTION_10M,
      HourlyVariable.BOUNDARY_LAYER_HEIGHT,
      HourlyVariable.PRECIPITATION,
    ],
  }
);

console.log(`Forecast: ${forecast.hourly?.windspeed_10m?.[0]} m/s`);
```

### Bulk Requests (múltiples ciudades)

```typescript
const cities = [
  { latitude: 34.05, longitude: -118.24 }, // LA
  { latitude: 37.77, longitude: -122.42 }, // SF
  { latitude: 40.71, longitude: -74.01 }, // NYC
];

const weatherData = await client.getHistoricalWeatherBulk(cities, {
  startDate: '2024-01-01',
  endDate: '2024-01-31',
  hourly: [HourlyVariable.WIND_SPEED_10M, HourlyVariable.BOUNDARY_LAYER_HEIGHT],
});

console.log(`Obtenidos ${weatherData.length} ciudades`);
```

### Weather Snapshots

```typescript
// Convertir a snapshots estructurados
const snapshots = client.toWeatherSnapshots(weather);

for (const snap of snapshots) {
  console.log(`${snap.time}: Wind ${snap.windSpeed} m/s @ ${snap.windDirection}°`);
  console.log(`  PBL: ${snap.boundaryLayerHeight}m, Precip: ${snap.precipitation}mm`);
}
```

### Helpers Estáticos

```typescript
// Calcular componentes U/V del viento para advección
const [u, v] = OpenMeteoClient.windComponents(10, 45);
console.log(`U: ${u}, V: ${v}`); // Wind from NE

// Obtener variables recomendadas para advección
const vars = OpenMeteoClient.getAdvectionVariables();
// [WIND_SPEED_10M, WIND_DIRECTION_10M, BOUNDARY_LAYER_HEIGHT, ...]

// Formatear fecha
const dateStr = OpenMeteoClient.dateToOpenMeteoFormat(new Date());
console.log(dateStr); // '2025-10-04'
```

## Variables Disponibles

### Hourly Variables (críticas para advección)

| Variable                    | Descripción                | Unidad |
| --------------------------- | -------------------------- | ------ |
| `WIND_SPEED_10M`            | Wind speed at 10m          | m/s    |
| `WIND_DIRECTION_10M`        | Wind direction at 10m      | °      |
| `BOUNDARY_LAYER_HEIGHT`     | PBL height (CRÍTICO)       | m      |
| `PRECIPITATION`             | Precipitation (washout)    | mm     |
| `TEMPERATURE_2M`            | Temperature at 2m          | °C     |
| `SURFACE_PRESSURE`          | Surface pressure           | hPa    |
| `RELATIVE_HUMIDITY_2M`      | Relative humidity          | %      |
| `CLOUD_COVER`               | Cloud cover                | %      |

Ver `src/types.ts` para lista completa de 60+ variables.

## Integration con Advection Model

```typescript
import { OpenMeteoClient, HourlyVariable } from '@atmos/openmeteo-client';
import { forecastAdvection, DEFAULT_FACTORS } from '@nasa-tempo/advection';

// 1. Obtener weather data
const weather = await client.getHistoricalWeather(location, {
  startDate: '2024-01-15',
  endDate: '2024-01-15',
  hourly: OpenMeteoClient.getAdvectionVariables(),
});

// 2. Extraer condiciones en timestamp específico
const snapshot = client.getWeatherAtTime(weather, new Date('2024-01-15T12:00:00Z'));

// 3. Usar en advection model
const forecast = forecastAdvection(
  currentGrid,
  {
    windSpeed: snapshot.windSpeed,
    windDirection: snapshot.windDirection,
    boundaryLayerHeight: snapshot.boundaryLayerHeight,
    precipitation: snapshot.precipitation,
    temperature: snapshot.temperature,
  },
  fires,
  DEFAULT_FACTORS
);
```

## API Endpoints

- **Historical Archive**: `https://archive-api.open-meteo.com/v1/archive`
  - Desde 1940 hasta presente
  - Hourly resolution
  - Global coverage
- **Forecast**: `https://api.open-meteo.com/v1/forecast`
  - 16 días hacia adelante
  - Hourly resolution
  - Update 4x/día

## Rate Limits

- **10,000 requests/día** - Suficiente para research
- Sin API key requerida
- FREE para uso académico/research

## References

- [Open-Meteo Documentation](https://open-meteo.com/en/docs)
- [Historical Archive API](https://open-meteo.com/en/docs/historical-weather-api)
- [Forecast API](https://open-meteo.com/en/docs)

## License

MIT

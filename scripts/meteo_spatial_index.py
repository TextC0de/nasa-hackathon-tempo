#!/usr/bin/env python3
"""
Índice espacial de meteorología para interpolación eficiente

Carga los datos de OpenMeteo de 25 ciudades de California y proporciona
interpolación espacial usando k-nearest neighbors con ponderación por distancia inversa.

Uso:
    from meteo_spatial_index import MeteoSpatialIndex

    meteo_index = MeteoSpatialIndex(Path('scripts/data/openmeteo'))
    meteo_data = meteo_index.interpolate_meteo(lat=34.05, lon=-118.24, timestamp='2024-02-15T14:00')
"""

import json
from pathlib import Path
from datetime import datetime
from typing import Dict, List, Tuple, Optional
import numpy as np

def haversine_distance(lat1: float, lon1: float, lat2: float, lon2: float) -> float:
    """
    Calcula la distancia en km entre dos puntos usando la fórmula de Haversine
    """
    R = 6371  # Radio de la Tierra en km

    lat1_rad = np.radians(lat1)
    lat2_rad = np.radians(lat2)
    dlat = np.radians(lat2 - lat1)
    dlon = np.radians(lon2 - lon1)

    a = np.sin(dlat/2)**2 + np.cos(lat1_rad) * np.cos(lat2_rad) * np.sin(dlon/2)**2
    c = 2 * np.arctan2(np.sqrt(a), np.sqrt(1-a))

    return R * c


class MeteoSpatialIndex:
    """
    Índice espacial para búsqueda eficiente de datos meteorológicos
    """

    def __init__(self, openmeteo_dir: Path):
        """
        Carga todos los archivos JSON de OpenMeteo y construye el índice espacial

        Args:
            openmeteo_dir: Directorio con los archivos JSON de ciudades
        """
        self.cities_data = {}
        self.city_locations = {}  # {city_name: (lat, lon)}

        print("🌤️  Cargando datos meteorológicos de OpenMeteo...")

        # Buscar todos los archivos JSON en el directorio
        json_files = list(openmeteo_dir.glob("*.json"))

        if not json_files:
            print(f"   ⚠️  No se encontraron archivos JSON en {openmeteo_dir}")
            return

        total_points = 0

        for json_file in sorted(json_files):
            city_name = json_file.stem  # e.g., "Los_Angeles"

            try:
                with open(json_file) as f:
                    data = json.load(f)

                # Extraer coordenadas
                lat = data.get('latitude')
                lon = data.get('longitude')

                if lat is None or lon is None:
                    print(f"   ⚠️  {city_name}: Sin coordenadas, saltando...")
                    continue

                # Extraer datos horarios
                hourly = data.get('hourly', {})
                times = hourly.get('time', [])

                if not times:
                    print(f"   ⚠️  {city_name}: Sin datos horarios, saltando...")
                    continue

                # Guardar ubicación
                self.city_locations[city_name] = (lat, lon)

                # Guardar datos en formato eficiente (arrays en lugar de diccionarios)
                self.cities_data[city_name] = {
                    'lat': lat,
                    'lon': lon,
                    'times': [t.replace('T', ' ').replace('Z', '') for t in times],
                    'wind_speed': hourly.get('windspeed_10m', []),
                    'wind_direction': hourly.get('winddirection_10m', []),
                    'temperature': hourly.get('temperature_2m', []),
                    'precipitation': hourly.get('precipitation', []),
                    'pbl_height': hourly.get('boundary_layer_height', []),
                    'surface_pressure': hourly.get('surface_pressure', []),
                    'relative_humidity': hourly.get('relative_humidity_2m', []),
                    'cloud_cover': hourly.get('cloud_cover', []),
                }

                city_points = len(times)
                total_points += city_points

                print(f"   ✓ {city_name:20s} → {city_points:6,d} puntos horarios | ({lat:.2f}, {lon:.2f})")

            except Exception as e:
                print(f"   ❌ Error cargando {city_name}: {e}")
                continue

        print(f"\n   📊 Total: {len(self.cities_data)} ciudades, {total_points:,d} puntos meteorológicos")
        print(f"   📍 Cobertura: {len(self.city_locations)} ubicaciones espaciales\n")


    def get_nearest_cities(self, lat: float, lon: float, k: int = 3) -> List[Tuple[str, float]]:
        """
        Encuentra las k ciudades más cercanas a un punto dado

        Args:
            lat, lon: Coordenadas del punto de interés
            k: Número de ciudades a retornar

        Returns:
            Lista de tuplas (city_name, distance_km)
        """
        if not self.city_locations:
            return []

        distances = []
        for city_name, (city_lat, city_lon) in self.city_locations.items():
            dist = haversine_distance(lat, lon, city_lat, city_lon)
            distances.append((city_name, dist))

        # Ordenar por distancia y tomar las k más cercanas
        distances.sort(key=lambda x: x[1])
        return distances[:k]


    def interpolate_meteo(self, lat: float, lon: float, timestamp: str, k: int = 3) -> Dict[str, float]:
        """
        Interpola datos meteorológicos usando k-nearest neighbors con ponderación por distancia inversa

        Args:
            lat, lon: Coordenadas del punto de interés
            timestamp: Timestamp en formato 'YYYY-MM-DD HH:MM'
            k: Número de ciudades a usar para interpolación

        Returns:
            Diccionario con variables meteorológicas interpoladas
        """
        # Encontrar las k ciudades más cercanas
        nearest = self.get_nearest_cities(lat, lon, k=k)

        if not nearest:
            # Si no hay datos, retornar defaults
            return {
                'wind_speed': 5.0,
                'wind_direction': 270.0,
                'temperature': 20.0,
                'precipitation': 0.0,
                'pbl_height': 800.0,
                'surface_pressure': 1013.0,
                'relative_humidity': 60.0,
                'cloud_cover': 50.0,
            }

        # Preparar para interpolación
        weights = []
        meteo_values = {
            'wind_speed': [],
            'wind_direction': [],
            'temperature': [],
            'precipitation': [],
            'pbl_height': [],
            'surface_pressure': [],
            'relative_humidity': [],
            'cloud_cover': [],
        }

        for city_name, distance in nearest:
            # Obtener datos para esta ciudad
            city_data = self.cities_data.get(city_name, {})
            times = city_data.get('times', [])

            # Buscar el índice del timestamp
            try:
                idx = times.index(timestamp)
            except ValueError:
                # Si no hay datos para este timestamp exacto, saltar
                continue

            # Ponderación: inverso de la distancia al cuadrado (más peso a las cercanas)
            # Evitar división por cero si la distancia es muy pequeña
            weight = 1.0 / (distance + 0.1)**2
            weights.append(weight)

            # Acumular valores
            for var in meteo_values.keys():
                values_array = city_data.get(var, [])
                if idx < len(values_array):
                    val = values_array[idx]
                    if val is not None:
                        meteo_values[var].append(val * weight)
                    else:
                        meteo_values[var].append(None)
                else:
                    meteo_values[var].append(None)

        # Si no hay datos válidos, retornar defaults
        if not weights:
            return {
                'wind_speed': 5.0,
                'wind_direction': 270.0,
                'temperature': 20.0,
                'precipitation': 0.0,
                'pbl_height': 800.0,
                'surface_pressure': 1013.0,
                'relative_humidity': 60.0,
                'cloud_cover': 50.0,
            }

        # Normalizar pesos
        total_weight = sum(weights)

        # Interpolar cada variable
        result = {}
        for var, values in meteo_values.items():
            # Filtrar None values
            valid_values = [v for v in values if v is not None]

            if valid_values:
                # Promedio ponderado
                result[var] = sum(valid_values) / total_weight
            else:
                # Default si no hay datos válidos
                defaults = {
                    'wind_speed': 5.0,
                    'wind_direction': 270.0,
                    'temperature': 20.0,
                    'precipitation': 0.0,
                    'pbl_height': 800.0,
                    'surface_pressure': 1013.0,
                    'relative_humidity': 60.0,
                    'cloud_cover': 50.0,
                }
                result[var] = defaults.get(var, 0.0)

        return result


    def get_meteo_for_time(self, lat: float, lon: float, timestamp: str) -> Dict[str, float]:
        """
        Alias de interpolate_meteo() para compatibilidad con código existente
        """
        return self.interpolate_meteo(lat, lon, timestamp, k=3)


# Test rápido si se ejecuta directamente
if __name__ == "__main__":
    import sys

    # Cargar índice
    openmeteo_dir = Path("scripts/data/openmeteo")
    if not openmeteo_dir.exists():
        print(f"❌ Directorio no encontrado: {openmeteo_dir}")
        sys.exit(1)

    meteo_index = MeteoSpatialIndex(openmeteo_dir)

    # Test: Los Ángeles
    print("\n" + "="*60)
    print("TEST: Interpolación para Los Ángeles")
    print("="*60)

    la_lat, la_lon = 34.05, -118.24
    test_timestamp = "2024-02-15 14:00"

    print(f"\n📍 Ubicación: ({la_lat}, {la_lon})")
    print(f"⏰ Timestamp: {test_timestamp}")

    # Encontrar ciudades cercanas
    nearest = meteo_index.get_nearest_cities(la_lat, la_lon, k=5)
    print(f"\n🏙️  5 ciudades más cercanas:")
    for city, dist in nearest:
        print(f"   • {city:20s} → {dist:6.1f} km")

    # Interpolar meteorología
    meteo = meteo_index.interpolate_meteo(la_lat, la_lon, test_timestamp, k=3)
    print(f"\n🌤️  Meteorología interpolada:")
    print(f"   • Viento:         {meteo['wind_speed']:.1f} m/s desde {meteo['wind_direction']:.0f}°")
    print(f"   • Temperatura:    {meteo['temperature']:.1f}°C")
    print(f"   • PBL:            {meteo['pbl_height']:.0f} m")
    print(f"   • Precipitación:  {meteo['precipitation']:.1f} mm")
    print(f"   • Humedad:        {meteo['relative_humidity']:.0f}%")
    print(f"   • Nubes:          {meteo['cloud_cover']:.0f}%")

    print("\n✅ Test completado\n")

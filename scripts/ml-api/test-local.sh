#!/bin/bash
# Test local de la API

echo "🧪 Testing ML API locally..."

# Health check
echo -e "\n1️⃣ Health check:"
curl -s http://localhost:8001/health | jq

# Get features
echo -e "\n2️⃣ Features list (first 5):"
curl -s http://localhost:8001/features | jq '.features[:5]'

# Test prediction (con features dummy)
echo -e "\n3️⃣ Test prediction:"
curl -s -X POST http://localhost:8001/predict \
  -H "Content-Type: application/json" \
  -d '{
    "features": {
      "no2_column_center": 1.5e16,
      "urban_proximity_index": 5.2,
      "distance_to_nearest_city_km": 10.5,
      "no2_avg_5km": 1.2e16,
      "no2_max_5km": 1.8e16,
      "no2_min_5km": 8e15,
      "no2_std_5km": 3e15,
      "no2_avg_10km": 1.3e16,
      "no2_max_10km": 2e16,
      "no2_min_10km": 7e15,
      "no2_std_10km": 4e15,
      "no2_avg_20km": 1.1e16,
      "no2_max_20km": 1.9e16,
      "no2_min_20km": 6e15,
      "no2_std_20km": 5e15,
      "no2_upwind_10km_avg": 1.4e16,
      "no2_upwind_10km_max": 2.1e16,
      "no2_upwind_10km_std": 3.5e15,
      "no2_upwind_20km_avg": 1.3e16,
      "no2_upwind_20km_max": 2e16,
      "no2_upwind_20km_std": 4e15,
      "no2_upwind_30km_avg": 1.2e16,
      "no2_upwind_30km_max": 1.8e16,
      "no2_upwind_30km_std": 3e15,
      "no2_downwind_10km_avg": 1.1e16,
      "no2_downwind_10km_max": 1.6e16,
      "no2_downwind_10km_std": 2.5e15,
      "no2_north_10km": 1.2e16,
      "no2_north_std_10km": 3e15,
      "no2_east_10km": 1.3e16,
      "no2_east_std_10km": 3.2e15,
      "no2_south_10km": 1.1e16,
      "no2_south_std_10km": 2.8e15,
      "no2_west_10km": 1.4e16,
      "no2_west_std_10km": 3.5e15,
      "gradient_NS": 1e-6,
      "gradient_EW": -5e-7,
      "gradient_upwind_downwind": 2e-6,
      "gradient_center_avg": 1.5e-6,
      "wind_speed": 3.5,
      "wind_direction": 270,
      "wind_u": 0,
      "wind_v": -3.5,
      "pbl_height": 800,
      "temperature": 20,
      "precipitation": 0,
      "pbl_normalized": 1,
      "hour": 14,
      "day_of_week": 3,
      "month": 10,
      "hour_sin": 0.5,
      "hour_cos": 0.866,
      "day_sin": 0.434,
      "day_cos": -0.901,
      "physics_prediction": 15.5,
      "no2_avg_24h": 14.2,
      "no2_avg_7d": 13.8,
      "no2_trend_24h": 0.05,
      "wind_speed_x_upwind_no2": 4.2e16,
      "hour_x_urban": 72.8,
      "pbl_x_center_no2": 1.2e19,
      "day_of_year": 278,
      "month_sin": 0.5,
      "month_cos": 0.866
    }
  }' | jq

echo -e "\n✅ Tests complete!"

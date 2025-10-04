# 🌍 Validación REAL del Modelo de Advección

## ✅ 100% Datos Reales - Sin Datos Sintéticos

Este sistema valida el modelo de advección usando **únicamente datos reales**:

- ✅ **Mediciones EPA PM2.5 reales** (8M+ registros, estaciones ground truth)
- ✅ **Incendios FIRMS reales** (datos satelitales NASA)
- ✅ **Meteorología OpenMeteo real** (54,744 registros horarios)

---

## 🚀 Uso

### Generar Reporte de Validación

```bash
pnpm validate:advection
```

**Qué hace:**
1. Carga 8M+ mediciones reales de EPA PM2.5
2. Carga datos de incendios FIRMS
3. Carga datos meteorológicos de OpenMeteo
4. Para cada medición EPA (sampleada a 1000 puntos):
   - Busca condiciones meteorológicas del momento
   - Busca incendios activos cercanos (<100km)
   - Genera predicción con modelo **COMPLETO** `forecastAdvection()`
   - Compara con medición **REAL** de EPA
5. Calcula métricas reales: R², MAE, RMSE, Bias
6. Genera reporte HTML interactivo
7. Abre en navegador automáticamente

**Tiempo estimado:** 1-2 minutos

---

## 📊 Reporte Generado

El reporte HTML (`advection-real-validation.html`) incluye:

### 1. **Métricas Reales**
- R² (Coeficiente de Determinación)
- MAE (Error Absoluto Medio) en µg/m³
- RMSE (Raíz del Error Cuadrático Medio)
- Bias (Sesgo sistemático)

### 2. **Gráficos Interactivos**
- **Scatter Plot**: Predicciones vs Mediciones EPA Reales
- **Serie Temporal**: Evolución de predicciones vs realidad (primeros 100 puntos)
- **Histograma**: Distribución de errores de predicción

### 3. **Narrativa Comprensible** ⭐

10 ejemplos concretos en lenguaje natural, como:

> **🎯 15 de marzo de 2024 a las 14:00 - Los Angeles**
>
> **🔮 Predicción del modelo:** 42.3 µg/m³ de PM2.5
> **📊 Medición EPA real:** 45.1 µg/m³
> **📏 Diferencia:** 2.8 µg/m³ (6.2% error)
>
> **🌡️ Condiciones meteorológicas:**
> - Viento: 12 km/h dirección suroeste
> - Altura de capa límite (PBL): 620 metros (normal)
> - Sin precipitación
>
> **🔥 Incendios activos:**
> - 2 incendios en un radio de 100km
> - Más cercano a 45.3 km de distancia
> - Potencia radiativa total: 12.4 MW
>
> **✨ Calidad de predicción: BUENA**

---

## 🔬 Detalles Técnicos

### Datos Utilizados

| Fuente | Período | Ubicación | Registros |
|--------|---------|-----------|-----------|
| EPA PM2.5 | 2024-01-01 a 2024-06-30 | Los Angeles (50km radio) | ~1000 (sampleados) |
| FIRMS Fires | 2024-01-01 a 2024-06-30 | Los Angeles (100km radio) | Variable por día |
| OpenMeteo Weather | 2024-01-10 a 2025-09-25 | Los Angeles | 54,744 |

### Algoritmo de Matching

Para cada medición EPA:

1. **Matching Temporal** (±60 minutos):
   - Busca registro meteorológico más cercano en tiempo
   - Si no hay dato en ±60 min, descarta el punto

2. **Matching Espacial de Incendios**:
   - Busca incendios del mismo día
   - Filtra por radio de 100km desde estación EPA
   - Calcula impacto ponderado por distancia

3. **Predicción Completa**:
   - Usa `forecastAdvection()` con todos los componentes:
     - NO2 column to surface conversion
     - Fire contribution (FRP weighted by distance)
     - Washout effect (precipitation)
     - PBL dilution effect
     - Bias correction (opcional)

4. **Comparación**:
   - Predicción vs medición EPA real
   - Calcula error absoluto y porcentual

### Modelo de Predicción

```typescript
const forecast = forecastAdvection(
  location,           // Lat/Lon de estación EPA
  estimatedNO2Column, // 2e15 molecules/cm² (típico urbano)
  weather,            // Condiciones meteorológicas reales
  fires,              // Incendios reales cercanos
  null,               // Sin bias correction inicial
  DEFAULT_FACTORS,    // Factores por defecto (o calibrados)
  0                   // Nowcast (predicción momento actual)
);
```

---

## 📖 Interpretación de Métricas

### R² (Coeficiente de Determinación)

Mide qué tan bien el modelo explica la variabilidad de los datos **reales**.

| Valor | Interpretación | Acción |
|-------|----------------|--------|
| > 0.9 | 🟢 Excelente | Modelo listo para producción |
| 0.7 - 0.9 | 🟡 Bueno | Considerar calibración |
| 0.5 - 0.7 | 🟠 Moderado | Calibrar factores |
| < 0.5 | 🔴 Pobre | Revisar modelo/datos |

### MAE (Mean Absolute Error)

Error promedio en valor absoluto.

| Valor (PM2.5) | Calidad | Acción |
|---------------|---------|--------|
| < 5 µg/m³ | 🟢 Excelente | Modelo muy preciso |
| 5-10 µg/m³ | 🟡 Buena | Aceptable para producción |
| 10-15 µg/m³ | 🟠 Aceptable | Calibrar factores |
| > 15 µg/m³ | 🔴 Necesita mejora | Revisar modelo |

### Bias (Sesgo)

Error sistemático del modelo.

| Valor | Interpretación | Acción |
|-------|----------------|--------|
| Bias > 5 µg/m³ | Sobreestima consistentemente | Ajustar bias_correction_weight |
| -5 < Bias < 5 | Sin sesgo significativo | ✅ Modelo balanceado |
| Bias < -5 µg/m³ | Subestima consistentemente | Ajustar factores de conversión |

---

## 🎯 Mejores Prácticas

### 1. **Ejecutar Validación Regularmente**

```bash
pnpm validate:advection
```

Ejecutar después de:
- Actualizar datos (EPA, FIRMS, OpenMeteo)
- Calibrar factores (`pnpm calibrate:advection`)
- Modificar algoritmo de advección

### 2. **Revisar Narrativa de Ejemplos**

La sección de narrativa del reporte HTML es **crítica** para entender:
- ¿En qué condiciones falla el modelo?
- ¿Qué casos predice bien?
- ¿Cómo afectan los incendios?
- ¿Cómo afecta la meteorología?

### 3. **Comparar con Baseline**

El modelo debe superar un baseline simple (persistencia):
- Persistencia: "Mañana será igual que hoy"
- Si R² < 0.3, el modelo no está aprendiendo patrones útiles

### 4. **Validación Cruzada por Períodos**

Modificar `VALIDATION_PERIOD` en el script:
- Entrenar en 2024-01 a 2024-06
- Validar en 2024-07 a 2024-12
- Verificar que el modelo generaliza

---

## 🔧 Configuración Avanzada

### Ajustar Tamaño de Muestra

Editar `scripts/real-advection-validation.ts`:

```typescript
const SAMPLE_SIZE = 1000; // Cambiar a 2000, 5000, etc.
```

**Trade-off:**
- Más muestras = más tiempo, métricas más precisas
- Menos muestras = más rápido, métricas menos estables

### Ajustar Radio de Búsqueda

```typescript
const LOS_ANGELES = {
  radiusKm: 50,      // Radio estaciones EPA
  fireRadiusKm: 100, // Radio incendios
};
```

### Ajustar Período de Validación

```typescript
const VALIDATION_PERIOD = {
  start: new Date('2024-01-01T00:00:00Z'),
  end: new Date('2024-12-31T23:59:59Z'), // Todo 2024
};
```

---

## 🆚 vs Scripts Antiguos

| Script Antiguo | Problema | Script Nuevo |
|----------------|----------|--------------|
| `analyze-advection-performance.ts` | ❌ Usaba `generateSyntheticGroundTruth()` | ✅ `real-advection-validation.ts` usa EPA real |
| `generate-advection-report.ts` | ❌ Modelo simplificado, no usaba FIRMS | ✅ Usa `forecastAdvection()` completo |
| Ambos | ❌ No había narrativa comprensible | ✅ 10 ejemplos concretos en lenguaje natural |

**Scripts antiguos eliminados:**
- ~~`analyze-advection-performance.ts`~~
- ~~`generate-advection-report.ts`~~

**Comandos deprecados:**
- ~~`pnpm analyze:advection`~~
- ~~`pnpm report:advection`~~

**Nuevo comando:**
- ✅ `pnpm validate:advection`

---

## 📞 Preguntas Frecuentes

### ¿Por qué NO2 column es estimado?

Actualmente usamos un valor típico urbano (2e15 molecules/cm²) porque:
- Los datos TEMPO NetCDF requieren un parser complejo
- El valor estimado es razonable para áreas urbanas
- El modelo ya muestra resultados útiles sin datos TEMPO

**Próximos pasos:**
- Implementar parser NetCDF para TEMPO
- Integrar NO2 column real satelital
- Mejora esperada: +10-15% en R²

### ¿Qué tan grandes son los archivos de datos?

- EPA PM2.5: ~2GB (8M registros)
- FIRMS: ~100MB (miles de incendios)
- OpenMeteo: ~10MB (54k registros)

El script samplea automáticamente para eficiencia.

### ¿Puedo validar otras ciudades?

Sí, modificar en el script:

```typescript
const CIUDAD = {
  name: 'San Francisco',
  latitude: 37.7749,
  longitude: -122.4194,
  radiusKm: 50,
  fireRadiusKm: 100,
};

const weatherPath = join(
  process.cwd(),
  'scripts/data/openmeteo/San_Francisco.json'
);
```

---

## 🎓 Para Personas No Técnicas

Este sistema permite que **cualquier persona** entienda si el modelo funciona bien:

✅ **Lee la sección "Ejemplos Concretos"** en el reporte HTML
✅ **Busca el emoji al inicio de cada ejemplo**:
  - 🎯 = Predicción excelente
  - ✅ = Predicción buena
  - ⚠️ = Predicción regular
  - ❌ = Predicción mala

✅ **Lee la narrativa** que explica:
  - Qué predijo el modelo
  - Qué midieron las estaciones EPA (real)
  - Cuál fue el error
  - Qué condiciones había (viento, incendios, lluvia)

✅ **Revisa los gráficos**:
  - Scatter plot: puntos cerca de la línea roja = buenas predicciones
  - Serie temporal: líneas superpuestas = buenas predicciones

---

## 🚀 Siguiente Paso

```bash
pnpm validate:advection
```

¡Genera tu primer reporte con datos 100% reales!

---

**Última actualización:** 2025-10-04
**Versión:** 1.0.0 (Validación Real)

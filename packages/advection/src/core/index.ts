/**
 * Motor principal de advección y forecasting
 *
 * Este módulo expone el motor completo de forecasting:
 * - Advección física (transporte por viento)
 * - Tendencias temporales (análisis T-3h → T=0)
 * - Dispersión de humo (Gaussian plume model)
 * - Grid advection engine (integración completa)
 */

export * from './temporal-trends';
export * from './smoke-dispersion';
export * from './grid-advection-engine';

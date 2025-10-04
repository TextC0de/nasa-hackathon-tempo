/**
 * Validation metrics for forecast accuracy
 */

import type { ComparisonSample, ValidationMetrics } from '../types';

/**
 * Calculate Mean Absolute Error (MAE)
 */
export function calculateMAE(samples: ComparisonSample[]): number {
  if (samples.length === 0) return 0;

  const sumAbsError = samples.reduce((sum, sample) => {
    return sum + Math.abs(sample.predicted - sample.actual);
  }, 0);

  return sumAbsError / samples.length;
}

/**
 * Calculate Root Mean Squared Error (RMSE)
 */
export function calculateRMSE(samples: ComparisonSample[]): number {
  if (samples.length === 0) return 0;

  const sumSquaredError = samples.reduce((sum, sample) => {
    const error = sample.predicted - sample.actual;
    return sum + error * error;
  }, 0);

  return Math.sqrt(sumSquaredError / samples.length);
}

/**
 * Calculate R² (coefficient of determination)
 */
export function calculateR2(samples: ComparisonSample[]): number {
  if (samples.length === 0) return 0;

  // Calculate mean of actual values
  const meanActual =
    samples.reduce((sum, s) => sum + s.actual, 0) / samples.length;

  // Calculate total sum of squares (SS_tot)
  const ssTot = samples.reduce((sum, sample) => {
    return sum + Math.pow(sample.actual - meanActual, 2);
  }, 0);

  // Calculate residual sum of squares (SS_res)
  const ssRes = samples.reduce((sum, sample) => {
    return sum + Math.pow(sample.actual - sample.predicted, 2);
  }, 0);

  // R² = 1 - (SS_res / SS_tot)
  if (ssTot === 0) return 0;
  return 1 - ssRes / ssTot;
}

/**
 * Calculate mean bias (average signed error)
 */
export function calculateBias(samples: ComparisonSample[]): number {
  if (samples.length === 0) return 0;

  const sumError = samples.reduce((sum, sample) => {
    return sum + (sample.predicted - sample.actual);
  }, 0);

  return sumError / samples.length;
}

/**
 * Calculate all validation metrics
 */
export function calculateAllMetrics(
  samples: ComparisonSample[]
): ValidationMetrics {
  return {
    mae: calculateMAE(samples),
    rmse: calculateRMSE(samples),
    r2: calculateR2(samples),
    bias: calculateBias(samples),
    count: samples.length,
  };
}

/**
 * Calculate metrics by forecast horizon
 */
export function calculateMetricsByHorizon(
  samples: ComparisonSample[]
): Map<number, ValidationMetrics> {
  // Group samples by hours ahead
  const groups = new Map<number, ComparisonSample[]>();

  for (const sample of samples) {
    const hoursAhead = Math.round(
      (sample.timestamp.getTime() - sample.timestamp.getTime()) / 3600000
    );

    const existing = groups.get(hoursAhead) || [];
    existing.push(sample);
    groups.set(hoursAhead, existing);
  }

  // Calculate metrics for each group
  const metricsByHorizon = new Map<number, ValidationMetrics>();

  for (const [horizon, groupSamples] of groups) {
    metricsByHorizon.set(horizon, calculateAllMetrics(groupSamples));
  }

  return metricsByHorizon;
}

/**
 * Calculate correlation coefficient (Pearson's r)
 */
export function calculateCorrelation(samples: ComparisonSample[]): number {
  if (samples.length === 0) return 0;

  const n = samples.length;

  // Calculate means
  const meanPredicted =
    samples.reduce((sum, s) => sum + s.predicted, 0) / n;
  const meanActual = samples.reduce((sum, s) => sum + s.actual, 0) / n;

  // Calculate standard deviations and covariance
  let covariance = 0;
  let sdPredicted = 0;
  let sdActual = 0;

  for (const sample of samples) {
    const diffPredicted = sample.predicted - meanPredicted;
    const diffActual = sample.actual - meanActual;

    covariance += diffPredicted * diffActual;
    sdPredicted += diffPredicted * diffPredicted;
    sdActual += diffActual * diffActual;
  }

  covariance /= n;
  sdPredicted = Math.sqrt(sdPredicted / n);
  sdActual = Math.sqrt(sdActual / n);

  // Calculate correlation
  if (sdPredicted === 0 || sdActual === 0) return 0;
  return covariance / (sdPredicted * sdActual);
}

/**
 * Print metrics in a human-readable format
 */
export function printMetrics(metrics: ValidationMetrics): string {
  return `
Validation Metrics:
  MAE:   ${metrics.mae.toFixed(2)} µg/m³
  RMSE:  ${metrics.rmse.toFixed(2)} µg/m³
  R²:    ${metrics.r2.toFixed(3)}
  Bias:  ${metrics.bias.toFixed(2)} µg/m³
  Count: ${metrics.count}
  `.trim();
}

/**
 * Compare two models based on metrics
 */
export function compareModels(
  model1: ValidationMetrics,
  model2: ValidationMetrics
): {
  betterModel: 1 | 2 | 'tie';
  improvements: {
    mae: number; // percentage
    rmse: number;
    r2: number;
  };
} {
  const maeImprovement = ((model1.mae - model2.mae) / model1.mae) * 100;
  const rmseImprovement = ((model1.rmse - model2.rmse) / model1.rmse) * 100;
  const r2Improvement = ((model2.r2 - model1.r2) / Math.abs(model1.r2)) * 100;

  // Determine better model (lower MAE/RMSE and higher R² are better)
  const model2Wins =
    (model2.mae < model1.mae ? 1 : 0) +
    (model2.rmse < model1.rmse ? 1 : 0) +
    (model2.r2 > model1.r2 ? 1 : 0);

  const model1Wins =
    (model1.mae < model2.mae ? 1 : 0) +
    (model1.rmse < model2.rmse ? 1 : 0) +
    (model1.r2 > model2.r2 ? 1 : 0);

  let betterModel: 1 | 2 | 'tie' = 'tie';
  if (model2Wins >= 2) betterModel = 2;
  else if (model1Wins >= 2) betterModel = 1;
  // else it's a tie (both win 1 or less, or both equal)

  return {
    betterModel,
    improvements: {
      mae: maeImprovement,
      rmse: rmseImprovement,
      r2: r2Improvement,
    },
  };
}

/**
 * Tests for validation metrics
 */

import { describe, it, expect } from 'vitest';
import {
  calculateMAE,
  calculateRMSE,
  calculateR2,
  calculateBias,
  calculateAllMetrics,
  compareModels,
} from './metrics';
import type { ComparisonSample } from '../types';

const createSamples = (): ComparisonSample[] => [
  {
    predicted: 25,
    actual: 23,
    timestamp: new Date('2024-01-01T12:00:00Z'),
    location: { latitude: 34, longitude: -118 },
    pollutant: 'PM25',
  },
  {
    predicted: 30,
    actual: 32,
    timestamp: new Date('2024-01-01T13:00:00Z'),
    location: { latitude: 34, longitude: -118 },
    pollutant: 'PM25',
  },
  {
    predicted: 20,
    actual: 19,
    timestamp: new Date('2024-01-01T14:00:00Z'),
    location: { latitude: 34, longitude: -118 },
    pollutant: 'PM25',
  },
];

describe('calculateMAE', () => {
  it('should calculate mean absolute error', () => {
    const samples = createSamples();
    const mae = calculateMAE(samples);

    // MAE = (|25-23| + |30-32| + |20-19|) / 3 = (2 + 2 + 1) / 3 = 1.67
    expect(mae).toBeCloseTo(1.67, 2);
  });

  it('should return 0 for empty samples', () => {
    expect(calculateMAE([])).toBe(0);
  });

  it('should return 0 for perfect predictions', () => {
    const samples: ComparisonSample[] = [
      {
        predicted: 25,
        actual: 25,
        timestamp: new Date(),
        location: { latitude: 34, longitude: -118 },
        pollutant: 'PM25',
      },
    ];

    expect(calculateMAE(samples)).toBe(0);
  });
});

describe('calculateRMSE', () => {
  it('should calculate root mean squared error', () => {
    const samples = createSamples();
    const rmse = calculateRMSE(samples);

    // RMSE = sqrt((4 + 4 + 1) / 3) = sqrt(3) ≈ 1.73
    expect(rmse).toBeCloseTo(1.73, 2);
  });

  it('should return 0 for empty samples', () => {
    expect(calculateRMSE([])).toBe(0);
  });
});

describe('calculateR2', () => {
  it('should calculate R² coefficient', () => {
    const samples = createSamples();
    const r2 = calculateR2(samples);

    expect(r2).toBeGreaterThan(0);
    expect(r2).toBeLessThanOrEqual(1);
  });

  it('should return 1 for perfect predictions', () => {
    const samples: ComparisonSample[] = [
      {
        predicted: 25,
        actual: 25,
        timestamp: new Date(),
        location: { latitude: 34, longitude: -118 },
        pollutant: 'PM25',
      },
      {
        predicted: 30,
        actual: 30,
        timestamp: new Date(),
        location: { latitude: 34, longitude: -118 },
        pollutant: 'PM25',
      },
    ];

    expect(calculateR2(samples)).toBeCloseTo(1, 5);
  });
});

describe('calculateBias', () => {
  it('should calculate mean bias', () => {
    const samples = createSamples();
    const bias = calculateBias(samples);

    // Bias = ((25-23) + (30-32) + (20-19)) / 3 = (2 - 2 + 1) / 3 = 0.33
    expect(bias).toBeCloseTo(0.33, 2);
  });

  it('should be positive when overestimating', () => {
    const samples: ComparisonSample[] = [
      {
        predicted: 30,
        actual: 25,
        timestamp: new Date(),
        location: { latitude: 34, longitude: -118 },
        pollutant: 'PM25',
      },
    ];

    expect(calculateBias(samples)).toBeGreaterThan(0);
  });

  it('should be negative when underestimating', () => {
    const samples: ComparisonSample[] = [
      {
        predicted: 20,
        actual: 25,
        timestamp: new Date(),
        location: { latitude: 34, longitude: -118 },
        pollutant: 'PM25',
      },
    ];

    expect(calculateBias(samples)).toBeLessThan(0);
  });
});

describe('calculateAllMetrics', () => {
  it('should calculate all metrics at once', () => {
    const samples = createSamples();
    const metrics = calculateAllMetrics(samples);

    expect(metrics.mae).toBeCloseTo(1.67, 2);
    expect(metrics.rmse).toBeCloseTo(1.73, 2);
    expect(metrics.r2).toBeGreaterThan(0);
    expect(metrics.bias).toBeCloseTo(0.33, 2);
    expect(metrics.count).toBe(3);
  });
});

describe('compareModels', () => {
  it('should identify better model', () => {
    const model1 = {
      mae: 10,
      rmse: 15,
      r2: 0.7,
      bias: 2,
      count: 100,
    };

    const model2 = {
      mae: 8,
      rmse: 12,
      r2: 0.8,
      bias: 1,
      count: 100,
    };

    const comparison = compareModels(model1, model2);

    expect(comparison.betterModel).toBe(2);
    expect(comparison.improvements.mae).toBeGreaterThan(0);
    expect(comparison.improvements.rmse).toBeGreaterThan(0);
  });

  it('should detect tie', () => {
    const model1 = {
      mae: 10,
      rmse: 15,
      r2: 0.7,
      bias: 2,
      count: 100,
    };

    const model2 = {
      mae: 10,
      rmse: 15,
      r2: 0.7,
      bias: 2,
      count: 100,
    };

    const comparison = compareModels(model1, model2);

    expect(comparison.betterModel).toBe('tie');
  });
});

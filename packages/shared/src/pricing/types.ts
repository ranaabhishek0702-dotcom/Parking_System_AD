import type { VehicleType, ZoneType } from '../constants.js';

export interface PricingGuardrailsConfig {
  maxChangePerIntervalPercent: number; // e.g. 0.25 (max ±25%)
  hardCapMultiplier: number;           // e.g. 3.0 (max 3x base rate)
  floorMultiplier: number;             // e.g. 0.5 (min 0.5x base rate)
  hospitalMaxMultiplier: number;       // e.g. 1.0 (never surge near hospitals)
  schoolMaxMultiplier: number;         // e.g. 1.0 during school hours
  targetOccupancyMin: number;          // e.g. 0.70
  targetOccupancyMax: number;          // e.g. 0.85
  emaSmoothingFactor: number;          // e.g. 0.35 (alpha)
}

export interface PricingEvaluationInput {
  zoneId: string;
  zoneType: ZoneType;
  baseHourlyRate: number; // in ₹ INR
  currentOccupancyRate: number; // 0.0 to 1.0
  forecastOccupancy45Min: number; // 0.0 to 1.0 (proactive lookahead)
  previousEffectiveRate?: number; // for EMA smoothing
  timestamp?: number; // epoch ms
  activeEventName?: string;
  eventUpliftPercent?: number; // e.g. +0.30 for IPL match
  vehicleType?: VehicleType; // default: 'car'
  isResident?: boolean;
  durationMinutes?: number;
}

export interface PricingFactorBreakdown {
  baseRate: number;
  demandFactor: number;     // e.g. 1.22
  timeFactor: number;       // e.g. 1.10
  eventFactor: number;      // e.g. 1.35
  zoneTypeFactor: number;   // e.g. 1.05
  rawCalculatedRate: number;
  smoothedRate: number;
  finalEffectiveRate: number; // clamped to integer ₹
}

export interface PricingEvaluationResult {
  zoneId: string;
  zoneType: ZoneType;
  effectiveRate: number; // Final billed ₹ per hour
  currency: 'INR';
  breakdown: PricingFactorBreakdown;
  guardrailsFired: string[];
  exemptionsApplied: string[];
  proactiveAdjustmentApplied: boolean;
  demandIndex: number;
  humanReason: string;
  timestamp: number;
}

export interface WhatIfSimulationResult {
  zoneId: string;
  priceChangePercent: number; // e.g. +20%
  originalRate: number;
  newRate: number;
  elasticityUsed: number;
  projectedOccupancy: {
    baseline: number;
    projected: number;
    p10: number; // lower bound
    p90: number; // upper bound
  };
  projectedHourlyRevenue: {
    baseline: number;
    projected: number;
    deltaPercent: number;
  };
  projectedTurnoverDeltaPercent: number;
  horizonHours: number;
  assumptions: string[];
}

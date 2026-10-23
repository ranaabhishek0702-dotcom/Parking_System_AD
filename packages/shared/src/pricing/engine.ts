import type {
  PricingGuardrailsConfig,
  PricingEvaluationInput,
  PricingEvaluationResult
} from './types.js';

export const DEFAULT_GUARDRAILS: PricingGuardrailsConfig = {
  maxChangePerIntervalPercent: 0.25, // Max ±25% step change per 15-min interval
  hardCapMultiplier: 3.0,            // City-mandated hard cap (3x base rate)
  floorMultiplier: 0.5,              // Minimum price floor (50% of base rate)
  hospitalMaxMultiplier: 1.0,        // Strict equity ceiling for hospital zones
  schoolMaxMultiplier: 1.0,          // Strict equity ceiling during school hours
  targetOccupancyMin: 0.70,          // Lower target boundary (70%)
  targetOccupancyMax: 0.85,          // Upper target boundary (85%)
  emaSmoothingFactor: 0.35           // Alpha parameter for exponential smoothing
};

export function calculateDynamicPrice(
  input: PricingEvaluationInput,
  config: PricingGuardrailsConfig = DEFAULT_GUARDRAILS
): PricingEvaluationResult {
  const {
    zoneId,
    zoneType,
    baseHourlyRate,
    currentOccupancyRate,
    forecastOccupancy45Min,
    previousEffectiveRate,
    timestamp = Date.now(),
    activeEventName,
    eventUpliftPercent = 0,
    vehicleType = 'car',
    isResident = false,
    durationMinutes
  } = input;

  const date = new Date(timestamp);
  const hourOfDay = date.getHours();
  const minuteOfHour = date.getMinutes();
  const timeFraction = hourOfDay + minuteOfHour / 60;

  const guardrailsFired: string[] = [];
  const exemptionsApplied: string[] = [];

  // ========================================================
  // 1. Proactive Demand Multiplier Calculation
  // ========================================================
  const targetMid = (config.targetOccupancyMin + config.targetOccupancyMax) / 2; // e.g. 0.775
  const currDelta = currentOccupancyRate - targetMid;
  const foreDelta = forecastOccupancy45Min - targetMid;

  // Asymmetric penalty: higher slope when exceeding target, lower when underutilized
  const g = (delta: number) => (delta > 0 ? 2.2 * delta : 1.2 * delta);

  // 60% weight on current reality, 40% weight on 45-min forecast lookahead
  const rawDemandMultiplier = 1.0 + 0.6 * g(currDelta) + 0.4 * g(foreDelta);
  const demandFactor = Math.max(0.5, Math.min(2.5, Number(rawDemandMultiplier.toFixed(4))));

  const proactiveAdjustmentApplied = (forecastOccupancy45Min - currentOccupancyRate) >= 0.08;

  // ========================================================
  // 2. Diurnal Time Factor
  // ========================================================
  let timeFactor = 1.0;
  // Morning peak: 8:30 AM - 11:00 AM
  if (timeFraction >= 8.5 && timeFraction <= 11.0) {
    timeFactor = 1.15;
  }
  // Evening peak: 5:30 PM - 9:00 PM
  else if (timeFraction >= 17.5 && timeFraction <= 21.0) {
    timeFactor = 1.20;
  }
  // Night lull: 11:00 PM - 6:00 AM
  else if (timeFraction >= 23.0 || timeFraction <= 6.0) {
    timeFactor = 0.75;
  }

  // ========================================================
  // 3. Event Multiplier
  // ========================================================
  const eventFactor = Math.max(0.6, Math.min(2.0, Number((1.0 + eventUpliftPercent).toFixed(4))));

  // ========================================================
  // 4. Zone Type Baseline Factor
  // ========================================================
  let zoneTypeFactor = 1.0;
  if (zoneType === 'office') {
    zoneTypeFactor = timeFraction >= 9 && timeFraction <= 18 ? 1.05 : 0.85;
  } else if (zoneType === 'market') {
    zoneTypeFactor = timeFraction >= 12 && timeFraction <= 22 ? 1.10 : 0.90;
  } else if (zoneType === 'transit') {
    zoneTypeFactor = 1.00;
  } else if (zoneType === 'hospital') {
    zoneTypeFactor = 0.90; // Compassionate baseline
  } else if (zoneType === 'school') {
    zoneTypeFactor = 0.95;
  }

  // ========================================================
  // 5. Raw Price Multiplier Composition
  // ========================================================
  const combinedMultiplier = demandFactor * timeFactor * eventFactor * zoneTypeFactor;
  const rawCalculatedRate = baseHourlyRate * combinedMultiplier;

  // ========================================================
  // 6. EMA Smoothing
  // ========================================================
  let smoothedRate = rawCalculatedRate;
  if (previousEffectiveRate && previousEffectiveRate > 0) {
    smoothedRate =
      config.emaSmoothingFactor * rawCalculatedRate +
      (1 - config.emaSmoothingFactor) * previousEffectiveRate;
  }

  let rate = smoothedRate;

  // ========================================================
  // 7. Guardrails Enforcement
  // ========================================================

  // (a) Max Interval Delta (e.g. max ±25% step from previous rate)
  if (previousEffectiveRate && previousEffectiveRate > 0) {
    const maxAllowed = previousEffectiveRate * (1 + config.maxChangePerIntervalPercent);
    const minAllowed = previousEffectiveRate * (1 - config.maxChangePerIntervalPercent);
    if (rate > maxAllowed) {
      rate = maxAllowed;
      guardrailsFired.push('MAX_INTERVAL_SURGE_CLAMP');
    } else if (rate < minAllowed) {
      rate = minAllowed;
      guardrailsFired.push('MAX_INTERVAL_DROP_CLAMP');
    }
  }

  // (b) Hospital Equity Protection: strictly capped at base rate
  if (zoneType === 'hospital') {
    const hospitalCap = baseHourlyRate * config.hospitalMaxMultiplier;
    if (rate > hospitalCap) {
      rate = hospitalCap;
      guardrailsFired.push('HOSPITAL_EQUITY_CAP');
    }
  }

  // (c) School Zone Drop-off Protection (7:30-9:00 AM, 1:30-3:00 PM)
  if (
    zoneType === 'school' &&
    ((timeFraction >= 7.5 && timeFraction <= 9.0) ||
      (timeFraction >= 13.5 && timeFraction <= 15.0))
  ) {
    const schoolCap = baseHourlyRate * config.schoolMaxMultiplier;
    if (rate > schoolCap) {
      rate = schoolCap;
      guardrailsFired.push('SCHOOL_DROP_OFF_CAP');
    }
  }

  // (d) Hard City-Mandated Cap (e.g. 3x base rate)
  const hardCap = baseHourlyRate * config.hardCapMultiplier;
  if (rate > hardCap) {
    rate = hardCap;
    guardrailsFired.push('HARD_CITY_CEILING');
  }

  // (e) Minimum Price Floor (e.g. 0.5x base rate)
  const floorRate = baseHourlyRate * config.floorMultiplier;
  if (rate < floorRate) {
    rate = floorRate;
    guardrailsFired.push('MIN_PRICE_FLOOR');
  }

  // ========================================================
  // 8. Vehicle & Civic Exemptions
  // ========================================================
  if (vehicleType === 'handicapped') {
    rate = 0;
    exemptionsApplied.push('HANDICAPPED_STATUTORY_EXEMPTION');
  } else if (vehicleType === 'ev') {
    rate = rate * 0.75; // 25% green mobility concession
    exemptionsApplied.push('EV_GREEN_MOBILITY_DISCOUNT');
  }

  if (isResident && rate > 0) {
    rate = rate * 0.60; // 40% residential permit discount
    exemptionsApplied.push('RESIDENT_PERMIT_CONCESSION');
  }

  // Short-stay grace period (e.g. <= 15 mins for quick pickup/drop)
  if (durationMinutes !== undefined && durationMinutes <= 15) {
    rate = 0;
    exemptionsApplied.push('SHORT_STAY_GRACE_PERIOD');
  }

  // Round to nearest whole ₹ rupee
  const finalEffectiveRate = Math.round(rate);

  // ========================================================
  // 9. Explainability & Human Reason Synthesis
  // ========================================================
  const reasonParts: string[] = [];

  const currOccPct = Math.round(currentOccupancyRate * 100);
  const foreOccPct = Math.round(forecastOccupancy45Min * 100);

  if (currOccPct > 85) {
    reasonParts.push(`Acute current occupancy at ${currOccPct}% (+${Math.round((demandFactor - 1) * 100)}%)`);
  } else if (currOccPct < 70) {
    reasonParts.push(`Low occupancy at ${currOccPct}% (-${Math.round((1 - demandFactor) * 100)}% discount to drive turnover)`);
  } else {
    reasonParts.push(`Occupancy in optimal target band at ${currOccPct}%`);
  }

  if (proactiveAdjustmentApplied) {
    reasonParts.push(`Proactive surge anticipated at ${foreOccPct}% in 45m`);
  }

  if (eventUpliftPercent > 0 && activeEventName) {
    reasonParts.push(`Event '${activeEventName}' (+${Math.round(eventUpliftPercent * 100)}%)`);
  }

  if (guardrailsFired.includes('HOSPITAL_EQUITY_CAP')) {
    reasonParts.push(`Protected by Hospital Equity Rule (capped at ₹${baseHourlyRate}/hr)`);
  } else if (guardrailsFired.includes('MAX_INTERVAL_SURGE_CLAMP')) {
    reasonParts.push(`Capped by max interval delta (+${Math.round(config.maxChangePerIntervalPercent * 100)}%)`);
  } else if (guardrailsFired.includes('HARD_CITY_CEILING')) {
    reasonParts.push(`Clamped at municipal hard cap of ₹${hardCap}/hr`);
  }

  if (exemptionsApplied.length > 0) {
    reasonParts.push(`Exemptions applied: ${exemptionsApplied.join(', ')}`);
  }

  const humanReason = `${reasonParts.join('. ')}. Effective tariff: ₹${finalEffectiveRate}/hr.`;

  return {
    zoneId,
    zoneType,
    effectiveRate: finalEffectiveRate,
    currency: 'INR',
    breakdown: {
      baseRate: baseHourlyRate,
      demandFactor,
      timeFactor,
      eventFactor,
      zoneTypeFactor,
      rawCalculatedRate: Number(rawCalculatedRate.toFixed(2)),
      smoothedRate: Number(smoothedRate.toFixed(2)),
      finalEffectiveRate
    },
    guardrailsFired,
    exemptionsApplied,
    proactiveAdjustmentApplied,
    demandIndex: Number(combinedMultiplier.toFixed(2)),
    humanReason,
    timestamp
  };
}

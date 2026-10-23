import assert from 'node:assert/strict';
import { calculateDynamicPrice } from '@parksense/shared';

describe('Pricing Engine: Dynamic Tariffs, Guardrails & Equity Caps', () => {
  const baseRate = 40;

  // 1. Target Occupancy Band Responses
  it('discounts tariff below base rate when occupancy is under target (<70%)', () => {
    const result = calculateDynamicPrice({
      zoneId: 'delhi-cp-inner',
      zoneType: 'market',
      baseHourlyRate: baseRate,
      currentOccupancyRate: 0.40,
      forecastOccupancy45Min: 0.42,
      timestamp: new Date('2026-10-23T14:00:00Z').getTime()
    });

    assert.ok(
      result.effectiveRate < baseRate,
      `Expected discounted rate < ₹40, got ₹${result.effectiveRate}`
    );
    assert.ok(
      result.breakdown.demandFactor < 1.0,
      `Expected demandFactor < 1.0, got ${result.breakdown.demandFactor}`
    );
    assert.match(result.humanReason, /Low occupancy/);
  });

  it('keeps tariff balanced when occupancy is inside optimal target band (70-85%)', () => {
    const result = calculateDynamicPrice({
      zoneId: 'delhi-cp-inner',
      zoneType: 'transit',
      baseHourlyRate: baseRate,
      currentOccupancyRate: 0.77,
      forecastOccupancy45Min: 0.78,
      timestamp: new Date('2026-10-23T12:00:00Z').getTime()
    });

    assert.ok(
      result.breakdown.demandFactor >= 0.95 && result.breakdown.demandFactor <= 1.05,
      `Demand factor should be neutral near target midpoint, got ${result.breakdown.demandFactor}`
    );
  });

  it('increases tariff when occupancy exceeds upper target (>85%)', () => {
    const result = calculateDynamicPrice({
      zoneId: 'delhi-cp-inner',
      zoneType: 'market',
      baseHourlyRate: baseRate,
      currentOccupancyRate: 0.94,
      forecastOccupancy45Min: 0.95,
      timestamp: new Date('2026-10-23T19:00:00+05:30').getTime()
    });

    assert.ok(
      result.effectiveRate > baseRate,
      `Expected surged rate > ₹40, got ₹${result.effectiveRate}`
    );
    assert.ok(
      result.breakdown.demandFactor > 1.25,
      `Expected high demand factor, got ${result.breakdown.demandFactor}`
    );
  });

  // 2. Hospital & School Equity Protection Invariants
  it('STRICT EQUITY: Never surges near hospital zones even under 100% occupancy & event spike', () => {
    const hospitalBaseRate = 20;
    const result = calculateDynamicPrice({
      zoneId: 'delhi-aiims-emergency',
      zoneType: 'hospital',
      baseHourlyRate: hospitalBaseRate,
      currentOccupancyRate: 0.99,
      forecastOccupancy45Min: 1.0,
      activeEventName: 'Mass Outpatient Rush',
      eventUpliftPercent: 0.50,
      timestamp: new Date('2026-10-23T10:00:00+05:30').getTime()
    });

    assert.equal(
      result.effectiveRate,
      hospitalBaseRate,
      `Hospital tariff MUST be capped at base rate ₹${hospitalBaseRate}, got ₹${result.effectiveRate}`
    );
    assert.ok(
      result.guardrailsFired.includes('HOSPITAL_EQUITY_CAP'),
      `HOSPITAL_EQUITY_CAP guardrail must fire. Fired: ${result.guardrailsFired.join(', ')}`
    );
    assert.match(result.humanReason, /Hospital Equity Rule/);
  });

  it('STRICT EQUITY: Caps school zone rates at base rate during morning drop-off hours', () => {
    const schoolBaseRate = 25;
    // 8:15 AM is inside drop-off window (7:30-9:00 AM)
    const schoolMorningTime = new Date('2026-10-23T08:15:00+05:30').getTime();

    const result = calculateDynamicPrice({
      zoneId: 'delhi-school-dps',
      zoneType: 'school',
      baseHourlyRate: schoolBaseRate,
      currentOccupancyRate: 0.92,
      forecastOccupancy45Min: 0.94,
      timestamp: schoolMorningTime
    });

    assert.ok(
      result.effectiveRate <= schoolBaseRate,
      `School zone rate during morning drop-off should be capped at ₹${schoolBaseRate}, got ₹${result.effectiveRate}`
    );
    assert.ok(result.guardrailsFired.includes('SCHOOL_DROP_OFF_CAP'));
  });

  // 3. Civic & Vehicle Exemptions
  it('applies statutory 100% exemption for handicapped bays (₹0 rate)', () => {
    const result = calculateDynamicPrice({
      zoneId: 'delhi-cp-inner',
      zoneType: 'market',
      baseHourlyRate: 50,
      currentOccupancyRate: 0.95,
      forecastOccupancy45Min: 0.98,
      vehicleType: 'handicapped'
    });

    assert.equal(result.effectiveRate, 0);
    assert.ok(result.exemptionsApplied.includes('HANDICAPPED_STATUTORY_EXEMPTION'));
  });

  it('applies 25% green mobility concession for EV vehicles', () => {
    const input = {
      zoneId: 'delhi-cp-inner',
      zoneType: 'office' as const,
      baseHourlyRate: 40,
      currentOccupancyRate: 0.75,
      forecastOccupancy45Min: 0.75,
      timestamp: new Date('2026-10-23T12:00:00Z').getTime()
    };

    const carResult = calculateDynamicPrice({ ...input, vehicleType: 'car' });
    const evResult = calculateDynamicPrice({ ...input, vehicleType: 'ev' });

    assert.ok(
      evResult.effectiveRate < carResult.effectiveRate,
      `EV rate ₹${evResult.effectiveRate} should be discounted vs Car ₹${carResult.effectiveRate}`
    );
    assert.ok(evResult.exemptionsApplied.includes('EV_GREEN_MOBILITY_DISCOUNT'));
  });

  it('provides ₹0 grace rate for short errands (duration <= 15 minutes)', () => {
    const result = calculateDynamicPrice({
      zoneId: 'delhi-cp-inner',
      zoneType: 'market',
      baseHourlyRate: 40,
      currentOccupancyRate: 0.85,
      forecastOccupancy45Min: 0.85,
      durationMinutes: 12
    });

    assert.equal(result.effectiveRate, 0);
    assert.ok(result.exemptionsApplied.includes('SHORT_STAY_GRACE_PERIOD'));
  });

  // 4. City Hard Cap & Floor
  it('respects hard city ceiling (3.0x base rate)', () => {
    const result = calculateDynamicPrice({
      zoneId: 'delhi-cp-inner',
      zoneType: 'market',
      baseHourlyRate: 50,
      currentOccupancyRate: 1.0,
      forecastOccupancy45Min: 1.0,
      eventUpliftPercent: 1.0, // +100% surge
      timestamp: new Date('2026-10-23T19:00:00+05:30').getTime()
    });

    const maxCap = 50 * 3.0; // ₹150
    assert.ok(
      result.effectiveRate <= maxCap,
      `Rate ₹${result.effectiveRate} must never exceed hard cap ₹${maxCap}`
    );
  });

  it('respects minimum price floor (0.5x base rate)', () => {
    const result = calculateDynamicPrice({
      zoneId: 'delhi-cp-inner',
      zoneType: 'market',
      baseHourlyRate: 40,
      currentOccupancyRate: 0.05,
      forecastOccupancy45Min: 0.05,
      timestamp: new Date('2026-10-23T03:00:00+05:30').getTime() // late night
    });

    const minFloor = 40 * 0.5; // ₹20
    assert.ok(
      result.effectiveRate >= minFloor,
      `Rate ₹${result.effectiveRate} must never drop below floor ₹${minFloor}`
    );
  });
});

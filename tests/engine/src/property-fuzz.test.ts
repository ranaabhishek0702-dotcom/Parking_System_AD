import assert from 'node:assert/strict';
import { calculateDynamicPrice, ZONE_TYPES, VEHICLE_TYPES, type ZoneType, type VehicleType } from '@parksense/shared';

describe('Property-Based & Fuzz Testing: Mathematical Invariant Guarantees', () => {
  it('FUZZ TEST: Invariants hold across 1,000 randomized and extreme edge inputs', () => {
    const ITERATIONS = 1000;

    for (let i = 0; i < ITERATIONS; i++) {
      // Generate randomized inputs (including negative, zero, and out-of-bound edge values)
      const baseHourlyRate = Math.floor(Math.random() * 180 + 10); // 10 to 190
      const currentOccupancyRate = Math.random() * 2.0 - 0.5; // -0.5 to 1.5
      const forecastOccupancy45Min = Math.random() * 2.0 - 0.5;
      const previousEffectiveRate = Math.random() > 0.3 ? Math.floor(Math.random() * 250) : undefined;
      const eventUpliftPercent = (Math.random() - 0.3) * 2.5; // -0.75 to 1.75
      const zoneType: ZoneType = ZONE_TYPES[Math.floor(Math.random() * ZONE_TYPES.length)];
      const vehicleType: VehicleType = VEHICLE_TYPES[Math.floor(Math.random() * VEHICLE_TYPES.length)];
      const isResident = Math.random() > 0.5;
      const durationMinutes = Math.random() > 0.5 ? Math.floor(Math.random() * 180) : undefined;
      const timestamp = Date.now() + Math.floor((Math.random() - 0.5) * 86400000 * 7);

      const result = calculateDynamicPrice({
        zoneId: `zone-fuzz-${i}`,
        zoneType,
        baseHourlyRate,
        currentOccupancyRate,
        forecastOccupancy45Min,
        previousEffectiveRate,
        eventUpliftPercent,
        vehicleType,
        isResident,
        durationMinutes,
        timestamp
      });

      // INVARIANT 1: Finite, non-negative integer
      assert.ok(
        Number.isInteger(result.effectiveRate),
        `Rate must be an integer, got ${result.effectiveRate}`
      );
      assert.ok(
        result.effectiveRate >= 0,
        `Rate must be non-negative, got ${result.effectiveRate}`
      );
      assert.ok(
        !Number.isNaN(result.effectiveRate),
        'Rate must not be NaN'
      );

      // INVARIANT 2: Never exceeds Hard City Ceiling (3.0x base rate)
      const hardCap = baseHourlyRate * 3.0;
      assert.ok(
        result.effectiveRate <= hardCap,
        `Rate ₹${result.effectiveRate} exceeded hard ceiling ₹${hardCap}`
      );

      // INVARIANT 3: Hospital Equity Invariant — Hospital rate NEVER exceeds base rate
      if (zoneType === 'hospital') {
        assert.ok(
          result.effectiveRate <= baseHourlyRate,
          `Hospital zone rate ₹${result.effectiveRate} exceeded base rate ₹${baseHourlyRate} on iteration ${i}`
        );
      }

      // INVARIANT 4: Handicapped bays are 100% free
      if (vehicleType === 'handicapped') {
        assert.equal(
          result.effectiveRate,
          0,
          `Handicapped bay must be free, got ₹${result.effectiveRate}`
        );
      }

      // INVARIANT 5: Minimum price floor (if no exemptions applied)
      if (
        vehicleType !== 'handicapped' &&
        vehicleType !== 'ev' &&
        !isResident &&
        (durationMinutes === undefined || durationMinutes > 15)
      ) {
        const floor = baseHourlyRate * 0.5;
        // In the presence of max interval step constraint from a lower previous rate,
        // it can be bounded by max drop clamp, otherwise it respects floor
        if (!result.guardrailsFired.includes('MAX_INTERVAL_DROP_CLAMP')) {
          assert.ok(
            result.effectiveRate >= Math.floor(floor) - 1, // account for rounding
            `Rate ₹${result.effectiveRate} dropped below minimum floor ₹${floor}`
          );
        }
      }

      // INVARIANT 6: Human reason must always be a non-empty string
      assert.ok(
        typeof result.humanReason === 'string' && result.humanReason.length > 10,
        'Human reason must be a descriptive string'
      );
    }
  });
});

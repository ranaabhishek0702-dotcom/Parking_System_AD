import assert from 'node:assert/strict';
import { calculateDynamicPrice } from '@parksense/shared';

describe('IPL Match Night Surge Simulation: Proactive Price Anticipation', () => {
  const baseRate = 40; // ₹40/hr for Connaught Place / Delhi Transit Hub

  it('ASSERT: Price rises proactively BEFORE occupancy peaks on IPL match night', () => {
    // Timeline of events leading up to a 7:30 PM (19:30) match:
    const timeline = [
      {
        timeLabel: '15:00 (Normal afternoon)',
        time: '2026-10-23T15:00:00+05:30',
        currentOccupancy: 0.55,
        forecastOccupancy45Min: 0.58,
        activeEvent: undefined,
        eventUplift: 0.0
      },
      {
        timeLabel: '17:00 (Pre-match transit build-up, 2.5h before game)',
        time: '2026-10-23T17:00:00+05:30',
        currentOccupancy: 0.64, // Still moderate (<70% target threshold!)
        forecastOccupancy45Min: 0.88, // Surge forecast in next 45 mins!
        activeEvent: 'IPL Match: Delhi Capitals vs Mumbai Indians',
        eventUplift: 0.35
      },
      {
        timeLabel: '17:45 (Immediate stadium transit rush)',
        time: '2026-10-23T17:45:00+05:30',
        currentOccupancy: 0.82,
        forecastOccupancy45Min: 0.94,
        activeEvent: 'IPL Match: Delhi Capitals vs Mumbai Indians',
        eventUplift: 0.35
      },
      {
        timeLabel: '19:15 (Match kick-off, stadium at maximum capacity)',
        time: '2026-10-23T19:15:00+05:30',
        currentOccupancy: 0.97, // Actual occupancy peak
        forecastOccupancy45Min: 0.98,
        activeEvent: 'IPL Match: Delhi Capitals vs Mumbai Indians',
        eventUplift: 0.35
      }
    ];

    let previousRate = baseRate;
    const evaluatedResults = [];

    for (const step of timeline) {
      const result = calculateDynamicPrice({
        zoneId: 'delhi-cp-inner',
        zoneType: 'transit',
        baseHourlyRate: baseRate,
        currentOccupancyRate: step.currentOccupancy,
        forecastOccupancy45Min: step.forecastOccupancy45Min,
        previousEffectiveRate: previousRate,
        timestamp: new Date(step.time).getTime(),
        activeEventName: step.activeEvent,
        eventUpliftPercent: step.eventUplift
      });

      evaluatedResults.push({
        ...step,
        result
      });

      previousRate = result.effectiveRate;
    }

    const t1500 = evaluatedResults[0];
    const t1700 = evaluatedResults[1];
    const t1915 = evaluatedResults[3];

    // 1. At 15:00, price should be steady near baseline
    assert.ok(
      t1500.result.effectiveRate <= baseRate,
      `At 15:00 rate should be near baseline ₹40, got ₹${t1500.result.effectiveRate}`
    );

    // 2. CRUCIAL ASSERTION: At 17:00, current occupancy is only 64% (well below the 70% congestion threshold),
    // BUT price has ALREADY risen proactively because forecast lookahead detected the IPL spike!
    assert.ok(
      t1700.currentOccupancy < 0.70,
      `Occupancy at 17:00 must be below target lower threshold (<70%), was ${t1700.currentOccupancy}`
    );
    assert.ok(
      t1700.result.effectiveRate > baseRate,
      `Price at 17:00 (₹${t1700.result.effectiveRate}) MUST rise above base rate ₹${baseRate} anticipating the surge!`
    );
    assert.equal(
      t1700.result.proactiveAdjustmentApplied,
      true,
      'Proactive adjustment flag must be true at 17:00'
    );
    assert.match(
      t1700.result.humanReason,
      /Proactive surge anticipated/,
      'Reason string should explicitly explain the proactive surge lookahead'
    );

    // 3. Peak price at 19:15 is higher than 17:00 and clamped by city guardrail
    assert.ok(
      t1915.result.effectiveRate >= t1700.result.effectiveRate,
      `19:15 rate (₹${t1915.result.effectiveRate}) should be >= 17:00 rate (₹${t1700.result.effectiveRate})`
    );
  });
});

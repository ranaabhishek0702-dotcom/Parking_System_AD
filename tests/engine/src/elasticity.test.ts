import assert from 'node:assert/strict';
import { simulateWhatIf } from '@parksense/shared';

describe('What-If Elasticity Simulator: Demand Shifts & Revenue Deltas', () => {
  it('projects reduced occupancy and increased slot turnover when tariff is raised (+25%)', () => {
    const result = simulateWhatIf({
      zoneId: 'delhi-cp-inner',
      zoneType: 'market',
      baseRate: 40,
      currentOccupancy: 0.90,
      totalBays: 50,
      priceChangePercent: 0.25, // +25%
      horizonHours: 4
    });

    assert.equal(result.originalRate, 40);
    assert.equal(result.newRate, 50); // 40 * 1.25
    assert.ok(
      result.projectedOccupancy.projected < result.projectedOccupancy.baseline,
      `Projected occupancy (${result.projectedOccupancy.projected}) should be lower than baseline (${result.projectedOccupancy.baseline})`
    );
    assert.ok(
      result.projectedTurnoverDeltaPercent > 0,
      `Turnover should increase when prices rise and overstay drops, got ${result.projectedTurnoverDeltaPercent}%`
    );
    assert.ok(
      result.projectedOccupancy.p10 <= result.projectedOccupancy.projected &&
      result.projectedOccupancy.projected <= result.projectedOccupancy.p90,
      'Projected occupancy must lie between p10 and p90 uncertainty bounds'
    );
  });

  it('projects increased occupancy when tariff is discounted (-30%)', () => {
    const result = simulateWhatIf({
      zoneId: 'delhi-karol-bagh',
      zoneType: 'market',
      baseRate: 30,
      currentOccupancy: 0.50,
      totalBays: 46,
      priceChangePercent: -0.30, // -30%
      horizonHours: 3
    });

    assert.ok(
      result.projectedOccupancy.projected > result.projectedOccupancy.baseline,
      `Discounted tariff should attract parked vehicles: projected ${result.projectedOccupancy.projected} > baseline ${result.projectedOccupancy.baseline}`
    );
  });

  it('demonstrates that hospital zones are highly inelastic compared to transit hubs', () => {
    const hospitalSim = simulateWhatIf({
      zoneId: 'delhi-aiims-emergency',
      zoneType: 'hospital',
      baseRate: 20,
      currentOccupancy: 0.85,
      priceChangePercent: 0.50
    });

    const transitSim = simulateWhatIf({
      zoneId: 'gurugram-huda-metro',
      zoneType: 'transit',
      baseRate: 30,
      currentOccupancy: 0.85,
      priceChangePercent: 0.50
    });

    const hospitalDrop =
      hospitalSim.projectedOccupancy.baseline - hospitalSim.projectedOccupancy.projected;
    const transitDrop =
      transitSim.projectedOccupancy.baseline - transitSim.projectedOccupancy.projected;

    assert.ok(
      transitDrop > hospitalDrop * 3,
      `Transit drop (${transitDrop.toFixed(3)}) should be significantly higher than hospital drop (${hospitalDrop.toFixed(3)})`
    );
    assert.equal(hospitalSim.elasticityUsed, -0.06);
    assert.equal(transitSim.elasticityUsed, -0.42);
  });
});

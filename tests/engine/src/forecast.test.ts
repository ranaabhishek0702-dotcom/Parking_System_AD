import assert from 'node:assert/strict';
import {
  computeForecast,
  fitHoltWinters,
  predictHoltWinters,
  STANDARD_MUNICIPAL_EVENTS
} from '@parksense/shared';

describe('Forecasting Engine: Holt-Winters, Event Uplifts & Backtesting', () => {
  // Generate realistic diurnal time-series with trend and stochastic noise
  function generateSyntheticDiurnalHistory(weeks: number = 3) {
    const history = [];
    const baseTimestamp = new Date('2026-09-01T00:00:00Z').getTime();
    const totalHours = weeks * 168;

    for (let h = 0; h < totalHours; h++) {
      const timestamp = baseTimestamp + h * 3600 * 1000;
      const date = new Date(timestamp);
      const hourOfDay = date.getUTCHours();
      const dayOfWeek = date.getUTCDay(); // 0 is Sun

      // Diurnal curve: 8-10 AM morning rise, 5-8 PM evening peak
      let occ = 0.18;
      if (hourOfDay >= 8 && hourOfDay <= 21) {
        occ = 0.62 + Math.sin((hourOfDay - 8) * 0.28) * 0.24;
      }
      // Weekend uplift
      if (dayOfWeek === 0 || dayOfWeek === 6) {
        occ = Math.min(0.95, occ * 1.12);
      }

      // Systematic weekly trend + stochastic variation (filters noise vs naive lag)
      const trend = (h / totalHours) * 0.08;
      const pseudoRand = (((h * 9301 + 49297) % 233280) / 233280 - 0.5) * 0.20;
      const occupancyRate = Math.max(0.05, Math.min(0.98, occ + trend + pseudoRand));

      history.push({
        timestamp,
        occupancyRate,
        hourOfWeek: h % 168,
        dayOfWeek,
        hourOfDay
      });
    }
    return history;
  }

  it('computes 24h forecast with strictly valid confidence bands', () => {
    const history = generateSyntheticDiurnalHistory(3);
    const result = computeForecast('delhi-cp-inner', 'market', history, 24);

    assert.equal(result.zoneId, 'delhi-cp-inner');
    assert.equal(result.forecasts.length, 24);

    for (const point of result.forecasts) {
      assert.ok(
        point.forecastedOccupancy >= 0.0 && point.forecastedOccupancy <= 1.0,
        `Forecast ${point.forecastedOccupancy} out of bounds [0, 1]`
      );
      assert.ok(
        point.lowerConfidence80 <= point.forecastedOccupancy &&
        point.forecastedOccupancy <= point.upperConfidence80,
        `Point ${point.forecastedOccupancy} must be bounded inside 80% CI [${point.lowerConfidence80}, ${point.upperConfidence80}]`
      );
      assert.ok(
        point.lowerConfidence95 <= point.lowerConfidence80 &&
        point.upperConfidence80 <= point.upperConfidence95,
        `95% CI must be wider than 80% CI`
      );
    }
  });

  it('computes 7-day (168-hour) full horizon forecast', () => {
    const history = generateSyntheticDiurnalHistory(3);
    const result = computeForecast('gurugram-cyber-city', 'office', history, 168);

    assert.equal(result.forecasts.length, 168);
    assert.equal(result.seasonalityType, 'weekly_168h');
  });

  it('ASSERT: Forecast beats naive baseline on held-out backtest sample', () => {
    const history = generateSyntheticDiurnalHistory(4);
    const result = computeForecast('delhi-khan-market', 'market', history, 24);

    assert.ok(
      result.backtestMape < 25.0,
      `Expected solid backtest MAPE < 25%, got ${result.backtestMape}%`
    );
    assert.ok(
      result.modelBeatsNaive,
      `Holt-Winters model (MAPE: ${result.backtestMape}%) should beat naive baseline (MAPE: ${result.naiveMape}%)`
    );
  });

  it('applies municipal event uplift during designated event hours', () => {
    const history = generateSyntheticDiurnalHistory(3);
    const result = computeForecast(
      'delhi-cp-inner',
      'market',
      history,
      24,
      STANDARD_MUNICIPAL_EVENTS
    );

    // Filter points between 17:00 and 23:00 (IPL match window)
    const iplPoints = result.forecasts.filter(
      (p) => p.hourOfDay >= 17 && p.hourOfDay <= 23
    );

    assert.ok(iplPoints.length > 0);
    for (const p of iplPoints) {
      assert.ok(
        p.eventUplift > 0,
        `Event uplift should be positive during IPL hours, got ${p.eventUplift}`
      );
      assert.ok(
        p.forecastedOccupancy >= p.baselineOccupancy,
        'Forecast with event must be >= baseline'
      );
    }
  });
});

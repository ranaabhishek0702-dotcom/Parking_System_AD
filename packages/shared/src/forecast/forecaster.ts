import { fitHoltWinters, predictHoltWinters } from './holtWinters.js';
import type {
  HourlyDataPoint,
  EventUpliftRule,
  ForecastPoint,
  ZoneForecastResult
} from './types.js';

export const STANDARD_MUNICIPAL_EVENTS: EventUpliftRule[] = [
  {
    id: 'evt-ipl-match',
    name: 'IPL Match Evening Surge',
    startHour: 17,
    endHour: 23,
    upliftPercent: 0.35, // +35% demand
    affectedZoneTypes: ['market', 'transit', 'office']
  },
  {
    id: 'evt-diwali-rush',
    name: 'Diwali Festive Market Rush',
    startHour: 11,
    endHour: 22,
    upliftPercent: 0.45,
    affectedZoneTypes: ['market']
  },
  {
    id: 'evt-monsoon-deluge',
    name: 'Monsoon Street Waterlogging',
    startHour: 8,
    endHour: 20,
    upliftPercent: -0.25, // -25% traffic slowdown
    affectedZoneTypes: ['market', 'office', 'transit']
  }
];

export function computeForecast(
  zoneId: string,
  zoneType: string,
  history: HourlyDataPoint[],
  horizonHours: number = 24,
  events: EventUpliftRule[] = STANDARD_MUNICIPAL_EVENTS
): ZoneForecastResult {
  if (history.length < 24) {
    throw new Error(
      `Insufficient history for zone ${zoneId}. Minimum 24 data points required, got ${history.length}.`
    );
  }

  // Sort history chronologically
  const sorted = [...history].sort((a, b) => a.timestamp - b.timestamp);
  const series = sorted.map((d) => d.occupancyRate);

  // 1. Determine optimal season length:
  // If we have >= 336 points (2 full weeks), use 168-hour weekly seasonality
  // Otherwise use 24-hour daily seasonality
  const seasonLength = sorted.length >= 336 ? 168 : 24;
  const seasonalityType = seasonLength === 168 ? 'weekly_168h' : 'daily_24h';

  // 2. Train / Test Split for honest Backtesting (last 20% held out, up to 48 hours)
  const holdoutSize = Math.min(48, Math.max(12, Math.floor(series.length * 0.15)));
  const trainSeries = series.slice(0, series.length - holdoutSize);
  const testSeries = series.slice(series.length - holdoutSize);

  // Fit model on training slice
  const backtestModel = fitHoltWinters(trainSeries, { seasonLength });
  const backtestStartSeasonIdx = trainSeries.length % seasonLength;
  const backtestPredictions = predictHoltWinters(
    backtestModel,
    holdoutSize,
    backtestStartSeasonIdx
  );

  // Calculate honest MAPE
  let mapeSum = 0;
  let naiveMapeSum = 0;

  for (let i = 0; i < holdoutSize; i++) {
    const actual = testSeries[i];
    const predicted = backtestPredictions[i].forecast;
    // Naive baseline: same hour from previous day or previous cycle
    const naivePredicted =
      trainSeries[trainSeries.length - seasonLength + (i % seasonLength)] ?? actual;

    // Avoid division by zero
    const denominator = Math.max(0.05, actual);
    mapeSum += Math.abs(actual - predicted) / denominator;
    naiveMapeSum += Math.abs(actual - naivePredicted) / denominator;
  }

  const backtestMape = Number(((mapeSum / holdoutSize) * 100).toFixed(2));
  const naiveMape = Number(((naiveMapeSum / holdoutSize) * 100).toFixed(2));

  // 3. Fit Model on FULL Series for actual future forecast
  const fullModel = fitHoltWinters(series, { seasonLength });
  const lastPoint = sorted[sorted.length - 1];
  const startTimestamp = lastPoint.timestamp;
  const startSeasonIdx = series.length % seasonLength;

  const rawForecasts = predictHoltWinters(
    fullModel,
    horizonHours,
    startSeasonIdx
  );

  // 4. Incorporate Municipal Event Uplifts
  const forecasts: ForecastPoint[] = [];

  for (let h = 0; h < horizonHours; h++) {
    const stepTimestamp = startTimestamp + (h + 1) * 3600 * 1000;
    const date = new Date(stepTimestamp);
    const hourOfDay = date.getHours();
    const dayOfWeek = date.getDay();

    const baseline = rawForecasts[h].forecast;

    // Check applicable events
    let eventUplift = 0;
    for (const evt of events) {
      const typeMatch = !evt.affectedZoneTypes || evt.affectedZoneTypes.includes(zoneType);
      const zoneMatch = !evt.affectedZoneIds || evt.affectedZoneIds.includes(zoneId);
      const hourMatch = hourOfDay >= evt.startHour && hourOfDay <= evt.endHour;
      const dayMatch = !evt.daysOfWeek || evt.daysOfWeek.includes(dayOfWeek);

      if (typeMatch && zoneMatch && hourMatch && dayMatch) {
        eventUplift += evt.upliftPercent;
      }
    }

    // Final combined forecast with event adjustment
    const adjusted = Math.max(0.05, Math.min(0.98, baseline * (1 + eventUplift)));

    // Derive symmetric margins from Holt-Winters residual error
    const margin80 = (rawForecasts[h].upper80 - rawForecasts[h].lower80) / 2;
    const margin95 = (rawForecasts[h].upper95 - rawForecasts[h].lower95) / 2;

    const lower80 = Number(Math.max(0.02, Math.min(adjusted, adjusted - margin80)).toFixed(4));
    const upper80 = Number(Math.min(1.0, Math.max(adjusted, adjusted + margin80)).toFixed(4));
    const lower95 = Number(Math.max(0.0, Math.min(lower80, adjusted - margin95)).toFixed(4));
    const upper95 = Number(Math.min(1.0, Math.max(upper80, adjusted + margin95)).toFixed(4));

    forecasts.push({
      timestamp: stepTimestamp,
      isoTime: date.toISOString(),
      hourOfDay,
      dayOfWeek,
      forecastedOccupancy: Number(adjusted.toFixed(4)),
      baselineOccupancy: Number(baseline.toFixed(4)),
      eventUplift: Number(eventUplift.toFixed(4)),
      lowerConfidence80: lower80,
      upperConfidence80: upper80,
      lowerConfidence95: lower95,
      upperConfidence95: upper95
    });
  }

  return {
    zoneId,
    generatedAt: Date.now(),
    horizonHours,
    forecasts,
    backtestMape,
    naiveMape,
    modelBeatsNaive: backtestMape <= naiveMape,
    sampleCount: sorted.length,
    seasonalityType
  };
}

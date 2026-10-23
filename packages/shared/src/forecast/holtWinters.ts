/**
 * Holt-Winters Triple Exponential Smoothing (Additive Seasonality)
 * Optimized for urban time-series parking patterns with weekly (168h) or daily (24h) cycles.
 */

export interface HoltWintersParams {
  alpha?: number; // Level smoothing parameter (0 < alpha < 1)
  beta?: number;  // Trend smoothing parameter (0 < beta < 1)
  gamma?: number; // Seasonal smoothing parameter (0 < gamma < 1)
  seasonLength: number; // e.g. 168 for hour-of-week, 24 for hour-of-day
}

export interface HoltWintersModel {
  level: number;
  trend: number;
  seasonals: number[];
  seasonLength: number;
  residualStdDev: number;
  fitted: number[];
  params: { alpha: number; beta: number; gamma: number };
}

export function fitHoltWinters(
  series: number[],
  options: Partial<HoltWintersParams> = {}
): HoltWintersModel {
  const m = options.seasonLength || 24;
  const alpha = options.alpha ?? 0.25;
  const beta = options.beta ?? 0.05;
  const gamma = options.gamma ?? 0.35;

  if (series.length < m * 2) {
    // If not enough data for 2 full seasons, fallback to single/double season length
    const effectiveM = Math.max(1, Math.min(m, Math.floor(series.length / 2)));
    return fitHoltWinters(series, { ...options, seasonLength: effectiveM });
  }

  const numSeasons = Math.floor(series.length / m);

  // 1. Initial Level and Trend estimation
  const seasonAverages: number[] = [];
  for (let s = 0; s < numSeasons; s++) {
    let sum = 0;
    for (let i = 0; i < m; i++) {
      sum += series[s * m + i];
    }
    seasonAverages.push(sum / m);
  }

  let initialTrend = 0;
  for (let i = 0; i < seasonAverages.length - 1; i++) {
    initialTrend += (seasonAverages[i + 1] - seasonAverages[i]) / m;
  }
  initialTrend = initialTrend / (seasonAverages.length - 1 || 1);

  let level = seasonAverages[0];
  let trend = initialTrend;

  // 2. Initial Seasonal Indices
  const seasonals: number[] = new Array(m).fill(0);
  for (let i = 0; i < m; i++) {
    let sumDiff = 0;
    for (let s = 0; s < numSeasons; s++) {
      sumDiff += series[s * m + i] - seasonAverages[s];
    }
    seasonals[i] = sumDiff / numSeasons;
  }

  // 3. Recursive Smoothing Loop
  const fitted: number[] = [];
  const residuals: number[] = [];

  for (let t = 0; t < series.length; t++) {
    const seasonalIdx = t % m;
    const y = series[t];
    const prevLevel = level;
    const prevTrend = trend;
    const prevSeason = seasonals[seasonalIdx];

    // Forecast for current step
    const yHat = Math.max(0, Math.min(1, prevLevel + prevTrend + prevSeason));
    fitted.push(yHat);
    residuals.push(y - yHat);

    // Update level, trend, seasonal
    level = alpha * (y - prevSeason) + (1 - alpha) * (prevLevel + prevTrend);
    trend = beta * (level - prevLevel) + (1 - beta) * prevTrend;
    // Damp trend slightly to prevent runaway explosion over long horizons
    trend = trend * 0.98;
    seasonals[seasonalIdx] = gamma * (y - level) + (1 - gamma) * prevSeason;
  }

  // Calculate Residual Standard Deviation
  const variance =
    residuals.reduce((acc, r) => acc + r * r, 0) / (residuals.length || 1);
  const residualStdDev = Math.sqrt(variance);

  return {
    level,
    trend,
    seasonals,
    seasonLength: m,
    residualStdDev,
    fitted,
    params: { alpha, beta, gamma }
  };
}

export function predictHoltWinters(
  model: HoltWintersModel,
  horizon: number,
  startSeasonIdx: number = 0
): Array<{
  forecast: number;
  lower80: number;
  upper80: number;
  lower95: number;
  upper95: number;
}> {
  const predictions = [];
  const { level, trend, seasonals, seasonLength, residualStdDev } = model;

  for (let h = 1; h <= horizon; h++) {
    const seasonalIdx = (startSeasonIdx + h - 1) % seasonLength;
    const seasonComp = seasonals[seasonalIdx] || 0;

    // Damped trend factor to prevent long-horizon drift in bounded occupancy
    const phi = 0.85;
    let trendDamped = 0;
    for (let i = 1; i <= h; i++) {
      trendDamped += Math.pow(phi, i);
    }

    // Projected point: Level + Damped Trend + Seasonal Component
    const point = level + trendDamped * trend + seasonComp;
    const clampedPoint = Math.max(0.05, Math.min(0.98, point));

    // Forecast uncertainty expands with sqrt(horizon step)
    const horizonFactor = Math.sqrt(1 + 0.08 * (h - 1));
    const margin80 = 1.28 * residualStdDev * horizonFactor;
    const margin95 = 1.96 * residualStdDev * horizonFactor;

    predictions.push({
      forecast: Number(clampedPoint.toFixed(4)),
      lower80: Number(Math.max(0.02, clampedPoint - margin80).toFixed(4)),
      upper80: Number(Math.min(1.0, clampedPoint + margin80).toFixed(4)),
      lower95: Number(Math.max(0.0, clampedPoint - margin95).toFixed(4)),
      upper95: Number(Math.min(1.0, clampedPoint + margin95).toFixed(4))
    });
  }

  return predictions;
}

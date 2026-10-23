export interface HourlyDataPoint {
  timestamp: number;
  occupancyRate: number; // 0.0 to 1.0
  hourOfWeek: number; // 0 to 167
  dayOfWeek: number; // 0 (Sun) to 6 (Sat)
  hourOfDay: number; // 0 to 23
}

export interface EventUpliftRule {
  id: string;
  name: string;
  startHour: number; // 0 to 23
  endHour: number;
  daysOfWeek?: number[]; // optional filter
  specificDate?: string; // YYYY-MM-DD
  upliftPercent: number; // e.g. 0.25 = +25% occupancy
  affectedZoneIds?: string[];
  affectedZoneTypes?: string[];
}

export interface ForecastPoint {
  timestamp: number;
  isoTime: string;
  hourOfDay: number;
  dayOfWeek: number;
  forecastedOccupancy: number; // clamped [0, 1]
  baselineOccupancy: number;
  eventUplift: number;
  lowerConfidence80: number;
  upperConfidence80: number;
  lowerConfidence95: number;
  upperConfidence95: number;
}

export interface ZoneForecastResult {
  zoneId: string;
  generatedAt: number;
  horizonHours: number; // 24 or 168
  forecasts: ForecastPoint[];
  backtestMape: number; // e.g. 8.4%
  naiveMape: number; // e.g. 15.2%
  modelBeatsNaive: boolean;
  sampleCount: number;
  seasonalityType: 'weekly_168h' | 'daily_24h';
}

import { z } from 'zod';
import {
  GeoPointSchema,
  PolygonPointSchema,
  ZoneSchema,
  BaySchema,
  SensorSchema,
  SensorIngestEventSchema,
  VehicleMetadataSchema,
  SensorTelemetrySchema,
  EventRecordSchema,
  ReservationSchema,
  PaymentSchema,
  PricingRuleSchema,
  PriceHistorySchema,
  ViolationSchema,
  UserSchema,
  AuditLogSchema,
  LiveZoneSchema,
  LiveBaySchema,
  LiveStatsSchema
} from './schemas.js';

export type GeoPoint = z.infer<typeof GeoPointSchema>;
export type PolygonPoint = z.infer<typeof PolygonPointSchema>;
export type Zone = z.infer<typeof ZoneSchema>;
export type Bay = z.infer<typeof BaySchema>;
export type Sensor = z.infer<typeof SensorSchema>;
export type SensorIngestEvent = z.infer<typeof SensorIngestEventSchema>;
export type VehicleMetadata = z.infer<typeof VehicleMetadataSchema>;
export type SensorTelemetry = z.infer<typeof SensorTelemetrySchema>;
export type EventRecord = z.infer<typeof EventRecordSchema>;
export type Reservation = z.infer<typeof ReservationSchema>;
export type Payment = z.infer<typeof PaymentSchema>;
export type PricingRule = z.infer<typeof PricingRuleSchema>;
export type PriceHistory = z.infer<typeof PriceHistorySchema>;
export type Violation = z.infer<typeof ViolationSchema>;
export type User = z.infer<typeof UserSchema>;
export type AuditLog = z.infer<typeof AuditLogSchema>;

// RTDB Types
export type LiveZone = z.infer<typeof LiveZoneSchema>;
export type LiveBay = z.infer<typeof LiveBaySchema>;
export type LiveStats = z.infer<typeof LiveStatsSchema>;

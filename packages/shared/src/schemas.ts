import { z } from 'zod';
import {
  USER_ROLES,
  VEHICLE_TYPES,
  ZONE_TYPES,
  BAY_STATUSES,
  SENSOR_TYPES,
  EVENT_TYPES,
  RESERVATION_STATUSES,
  PAYMENT_STATUSES,
  VIOLATION_TYPES,
  VIOLATION_STATUSES,
  SENSOR_HEALTH_STATUSES
} from './constants.js';

// Coordinates
export const GeoPointSchema = z.object({
  lat: z.number().min(-90).max(90),
  lng: z.number().min(-180).max(180)
});

export const PolygonPointSchema = z.object({
  lat: z.number().min(-90).max(90),
  lng: z.number().min(-180).max(180)
});

// 1. Zones
export const ZoneSchema = z.object({
  id: z.string().min(1),
  name: z.string().min(1),
  city: z.string().default('Delhi NCR'),
  type: z.enum(ZONE_TYPES),
  location: GeoPointSchema,
  polygon: z.array(PolygonPointSchema).default([]),
  totalBays: z.number().int().nonnegative(),
  baseHourlyRate: z.number().nonnegative(), // In ₹ INR
  operatingHours: z.object({
    start: z.string().regex(/^([01]\d|2[0-3]):([0-5]\d)$/),
    end: z.string().regex(/^([01]\d|2[0-3]):([0-5]\d)$/),
    timezone: z.string().default('Asia/Kolkata')
  }),
  amenities: z.object({
    hasEV: z.boolean().default(false),
    hasDisabled: z.boolean().default(false),
    covered: z.boolean().default(false)
  }),
  createdAt: z.union([z.number(), z.string(), z.any()]),
  updatedAt: z.union([z.number(), z.string(), z.any()])
});

// 2. Bays
export const BaySchema = z.object({
  id: z.string().min(1),
  zoneId: z.string().min(1),
  bayNumber: z.string().min(1),
  location: GeoPointSchema,
  vehicleType: z.enum(VEHICLE_TYPES),
  sensorId: z.string().min(1),
  status: z.enum(BAY_STATUSES),
  currentSession: z
    .object({
      vehicleNumber: z.string().optional(),
      occupiedSince: z.union([z.number(), z.string(), z.any()]).optional(),
      eventId: z.string().optional()
    })
    .optional(),
  createdAt: z.union([z.number(), z.string(), z.any()]),
  updatedAt: z.union([z.number(), z.string(), z.any()])
});

// 3. Sensors
export const SensorSchema = z.object({
  id: z.string().min(1),
  bayId: z.string().min(1),
  zoneId: z.string().min(1),
  type: z.enum(SENSOR_TYPES),
  macOrEui: z.string().min(1),
  batteryPercent: z.number().min(0).max(100),
  firmwareVersion: z.string().default('1.0.0'),
  lastHeartbeat: z.union([z.number(), z.string(), z.any()]),
  healthStatus: z.enum(SENSOR_HEALTH_STATUSES).default('healthy')
});

// 4. Ingestion Event Telemetry & Payloads (IoT Gateway Specification)
export const VehicleMetadataSchema = z.object({
  detectedClass: z.enum(VEHICLE_TYPES).default('car'),
  licensePlate: z.string().optional(),
  confidenceScore: z.number().min(0).max(1).default(0.95)
});

export const SensorTelemetrySchema = z.object({
  batteryVoltage: z.number().optional(),
  signalRssi: z.number().optional(),
  temperatureC: z.number().optional()
});

export const SensorIngestEventSchema = z.object({
  gatewayId: z.string().min(1),
  sensorId: z.string().min(1),
  bayId: z.string().min(1),
  zoneId: z.string().min(1),
  eventType: z.enum(EVENT_TYPES),
  timestamp: z.number().int().positive(), // Epoch millis from sensor
  idempotencyKey: z.string().min(1),
  vehicleMetadata: VehicleMetadataSchema.optional(),
  telemetry: SensorTelemetrySchema.optional(),
  signature: z.string().optional()
});

// Firestore Event Record
export const EventRecordSchema = z.object({
  id: z.string().min(1),
  idempotencyKey: z.string().min(1),
  bayId: z.string().min(1),
  zoneId: z.string().min(1),
  sensorId: z.string().min(1),
  eventType: z.enum(EVENT_TYPES),
  timestamp: z.union([z.number(), z.string(), z.any()]),
  receivedAt: z.union([z.number(), z.string(), z.any()]),
  vehicleType: z.string().optional(),
  vehicleNumberPlate: z.string().optional(),
  confidence: z.number().min(0).max(1).optional(),
  rawPayload: z.record(z.any()).optional()
});

// 5. Reservations
export const ReservationSchema = z.object({
  id: z.string().min(1),
  userId: z.string().min(1),
  zoneId: z.string().min(1),
  bayId: z.string().min(1),
  vehicleNumber: z.string().min(1),
  vehicleType: z.enum(VEHICLE_TYPES),
  status: z.enum(RESERVATION_STATUSES),
  startTime: z.union([z.number(), z.string(), z.any()]),
  endTime: z.union([z.number(), z.string(), z.any()]),
  gracePeriodMinutes: z.number().int().default(15),
  estimatedAmount: z.number().nonnegative(),
  finalAmount: z.number().nonnegative().optional(),
  lockedHourlyRate: z.number().nonnegative().optional(),
  paymentId: z.string().optional(),
  paymentMethod: z.string().optional(),
  holdExpiresAt: z.union([z.number(), z.string(), z.any()]).optional(),
  qrToken: z.string().optional(),
  checkedInAt: z.union([z.number(), z.string(), z.any()]).optional(),
  cancelledAt: z.union([z.number(), z.string(), z.any()]).optional(),
  createdAt: z.union([z.number(), z.string(), z.any()]),
  updatedAt: z.union([z.number(), z.string(), z.any()])
});

// 6. Payments
export const PaymentSchema = z.object({
  id: z.string().min(1),
  reservationId: z.string().min(1),
  userId: z.string().min(1),
  amount: z.number().nonnegative(), // In ₹ INR
  currency: z.literal('INR').default('INR'),
  gateway: z.literal('razorpay').default('razorpay'),
  gatewayOrderId: z.string().min(1),
  gatewayPaymentId: z.string().optional(),
  status: z.enum(PAYMENT_STATUSES),
  receiptUrl: z.string().url().optional(),
  createdAt: z.union([z.number(), z.string(), z.any()]),
  updatedAt: z.union([z.number(), z.string(), z.any()])
});

// 7. Pricing Rules
export const PricingRuleSchema = z.object({
  id: z.string().min(1),
  zoneId: z.string().min(1), // 'global' or specific zoneId
  ruleName: z.string().min(1),
  multiplier: z.number().positive(),
  conditions: z.object({
    daysOfWeek: z.array(z.number().int().min(0).max(6)).default([]),
    startHour: z.number().int().min(0).max(23),
    endHour: z.number().int().min(0).max(23),
    occupancyThreshold: z.number().min(0).max(1).default(0.8)
  }),
  active: z.boolean().default(true),
  createdAt: z.union([z.number(), z.string(), z.any()]),
  updatedAt: z.union([z.number(), z.string(), z.any()])
});

// 8. Price History
export const PriceHistorySchema = z.object({
  id: z.string().min(1),
  zoneId: z.string().min(1),
  effectiveRate: z.number().nonnegative(),
  demandIndex: z.number().nonnegative(),
  occupancyRate: z.number().min(0).max(1),
  calculatedAt: z.union([z.number(), z.string(), z.any()])
});

// 9. Violations
export const ViolationSchema = z.object({
  id: z.string().min(1),
  zoneId: z.string().min(1),
  bayId: z.string().min(1),
  userId: z.string().optional(),
  type: z.enum(VIOLATION_TYPES),
  vehicleNumber: z.string().optional(),
  detectedAt: z.union([z.number(), z.string(), z.any()]),
  resolvedAt: z.union([z.number(), z.string(), z.any()]).optional(),
  status: z.enum(VIOLATION_STATUSES).default('detected'),
  fineAmount: z.number().nonnegative().default(500),
  challanId: z.string().optional(),
  reporterUserId: z.string().optional(),
  photoUrl: z.string().optional(),
  location: GeoPointSchema.optional(),
  notes: z.string().optional()
});

// 10. Users
export const UserSchema = z.object({
  id: z.string().min(1),
  phone: z.string().min(10),
  email: z.string().email().optional(),
  name: z.string().min(1),
  roles: z.array(z.enum(USER_ROLES)).default(['citizen']),
  savedVehicles: z
    .array(
      z.object({
        plate: z.string().min(1),
        type: z.enum(VEHICLE_TYPES),
        model: z.string().optional()
      })
    )
    .default([]),
  preferredLanguage: z.enum(['en', 'hi']).default('en'),
  createdAt: z.union([z.number(), z.string(), z.any()]),
  updatedAt: z.union([z.number(), z.string(), z.any()])
});

// 11. Audit Logs
export const AuditLogSchema = z.object({
  id: z.string().min(1),
  actorId: z.string().min(1),
  actorRole: z.string().min(1),
  action: z.string().min(1),
  resource: z.string().min(1),
  metadata: z.record(z.any()).default({}),
  timestamp: z.union([z.number(), z.string(), z.any()]),
  ipAddress: z.string().optional()
});

// 12. Realtime Database Schemas
export const LiveZoneSchema = z.object({
  totalBays: z.number().int().nonnegative(),
  occupiedBays: z.number().int().nonnegative(),
  reservedBays: z.number().int().nonnegative(),
  availableBays: z.number().int().nonnegative(),
  occupancyRate: z.number().min(0).max(1),
  currentRatePerHour: z.number().nonnegative(),
  lastUpdated: z.number()
});

export const LiveBaySchema = z.object({
  status: z.enum(BAY_STATUSES),
  vehicleType: z.enum(VEHICLE_TYPES),
  occupiedSince: z.number().optional(),
  isReserved: z.boolean().default(false)
});

export const LiveStatsSchema = z.object({
  totalLiveOccupied: z.number().int().nonnegative(),
  totalLiveAvailable: z.number().int().nonnegative(),
  activeViolationsCount: z.number().int().nonnegative(),
  systemHeartbeat: z.number()
});

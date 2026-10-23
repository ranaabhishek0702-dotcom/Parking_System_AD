export const USER_ROLES = [
  'citizen',
  'super_admin',
  'zone_manager',
  'enforcement_officer',
  'finance_auditor'
] as const;

export type UserRole = (typeof USER_ROLES)[number];

export const VEHICLE_TYPES = [
  'car',
  'two_wheeler',
  'ev',
  'heavy',
  'handicapped'
] as const;

export type VehicleType = (typeof VEHICLE_TYPES)[number];

export const ZONE_TYPES = [
  'market',
  'hospital',
  'transit',
  'office',
  'school'
] as const;

export type ZoneType = (typeof ZONE_TYPES)[number];

export const BAY_STATUSES = [
  'available',
  'occupied',
  'reserved',
  'violation',
  'maintenance'
] as const;

export type BayStatus = (typeof BAY_STATUSES)[number];

export const SENSOR_TYPES = [
  'geomagnetic_ground',
  'ultrasonic',
  'camera_anpr',
  'virtual_simulator'
] as const;

export type SensorType = (typeof SENSOR_TYPES)[number];

export const EVENT_TYPES = [
  'ENTRY',
  'EXIT',
  'HEARTBEAT',
  'TAMPER',
  'OVERSTAY_ALERT'
] as const;

export type EventType = (typeof EVENT_TYPES)[number];

export const RESERVATION_STATUSES = [
  'hold',
  'pending',
  'confirmed',
  'active',
  'completed',
  'cancelled',
  'expired'
] as const;

export type ReservationStatus = (typeof RESERVATION_STATUSES)[number];

export const PAYMENT_STATUSES = [
  'created',
  'authorized',
  'captured',
  'failed',
  'refunded'
] as const;

export type PaymentStatus = (typeof PAYMENT_STATUSES)[number];

export const VIOLATION_TYPES = [
  'unauthorized_parking',
  'overstay',
  'wrong_vehicle_type',
  'blocking_passage'
] as const;

export type ViolationType = (typeof VIOLATION_TYPES)[number];

export const VIOLATION_STATUSES = [
  'detected',
  'notified',
  'challan_issued',
  'resolved'
] as const;

export type ViolationStatus = (typeof VIOLATION_STATUSES)[number];

export const SENSOR_HEALTH_STATUSES = [
  'healthy',
  'low_battery',
  'degraded',
  'offline'
] as const;

export type SensorHealthStatus = (typeof SENSOR_HEALTH_STATUSES)[number];

// Default hourly base rates in ₹ (INR) by vehicle class
export const DEFAULT_VEHICLE_BASE_RATES: Record<VehicleType, number> = {
  car: 40,
  two_wheeler: 20,
  ev: 30,
  heavy: 100,
  handicapped: 0
};

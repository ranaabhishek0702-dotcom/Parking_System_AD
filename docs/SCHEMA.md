# ParkSense Data Architecture & Schema Documentation

## 1. Overview & Dual-Database Rationale

ParkSense employs a high-performance **dual-database architecture** designed specifically for real-time urban IoT workloads:

1. **Google Cloud Firestore (Durable Master Ledger)**:
   - Provides multi-region ACID persistence for core business entities: zones, bays, user records, reservations, financial transactions, and compliance audit logs.
   - Designed for structured indexing, composite queries, and historical compliance.
2. **Firebase Realtime Database (RTDB - Ultra-Low Latency Hot State)**:
   - Powers sub-second state fan-out (via persistent WebSockets) for live parking occupancy, bay transitions, and municipal zone heatmaps.
   - High write throughput, minimal serialization overhead, and instant mobile reactivity for citizen navigation and enforcement officers.

---

## 2. Cloud Firestore Schema (Collections & Document Structures)

### 2.1 `/zones/{zoneId}`
Defines a managed street-parking zone or cluster within the city.

| Field | Type | Description |
| :--- | :--- | :--- |
| `id` | `string` | Unique zone identifier (e.g. `delhi-cp-inner`) |
| `name` | `string` | Human-readable name (e.g. `Connaught Place Inner Circle Block A-C`) |
| `city` | `string` | Municipality / City (e.g. `Delhi NCR`) |
| `type` | `enum` | `'market' \| 'hospital' \| 'transit' \| 'office' \| 'school'` |
| `location` | `GeoPoint` | Centroid coordinates `{ lat: number, lng: number }` |
| `polygon` | `Array<GeoPoint>` | Geofence boundary polygon coordinates |
| `totalBays` | `number` | Total parking bays configured in this zone |
| `baseHourlyRate` | `number` | Baseline tariff in Indian Rupees (₹) |
| `operatingHours` | `object` | `{ start: "08:00", end: "22:00", timezone: "Asia/Kolkata" }` |
| `amenities` | `object` | `{ hasEV: boolean, hasDisabled: boolean, covered: boolean }` |
| `createdAt` | `Timestamp` | Record creation timestamp |
| `updatedAt` | `Timestamp` | Last update timestamp |

### 2.2 `/bays/{bayId}`
Represents an individual physical on-street parking slot.

| Field | Type | Description |
| :--- | :--- | :--- |
| `id` | `string` | Unique bay identifier (e.g. `bay-del-cp-001`) |
| `zoneId` | `string` | Reference to parent `/zones/{zoneId}` |
| `bayNumber` | `string` | Physical stencil marking (e.g. `CP-A-01`) |
| `location` | `GeoPoint` | Precision coordinates `{ lat: number, lng: number }` |
| `vehicleType` | `enum` | `'car' \| 'two_wheeler' \| 'ev' \| 'heavy' \| 'handicapped'` |
| `sensorId` | `string` | Assigned physical/virtual sensor ID |
| `status` | `enum` | `'available' \| 'occupied' \| 'reserved' \| 'violation' \| 'maintenance'` |
| `currentSession`| `object?` | `{ vehicleNumber?: string, occupiedSince?: Timestamp, eventId?: string }` |
| `createdAt` | `Timestamp` | Creation timestamp |
| `updatedAt` | `Timestamp` | Status modification timestamp |

### 2.3 `/sensors/{sensorId}`
Physical IoT hardware or virtual gateway metadata installed at a bay.

| Field | Type | Description |
| :--- | :--- | :--- |
| `id` | `string` | Hardware identifier (e.g. `sns-cp-001`) |
| `bayId` | `string` | Attached bay ID |
| `zoneId` | `string` | Parent zone ID |
| `type` | `enum` | `'geomagnetic_ground' \| 'ultrasonic' \| 'camera_anpr' \| 'virtual_simulator'` |
| `macOrEui` | `string` | LoRaWAN DevEUI or MAC Address |
| `batteryPercent`| `number` | Battery percentage remaining (0 - 100) |
| `firmwareVersion`| `string` | Active firmware tag (e.g. `1.0.4-lora`) |
| `lastHeartbeat`| `Timestamp` | Last telemetry ping timestamp |
| `healthStatus` | `enum` | `'healthy' \| 'low_battery' \| 'degraded' \| 'offline'` |

### 2.4 `/events/{eventId}` (Immutable Append-Only Ledger)
Comprehensive audit record for every vehicle arrival, departure, and gateway event.

| Field | Type | Description |
| :--- | :--- | :--- |
| `id` | `string` | Deterministic event ID / UUID |
| `idempotencyKey`| `string` | Hash: `{sensorId}_{timestamp}_{eventType}` |
| `bayId` | `string` | Target bay |
| `zoneId` | `string` | Target zone |
| `sensorId` | `string` | Emitting sensor |
| `eventType` | `enum` | `'ENTRY' \| 'EXIT' \| 'HEARTBEAT' \| 'TAMPER' \| 'OVERSTAY_ALERT'` |
| `timestamp` | `Timestamp` | UTC timestamp from sensor hardware clock |
| `receivedAt` | `Timestamp` | UTC timestamp of Cloud Function ingestion |
| `vehicleType` | `string?` | Detected vehicle category |
| `vehicleNumberPlate`| `string?`| OCR-detected license plate (DL-01-AB-1234) |
| `confidence` | `number?` | Detection confidence (0.00 to 1.00) |
| `rawPayload` | `map?` | Raw unprocessed telemetry payload |

### 2.5 `/reservations/{reservationId}`
Citizen booking records for reserved parking bays.

| Field | Type | Description |
| :--- | :--- | :--- |
| `id` | `string` | Unique reservation ID |
| `userId` | `string` | Firebase Auth UID of citizen |
| `zoneId` | `string` | Target zone |
| `bayId` | `string` | Assigned bay |
| `vehicleNumber` | `string` | Vehicle registration plate |
| `vehicleType` | `enum` | Vehicle class |
| `status` | `enum` | `'pending' \| 'confirmed' \| 'active' \| 'completed' \| 'cancelled' \| 'expired'` |
| `startTime` | `Timestamp` | Booking window start |
| `endTime` | `Timestamp` | Booking window expiration |
| `gracePeriodMinutes`| `number` | Overstay threshold before violation (default: 15 mins) |
| `estimatedAmount`| `number` | Upfront quotation in ₹ |
| `finalAmount` | `number?` | Actual billed charge in ₹ |
| `paymentId` | `string?` | Ref to `/payments/{paymentId}` |

### 2.6 `/payments/{paymentId}`
Audited financial ledger records for parking fees and fines.

| Field | Type | Description |
| :--- | :--- | :--- |
| `id` | `string` | Transaction ID |
| `reservationId`| `string` | Linked reservation |
| `userId` | `string` | Payer UID |
| `amount` | `number` | Total charged in ₹ |
| `currency` | `string` | Fixed to `'INR'` |
| `gateway` | `string` | Fixed to `'razorpay'` |
| `gatewayOrderId`| `string`| Razorpay order ID |
| `gatewayPaymentId`| `string?`| Razorpay payment ID |
| `status` | `enum` | `'created' \| 'authorized' \| 'captured' \| 'failed' \| 'refunded'` |
| `receiptUrl` | `string?` | Downloadable PDF tax invoice / receipt |
| `createdAt` | `Timestamp` | Transaction creation timestamp |

### 2.7 `/pricing_rules/{ruleId}`
Dynamic pricing rules and municipal multipliers.

| Field | Type | Description |
| :--- | :--- | :--- |
| `id` | `string` | Rule ID |
| `zoneId` | `string` | Zone scope (`'global'` or specific zone) |
| `ruleName` | `string` | Descriptive title (e.g. `Evening Peak Multiplier`) |
| `multiplier` | `number` | Rate scalar (e.g. `1.5` = +50%) |
| `conditions` | `object` | `{ daysOfWeek: number[], startHour: number, endHour: number, occupancyThreshold: number }` |
| `active` | `boolean` | Rule enforcement toggle |

### 2.8 `/price_history/{historyId}`
Hourly time-series pricing logs utilized for citizen transparency and Gemini predictive training.

| Field | Type | Description |
| :--- | :--- | :--- |
| `id` | `string` | Record ID |
| `zoneId` | `string` | Zone identifier |
| `effectiveRate` | `number` | Billed rate in ₹/hr |
| `demandIndex` | `number` | Algorithmic congestion factor (0.0 - 3.0) |
| `occupancyRate` | `number` | Zone capacity utilization (0.00 - 1.00) |
| `calculatedAt` | `Timestamp` | Snapshot timestamp |

### 2.9 `/violations/{violationId}`
Illegal parking incidents and enforcement tracking.

| Field | Type | Description |
| :--- | :--- | :--- |
| `id` | `string` | Violation ID |
| `zoneId` | `string` | Location zone |
| `bayId` | `string` | Location bay |
| `userId` | `string?` | Linked user UID if registered vehicle |
| `type` | `enum` | `'unauthorized_parking' \| 'overstay' \| 'wrong_vehicle_type' \| 'blocking_passage'` |
| `vehicleNumber` | `string?` | Offending vehicle plate |
| `detectedAt` | `Timestamp` | Detection timestamp |
| `resolvedAt` | `Timestamp?`| Clearance timestamp |
| `status` | `enum` | `'detected' \| 'notified' \| 'challan_issued' \| 'resolved'` |
| `fineAmount` | `number` | Fine penalty in ₹ (standard: ₹500 - ₹2000) |
| `challanId` | `string?` | MoRTH / Delhi Traffic Police e-Challan number |

### 2.10 `/users/{userId}`
User profiles and citizen identities (keyed by Firebase Auth UID).

| Field | Type | Description |
| :--- | :--- | :--- |
| `id` | `string` | Auth UID |
| `phone` | `string` | Verified mobile phone number (+91...) |
| `email` | `string?` | Optional contact email |
| `name` | `string` | Full name |
| `roles` | `Array<string>`| `['citizen', 'super_admin', 'zone_manager', 'enforcement_officer', 'finance_auditor']` |
| `savedVehicles` | `array` | `[{ plate: string, type: string, model: string }]` |
| `preferredLanguage`| `enum` | `'en' \| 'hi'` |
| `createdAt` | `Timestamp` | Account registration time |

### 2.11 `/audit_logs/{logId}`
Tamper-proof administrative action trail.

| Field | Type | Description |
| :--- | :--- | :--- |
| `id` | `string` | Log ID |
| `actorId` | `string` | Operator UID |
| `actorRole` | `string` | Operator Role |
| `action` | `string` | Event tag (e.g. `MANUAL_CHALLAN_ISSUED`, `ZONE_RATE_MODIFIED`) |
| `resource` | `string` | Target entity URI |
| `metadata` | `map` | Contextual diff / payload |
| `timestamp` | `Timestamp` | Audit event time |
| `ipAddress` | `string?` | Client remote IP |

---

## 3. Firebase Realtime Database (RTDB) Tree Structure

The Realtime Database is structured as three distinct hot branches:

```json
{
  "live_zones": {
    "delhi-cp-inner": {
      "totalBays": 48,
      "occupiedBays": 36,
      "reservedBays": 4,
      "availableBays": 8,
      "occupancyRate": 0.75,
      "currentRatePerHour": 60,
      "lastUpdated": 1774254000000
    }
  },
  "live_bays": {
    "delhi-cp-inner": {
      "bay-del-cp-001": {
        "status": "occupied",
        "vehicleType": "car",
        "occupiedSince": 1774251200000,
        "isReserved": false
      },
      "bay-del-cp-002": {
        "status": "available",
        "vehicleType": "ev",
        "isReserved": false
      }
    }
  },
  "live_stats": {
    "totalLiveOccupied": 218,
    "totalLiveAvailable": 114,
    "activeViolationsCount": 5,
    "systemHeartbeat": 1774254005000
  }
}
```

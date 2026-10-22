# 🅿️ ParkSense — Smart Street-Parking Platform for Indian Cities

> **Submission for Ministry of Housing and Urban Affairs (MoHUA)**  
> *Category: Smart Automation & Software*  
> **Production-Grade Real-Time On-Street Parking Ecosystem**

---

## 🌟 Overview

ParkSense is a production-grade, real-time street parking management and automation platform designed specifically for the unique dynamics of high-density Indian urban centers (Delhi NCR, Bengaluru, Mumbai).

It solves acute street congestion, irregular parking attendant friction, parking violations, and unpredictable retail/transit rushes through:
1. **Sub-second Realtime Bay State Sync**: Dual-database architecture combining Google Cloud Firestore (ACID ledger) and Firebase Realtime Database (ultra-low latency WebSockets).
2. **Hardware-Agnostic IoT Ingestion**: Direct compatibility with LoRaWAN (865 MHz India band) surface geomagnetic pucks, pole-mounted ultrasonic beams, and ANPR vision cameras.
3. **Delhi NCR Urban Simulator**: 358 smart bays across 9 realistic zones (Connaught Place, Khan Market, Karol Bagh, Lajpat Nagar, Cyber City Gurugram, AIIMS Hospital, Chandni Chowk, HUDA Metro, Nehru Place).
4. **Dynamic AI-Driven Surge Pricing & What-If Forecasting**: Keeping zones in the 70–85% target occupancy band while preventing price-gouging around hospitals and schools.
5. **Accessible Citizen PWA & Municipal Command Center**: Bilingual (English & Hindi) UPI-native booking with live turn-by-turn navigation.

---

## 🏗️ Architecture & Monorepo Structure

```
ParkSense/
├── apps/
│   ├── citizen/             # Citizen Progressive Web App (Next.js 15 App Router, MapLibre, UPI)
│   └── admin/               # Municipal Command & Control Dashboard (Next.js 15 App Router, Recharts)
├── packages/
│   └── shared/              # @parksense/shared: Isomorphic Zod validation schemas, types, and constants
├── functions/               # Firebase Cloud Functions (ingestEvent, pricingTick, authHooks)
├── simulator/               # Standalone Urban Telemetry Simulator CLI (1x/10x/60x speeds & presets)
├── tests/
│   └── rules/               # Security Rules Unit Tests (@firebase/rules-unit-testing)
├── docs/                    # Complete Architecture, Schema, and Sensor Documentation
│   ├── ARCHITECTURE.md      # Dual-database architecture & flow
│   ├── SCHEMA.md            # Data dictionary for all 11 Firestore collections & RTDB trees
│   └── SENSORS.md           # Hardware integration guide (LoRaWAN, ANPR, HMAC signatures)
├── firestore.rules          # Strict RBAC & Tenant Isolation security rules
└── database.rules.json      # Realtime Database hot state security rules
```

---

## 🛡️ Security & Role-Based Access Control (RBAC)

ParkSense implements custom claims for 5 distinct roles:
- **`citizen`**: Can view public zones and live occupancy; can **only** read/write their own reservations and payments. *Strict negative tests prevent citizens from viewing other citizens' payments.*
- **`super_admin`**: Full access to all collections, configuration, and audit logs.
- **`zone_manager`**: Manages bays and zone tariffs for assigned municipal jurisdictions.
- **`enforcement_officer`**: Issues and resolves parking violations and e-Challans.
- **`finance_auditor`**: Read-only access to transaction ledgers, pricing history, and municipal revenue analytics.

---

## 🚀 Quickstart & Local Development

### Prerequisites
- Node.js >= 20 (Node 26 LTS supported)
- Java 17+ (for Firebase Emulator Suite)

### Installation
```bash
git clone https://github.com/ranaabhishek0702-dotcom/Parking_System_AD.git
cd Parking_System_AD
npm install
npm run build
```

### Run Full Backend (Emulators + Seeder + Simulator)
```bash
npm run dev:backend
```
This single command:
1. Boots the Firebase Emulator Suite (Firestore on `:8080`, RTDB on `:9000`, Auth on `:9099`, Functions on `:5001`, Emulator UI on `http://127.0.0.1:4000`).
2. Seeds 9 realistic Delhi NCR zones, 358 bays, telemetry sensors, and dynamic pricing rules.
3. Starts the real-time urban telemetry simulator emitting live events.

### Run Security Rules Test Suite
```bash
npm run test:rules
```
Runs 18 positive and negative security tests verifying RBAC boundaries and payment isolation.

### Run Simulator Scenarios
```bash
npm run simulate:ipl     # IPL match night surge at 60x speed
npm run simulate:diwali  # Diwali retail rush at 60x speed
npm run backfill         # Generates 8 weeks (6,000+ points) of historical time-series data
```

---

## 📜 Documentation Index
- [Architecture Blueprint](docs/ARCHITECTURE.md)
- [Complete Data Schema](docs/SCHEMA.md)
- [Sensor Hardware Integration Protocol](docs/SENSORS.md)
- [Implementation Plan](file:///Users/abhishekrana/.gemini/antigravity-ide/brain/bb033eec-6330-4ae8-a3eb-9a9b5a97ca27/implementation_plan.md)

---

## 🏛️ MoHUA Smart Cities Compliance
- **Open Standards**: Fully compatible with Bureau of Indian Standards (BIS) IoT framework and OpenStreetMap open data.
- **Zero Lock-In**: Clean isomorphic TypeScript contracts without proprietary vendor lock-in.
- **Scalable**: Validated for 350+ sensors locally; horizontally scales to 50,000+ concurrent city bays on Firebase serverless infrastructure.

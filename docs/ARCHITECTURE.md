# ParkSense System Architecture

## Mission & MoHUA Context
ParkSense is built as a state-of-the-art street parking automation platform for Indian municipal corporations, under the Ministry of Housing and Urban Affairs (MoHUA) Smart Cities mission.

Indian street parking has unique challenges:
1. High density of two-wheelers alongside cars and commercial rickshaws/autos.
2. Informal parking attendants and rampant overstaying/unauthorized parking.
3. Unpredictable congestion surges (market days, festive rush, religious and sporting events).
4. Extreme environmental conditions (extreme summer heat 45°C+, monsoon waterlogging).

ParkSense tackles this with:
- **Zero-latency real-time state synchronization**: Dual-database architecture using Firestore for durable transactions and Realtime Database for sub-second reactive counters.
- **Hardware-agnostic ingestion**: Works with surface geomagnetic sensors, pole-mounted ultrasonics, and ANPR vision cameras.
- **AI-driven dynamic pricing and enforcement**: Predictive demand forecasting and automated violation detection.
- **Accessible Citizen PWA**: Lightweight, bilingual (English & Hindi), UPI-native (Razorpay), with turn-by-turn bay navigation.
- **Municipal Command Dashboard**: Zone heatmaps, custom tariff rules, and enforcement officer dispatch.

---

## Architecture Blueprint

```
+-----------------------------------------------------------------------------------+
|                                 PARKSENSE SYSTEM                                  |
+-----------------------------------------------------------------------------------+
|  CITIZEN PWA (Next.js 15)  |  MUNICIPAL ADMIN (Next.js 15) |  HARDWARE / SIMULATOR  |
|  - Realtime Bay Locator    |  - Live MapLibre Heatmap      |  - 330+ Delhi NCR Bays|
|  - Razorpay UPI Payments   |  - Dynamic Surge Multipliers  |  - Diurnal Peak Curves|
|  - English / Hindi i18n    |  - Enforcement Dispatch       |  - Speed (1x/10x/60x) |
|  - Turn-by-Turn Nav        |  - Gemini 2.5 AI Forecasting  |  - Scenario Presets   |
+----------------------------+-------------------------------+-----------------------+
                                        |
                                        v
+-----------------------------------------------------------------------------------+
|                           FIREBASE CLOUD FUNCTIONS                                |
|  - /ingestEvent: Gateway Event Ingestion (Zod Validated, Idempotent, Multi-DB)     |
|  - /authHooks: Custom Claims Management (Citizen, Admin, Enforcement, Auditor)   |
|  - /pricingEngine: Automated Dynamic Demand Tariffs                                |
+-----------------------------------------------------------------------------------+
                         |                                 |
                         v                                 v
+-------------------------------------+   +-----------------------------------------+
|     CLOUD FIRESTORE (DURABLE)       |   |       REALTIME DATABASE (HOT STATE)     |
|  - /zones                           |   |  - live_zones (Capacity & Rates)        |
|  - /bays                            |   |  - live_bays (Occupancy & Reservations) |
|  - /sensors                         |   |  - live_stats (City-wide Live Totals)   |
|  - /events (Immutable Ledger)       |   +-----------------------------------------+
|  - /reservations                    |
|  - /payments (Isolated per Citizen) |
|  - /pricing_rules & price_history   |
|  - /violations                      |
|  - /users                           |
|  - /audit_logs                      |
+-------------------------------------+
```

import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import picocolors from 'picocolors';
import { firestore, rtdb } from './firebase.js';
import type { VehicleType } from '@parksense/shared';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

interface CityConfig {
  city: string;
  state: string;
  timezone: string;
  zones: Array<{
    id: string;
    name: string;
    type: string;
    location: { lat: number; lng: number };
    polygon: Array<{ lat: number; lng: number }>;
    baseHourlyRate: number;
    operatingHours: { start: string; end: string; timezone: string };
    amenities: { hasEV: boolean; hasDisabled: boolean; covered: boolean };
    bayCounts: Record<string, number>;
  }>;
}

export async function runSeeder(configFilePath?: string) {
  const configFile =
    configFilePath ||
    path.resolve(__dirname, '../configs/delhi-ncr.json');

  if (!fs.existsSync(configFile)) {
    throw new Error(`Configuration file not found: ${configFile}`);
  }

  const raw = fs.readFileSync(configFile, 'utf-8');
  const cityConfig: CityConfig = JSON.parse(raw);

  console.log(
    picocolors.bold(
      picocolors.cyan(`\n🌱 Starting ParkSense Seeder for ${cityConfig.city}...`)
    )
  );

  let totalZonesCreated = 0;
  let totalBaysCreated = 0;
  let totalSensorsCreated = 0;

  const now = Date.now();
  const serverTimestamp = new Date();

  // RTDB batch accumulator
  const rtdbLiveZones: Record<string, any> = {};
  const rtdbLiveBays: Record<string, Record<string, any>> = {};

  for (const zone of cityConfig.zones) {
    let zoneTotalBays = 0;
    for (const count of Object.values(zone.bayCounts)) {
      zoneTotalBays += count;
    }

    // 1. Seed Zone in Firestore
    const zoneRef = firestore.collection('zones').doc(zone.id);
    await zoneRef.set({
      id: zone.id,
      name: zone.name,
      city: cityConfig.city,
      type: zone.type,
      location: zone.location,
      polygon: zone.polygon,
      totalBays: zoneTotalBays,
      baseHourlyRate: zone.baseHourlyRate,
      operatingHours: zone.operatingHours,
      amenities: zone.amenities,
      createdAt: serverTimestamp,
      updatedAt: serverTimestamp
    });
    totalZonesCreated++;

    // Prepare RTDB zone entry
    rtdbLiveZones[zone.id] = {
      totalBays: zoneTotalBays,
      occupiedBays: 0,
      reservedBays: 0,
      availableBays: zoneTotalBays,
      occupancyRate: 0,
      currentRatePerHour: zone.baseHourlyRate,
      lastUpdated: now
    };
    rtdbLiveBays[zone.id] = {};

    // 2. Generate Bays and Sensors for Zone
    const bayBatch = firestore.batch();
    let bayIndex = 1;

    for (const [vType, count] of Object.entries(zone.bayCounts)) {
      const vehicleType = vType as VehicleType;

      for (let i = 1; i <= count; i++) {
        const prefix =
          vehicleType === 'car'
            ? 'C'
            : vehicleType === 'two_wheeler'
              ? '2W'
              : vehicleType === 'ev'
                ? 'EV'
                : 'HA';

        const bayId = `bay-${zone.id}-${prefix.toLowerCase()}-${String(i).padStart(3, '0')}`;
        const sensorId = `sns-${zone.id}-${prefix.toLowerCase()}-${String(i).padStart(3, '0')}`;
        const bayNumber = `${prefix}-${String(i).padStart(2, '0')}`;

        // Generate slight lat/lng displacement around zone center
        const latOffset = (Math.random() - 0.5) * 0.0018;
        const lngOffset = (Math.random() - 0.5) * 0.0018;
        const bayLocation = {
          lat: Number((zone.location.lat + latOffset).toFixed(6)),
          lng: Number((zone.location.lng + lngOffset).toFixed(6))
        };

        // Write Bay
        const bayRef = firestore.collection('bays').doc(bayId);
        bayBatch.set(bayRef, {
          id: bayId,
          zoneId: zone.id,
          bayNumber,
          location: bayLocation,
          vehicleType,
          sensorId,
          status: 'available',
          currentSession: null,
          createdAt: serverTimestamp,
          updatedAt: serverTimestamp
        });

        // Write Sensor
        const sensorRef = firestore.collection('sensors').doc(sensorId);
        const sensorType =
          vehicleType === 'ev'
            ? 'camera_anpr'
            : Math.random() > 0.3
              ? 'geomagnetic_ground'
              : 'ultrasonic';

        bayBatch.set(sensorRef, {
          id: sensorId,
          bayId,
          zoneId: zone.id,
          type: sensorType,
          macOrEui: `E8:EB:11:${Math.floor(Math.random() * 89 + 10)}:${Math.floor(Math.random() * 89 + 10)}:${Math.floor(Math.random() * 89 + 10)}`,
          batteryPercent: Math.floor(Math.random() * 30 + 70), // 70-100%
          firmwareVersion: '1.2.4-delhi',
          lastHeartbeat: serverTimestamp,
          healthStatus: 'healthy'
        });

        // Add to RTDB bay branch
        rtdbLiveBays[zone.id][bayId] = {
          status: 'available',
          vehicleType,
          isReserved: false
        };

        totalBaysCreated++;
        totalSensorsCreated++;
        bayIndex++;
      }
    }

    await bayBatch.commit();
  }

  // 3. Write RTDB Live States
  await rtdb.ref('live_zones').set(rtdbLiveZones);
  await rtdb.ref('live_bays').set(rtdbLiveBays);
  await rtdb.ref('live_stats').set({
    totalLiveOccupied: 0,
    totalLiveAvailable: totalBaysCreated,
    activeViolationsCount: 0,
    systemHeartbeat: now
  });

  // 4. Seed Standard Pricing Rules
  const pricingRules = [
    {
      id: 'rule-peak-evening',
      zoneId: 'global',
      ruleName: 'Delhi Evening Peak Congestion Multiplier',
      multiplier: 1.5,
      conditions: {
        daysOfWeek: [1, 2, 3, 4, 5],
        startHour: 17,
        endHour: 21,
        occupancyThreshold: 0.75
      },
      active: true
    },
    {
      id: 'rule-weekend-retail-surge',
      zoneId: 'global',
      ruleName: 'Weekend Market Retail Surge',
      multiplier: 1.3,
      conditions: {
        daysOfWeek: [0, 6],
        startHour: 12,
        endHour: 22,
        occupancyThreshold: 0.7
      },
      active: true
    }
  ];

  for (const rule of pricingRules) {
    await firestore.collection('pricing_rules').doc(rule.id).set({
      ...rule,
      createdAt: serverTimestamp,
      updatedAt: serverTimestamp
    });
  }

  // 5. Seed Test Users with Custom Claims / Roles
  const testUsers = [
    {
      id: 'usr_citizen_demo',
      phone: '+919876543210',
      name: 'Rohan Sharma',
      roles: ['citizen'],
      preferredLanguage: 'en',
      savedVehicles: [{ plate: 'DL01AB1234', type: 'car', model: 'Tata Nexon EV' }]
    },
    {
      id: 'usr_admin_demo',
      phone: '+919999900001',
      name: 'Municipal Commissioner Delhi',
      roles: ['super_admin'],
      preferredLanguage: 'en',
      savedVehicles: []
    },
    {
      id: 'usr_enforcement_demo',
      phone: '+919999900002',
      name: 'Inspector Vikram Singh',
      roles: ['enforcement_officer'],
      preferredLanguage: 'hi',
      savedVehicles: []
    },
    {
      id: 'usr_auditor_demo',
      phone: '+919999900003',
      name: 'Priya Mehra (CAG Audit)',
      roles: ['finance_auditor'],
      preferredLanguage: 'en',
      savedVehicles: []
    }
  ];

  for (const user of testUsers) {
    await firestore.collection('users').doc(user.id).set({
      ...user,
      createdAt: serverTimestamp,
      updatedAt: serverTimestamp
    });
  }

  console.log(
    picocolors.green(
      `\n✅ Seeding complete! Populated:`
    )
  );
  console.log(picocolors.bold(`   • ${totalZonesCreated} Zones across ${cityConfig.city}`));
  console.log(picocolors.bold(`   • ${totalBaysCreated} Smart Parking Bays (Car, 2W, EV, Handicapped)`));
  console.log(picocolors.bold(`   • ${totalSensorsCreated} Telemetry Sensors`));
  console.log(picocolors.bold(`   • Initialized RTDB live_zones, live_bays, and live_stats`));
  console.log(picocolors.bold(`   • Seeded dynamic pricing rules & demo user accounts`));
}

// Allow direct CLI execution
if (process.argv[1] === fileURLToPath(import.meta.url)) {
  runSeeder()
    .then(() => process.exit(0))
    .catch((err) => {
      console.error(picocolors.red('Seeding failed:'), err);
      process.exit(1);
    });
}

import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import picocolors from 'picocolors';
import { firestore, rtdb } from './firebase.js';
import type { VehicleType } from '@parksense/shared';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Simple Mulberry32 Seedable PRNG
function createPrng(seedStr: string) {
  let h = 0;
  for (let i = 0; i < seedStr.length; i++) {
    h = Math.imul(31, h) + seedStr.charCodeAt(i) | 0;
  }
  return function () {
    h |= 0;
    h = (h + 0x6d2b79f5) | 0;
    let t = Math.imul(h ^ (h >>> 15), 1 | h);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

const INDIAN_STATES = ['DL', 'HR', 'UP'];
const DISTRICT_CODES = ['01', '02', '03', '04', '07', '10', '26'];
const LETTERS = 'ABCDEFGHJKLMNPQRSTUVWXYZ';

function generatePlate(random: () => number): string {
  const state = INDIAN_STATES[Math.floor(random() * INDIAN_STATES.length)];
  const district = DISTRICT_CODES[Math.floor(random() * DISTRICT_CODES.length)];
  const char1 = LETTERS[Math.floor(random() * LETTERS.length)];
  const char2 = LETTERS[Math.floor(random() * LETTERS.length)];
  const num = Math.floor(random() * 8999 + 1000);
  return `${state}${district}${char1}${char2}${num}`;
}

export interface SimulationOptions {
  speed: '1x' | '10x' | '60x';
  scenario: string;
  seed: string;
  cityConfigPath?: string;
  useHttpIngestion?: boolean;
}

export class SimulationEngine {
  private options: SimulationOptions;
  private isRunning: boolean = false;
  private prng: () => number;
  private scenarios: Record<string, any>;
  private cityConfig: any;
  private baysCache: Array<{
    id: string;
    zoneId: string;
    bayNumber: string;
    vehicleType: VehicleType;
    sensorId: string;
    status: string;
  }> = [];

  constructor(options: SimulationOptions) {
    this.options = options;
    this.prng = createPrng(options.seed);

    const scenariosPath = path.resolve(__dirname, '../configs/scenarios.json');
    this.scenarios = JSON.parse(fs.readFileSync(scenariosPath, 'utf-8'));

    const configPath =
      options.cityConfigPath || path.resolve(__dirname, '../configs/delhi-ncr.json');
    this.cityConfig = JSON.parse(fs.readFileSync(configPath, 'utf-8'));
  }

  async initialize() {
    console.log(picocolors.cyan(`📡 Loading bay network for ${this.cityConfig.city}...`));
    const snapshot = await firestore.collection('bays').get();

    if (snapshot.empty) {
      throw new Error(
        'No bays found in Firestore. Please run `npm run seed` first to populate the database!'
      );
    }

    this.baysCache = snapshot.docs.map((doc) => doc.data() as any);
    console.log(
      picocolors.green(`✓ Loaded ${this.baysCache.length} bays across ${this.cityConfig.zones.length} zones`)
    );

    // Listen for dynamic control updates from Admin Dashboard
    rtdb.ref('simulation_control').on('value', (snapshot) => {
      const ctrl = snapshot.val();
      if (ctrl) {
        if (ctrl.speed && ['1x', '10x', '60x'].includes(ctrl.speed) && ctrl.speed !== this.options.speed) {
          this.options.speed = ctrl.speed;
          console.log(picocolors.bold(picocolors.yellow(`\n⚡ [Simulator Control] Speed updated to ${ctrl.speed}`)));
        }
        if (ctrl.scenario && this.scenarios[ctrl.scenario] && ctrl.scenario !== this.options.scenario) {
          this.options.scenario = ctrl.scenario;
          console.log(picocolors.bold(picocolors.magenta(`\n🎪 [Simulator Control] Scenario shifted to ${this.scenarios[ctrl.scenario]?.name || ctrl.scenario}`)));
        }
        if (ctrl.seed && ctrl.seed !== this.options.seed) {
          this.options.seed = ctrl.seed;
          this.prng = createPrng(ctrl.seed);
          console.log(picocolors.bold(picocolors.cyan(`\n🌱 [Simulator Control] Seed re-initialized to ${ctrl.seed}`)));
        }
      }
    });

    // Write initial state to simulation_state
    await rtdb.ref('simulation_state').set({
      speed: this.options.speed,
      scenario: this.options.scenario,
      seed: this.options.seed,
      active: true,
      updatedAt: Date.now()
    });
  }

  async start() {
    this.isRunning = true;

    console.log(
      picocolors.bold(
        picocolors.magenta(`\n🚀 Urban Simulator Running at ${this.options.speed} Speed`)
      )
    );
    console.log(picocolors.bold(`   • Scenario: ${this.options.scenario}`));
    console.log(picocolors.gray(`   • Reproducible Seed: ${this.options.seed}`));
    console.log(picocolors.cyan(`\nLive Telemetry Stream:`));

    while (this.isRunning) {
      const scenario = this.scenarios[this.options.scenario] || this.scenarios['normal-weekday'];
      const tickIntervalMs =
        this.options.speed === '60x' ? 60 : this.options.speed === '10x' ? 350 : 2500;

      try {
        await this.step(scenario);
      } catch (err: any) {
        console.error(picocolors.red('Error during simulation step:'), err.message);
      }
      await new Promise((resolve) => setTimeout(resolve, tickIntervalMs));
    }
  }

  stop() {
    this.isRunning = false;
    rtdb.ref('simulation_control').off();
    rtdb.ref('simulation_state').update({ active: false });
    console.log(picocolors.yellow('Simulation stopped.'));
  }

  private async step(scenario: any) {
    if (this.baysCache.length === 0) return;

    // Pick random bay
    const bayIndex = Math.floor(this.prng() * this.baysCache.length);
    const bay = this.baysCache[bayIndex];
    const isCurrentlyOccupied = bay.status === 'occupied';

    // Decide event type based on current status and scenario weights
    const eventType: 'ENTRY' | 'EXIT' = isCurrentlyOccupied ? 'EXIT' : 'ENTRY';
    const timestamp = Date.now();
    const plate = generatePlate(this.prng);

    const idempotencyKey = `${bay.sensorId}_${timestamp}_${eventType}`;

    // Update memory cache
    bay.status = eventType === 'ENTRY' ? 'occupied' : 'available';

    // Trigger violation scenario check
    const isViolation =
      eventType === 'ENTRY' && this.prng() < (scenario.violationProbability || 0.04);

    // Build gateway telemetry payload
    const eventPayload = {
      gatewayId: `GW-${bay.zoneId.toUpperCase()}-01`,
      sensorId: bay.sensorId,
      bayId: bay.id,
      zoneId: bay.zoneId,
      eventType,
      timestamp,
      idempotencyKey,
      vehicleMetadata: {
        detectedClass: bay.vehicleType,
        licensePlate: plate,
        confidenceScore: 0.94 + Number((this.prng() * 0.05).toFixed(2))
      },
      telemetry: {
        batteryVoltage: 3.6 + (this.prng() * 0.4),
        signalRssi: -70 - Math.floor(this.prng() * 20),
        temperatureC: 32 + Math.floor(this.prng() * 6)
      }
    };

    // If HTTP ingestion is desired and accessible, we dispatch HTTP POST
    // Otherwise we update directly via Admin SDK for high throughput & stability
    await this.applyEventDirectly(eventPayload, isViolation);

    // Print colorful live line
    const eventTag =
      eventType === 'ENTRY'
        ? picocolors.green(' ENTRY ')
        : picocolors.yellow('  EXIT ');

    const violationTag = isViolation
      ? picocolors.bgRed(picocolors.white(' ⚠️ VIOLATION '))
      : '';

    console.log(
      `${picocolors.gray(new Date().toLocaleTimeString())} | ${eventTag} | ${picocolors.cyan(bay.zoneId.padEnd(20))} | ${picocolors.bold(bay.bayNumber.padEnd(7))} | ${plate} (${bay.vehicleType}) ${violationTag}`
    );
  }

  private async applyEventDirectly(event: any, isViolation: boolean) {
    const { zoneId, bayId, eventType, timestamp, idempotencyKey, vehicleMetadata, telemetry } =
      event;
    const serverTimestamp = new Date();

    // 1. Record Firestore Event
    const eventRef = firestore.collection('events').doc(idempotencyKey);
    await eventRef.set({
      id: idempotencyKey,
      idempotencyKey,
      bayId,
      zoneId,
      sensorId: event.sensorId,
      eventType,
      timestamp: new Date(timestamp),
      receivedAt: serverTimestamp,
      vehicleType: vehicleMetadata.detectedClass,
      vehicleNumberPlate: vehicleMetadata.licensePlate,
      confidence: vehicleMetadata.confidenceScore,
      rawPayload: event
    });

    // 2. Update Firestore Bay
    const bayRef = firestore.collection('bays').doc(bayId);
    if (eventType === 'ENTRY') {
      await bayRef.set(
        {
          status: 'occupied',
          currentSession: {
            vehicleNumber: vehicleMetadata.licensePlate,
            occupiedSince: new Date(timestamp),
            eventId: idempotencyKey
          },
          updatedAt: serverTimestamp
        },
        { merge: true }
      );
    } else {
      await bayRef.set(
        {
          status: 'available',
          currentSession: null,
          updatedAt: serverTimestamp
        },
        { merge: true }
      );
    }

    // 3. If violation, write to /violations
    if (isViolation) {
      const violationId = `viol_${Date.now()}_${bayId}`;
      await firestore.collection('violations').doc(violationId).set({
        id: violationId,
        zoneId,
        bayId,
        type: 'unauthorized_parking',
        vehicleNumber: vehicleMetadata.licensePlate,
        detectedAt: serverTimestamp,
        status: 'detected',
        fineAmount: 500,
        challanId: `CH-${Date.now().toString().slice(-6)}`
      });
    }

    // 4. Update RTDB Live State atomically
    const zoneLiveRef = rtdb.ref(`live_zones/${zoneId}`);
    const bayLiveRef = rtdb.ref(`live_bays/${zoneId}/${bayId}`);

    await bayLiveRef.update({
      status: eventType === 'ENTRY' ? 'occupied' : 'available',
      occupiedSince: eventType === 'ENTRY' ? timestamp : null
    });

    await zoneLiveRef.transaction((currentZone) => {
      if (!currentZone) return currentZone;
      const total = currentZone.totalBays || 30;
      let occupied = currentZone.occupiedBays || 0;
      const reserved = currentZone.reservedBays || 0;

      if (eventType === 'ENTRY') {
        occupied = Math.min(total, occupied + 1);
      } else {
        occupied = Math.max(0, occupied - 1);
      }

      const available = Math.max(0, total - occupied - reserved);
      const occupancyRate = total > 0 ? Number((occupied / total).toFixed(4)) : 0;

      return {
        ...currentZone,
        occupiedBays: occupied,
        availableBays: available,
        occupancyRate,
        lastUpdated: timestamp
      };
    });

    // Update global RTDB heartbeat
    await rtdb.ref('live_stats').update({
      systemHeartbeat: timestamp
    });
  }
}

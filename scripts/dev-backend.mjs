import { spawn } from 'child_process';
import http from 'http';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const rootDir = path.resolve(__dirname, '..');
const configDir = path.join(rootDir, '.config');

function checkPort(port, host = '127.0.0.1') {
  return new Promise((resolve) => {
    const req = http.get(`http://${host}:${port}`, () => resolve(true));
    req.on('error', () => resolve(false));
    req.setTimeout(800, () => {
      req.destroy();
      resolve(false);
    });
  });
}

async function waitForEmulators(timeoutMs = 60000) {
  const start = Date.now();
  process.stdout.write('⏳ Waiting for Firebase Emulators (UI on :4000, RTDB on :9000, Firestore on :8080)...');

  while (Date.now() - start < timeoutMs) {
    const [uiReady, rtdbReady, firestoreReady] = await Promise.all([
      checkPort(4000),
      checkPort(9000),
      checkPort(8080)
    ]);

    if (uiReady && rtdbReady && firestoreReady) {
      console.log('\n✅ All Firebase Emulators are fully online!');
      return true;
    }
    process.stdout.write('.');
    await new Promise((r) => setTimeout(r, 1000));
  }
  throw new Error('Timed out waiting for Firebase Emulators to start.');
}

async function main() {
  console.log('🚀 Starting ParkSense Backend Infrastructure (Emulators + Seeder + Simulator)...\n');

  let simulatorProcess = null;
  let emulatorProcess = null;

  const cleanup = () => {
    console.log('\n🛑 Shutting down ParkSense services...');
    try {
      simulatorProcess?.kill('SIGINT');
      emulatorProcess?.kill('SIGINT');
    } catch (e) {}
    process.exit(0);
  };

  process.on('SIGINT', cleanup);
  process.on('SIGTERM', cleanup);

  // 1. Spawn Firebase Emulators
  emulatorProcess = spawn(
    'npx',
    ['firebase-tools', 'emulators:start', '--project', 'parksense-india', '--only', 'auth,firestore,database,functions'],
    {
      cwd: rootDir,
      stdio: 'inherit',
      env: {
        ...process.env,
        XDG_CONFIG_HOME: configDir,
        USE_FIREBASE_EMULATORS: 'true'
      }
    }
  );

  // 2. Wait for Emulators to become healthy
  await waitForEmulators();

  // 3. Seed Database
  console.log('\n🌱 Running ParkSense Seeder...');
  const seederPromise = new Promise((resolve, reject) => {
    const seeder = spawn('npx', ['tsx', 'simulator/src/seeder.ts'], {
      cwd: rootDir,
      stdio: 'inherit',
      env: {
        ...process.env,
        XDG_CONFIG_HOME: configDir,
        USE_FIREBASE_EMULATORS: 'true',
        FIRESTORE_EMULATOR_HOST: '127.0.0.1:8080',
        FIREBASE_DATABASE_EMULATOR_HOST: '127.0.0.1:9000',
        FIREBASE_AUTH_EMULATOR_HOST: '127.0.0.1:9099'
      }
    });
    seeder.on('close', (code) => {
      if (code === 0) resolve();
      else reject(new Error(`Seeder failed with exit code ${code}`));
    });
  });

  await seederPromise;

  // 4. Start Simulator
  console.log('\n🏎️ Starting ParkSense Urban Telemetry Simulator...');
  simulatorProcess = spawn(
    'npx',
    [
      'tsx',
      'simulator/src/index.ts',
      '--speed',
      process.env.SIMULATOR_SPEED || '10x',
      '--scenario',
      process.env.SIMULATOR_SCENARIO || 'normal-weekday'
    ],
    {
      cwd: rootDir,
      stdio: 'inherit',
      env: {
        ...process.env,
        XDG_CONFIG_HOME: configDir,
        USE_FIREBASE_EMULATORS: 'true',
        FIRESTORE_EMULATOR_HOST: '127.0.0.1:8080',
        FIREBASE_DATABASE_EMULATOR_HOST: '127.0.0.1:9000',
        FIREBASE_AUTH_EMULATOR_HOST: '127.0.0.1:9099'
      }
    }
  );
}

main().catch((err) => {
  console.error('\n❌ Fatal error in dev:backend:', err);
  process.exit(1);
});

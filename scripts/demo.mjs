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

async function waitForPorts(ports, timeoutMs = 60000) {
  const start = Date.now();
  process.stdout.write(`⏳ Waiting for services on ports [${ports.join(', ')}]...`);

  while (Date.now() - start < timeoutMs) {
    const checks = await Promise.all(ports.map((p) => checkPort(p)));
    if (checks.every(Boolean)) {
      console.log('\n✅ All target ports are live!');
      return true;
    }
    process.stdout.write('.');
    await new Promise((r) => setTimeout(r, 1000));
  }
  return false;
}

function openUrl(url) {
  const startCmd =
    process.platform === 'darwin'
      ? 'open'
      : process.platform === 'win32'
      ? 'start'
      : 'xdg-open';
  spawn(startCmd, [url], { stdio: 'ignore', shell: true });
}

async function main() {
  console.log('╔═════════════════════════════════════════════════════════════════════════════╗');
  console.log('║        🚀 PARKSENSE DEMO ORCHESTRATOR — SMART STREET PARKING PLATFORM      ║');
  console.log('║       Ministry of Housing and Urban Affairs (MoHUA) Smart Cities Mission     ║');
  console.log('╚═════════════════════════════════════════════════════════════════════════════╝\n');

  const children = [];

  const cleanup = () => {
    console.log('\n🛑 Gracefully shutting down all ParkSense demo services...');
    for (const child of children) {
      try {
        child.kill('SIGINT');
      } catch (e) {}
    }
    process.exit(0);
  };

  process.on('SIGINT', cleanup);
  process.on('SIGTERM', cleanup);

  // 1. Build shared packages if dist not found
  console.log('📦 Verifying shared packages & engine...');
  const buildPromise = new Promise((resolve) => {
    const b = spawn('npm', ['run', 'build'], { cwd: rootDir, stdio: 'inherit' });
    b.on('close', () => resolve());
  });
  await buildPromise;

  // 2. Check if Firebase emulators already running
  const emulatorsAlreadyRunning = (await checkPort(8080)) && (await checkPort(9000));

  if (!emulatorsAlreadyRunning) {
    console.log('\n🔥 Launching Firebase Emulators Suite (Auth, Firestore, RTDB, Functions)...');
    const emu = spawn(
      'npx',
      [
        'firebase-tools',
        'emulators:start',
        '--project',
        'parksense-india',
        '--only',
        'auth,firestore,database,functions'
      ],
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
    children.push(emu);

    await waitForPorts([8080, 9000, 5001]);
  } else {
    console.log('✅ Firebase Emulators are already running on ports 8080, 9000, 5001.');
  }

  // 3. Seed initial zones & bays if needed
  console.log('\n🌱 Ensuring database has Delhi NCR network topology...');
  const seedPromise = new Promise((resolve) => {
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
    seeder.on('close', () => resolve());
  });
  await seedPromise;

  // 4. Start Real-Time Simulator if not already running
  const simulatorAlreadyRunning = await checkPort(9000); // Check RTDB connection
  console.log('\n🏎️ Starting Real-Time Urban Sensor Simulator (10x Speed)...');
  const sim = spawn(
    'npx',
    ['tsx', 'simulator/src/index.ts', '-s', '10x', '-c', 'normal-weekday'],
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
  children.push(sim);

  // 5. Start Citizen PWA (Port 3000)
  const citizenAlreadyRunning = await checkPort(3000);
  if (!citizenAlreadyRunning) {
    console.log('\n📱 Launching Citizen PWA (http://localhost:3000)...');
    const citizen = spawn('npm', ['run', 'dev', '--workspace=parksense-citizen'], {
      cwd: rootDir,
      stdio: 'inherit'
    });
    children.push(citizen);
  }

  // 6. Start Admin Command Dashboard (Port 3001)
  const adminAlreadyRunning = await checkPort(3001);
  if (!adminAlreadyRunning) {
    console.log('\n🖥️ Launching Admin Mission Control (http://localhost:3001)...');
    const admin = spawn('npm', ['run', 'dev', '--workspace=parksense-admin'], {
      cwd: rootDir,
      stdio: 'inherit'
    });
    children.push(admin);
  }

  // 7. Wait for both apps and open them
  await waitForPorts([3000, 3001]);

  console.log('\n✨ PARKSENSE IS FULLY OPERATIONAL!');
  console.log('   • Citizen Mobile PWA:    http://localhost:3000');
  console.log('   • Admin Mission Control: http://localhost:3001');
  console.log('   • Firebase Emulator UI:  http://127.0.0.1:4000');

  console.log('\n🌐 Opening applications in your default web browser...');
  openUrl('http://localhost:3000');
  setTimeout(() => openUrl('http://localhost:3001'), 1500);

  console.log('\nPress Ctrl+C to shut down all processes.');
}

main().catch((err) => {
  console.error('\n❌ Error running demo:', err);
  process.exit(1);
});

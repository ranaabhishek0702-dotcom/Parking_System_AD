import { spawn } from 'child_process';
import http from 'http';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const rootDir = path.resolve(__dirname, '..');

function isEmulatorRunning(port = 8080) {
  return new Promise((resolve) => {
    const req = http.get(`http://127.0.0.1:${port}`, () => resolve(true));
    req.on('error', () => resolve(false));
    req.setTimeout(600, () => {
      req.destroy();
      resolve(false);
    });
  });
}

async function run() {
  const alreadyRunning = await isEmulatorRunning(8080);

  if (alreadyRunning) {
    console.log('⚡ Firebase Emulators already running on :8080 / :9000. Running rules tests directly...\n');
    const directTest = spawn('npm', ['run', 'test', '--workspace=rules-tests'], {
      cwd: rootDir,
      stdio: 'inherit',
      env: {
        ...process.env,
        USE_FIREBASE_EMULATORS: 'true',
        FIRESTORE_EMULATOR_HOST: '127.0.0.1:8080',
        FIREBASE_DATABASE_EMULATOR_HOST: '127.0.0.1:9000'
      }
    });

    directTest.on('close', (code) => {
      process.exit(code ?? 0);
    });
  } else {
    console.log('🚀 Spawning transient Firebase Emulators for rules testing...\n');
    const testProcess = spawn(
      'npx',
      [
        'firebase-tools',
        'emulators:exec',
        '--only',
        'firestore,database',
        'npm run test --workspace=rules-tests'
      ],
      {
        cwd: rootDir,
        stdio: 'inherit',
        env: {
          ...process.env,
          XDG_CONFIG_HOME: path.join(rootDir, '.config'),
          USE_FIREBASE_EMULATORS: 'true'
        }
      }
    );

    testProcess.on('close', (code) => {
      process.exit(code ?? 0);
    });
  }
}

run();

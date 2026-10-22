import { spawn } from 'child_process';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const rootDir = path.resolve(__dirname, '..');

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

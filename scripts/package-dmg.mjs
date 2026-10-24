import fs from 'fs';
import path from 'path';
import { execSync } from 'child_process';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const rootDir = path.resolve(__dirname, '..');
const desktopDir = path.join(rootDir, 'apps', 'desktop');
const releaseDir = path.join(desktopDir, 'release');
const macAppDir = path.join(releaseDir, 'mac');
const targetApp = path.join(macAppDir, 'ParkSense.app');
const electronDistApp = path.join(rootDir, 'node_modules', 'electron', 'dist', 'Electron.app');

async function buildDmg() {
  console.log('🚀 Building ParkSense macOS Standalone App & DMG Installer...\n');

  // 1. Compile TypeScript
  console.log('📦 1. Compiling Desktop TypeScript...');
  execSync('npm run build --workspace=parksense-desktop', { cwd: rootDir, stdio: 'inherit' });

  // 2. Prepare release directories
  if (fs.existsSync(releaseDir)) {
    fs.rmSync(releaseDir, { recursive: true, force: true });
  }
  fs.mkdirSync(macAppDir, { recursive: true });

  // 3. Clone Electron.app skeleton
  console.log('📂 2. Extracting Electron macOS runtime bundle...');
  execSync(`cp -R "${electronDistApp}" "${targetApp}"`);

  // 4. Update Info.plist
  console.log('⚙️ 3. Configuring macOS bundle metadata (Info.plist)...');
  const plistPath = path.join(targetApp, 'Contents', 'Info.plist');
  let plist = fs.readFileSync(plistPath, 'utf-8');

  plist = plist.replace(/<key>CFBundleDisplayName<\/key>\s*<string>[^<]*<\/string>/, 
    '<key>CFBundleDisplayName</key><string>ParkSense</string>');
  plist = plist.replace(/<key>CFBundleName<\/key>\s*<string>[^<]*<\/string>/, 
    '<key>CFBundleName</key><string>ParkSense</string>');
  plist = plist.replace(/<key>CFBundleIdentifier<\/key>\s*<string>[^<]*<\/string>/, 
    '<key>CFBundleIdentifier</key><string>in.gov.mohua.parksense</string>');
  plist = plist.replace(/<key>CFBundleExecutable<\/key>\s*<string>Electron<\/string>/, 
    '<key>CFBundleExecutable</key><string>ParkSense</string>');
  plist = plist.replace(/<key>CFBundleIconFile<\/key>\s*<string>[^<]*<\/string>/, 
    '<key>CFBundleIconFile</key><string>icon.icns</string>');

  fs.writeFileSync(plistPath, plist, 'utf-8');

  // 5. Rename binary
  const oldBin = path.join(targetApp, 'Contents', 'MacOS', 'Electron');
  const newBin = path.join(targetApp, 'Contents', 'MacOS', 'ParkSense');
  fs.renameSync(oldBin, newBin);

  // 6. Copy Icon
  const icnsSrc = path.join(desktopDir, 'assets', 'icon.icns');
  const icnsDst = path.join(targetApp, 'Contents', 'Resources', 'icon.icns');
  if (fs.existsSync(icnsSrc)) {
    fs.copyFileSync(icnsSrc, icnsDst);
  }

  // 7. Inject App Code into Contents/Resources/app/
  console.log('🧩 4. Injecting ParkSense code and assets into application bundle...');
  const appResDir = path.join(targetApp, 'Contents', 'Resources', 'app');
  fs.mkdirSync(appResDir, { recursive: true });

  // Copy dist
  fs.cpSync(path.join(desktopDir, 'dist'), path.join(appResDir, 'dist'), { recursive: true });
  // Copy assets
  fs.cpSync(path.join(desktopDir, 'assets'), path.join(appResDir, 'assets'), { recursive: true });
  // Copy package.json
  fs.copyFileSync(path.join(desktopDir, 'package.json'), path.join(appResDir, 'package.json'));

  // 8. Ad-hoc codesign
  console.log('🔏 5. Applying ad-hoc Apple codesign signature...');
  try {
    execSync(`codesign --force --deep --sign - "${targetApp}"`, { stdio: 'ignore' });
  } catch (e) {
    console.warn('⚠️ Codesign note:', e.message);
  }

  // 9. Build DMG with Applications symlink
  console.log('💿 6. Generating Apple Disk Image (DMG) via hdiutil...');
  const dmgStage = path.join(releaseDir, 'dmg_stage');
  fs.mkdirSync(dmgStage, { recursive: true });

  execSync(`cp -R "${targetApp}" "${dmgStage}/ParkSense.app"`);
  execSync(`ln -s /Applications "${dmgStage}/Applications"`);

  const outputDmg = path.join(releaseDir, 'ParkSense-1.0.0-arm64.dmg');
  const rootDmg = path.join(rootDir, 'ParkSense-1.0.0-arm64.dmg');

  execSync(
    `hdiutil create -volname "ParkSense Installer" -srcfolder "${dmgStage}" -ov -format UDZO "${outputDmg}"`,
    { stdio: 'inherit' }
  );

  // Clean up staging folder
  fs.rmSync(dmgStage, { recursive: true, force: true });

  // Also create a copy in the repository root for instant user access
  fs.copyFileSync(outputDmg, rootDmg);

  const stats = fs.statSync(outputDmg);
  const sizeMB = (stats.size / (1024 * 1024)).toFixed(1);

  console.log('\n========================================================================');
  console.log('🎉 PARKSENSE MACOS DMG INSTALLER CREATED SUCCESSFULLY!');
  console.log('========================================================================');
  console.log(`📁 DMG File Location:   ${outputDmg}`);
  console.log(`📁 Root Shortcut:       ${rootDmg}`);
  console.log(`📱 App Bundle Location: ${targetApp}`);
  console.log(`📊 DMG Package Size:    ${sizeMB} MB`);
  console.log('========================================================================\n');
}

buildDmg().catch((err) => {
  console.error('❌ Failed to build DMG:', err);
  process.exit(1);
});

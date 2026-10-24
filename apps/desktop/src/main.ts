import {
  app,
  BrowserWindow,
  Menu,
  Tray,
  ipcMain,
  dialog,
  shell,
  Notification,
  nativeImage,
  MenuItemConstructorOptions
} from 'electron';
import * as path from 'path';
import * as http from 'http';
import * as fs from 'fs';
import * as os from 'os';

// URLs for ParkSense surfaces
const ADMIN_URL = process.env.PARKSENSE_ADMIN_URL || 'http://localhost:3001';
const CITIZEN_URL = process.env.PARKSENSE_CITIZEN_URL || 'http://localhost:3000';

let mainWindow: BrowserWindow | null = null;
let citizenWindow: BrowserWindow | null = null;
let splashWindow: BrowserWindow | null = null;
let tray: Tray | null = null;

// Configure App Name
app.setName('ParkSense Desktop');

/**
 * Creates the sleek animated splash window while servers connect
 */
function createSplashWindow() {
  splashWindow = new BrowserWindow({
    width: 480,
    height: 380,
    resizable: false,
    frame: false,
    transparent: true,
    alwaysOnTop: true,
    center: true,
    show: false,
    webPreferences: {
      nodeIntegration: false,
      contextIsolation: true
    }
  });

  const splashPath = path.join(__dirname, '../assets/splash.html');
  splashWindow.loadFile(splashPath);

  splashWindow.once('ready-to-show', () => {
    if (splashWindow) {
      splashWindow.show();
    }
  });
}

/**
 * Creates the primary City Admin ICCC Command Center window
 */
function createMainWindow() {
  const iconPath = path.join(__dirname, '../assets/icon.png');

  mainWindow = new BrowserWindow({
    width: 1440,
    height: 920,
    minWidth: 1080,
    minHeight: 700,
    backgroundColor: '#090d16',
    title: 'ParkSense — MoHUA Smart City Command Centre',
    icon: fs.existsSync(iconPath) ? nativeImage.createFromPath(iconPath) : undefined,
    show: false,
    titleBarStyle: process.platform === 'darwin' ? 'hiddenInset' : 'default',
    trafficLightPosition: { x: 16, y: 18 },
    webPreferences: {
      preload: path.join(__dirname, 'preload.js'),
      contextIsolation: true,
      nodeIntegration: false,
      sandbox: false
    }
  });

  // Check server availability before loading, or poll if starting up
  loadAdminWithRetry(ADMIN_URL, 15);

  mainWindow.once('ready-to-show', () => {
    if (splashWindow && !splashWindow.isDestroyed()) {
      splashWindow.destroy();
      splashWindow = null;
    }
    if (mainWindow) {
      mainWindow.show();
      mainWindow.focus();
    }
  });

  mainWindow.on('closed', () => {
    mainWindow = null;
  });

  mainWindow.webContents.on('did-finish-load', async () => {
    try {
      setTimeout(async () => {
        if (mainWindow && !mainWindow.isDestroyed()) {
          const img = await mainWindow.webContents.capturePage();
          const artifactDir =
            '/Users/abhishekrana/.gemini/antigravity-ide/brain/bb033eec-6330-4ae8-a3eb-9a9b5a97ca27';
          if (fs.existsSync(artifactDir)) {
            fs.writeFileSync(path.join(artifactDir, 'electron_desktop_render.png'), img.toPNG());
          }
        }
      }, 2500);
    } catch {
      // ignore
    }
  });

  mainWindow.webContents.setWindowOpenHandler(({ url }) => {
    if (url.startsWith('http:') || url.startsWith('https:')) {
      shell.openExternal(url);
      return { action: 'deny' };
    }
    return { action: 'allow' };
  });
}

/**
 * Polls the Admin server until ready, then loads the URL
 */
function loadAdminWithRetry(url: string, retriesLeft: number) {
  const checkServer = () => {
    http
      .get(url, (res) => {
        if (res.statusCode && res.statusCode < 500) {
          if (mainWindow && !mainWindow.isDestroyed()) {
            mainWindow.loadURL(url);
          }
        } else if (retriesLeft > 0) {
          setTimeout(() => loadAdminWithRetry(url, retriesLeft - 1), 800);
        } else {
          if (mainWindow && !mainWindow.isDestroyed()) {
            mainWindow.loadURL(url);
          }
        }
      })
      .on('error', () => {
        if (retriesLeft > 0) {
          setTimeout(() => loadAdminWithRetry(url, retriesLeft - 1), 800);
        } else {
          // If server still unreachable, load with default error page
          if (mainWindow && !mainWindow.isDestroyed()) {
            mainWindow.loadURL(url);
          }
        }
      });
  };
  checkServer();
}

/**
 * Creates or focuses the Citizen Mobile Companion simulator window
 */
function openCitizenCompanion() {
  if (citizenWindow && !citizenWindow.isDestroyed()) {
    citizenWindow.focus();
    return;
  }

  const iconPath = path.join(__dirname, '../assets/icon.png');

  citizenWindow = new BrowserWindow({
    width: 412,
    height: 880,
    minWidth: 380,
    minHeight: 650,
    maxWidth: 500,
    backgroundColor: '#0f172a',
    title: 'ParkSense Citizen — Mobile Companion',
    icon: fs.existsSync(iconPath) ? nativeImage.createFromPath(iconPath) : undefined,
    show: false,
    titleBarStyle: process.platform === 'darwin' ? 'hiddenInset' : 'default',
    trafficLightPosition: { x: 12, y: 16 },
    webPreferences: {
      preload: path.join(__dirname, 'preload.js'),
      contextIsolation: true,
      nodeIntegration: false
    }
  });

  citizenWindow.loadURL(CITIZEN_URL);

  citizenWindow.once('ready-to-show', () => {
    if (citizenWindow) {
      citizenWindow.show();
      citizenWindow.focus();
    }
  });

  citizenWindow.webContents.on('did-finish-load', async () => {
    try {
      setTimeout(async () => {
        if (citizenWindow && !citizenWindow.isDestroyed()) {
          const img = await citizenWindow.webContents.capturePage();
          const artifactDir =
            '/Users/abhishekrana/.gemini/antigravity-ide/brain/bb033eec-6330-4ae8-a3eb-9a9b5a97ca27';
          if (fs.existsSync(artifactDir)) {
            fs.writeFileSync(
              path.join(artifactDir, 'electron_desktop_citizen_companion.png'),
              img.toPNG()
            );
          }
        }
      }, 2500);
    } catch {
      // ignore
    }
  });

  citizenWindow.on('closed', () => {
    citizenWindow = null;
  });
}

/**
 * Build Native Application Menu Bar
 */
function setupApplicationMenu() {
  const isMac = process.platform === 'darwin';

  const sendToRenderer = (channel: string, ...args: any[]) => {
    if (mainWindow && !mainWindow.isDestroyed()) {
      mainWindow.webContents.send(channel, ...args);
    }
  };

  const template: MenuItemConstructorOptions[] = [
    ...(isMac
      ? [
          {
            label: app.name,
            submenu: [
              { role: 'about' as const, label: 'About ParkSense Desktop' },
              { type: 'separator' as const },
              {
                label: 'Preferences...',
                accelerator: 'Cmd+,',
                click: () => sendToRenderer('menu:navigate-tab', 'manage')
              },
              { type: 'separator' as const },
              { role: 'services' as const },
              { type: 'separator' as const },
              { role: 'hide' as const },
              { role: 'hideOthers' as const },
              { role: 'unhide' as const },
              { type: 'separator' as const },
              { role: 'quit' as const }
            ]
          }
        ]
      : []),
    {
      label: 'File',
      submenu: [
        {
          label: '📱 Open Citizen Mobile Companion',
          accelerator: 'CmdOrCtrl+Shift+M',
          click: () => openCitizenCompanion()
        },
        { type: 'separator' },
        {
          label: 'Export Settlement Report (CSV)...',
          accelerator: 'CmdOrCtrl+S',
          click: () => sendToRenderer('menu:navigate-tab', 'finance')
        },
        {
          label: 'Export e-Challan / Page to PDF...',
          accelerator: 'CmdOrCtrl+P',
          click: async () => {
            if (mainWindow) {
              const res = await dialog.showSaveDialog(mainWindow, {
                title: 'Save PDF Report',
                defaultPath: `ParkSense_Report_${Date.now()}.pdf`,
                filters: [{ name: 'PDF Document', extensions: ['pdf'] }]
              });
              if (!res.canceled && res.filePath) {
                const pdfData = await mainWindow.webContents.printToPDF({});
                fs.writeFileSync(res.filePath, pdfData);
                new Notification({
                  title: 'ParkSense PDF Exported',
                  body: `Saved report to ${path.basename(res.filePath)}`
                }).show();
              }
            }
          }
        },
        { type: 'separator' },
        isMac ? { role: 'close' } : { role: 'quit' }
      ]
    },
    {
      label: 'Navigation',
      submenu: [
        {
          label: '🛰️ 1. Live City Overview',
          accelerator: 'CmdOrCtrl+1',
          click: () => sendToRenderer('menu:navigate-tab', 'overview')
        },
        {
          label: '📈 2. Predict & Demand',
          accelerator: 'CmdOrCtrl+2',
          click: () => sendToRenderer('menu:navigate-tab', 'predict')
        },
        {
          label: '⚙️ 3. Manage & Tariff Guardrails',
          accelerator: 'CmdOrCtrl+3',
          click: () => sendToRenderer('menu:navigate-tab', 'manage')
        },
        {
          label: '💰 4. Municipal Finance & Settlements',
          accelerator: 'CmdOrCtrl+4',
          click: () => sendToRenderer('menu:navigate-tab', 'finance')
        },
        {
          label: '🚨 5. Enforcement & e-Challan',
          accelerator: 'CmdOrCtrl+5',
          click: () => sendToRenderer('menu:navigate-tab', 'enforcement')
        },
        {
          label: '🌱 6. Civic & Environmental Impact',
          accelerator: 'CmdOrCtrl+6',
          click: () => sendToRenderer('menu:navigate-tab', 'impact')
        },
        {
          label: '🎮 7. Simulation Control Lab',
          accelerator: 'CmdOrCtrl+7',
          click: () => sendToRenderer('menu:navigate-tab', 'simulation')
        },
        {
          label: '🤖 8. MoHUA AI Copilot',
          accelerator: 'CmdOrCtrl+8',
          click: () => sendToRenderer('menu:navigate-tab', 'copilot')
        }
      ]
    },
    {
      label: 'Role Persona',
      submenu: [
        {
          label: '👑 Super Admin (MoHUA Director)',
          accelerator: 'CmdOrCtrl+Alt+1',
          click: () => sendToRenderer('menu:switch-role', 'super_admin')
        },
        {
          label: '🏢 Zone Manager (NDMC Commercial)',
          accelerator: 'CmdOrCtrl+Alt+2',
          click: () => sendToRenderer('menu:switch-role', 'zone_manager')
        },
        {
          label: '🚔 Enforcement Officer (Traffic Police)',
          accelerator: 'CmdOrCtrl+Alt+3',
          click: () => sendToRenderer('menu:switch-role', 'enforcement_officer')
        },
        {
          label: '📊 Finance Auditor (CAG Division)',
          accelerator: 'CmdOrCtrl+Alt+4',
          click: () => sendToRenderer('menu:switch-role', 'finance_auditor')
        }
      ]
    },
    {
      label: 'Simulation',
      submenu: [
        {
          label: 'Preset: Normal Weekday Baseline',
          click: () => sendToRenderer('menu:trigger-scenario', 'normal_weekday')
        },
        {
          label: 'Preset: IPL Match Night Surge',
          click: () => sendToRenderer('menu:trigger-scenario', 'ipl_match_rush')
        },
        {
          label: 'Preset: Diwali Festival Shopping Rush',
          click: () => sendToRenderer('menu:trigger-scenario', 'diwali_rush')
        },
        {
          label: 'Preset: Monsoon Deluge & Gridlock',
          click: () => sendToRenderer('menu:trigger-scenario', 'monsoon_deluge')
        },
        {
          label: 'Preset: Illegal Parking Stress Test',
          click: () => sendToRenderer('menu:trigger-scenario', 'illegal_stress_test')
        }
      ]
    },
    {
      label: 'View',
      submenu: [
        { role: 'reload' },
        { role: 'forceReload' },
        { role: 'toggleDevTools' },
        { type: 'separator' },
        { role: 'resetZoom' },
        { role: 'zoomIn' },
        { role: 'zoomOut' },
        { type: 'separator' },
        {
          role: 'togglefullscreen',
          label: 'Toggle Smart City Kiosk / Fullscreen'
        }
      ]
    },
    {
      label: 'Window',
      submenu: [
        { role: 'minimize' },
        { role: 'zoom' },
        ...(isMac
          ? [
              { type: 'separator' as const },
              { role: 'front' as const },
              { type: 'separator' as const },
              { role: 'window' as const }
            ]
          : [{ role: 'close' as const }])
      ]
    },
    {
      label: 'Help',
      submenu: [
        {
          label: 'ParkSense Documentation',
          click: async () => {
            await shell.openExternal('https://github.com/ranaabhishek0702-dotcom/Parking_System_AD#readme');
          }
        },
        {
          label: 'MoHUA Smart Cities Mission Portal',
          click: async () => {
            await shell.openExternal('https://smartcities.gov.in');
          }
        },
        { type: 'separator' },
        {
          label: 'System Diagnostics & Telemetry',
          click: () => {
            const memory = process.getProcessMemoryInfo();
            memory.then((mem) => {
              dialog.showMessageBox(mainWindow || new BrowserWindow(), {
                type: 'info',
                title: 'ParkSense Diagnostics',
                message: 'ParkSense Smart City Desktop ICCC',
                detail: `Version: 1.0.0\nElectron: ${process.versions.electron}\nNode: ${process.versions.node}\nChromium: ${process.versions.chrome}\nOS: ${os.type()} ${os.release()} (${os.arch()})\nWorking Set Memory: ${(mem.residentSet / 1024).toFixed(1)} MB`
              });
            });
          }
        }
      ]
    }
  ];

  const menu = Menu.buildFromTemplate(template);
  Menu.setApplicationMenu(menu);
}

/**
 * Setup Native Status Bar Tray
 */
function setupTray() {
  const trayIconPath = path.join(__dirname, '../assets/tray-icon.png');
  if (!fs.existsSync(trayIconPath)) return;

  const trayImage = nativeImage.createFromPath(trayIconPath);
  tray = new Tray(trayImage);

  tray.setToolTip('ParkSense ICCC — MoHUA Smart Cities Mission');

  const contextMenu = Menu.buildFromTemplate([
    {
      label: '🛰️ ParkSense ICCC (Active)',
      enabled: false
    },
    {
      label: 'Telemetry: 9 Zones Connected',
      enabled: false
    },
    { type: 'separator' },
    {
      label: 'Open Command Center',
      click: () => {
        if (mainWindow) {
          mainWindow.show();
          mainWindow.focus();
        } else {
          createMainWindow();
        }
      }
    },
    {
      label: '📱 Open Citizen Mobile Companion',
      click: () => openCitizenCompanion()
    },
    { type: 'separator' },
    {
      label: 'Scenario: IPL Match Surge',
      click: () => {
        if (mainWindow) {
          mainWindow.webContents.send('menu:trigger-scenario', 'ipl_match_rush');
        }
      }
    },
    {
      label: 'Scenario: Diwali Festival Rush',
      click: () => {
        if (mainWindow) {
          mainWindow.webContents.send('menu:trigger-scenario', 'diwali_rush');
        }
      }
    },
    { type: 'separator' },
    {
      label: 'Quit ParkSense',
      click: () => app.quit()
    }
  ]);

  tray.setContextMenu(contextMenu);

  tray.on('click', () => {
    if (mainWindow) {
      if (mainWindow.isVisible()) {
        mainWindow.focus();
      } else {
        mainWindow.show();
      }
    }
  });
}

/**
 * Register IPC Handlers
 */
function setupIpcHandlers() {
  // Open citizen companion
  ipcMain.on('parksense:open-citizen', () => {
    openCitizenCompanion();
  });

  // Native notification
  ipcMain.on('parksense:notify', (_event, options) => {
    if (Notification.isSupported()) {
      new Notification({
        title: options.title || 'ParkSense Alert',
        body: options.body || '',
        silent: options.silent || false
      }).show();
    }
  });

  // Save File Dialog
  ipcMain.handle('parksense:save-file', async (_event, options) => {
    const parentWin = mainWindow || undefined;
    const res = await dialog.showSaveDialog(parentWin as any, {
      title: 'Save File',
      defaultPath: options.defaultPath || 'parksense_export.csv',
      filters: options.filters || [{ name: 'CSV File', extensions: ['csv'] }]
    });

    if (res.canceled || !res.filePath) {
      return { success: false };
    }

    try {
      await fs.promises.writeFile(res.filePath, options.content, 'utf-8');
      return { success: true, filePath: res.filePath };
    } catch (err: any) {
      return { success: false, error: err.message };
    }
  });

  // Print to PDF
  ipcMain.handle('parksense:print-pdf', async (_event, options) => {
    if (!mainWindow) return { success: false };
    const res = await dialog.showSaveDialog(mainWindow, {
      title: 'Export PDF Report',
      defaultPath: options?.filename || 'ParkSense_Report.pdf',
      filters: [{ name: 'PDF Document', extensions: ['pdf'] }]
    });

    if (res.canceled || !res.filePath) {
      return { success: false };
    }

    try {
      const pdfData = await mainWindow.webContents.printToPDF({});
      await fs.promises.writeFile(res.filePath, pdfData);
      return { success: true, filePath: res.filePath };
    } catch (err: any) {
      return { success: false, error: err.message };
    }
  });

  // macOS Dock Badge
  ipcMain.on('parksense:set-badge', (_event, badge) => {
    if (process.platform === 'darwin') {
      app.dock.setBadge(badge || '');
    }
  });

  // System Diagnostics
  ipcMain.handle('parksense:get-system-info', async () => {
    return {
      platform: os.platform(),
      arch: os.arch(),
      totalMemMB: Math.round(os.totalmem() / (1024 * 1024)),
      freeMemMB: Math.round(os.freemem() / (1024 * 1024)),
      uptimeSec: os.uptime(),
      cpus: os.cpus().length,
      hostname: os.hostname()
    };
  });

  // Window Controls
  ipcMain.on('parksense:window-minimize', () => mainWindow?.minimize());
  ipcMain.on('parksense:window-maximize', () => {
    if (mainWindow?.isMaximized()) {
      mainWindow.unmaximize();
    } else {
      mainWindow?.maximize();
    }
  });
  ipcMain.on('parksense:window-close', () => mainWindow?.close());
}

/**
 * Local Automation & Testing Control Endpoint (strictly bound to 127.0.0.1:3002)
 */
function setupControlServer() {
  const server = http.createServer(async (req, res) => {
    try {
      const url = new URL(req.url || '/', 'http://127.0.0.1:3002');
      if (url.pathname === '/citizen') {
        openCitizenCompanion();
        res.writeHead(200, { 'Content-Type': 'application/json' });
        res.end(JSON.stringify({ ok: true, action: 'open_citizen' }));
      } else if (url.pathname === '/navigate') {
        const targetUrl = url.searchParams.get('url') || ADMIN_URL;
        if (mainWindow && !mainWindow.isDestroyed()) {
          mainWindow.loadURL(targetUrl);
        }
        res.writeHead(200, { 'Content-Type': 'application/json' });
        res.end(JSON.stringify({ ok: true, url: targetUrl }));
      } else if (url.pathname === '/tab') {
        const tab = url.searchParams.get('tab') || 'overview';
        if (mainWindow && !mainWindow.isDestroyed()) {
          mainWindow.webContents.send('menu:navigate-tab', tab);
          mainWindow.webContents
            .executeJavaScript(
              `
            const btn = document.getElementById('tab-btn-${tab}');
            if (btn) btn.click();
          `
            )
            .catch(() => {});
        }
        res.writeHead(200, { 'Content-Type': 'application/json' });
        res.end(JSON.stringify({ ok: true, tab }));
      } else if (url.pathname === '/role') {
        const role = url.searchParams.get('role') || 'super_admin';
        if (mainWindow && !mainWindow.isDestroyed()) {
          mainWindow.webContents.send('menu:switch-role', role);
          mainWindow.webContents
            .executeJavaScript(
              `
            const sel = document.getElementById('role-select');
            if (sel) {
              sel.value = '${role}';
              sel.dispatchEvent(new Event('change', { bubbles: true }));
            }
          `
            )
            .catch(() => {});
        }
        res.writeHead(200, { 'Content-Type': 'application/json' });
        res.end(JSON.stringify({ ok: true, role }));
      } else if (url.pathname === '/screenshot') {
        const target = url.searchParams.get('target') || 'main';
        const win = target === 'citizen' ? citizenWindow : mainWindow;
        if (win && !win.isDestroyed()) {
          const img = await win.webContents.capturePage();
          const filename = url.searchParams.get('name') || 'electron_render.png';
          const artifactDir =
            '/Users/abhishekrana/.gemini/antigravity-ide/brain/bb033eec-6330-4ae8-a3eb-9a9b5a97ca27';
          fs.writeFileSync(path.join(artifactDir, filename), img.toPNG());
          res.writeHead(200, { 'Content-Type': 'application/json' });
          res.end(JSON.stringify({ ok: true, file: filename }));
        } else {
          res.writeHead(404, { 'Content-Type': 'application/json' });
          res.end(JSON.stringify({ error: `Window '${target}' not open` }));
        }
      } else {
        res.writeHead(200, { 'Content-Type': 'application/json' });
        res.end(JSON.stringify({ name: 'ParkSense Desktop Control API', status: 'running' }));
      }
    } catch (err: any) {
      res.writeHead(500, { 'Content-Type': 'application/json' });
      res.end(JSON.stringify({ error: err.message }));
    }
  });

  server.listen(3002, '127.0.0.1', () => {
    // control server ready
  });
}

/**
 * App Lifecycle Events
 */
app.whenReady().then(() => {
  setupIpcHandlers();
  setupApplicationMenu();
  setupTray();
  setupControlServer();
  createSplashWindow();
  createMainWindow();

  app.on('activate', () => {
    if (BrowserWindow.getAllWindows().length === 0) {
      createMainWindow();
    }
  });
});

app.on('window-all-closed', () => {
  if (process.platform !== 'darwin') {
    app.quit();
  }
});

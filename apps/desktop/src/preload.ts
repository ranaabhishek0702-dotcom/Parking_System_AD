import { contextBridge, ipcRenderer } from 'electron';

// Expose safe, typed desktop APIs to renderer window
contextBridge.exposeInMainWorld('parksenseDesktop', {
  isElectron: true,
  platform: process.platform,
  version: '1.0.0',

  // Companion Windows
  openCitizenWindow: () => {
    ipcRenderer.send('parksense:open-citizen');
  },

  // Native Notifications
  sendNotification: (options: { title: string; body: string; silent?: boolean }) => {
    ipcRenderer.send('parksense:notify', options);
  },

  // Native Save File Dialog (for CSV / JSON exports)
  saveFile: async (options: {
    defaultPath?: string;
    filters?: { name: string; extensions: string[] }[];
    content: string;
  }) => {
    return await ipcRenderer.invoke('parksense:save-file', options);
  },

  // Native Print / Save to PDF (for e-Challan / municipal reports)
  printToPDF: async (options?: { filename?: string }) => {
    return await ipcRenderer.invoke('parksense:print-pdf', options);
  },

  // Dock / Taskbar Badging
  setDockBadge: (badge: string) => {
    ipcRenderer.send('parksense:set-badge', badge);
  },

  // System Telemetry for ICCC
  getSystemInfo: async () => {
    return await ipcRenderer.invoke('parksense:get-system-info');
  },

  // Window Controls (for custom frameless titlebar if needed)
  minimize: () => ipcRenderer.send('parksense:window-minimize'),
  maximize: () => ipcRenderer.send('parksense:window-maximize'),
  close: () => ipcRenderer.send('parksense:window-close'),

  // Listeners from Application Menu or System Tray
  onNavigateTab: (callback: (tab: string) => void) => {
    const handler = (_event: any, tab: string) => callback(tab);
    ipcRenderer.on('menu:navigate-tab', handler);
    return () => ipcRenderer.removeListener('menu:navigate-tab', handler);
  },

  onSwitchRole: (callback: (role: string) => void) => {
    const handler = (_event: any, role: string) => callback(role);
    ipcRenderer.on('menu:switch-role', handler);
    return () => ipcRenderer.removeListener('menu:switch-role', handler);
  },

  onTriggerScenario: (callback: (scenario: string) => void) => {
    const handler = (_event: any, scenario: string) => callback(scenario);
    ipcRenderer.on('menu:trigger-scenario', handler);
    return () => ipcRenderer.removeListener('menu:trigger-scenario', handler);
  }
});

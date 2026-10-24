export interface ParkSenseDesktopAPI {
  isElectron: boolean;
  platform: string;
  version: string;
  openCitizenWindow: () => void;
  sendNotification: (options: { title: string; body: string; silent?: boolean }) => void;
  saveFile: (options: {
    defaultPath?: string;
    filters?: { name: string; extensions: string[] }[];
    content: string;
  }) => Promise<{ success: boolean; filePath?: string; error?: string }>;
  printToPDF: (options?: { filename?: string }) => Promise<{ success: boolean; filePath?: string; error?: string }>;
  setDockBadge: (badge: string) => void;
  getSystemInfo: () => Promise<{
    platform: string;
    arch: string;
    totalMemMB: number;
    freeMemMB: number;
    uptimeSec: number;
    cpus: number;
    hostname: string;
  }>;
  minimize: () => void;
  maximize: () => void;
  close: () => void;
  onNavigateTab: (callback: (tab: string) => void) => () => void;
  onSwitchRole: (callback: (role: string) => void) => () => void;
  onTriggerScenario: (callback: (scenario: string) => void) => () => void;
}

declare global {
  interface Window {
    parksenseDesktop?: ParkSenseDesktopAPI;
  }
}

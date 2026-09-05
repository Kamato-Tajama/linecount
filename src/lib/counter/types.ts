export type SensorMode = "demo" | "camera";
export type CountDirection = "both" | "ltr" | "rtl";

export type SensorSettings = {
  lineX: number;
  threshold: number;
  minRunPct: number;
  cooldownMs: number;
  direction: CountDirection;
  sound: boolean;
  haptics: boolean;
  demoSpeed: number;
  demoDensity: number;
  showProfile: boolean;
};

export type CountEvent = {
  id: number;
  at: number;
  intervalMs: number;
  occupancy: number;
  source: SensorMode;
};

export const DEFAULT_SETTINGS: SensorSettings = {
  lineX: 0.62,
  threshold: 28,
  minRunPct: 0.07,
  cooldownMs: 280,
  direction: "both",
  sound: true,
  haptics: true,
  demoSpeed: 1,
  demoDensity: 1,
  showProfile: true,
};

export const SETTINGS_KEY = "linecount.settings.v1";

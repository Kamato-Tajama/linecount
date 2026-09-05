import { create } from "zustand";
import {
  DEFAULT_SETTINGS,
  SETTINGS_KEY,
  type CountEvent,
  type SensorMode,
  type SensorSettings,
} from "./types";

type OccupancySnap = {
  occupied: boolean;
  occupancy: number;
  centroid: number;
  arming: boolean;
};

type CounterState = {
  count: number;
  running: boolean;
  mode: SensorMode;
  settings: SensorSettings;
  events: CountEvent[];
  startedAt: number | null;
  elapsedMs: number;
  occupancy: OccupancySnap;
  cameraError: string | null;
  lastFlashAt: number;
  hydrated: boolean;
  setRunning: (running: boolean) => void;
  toggleRunning: () => void;
  setMode: (mode: SensorMode) => void;
  patchSettings: (patch: Partial<SensorSettings>) => void;
  increment: (occupancy: number, source: SensorMode) => void;
  resetCount: () => void;
  setOccupancy: (snap: OccupancySnap) => void;
  setCameraError: (message: string | null) => void;
  tickElapsed: () => void;
  hydrate: () => void;
};

function persistSettings(settings: SensorSettings) {
  try {
    localStorage.setItem(SETTINGS_KEY, JSON.stringify(settings));
  } catch {
    /* ignore */
  }
}

function nowMs() {
  return typeof performance !== "undefined" ? performance.now() : Date.now();
}

export const useCounter = create<CounterState>((set, get) => ({
  count: 0,
  running: true,
  mode: "demo",
  settings: DEFAULT_SETTINGS,
  events: [],
  startedAt: null,
  elapsedMs: 0,
  occupancy: { occupied: false, occupancy: 0, centroid: 0.5, arming: true },
  cameraError: null,
  lastFlashAt: 0,
  hydrated: false,

  setRunning: (running) => {
    set((state) => ({
      running,
      startedAt: running ? (state.startedAt ?? nowMs()) : state.startedAt,
    }));
  },
  toggleRunning: () => get().setRunning(!get().running),
  setMode: (mode) => set({ mode, cameraError: mode === "demo" ? null : get().cameraError }),
  patchSettings: (patch) => {
    const settings = { ...get().settings, ...patch };
    set({ settings });
    persistSettings(settings);
  },
  increment: (occupancy, source) => {
    const at = Date.now();
    const prev = get().events[0];
    const event: CountEvent = {
      id: (prev?.id ?? 0) + 1,
      at,
      intervalMs: prev ? at - prev.at : 0,
      occupancy,
      source,
    };
    set((state) => ({
      count: state.count + 1,
      events: [event, ...state.events].slice(0, 80),
      lastFlashAt: at,
    }));
  },
  resetCount: () =>
    set({
      count: 0,
      events: [],
      startedAt: get().running ? nowMs() : null,
      elapsedMs: 0,
      lastFlashAt: 0,
    }),
  setOccupancy: (occupancy) => set({ occupancy }),
  setCameraError: (cameraError) => set({ cameraError }),
  tickElapsed: () => {
    const { running, startedAt } = get();
    if (!running || startedAt == null) return;
    set({ elapsedMs: nowMs() - startedAt });
  },
  hydrate: () => {
    if (get().hydrated) return;
    let settings = DEFAULT_SETTINGS;
    try {
      const raw = localStorage.getItem(SETTINGS_KEY);
      if (raw) settings = { ...DEFAULT_SETTINGS, ...JSON.parse(raw) };
    } catch {
      /* ignore */
    }
    set({
      settings,
      hydrated: true,
      startedAt: nowMs(),
    });
  },
}));

export function formatElapsed(ms: number) {
  const total = Math.max(0, Math.floor(ms / 1000));
  const h = Math.floor(total / 3600);
  const m = Math.floor((total % 3600) / 60);
  const s = total % 60;
  if (h > 0) {
    return `${h}:${String(m).padStart(2, "0")}:${String(s).padStart(2, "0")}`;
  }
  return `${String(m).padStart(2, "0")}:${String(s).padStart(2, "0")}`;
}

export function rollingRate(events: CountEvent[], elapsedMs: number, now = Date.now()) {
  if (events.length === 0) return 0;
  const recent = events.filter((e) => now - e.at <= 30_000);
  if (recent.length === 0) return 0;
  const oldest = recent[recent.length - 1]!.at;
  const span = Math.max(1500, Math.min(30_000, elapsedMs || now - oldest));
  return (recent.length / span) * 60_000;
}

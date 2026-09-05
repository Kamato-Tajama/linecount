import type { CountDirection } from "./types";

export type DetectorConfig = {
  threshold: number;
  minRunPct: number;
  cooldownMs: number;
  direction: CountDirection;
};

export type DetectorStep = {
  occupied: boolean;
  counted: boolean;
  occupancy: number;
  centroid: number;
  profile: Float32Array;
  diff: Float32Array;
  arming: boolean;
  direction: "ltr" | "rtl" | "unknown";
};

const BINS = 96;
const ARM_FRAMES = 14;
const BG_LEARN_IDLE = 0.04;
const BG_LEARN_BUSY = 0.004;

export function columnToGray(image: ImageData, bins = BINS): Float32Array {
  const h = image.height;
  const out = new Float32Array(bins);
  const counts = new Uint16Array(bins);
  const data = image.data;
  for (let y = 0; y < h; y++) {
    const i = y * 4;
    const gray = data[i] * 0.299 + data[i + 1] * 0.587 + data[i + 2] * 0.114;
    const bin = Math.min(bins - 1, Math.floor((y / h) * bins));
    out[bin] += gray;
    counts[bin] += 1;
  }
  for (let i = 0; i < bins; i++) {
    out[i] = counts[i] ? out[i] / counts[i] : 0;
  }
  return out;
}

export class TripLineDetector {
  private background: Float32Array | null = null;
  private occupied = false;
  private lastCountAt = 0;
  private frames = 0;
  private lastCentroid = 0.5;
  private prevLeftOccupied = false;
  private prevRightOccupied = false;
  private lastUpstream: "left" | "right" | null = null;
  private lastUpstreamAt = 0;

  reset() {
    this.background = null;
    this.occupied = false;
    this.lastCountAt = 0;
    this.frames = 0;
    this.prevLeftOccupied = false;
    this.prevRightOccupied = false;
    this.lastUpstream = null;
  }

  step(
    gray: Float32Array,
    now: number,
    cfg: DetectorConfig,
    neighbors?: { left?: Float32Array; right?: Float32Array },
  ): DetectorStep {
    if (!this.background || this.background.length !== gray.length) {
      this.background = Float32Array.from(gray);
      this.frames = 1;
      return this.emptyStep(gray, true);
    }

    const n = gray.length;
    const diff = new Float32Array(n);
    let run = 0;
    let maxRun = 0;
    let runStart = 0;
    let bestStart = 0;
    let occupiedCount = 0;
    const minRun = Math.max(3, Math.round(cfg.minRunPct * n));
    const learn = this.occupied ? BG_LEARN_BUSY : BG_LEARN_IDLE;

    for (let i = 0; i < n; i++) {
      const d = Math.abs(gray[i] - this.background[i]);
      diff[i] = d;
      const fg = d >= cfg.threshold;
      if (fg) {
        if (run === 0) runStart = i;
        run += 1;
        occupiedCount += 1;
        if (run > maxRun) {
          maxRun = run;
          bestStart = runStart;
        }
      } else {
        run = 0;
      }
      this.background[i] = this.background[i] * (1 - learn) + gray[i] * learn;
    }

    this.frames += 1;
    const arming = this.frames < ARM_FRAMES;
    const occupancy = occupiedCount / n;
    const enter = maxRun >= minRun;
    const stay = maxRun >= Math.max(2, Math.round(minRun * 0.45));
    const occupied = this.occupied ? stay : enter;
    const centroid =
      maxRun > 0 ? (bestStart + maxRun / 2) / n : this.lastCentroid;
    this.lastCentroid = centroid;

    const leftOcc = neighbors?.left
      ? this.columnOccupied(neighbors.left, cfg)
      : false;
    const rightOcc = neighbors?.right
      ? this.columnOccupied(neighbors.right, cfg)
      : false;

    if (leftOcc && !this.prevLeftOccupied) {
      this.lastUpstream = "left";
      this.lastUpstreamAt = now;
    }
    if (rightOcc && !this.prevRightOccupied) {
      this.lastUpstream = "right";
      this.lastUpstreamAt = now;
    }
    this.prevLeftOccupied = leftOcc;
    this.prevRightOccupied = rightOcc;

    let direction: DetectorStep["direction"] = "unknown";
    if (this.lastUpstream === "left" && now - this.lastUpstreamAt < 420) {
      direction = "ltr";
    } else if (this.lastUpstream === "right" && now - this.lastUpstreamAt < 420) {
      direction = "rtl";
    }

    let counted = false;
    if (!arming && occupied && !this.occupied && now - this.lastCountAt >= cfg.cooldownMs) {
      const dirOk =
        cfg.direction === "both" ||
        direction === "unknown" ||
        direction === cfg.direction;
      if (dirOk) {
        counted = true;
        this.lastCountAt = now;
      }
    }

    this.occupied = occupied;
    return {
      occupied,
      counted,
      occupancy,
      centroid,
      profile: gray,
      diff,
      arming,
      direction,
    };
  }

  private columnOccupied(gray: Float32Array, cfg: DetectorConfig): boolean {
    if (!this.background || this.background.length !== gray.length) return false;
    const n = gray.length;
    const minRun = Math.max(3, Math.round(cfg.minRunPct * n));
    let run = 0;
    let maxRun = 0;
    for (let i = 0; i < n; i++) {
      const d = Math.abs(gray[i] - this.background[i]);
      if (d >= cfg.threshold) {
        run += 1;
        if (run > maxRun) maxRun = run;
      } else {
        run = 0;
      }
    }
    return maxRun >= minRun;
  }

  private emptyStep(gray: Float32Array, arming: boolean): DetectorStep {
    return {
      occupied: false,
      counted: false,
      occupancy: 0,
      centroid: 0.5,
      profile: gray,
      diff: new Float32Array(gray.length),
      arming,
      direction: "unknown",
    };
  }
}

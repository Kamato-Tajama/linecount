import { useEffect, useRef, type PointerEvent } from "react";
import { columnToGray, TripLineDetector } from "@/lib/counter/detector";
import { playCountTick, resumeAudio, vibrateCount } from "@/lib/counter/audio";
import { DemoWorld, drawDemoScene } from "@/lib/counter/demo-scene";
import { useCounter } from "@/lib/counter/store";

const NEIGHBOR_GAP = 0.035;

export function Viewport() {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const videoRef = useRef<HTMLVideoElement>(null);
  const streamRef = useRef<MediaStream | null>(null);
  const worldRef = useRef(new DemoWorld());
  const detectorRef = useRef(new TripLineDetector());
  const dragRef = useRef(false);
  const lastTsRef = useRef(0);
  const occStampRef = useRef(0);
  const wakeRef = useRef<WakeLockSentinel | null>(null);

  useEffect(() => {
    useCounter.getState().hydrate();
  }, []);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext("2d", { willReadFrequently: true });
    if (!ctx) return;

    let raf = 0;
    let live = true;

    const loop = (ts: number) => {
      if (!live) return;
      const state = useCounter.getState();
      const { settings, running, mode } = state;
      const parent = canvas.parentElement;
      const cssW = Math.max(1, parent?.clientWidth ?? canvas.clientWidth);
      const cssH = Math.max(1, parent?.clientHeight ?? canvas.clientHeight);
      const dpr = Math.min(2, window.devicePixelRatio || 1);
      if (canvas.width !== Math.round(cssW * dpr) || canvas.height !== Math.round(cssH * dpr)) {
        canvas.width = Math.round(cssW * dpr);
        canvas.height = Math.round(cssH * dpr);
      }

      const dt = lastTsRef.current ? Math.min(0.05, (ts - lastTsRef.current) / 1000) : 0.016;
      lastTsRef.current = ts;

      ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
      ctx.clearRect(0, 0, cssW, cssH);

      const video = videoRef.current;
      if (mode === "camera" && video && video.readyState >= 2) {
        drawCover(ctx, video, cssW, cssH);
      } else if (mode === "camera") {
        ctx.fillStyle = "#10110f";
        ctx.fillRect(0, 0, cssW, cssH);
        ctx.fillStyle = "#8d9086";
        ctx.font = '500 13px "IBM Plex Sans", sans-serif';
        ctx.textAlign = "center";
        ctx.fillText("Starting camera", cssW / 2, cssH / 2);
        ctx.textAlign = "start";
      } else {
        if (running) {
          worldRef.current.update(dt, cssW, cssH, settings.demoSpeed, settings.demoDensity);
        }
        drawDemoScene(ctx, cssW, cssH, worldRef.current, running);
      }

      const lineX = Math.round(settings.lineX * cssW);
      const sampleX = Math.min(cssW - 1, Math.max(0, lineX));
      let step: ReturnType<TripLineDetector["step"]> | null = null;
      try {
        const col = ctx.getImageData(Math.round(sampleX * dpr), 0, 1, canvas.height);
        const gray = columnToGray(col);
        const leftX = Math.round(Math.max(0, (settings.lineX - NEIGHBOR_GAP) * cssW) * dpr);
        const rightX = Math.round(
          Math.min(cssW - 1, (settings.lineX + NEIGHBOR_GAP) * cssW) * dpr,
        );
        const left = columnToGray(ctx.getImageData(leftX, 0, 1, canvas.height));
        const right = columnToGray(ctx.getImageData(rightX, 0, 1, canvas.height));
        step = detectorRef.current.step(gray, ts, settings, { left, right });
      } catch {
        step = null;
      }

      if (step) {
        if (running && step.counted) {
          state.increment(step.occupancy, mode);
          if (settings.sound) playCountTick();
          if (settings.haptics) vibrateCount();
        }
        if (ts - occStampRef.current > 100) {
          occStampRef.current = ts;
          const prev = state.occupancy;
          if (
            prev.occupied !== step.occupied ||
            prev.arming !== step.arming ||
            Math.abs(prev.occupancy - step.occupancy) > 0.04
          ) {
            state.setOccupancy({
              occupied: step.occupied,
              occupancy: step.occupancy,
              centroid: step.centroid,
              arming: step.arming,
            });
          }
        }
        drawOverlay(ctx, cssW, cssH, settings.lineX, step, settings.showProfile, state.lastFlashAt);
      } else {
        drawOverlay(ctx, cssW, cssH, settings.lineX, null, false, 0);
      }

      raf = requestAnimationFrame(loop);
    };

    raf = requestAnimationFrame(loop);
    return () => {
      live = false;
      cancelAnimationFrame(raf);
    };
  }, []);

  useEffect(() => {
    const unsub = useCounter.subscribe((state, prev) => {
      if (state.mode !== prev.mode || state.running !== prev.running) {
        detectorRef.current.reset();
      }
      if (state.mode === "demo" && prev.mode === "camera") {
        stopStream();
      }
    });
    return unsub;
  }, []);

  useEffect(() => {
    async function syncWake() {
      const running = useCounter.getState().running;
      if (running && navigator.wakeLock) {
        try {
          wakeRef.current = await navigator.wakeLock.request("screen");
        } catch {
          /* ignore */
        }
      } else {
        await wakeRef.current?.release().catch(() => undefined);
        wakeRef.current = null;
      }
    }
    const unsub = useCounter.subscribe((state, prev) => {
      if (state.running !== prev.running) void syncWake();
    });
    void syncWake();
    return () => {
      unsub();
      void wakeRef.current?.release().catch(() => undefined);
    };
  }, []);

  useEffect(() => {
    return () => stopStream();
  }, []);

  function stopStream() {
    streamRef.current?.getTracks().forEach((t) => t.stop());
    streamRef.current = null;
    if (videoRef.current) videoRef.current.srcObject = null;
  }

  async function startCamera() {
    await resumeAudio();
    const store = useCounter.getState();
    store.setMode("camera");
    store.setCameraError(null);
    detectorRef.current.reset();
    if (!navigator.mediaDevices?.getUserMedia) {
      store.setCameraError(
        "Camera is not available here. Use the demo belt, or open this app on a phone.",
      );
      store.setMode("demo");
      return;
    }
    try {
      const stream = await navigator.mediaDevices.getUserMedia({
        audio: false,
        video: {
          facingMode: { ideal: "environment" },
          width: { ideal: 1280 },
          height: { ideal: 720 },
        },
      });
      streamRef.current = stream;
      const video = videoRef.current;
      if (!video) return;
      video.srcObject = stream;
      await video.play();
      store.setRunning(true);
    } catch {
      store.setCameraError(
        "Camera is blocked in this view. Use demo mode here, or open the app on your phone to count live.",
      );
      store.setMode("demo");
    }
  }

  function onPointerDown(e: PointerEvent<HTMLCanvasElement>) {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const rect = canvas.getBoundingClientRect();
    const x = (e.clientX - rect.left) / rect.width;
    const line = useCounter.getState().settings.lineX;
    if (Math.abs(x - line) < 0.08) {
      dragRef.current = true;
      canvas.setPointerCapture(e.pointerId);
    }
  }

  function onPointerMove(e: PointerEvent<HTMLCanvasElement>) {
    if (!dragRef.current) return;
    const canvas = canvasRef.current;
    if (!canvas) return;
    const rect = canvas.getBoundingClientRect();
    const x = Math.min(0.9, Math.max(0.1, (e.clientX - rect.left) / rect.width));
    useCounter.getState().patchSettings({ lineX: x });
  }

  function onPointerUp(e: PointerEvent<HTMLCanvasElement>) {
    dragRef.current = false;
    try {
      canvasRef.current?.releasePointerCapture(e.pointerId);
    } catch {
      /* ignore */
    }
  }

  return (
    <div className="relative h-full w-full overflow-hidden rounded-xl bg-surface-2">
      <video
        ref={videoRef}
        className="pointer-events-none absolute h-px w-px opacity-0"
        playsInline
        muted
        autoPlay
      />
      <canvas
        ref={canvasRef}
        className="block h-full w-full touch-none cursor-ew-resize"
        onPointerDown={onPointerDown}
        onPointerMove={onPointerMove}
        onPointerUp={onPointerUp}
        onPointerCancel={onPointerUp}
      />
      <CameraButton onStart={startCamera} />
    </div>
  );
}

function CameraButton({ onStart }: { onStart: () => void }) {
  const mode = useCounter((s) => s.mode);
  const error = useCounter((s) => s.cameraError);
  return (
    <div className="pointer-events-none absolute inset-x-3 bottom-3 flex flex-col gap-2">
      {error ? (
        <p className="pointer-events-auto max-w-md rounded-lg border border-border bg-bg/85 px-3 py-2 text-xs text-muted">
          {error}
        </p>
      ) : null}
      <div className="flex justify-end">
        {mode === "demo" ? (
          <button
            type="button"
            onClick={onStart}
            className="pointer-events-auto h-9 rounded-md border border-border bg-bg/80 px-3 text-xs font-medium text-fg hover:bg-surface"
          >
            Use camera
          </button>
        ) : (
          <button
            type="button"
            onClick={() => {
              useCounter.getState().setMode("demo");
            }}
            className="pointer-events-auto h-9 rounded-md border border-border bg-bg/80 px-3 text-xs font-medium text-fg hover:bg-surface"
          >
            Back to demo
          </button>
        )}
      </div>
    </div>
  );
}

function drawCover(
  ctx: CanvasRenderingContext2D,
  video: HTMLVideoElement,
  dw: number,
  dh: number,
) {
  const sw = video.videoWidth || dw;
  const sh = video.videoHeight || dh;
  const scale = Math.max(dw / sw, dh / sh);
  const w = sw * scale;
  const h = sh * scale;
  ctx.drawImage(video, (dw - w) / 2, (dh - h) / 2, w, h);
}

function drawOverlay(
  ctx: CanvasRenderingContext2D,
  w: number,
  h: number,
  lineX: number,
  step: ReturnType<TripLineDetector["step"]> | null,
  showProfile: boolean,
  lastFlashAt: number,
) {
  const x = lineX * w;
  const hot = step?.occupied ?? false;
  const flash = Date.now() - lastFlashAt < 180;

  ctx.save();
  ctx.strokeStyle = flash || hot ? "#d7efe9" : "#9ec9c3";
  ctx.globalAlpha = flash ? 1 : hot ? 0.95 : 0.72;
  ctx.lineWidth = flash ? 3 : 2;
  ctx.beginPath();
  ctx.moveTo(x, 10);
  ctx.lineTo(x, h - 10);
  ctx.stroke();

  ctx.fillStyle = flash || hot ? "#d7efe9" : "#9ec9c3";
  ctx.beginPath();
  ctx.arc(x, 8, 4, 0, Math.PI * 2);
  ctx.arc(x, h - 8, 4, 0, Math.PI * 2);
  ctx.fill();

  if (showProfile && step) {
    const n = step.diff.length;
    for (let i = 0; i < n; i++) {
      const y = (i / n) * h;
      const mag = Math.min(1, step.diff[i]! / 70);
      if (mag < 0.08) continue;
      ctx.fillStyle = hot ? "#d7efe9" : "#8fb8b3";
      ctx.globalAlpha = 0.25 + mag * 0.65;
      ctx.fillRect(x + 5, y, 3 + mag * 18, h / n + 0.5);
    }
  }

  if (hot && step) {
    const cy = step.centroid * h;
    ctx.globalAlpha = 0.9;
    ctx.strokeStyle = "#d7efe9";
    ctx.lineWidth = 1.5;
    ctx.beginPath();
    ctx.arc(x, cy, 9, 0, Math.PI * 2);
    ctx.stroke();
  }

  ctx.restore();
  ctx.globalAlpha = 1;

  ctx.fillStyle = "rgba(12, 13, 11, 0.55)";
  ctx.fillRect(x - 34, 14, 68, 18);
  ctx.fillStyle = hot ? "#d7efe9" : "#9ec9c3";
  ctx.font = '500 10px "IBM Plex Sans", sans-serif';
  ctx.textAlign = "center";
  ctx.fillText(hot ? "BEAM BROKEN" : "BEAM CLEAR", x, 27);
  ctx.textAlign = "start";
}

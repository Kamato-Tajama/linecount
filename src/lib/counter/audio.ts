let ctx: AudioContext | null = null;

function getCtx(): AudioContext | null {
  if (typeof window === "undefined") return null;
  try {
    ctx ??= new AudioContext();
    return ctx;
  } catch {
    return null;
  }
}

export async function resumeAudio() {
  const audio = getCtx();
  if (audio && audio.state === "suspended") {
    await audio.resume().catch(() => undefined);
  }
}

export function playCountTick() {
  const audio = getCtx();
  if (!audio) return;
  const now = audio.currentTime;
  const osc = audio.createOscillator();
  const gain = audio.createGain();
  osc.type = "square";
  osc.frequency.setValueAtTime(1860, now);
  osc.frequency.exponentialRampToValueAtTime(920, now + 0.03);
  gain.gain.setValueAtTime(0.05, now);
  gain.gain.exponentialRampToValueAtTime(0.0001, now + 0.045);
  osc.connect(gain).connect(audio.destination);
  osc.start(now);
  osc.stop(now + 0.05);
}

export function vibrateCount() {
  try {
    navigator.vibrate?.(18);
  } catch {
    /* ignore */
  }
}

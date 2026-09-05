import { useEffect } from "react";
import { useCounter, formatElapsed, rollingRate } from "@/lib/counter/store";
import { cn } from "@/lib/utils";

export function Readout() {
  const count = useCounter((s) => s.count);
  const events = useCounter((s) => s.events);
  const elapsedMs = useCounter((s) => s.elapsedMs);
  const running = useCounter((s) => s.running);
  const occupancy = useCounter((s) => s.occupancy);
  const lastFlashAt = useCounter((s) => s.lastFlashAt);
  const mode = useCounter((s) => s.mode);

  useEffect(() => {
    const id = window.setInterval(() => {
      useCounter.getState().tickElapsed();
    }, 250);
    return () => window.clearInterval(id);
  }, []);

  const rate = rollingRate(events, elapsedMs);
  const last = events[0];
  const digits = Math.max(0, count).toString().padStart(6, "0").slice(-6);
  const flashing = Date.now() - lastFlashAt < 280;

  return (
    <section className="relative rounded-xl border border-border bg-surface p-4 sm:p-6">
      {flashing ? (
        <div className="count-flash pointer-events-none absolute inset-0 bg-accent/10" />
      ) : null}

      <div className="flex items-center justify-between gap-3">
        <p className="text-xs font-medium tracking-[0.18em] text-muted uppercase">Total</p>
        <StatusChip
          running={running}
          occupied={occupancy.occupied}
          arming={occupancy.arming}
          mode={mode}
        />
      </div>

      <div
        className="mt-4 flex w-full justify-center gap-1 sm:gap-2"
        aria-live="polite"
        aria-label={`${count} items counted`}
      >
        {digits.split("").map((d, i) => (
          <span
            key={i}
            className="flex h-14 min-w-0 flex-1 items-center justify-center rounded-md border border-border bg-surface-2 sm:h-20 sm:max-w-12 sm:flex-none sm:w-12"
          >
            <span
              key={`${i}-${d}`}
              className={cn(
                "digit-in font-mono text-3xl font-medium tabular-nums text-fg sm:text-5xl",
              )}
            >
              {d}
            </span>
          </span>
        ))}
      </div>

      <dl className="mt-5 grid grid-cols-3 gap-3 border-t border-border pt-4">
        <Stat label="Rate" value={rate > 0 ? rate.toFixed(1) : "0.0"} unit="/min" />
        <Stat label="Session" value={formatElapsed(elapsedMs)} />
        <Stat
          label="Last gap"
          value={last && last.intervalMs > 0 ? (last.intervalMs / 1000).toFixed(1) : "—"}
          unit={last && last.intervalMs > 0 ? "s" : ""}
        />
      </dl>
    </section>
  );
}

function Stat({ label, value, unit }: { label: string; value: string; unit?: string }) {
  return (
    <div>
      <dt className="text-xs font-medium tracking-wide text-muted uppercase">{label}</dt>
      <dd className="mt-1 font-mono text-sm tabular-nums text-fg">
        {value}
        {unit ? <span className="ml-0.5 text-muted">{unit}</span> : null}
      </dd>
    </div>
  );
}

function StatusChip({
  running,
  occupied,
  arming,
  mode,
}: {
  running: boolean;
  occupied: boolean;
  arming: boolean;
  mode: string;
}) {
  const label = !running ? "Paused" : arming ? "Arming" : occupied ? "Triggered" : "Live";
  return (
    <span className="inline-flex items-center gap-2 rounded-full border border-border bg-surface-2 px-2.5 py-1 text-xs font-medium text-muted">
      <span
        className={cn(
          "size-1.5 rounded-full",
          occupied ? "bg-beam-hot" : running ? "bg-accent" : "bg-faint",
        )}
      />
      {label}
      <span className="text-faint">·</span>
      {mode === "camera" ? "Camera" : "Demo"}
    </span>
  );
}

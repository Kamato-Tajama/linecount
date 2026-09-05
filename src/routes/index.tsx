import { createFileRoute } from "@tanstack/react-router";
import { EventLog } from "@/components/counter/event-log";
import { Readout } from "@/components/counter/readout";
import { SettingsPanel } from "@/components/counter/settings-panel";
import { Toolbar } from "@/components/counter/toolbar";
import { Viewport } from "@/components/counter/viewport";

export const Route = createFileRoute("/")({ component: Home });

function Home() {
  return (
    <main className="mx-auto flex min-h-dvh max-w-6xl flex-col gap-4 px-4 py-4 pb-6 sm:gap-5 sm:px-6 sm:py-6">
      <header className="flex items-center justify-between gap-3">
        <div className="flex min-w-0 items-center gap-3">
          <Mark />
          <div className="min-w-0">
            <h1 className="text-base font-medium tracking-tight text-fg">LineCount</h1>
            <p className="truncate text-xs text-muted">Trip-line production counter</p>
          </div>
        </div>
        <SettingsPanel />
      </header>

      <div className="grid min-h-0 flex-1 gap-4 lg:grid-cols-[minmax(0,1.4fr)_22rem]">
        <div className="flex min-h-0 flex-col gap-4">
          <div className="aspect-[4/3] min-h-56 w-full max-h-96 lg:aspect-auto lg:max-h-none lg:min-h-96 lg:flex-1">
            <Viewport />
          </div>
          <Readout />
          <Toolbar />
        </div>
        <aside className="flex min-h-60 flex-col gap-3 lg:min-h-0">
          <HowItWorks />
          <EventLog />
        </aside>
      </div>
    </main>
  );
}

function Mark() {
  return (
    <span
      className="relative flex size-9 items-center justify-center rounded-md border border-border bg-surface-2"
      aria-hidden
    >
      <span className="absolute top-1.5 size-1.5 rounded-full bg-accent" />
      <span className="h-5 w-px bg-accent" />
      <span className="absolute bottom-1.5 size-1.5 rounded-full bg-accent" />
    </span>
  );
}

function HowItWorks() {
  return (
    <section className="rounded-xl border border-border bg-surface p-4">
      <h2 className="text-sm font-medium text-fg">How to count</h2>
      <ol className="mt-3 space-y-2 text-sm leading-relaxed text-muted">
        <li>1. Aim the vertical beam across the path of travel — drag it to place.</li>
        <li>2. Each item that breaks then clears the beam adds one to the total.</li>
        <li>3. Use the demo belt here, or open camera on a phone pointed at the line.</li>
      </ol>
    </section>
  );
}

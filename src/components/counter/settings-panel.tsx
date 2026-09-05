import * as Dialog from "@radix-ui/react-dialog";
import { SlidersHorizontal, X } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Slider } from "@/components/ui/slider";
import { Switch } from "@/components/ui/switch";
import { useCounter } from "@/lib/counter/store";
import type { CountDirection } from "@/lib/counter/types";

export function SettingsPanel() {
  return (
    <Dialog.Root>
      <Dialog.Trigger asChild>
        <Button variant="ghost" size="icon" aria-label="Sensor settings">
          <SlidersHorizontal />
        </Button>
      </Dialog.Trigger>
      <Dialog.Portal>
        <Dialog.Overlay className="fixed inset-0 z-40 bg-bg/70" />
        <Dialog.Content className="fixed inset-x-0 bottom-0 z-50 max-h-[90vh] overflow-y-auto rounded-t-xl border border-border bg-surface p-5 shadow-2xl sm:inset-auto sm:top-1/2 sm:left-1/2 sm:w-full sm:max-w-md sm:max-h-[90vh] sm:-translate-x-1/2 sm:-translate-y-1/2 sm:rounded-xl">
          <div className="mb-5 flex items-start justify-between gap-3">
            <div>
              <Dialog.Title className="text-base font-medium text-fg">Sensor setup</Dialog.Title>
              <Dialog.Description className="mt-1 text-sm text-muted">
                Tune the trip line like a photoelectric gate on a conveyor.
              </Dialog.Description>
            </div>
            <Dialog.Close asChild>
              <Button variant="ghost" size="icon" aria-label="Close settings">
                <X />
              </Button>
            </Dialog.Close>
          </div>
          <SettingsFields />
        </Dialog.Content>
      </Dialog.Portal>
    </Dialog.Root>
  );
}

function SettingsFields() {
  const settings = useCounter((s) => s.settings);
  const patch = useCounter((s) => s.patchSettings);

  return (
    <div className="flex flex-col gap-5">
      <SliderField
        label="Sensitivity"
        hint="Lower catches faint items. Higher ignores belt noise."
        value={settings.threshold}
        min={12}
        max={70}
        onChange={(threshold) => patch({ threshold })}
        display={String(settings.threshold)}
      />
      <SliderField
        label="Minimum object size"
        hint="Percent of the beam an item must cover."
        value={Math.round(settings.minRunPct * 100)}
        min={3}
        max={30}
        onChange={(v) => patch({ minRunPct: v / 100 })}
        display={`${Math.round(settings.minRunPct * 100)}%`}
      />
      <SliderField
        label="Retrigger delay"
        hint="Dead time after a count so one item is not tallied twice."
        value={settings.cooldownMs}
        min={80}
        max={900}
        step={10}
        onChange={(cooldownMs) => patch({ cooldownMs })}
        display={`${settings.cooldownMs} ms`}
      />
      <SliderField
        label="Demo belt speed"
        value={Math.round(settings.demoSpeed * 100)}
        min={40}
        max={180}
        onChange={(v) => patch({ demoSpeed: v / 100 })}
        display={`${settings.demoSpeed.toFixed(2)}×`}
      />
      <SliderField
        label="Demo density"
        value={Math.round(settings.demoDensity * 100)}
        min={40}
        max={180}
        onChange={(v) => patch({ demoDensity: v / 100 })}
        display={`${settings.demoDensity.toFixed(2)}×`}
      />

      <fieldset>
        <legend className="text-sm font-medium text-fg">Count direction</legend>
        <div className="mt-2 grid grid-cols-3 gap-2">
          {(
            [
              ["both", "Both"],
              ["ltr", "Left →"],
              ["rtl", "← Right"],
            ] as [CountDirection, string][]
          ).map(([value, label]) => (
            <button
              key={value}
              type="button"
              onClick={() => patch({ direction: value })}
              className={
                settings.direction === value
                  ? "h-10 rounded-md bg-primary text-sm font-medium text-primary-fg"
                  : "h-10 rounded-md border border-border bg-surface-2 text-sm text-muted hover:text-fg"
              }
            >
              {label}
            </button>
          ))}
        </div>
      </fieldset>

      <ToggleRow
        label="Count click"
        checked={settings.sound}
        onCheckedChange={(sound) => patch({ sound })}
      />
      <ToggleRow
        label="Haptic pulse"
        checked={settings.haptics}
        onCheckedChange={(haptics) => patch({ haptics })}
      />
      <ToggleRow
        label="Beam profile"
        checked={settings.showProfile}
        onCheckedChange={(showProfile) => patch({ showProfile })}
      />

      <p className="text-xs leading-relaxed text-muted">
        On a phone, add this app to the home screen and point the rear camera at the line of travel.
        Drag the vertical beam until items break it one at a time.
      </p>
    </div>
  );
}

function SliderField({
  label,
  hint,
  value,
  min,
  max,
  step = 1,
  onChange,
  display,
}: {
  label: string;
  hint?: string;
  value: number;
  min: number;
  max: number;
  step?: number;
  onChange: (value: number) => void;
  display: string;
}) {
  return (
    <div>
      <div className="mb-1 flex items-baseline justify-between gap-3">
        <label className="text-sm font-medium text-fg">{label}</label>
        <span className="font-mono text-xs tabular-nums text-muted">{display}</span>
      </div>
      {hint ? <p className="mb-2 text-xs text-muted">{hint}</p> : null}
      <Slider
        min={min}
        max={max}
        step={step}
        value={[value]}
        onValueChange={(v) => onChange(v[0] ?? value)}
      />
    </div>
  );
}

function ToggleRow({
  label,
  checked,
  onCheckedChange,
}: {
  label: string;
  checked: boolean;
  onCheckedChange: (value: boolean) => void;
}) {
  return (
    <label className="flex h-11 items-center justify-between gap-3">
      <span className="text-sm text-fg">{label}</span>
      <Switch checked={checked} onCheckedChange={onCheckedChange} />
    </label>
  );
}

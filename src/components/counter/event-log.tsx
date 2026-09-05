import { Download } from "lucide-react";
import { Button } from "@/components/ui/button";
import { useCounter } from "@/lib/counter/store";

export function EventLog() {
  const events = useCounter((s) => s.events);

  function exportCsv() {
    const rows = ["id,time,interval_ms,occupancy,source"];
    for (const e of [...events].reverse()) {
      rows.push(
        `${e.id},${new Date(e.at).toISOString()},${e.intervalMs},${e.occupancy.toFixed(3)},${e.source}`,
      );
    }
    const blob = new Blob([rows.join("\n")], { type: "text/csv" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = "linecount-session.csv";
    a.click();
    URL.revokeObjectURL(url);
  }

  return (
    <section className="flex min-h-0 flex-1 flex-col rounded-xl border border-border bg-surface p-4">
      <div className="mb-3 flex items-center justify-between gap-2">
        <h2 className="text-sm font-medium text-fg">Pass log</h2>
        <Button
          variant="ghost"
          size="sm"
          disabled={events.length === 0}
          onClick={exportCsv}
        >
          <Download />
          CSV
        </Button>
      </div>
      {events.length === 0 ? (
        <p className="py-6 text-sm text-muted">
          Waiting for the first item to break the beam.
        </p>
      ) : (
        <ol className="min-h-0 flex-1 space-y-1 overflow-y-auto pr-1">
          {events.slice(0, 24).map((e) => (
            <li
              key={e.id}
              className="flex items-center justify-between gap-3 rounded-md px-2 py-2 text-sm hover:bg-surface-2"
            >
              <span className="font-mono tabular-nums text-muted">
                #{String(e.id).padStart(3, "0")}
              </span>
              <span className="font-mono tabular-nums text-fg">
                {new Date(e.at).toLocaleTimeString([], {
                  hour: "2-digit",
                  minute: "2-digit",
                  second: "2-digit",
                })}
              </span>
              <span className="font-mono tabular-nums text-muted">
                {e.intervalMs > 0 ? `${(e.intervalMs / 1000).toFixed(2)}s` : "—"}
              </span>
            </li>
          ))}
        </ol>
      )}
    </section>
  );
}

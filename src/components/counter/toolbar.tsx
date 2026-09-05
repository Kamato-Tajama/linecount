import { Pause, Play, RotateCcw } from "lucide-react";
import { Button } from "@/components/ui/button";
import { resumeAudio } from "@/lib/counter/audio";
import { useCounter } from "@/lib/counter/store";

export function Toolbar() {
  const running = useCounter((s) => s.running);
  const count = useCounter((s) => s.count);

  return (
    <div className="flex gap-2">
      <Button
        className="flex-1"
        variant="primary"
        size="lg"
        onClick={() => {
          void resumeAudio();
          useCounter.getState().toggleRunning();
        }}
      >
        {running ? <Pause /> : <Play />}
        {running ? "Pause" : "Start"}
      </Button>
      <Button
        variant="secondary"
        size="lg"
        className="px-5"
        disabled={count === 0}
        onClick={() => useCounter.getState().resetCount()}
      >
        <RotateCcw />
        Reset
      </Button>
    </div>
  );
}

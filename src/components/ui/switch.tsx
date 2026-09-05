import type { ComponentProps } from "react";
import * as SwitchPrimitive from "@radix-ui/react-switch";
import { cn } from "@/lib/utils";

export function Switch({
  className,
  ...props
}: ComponentProps<typeof SwitchPrimitive.Root>) {
  return (
    <SwitchPrimitive.Root
      className={cn(
        "inline-flex h-6 w-10 shrink-0 items-center rounded-full border border-border bg-surface-2 transition-colors data-[state=checked]:border-accent data-[state=checked]:bg-accent focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent/70",
        className,
      )}
      {...props}
    >
      <SwitchPrimitive.Thumb className="pointer-events-none block size-4 translate-x-0.5 rounded-full bg-muted transition-transform data-[state=checked]:translate-x-5 data-[state=checked]:bg-accent-fg" />
    </SwitchPrimitive.Root>
  );
}

import * as React from "react";

import { cn } from "../lib/utils";

type MeterProps = Omit<React.ComponentProps<"div">, "children"> & {
  /** Accessible name, e.g. "Website Redesign progress". */
  label: string;
  /** Percentage, 0–100. */
  value: number;
};

/** A single ratio as a bar: the fill and the track are steps of the same hue. */
function Meter({ label, value, className, ...props }: MeterProps) {
  const percent = Math.min(100, Math.max(0, Math.round(value)));
  return (
    <div
      role="progressbar"
      aria-label={label}
      aria-valuenow={percent}
      aria-valuemin={0}
      aria-valuemax={100}
      className={cn("h-2 w-full overflow-hidden rounded bg-chart-track", className)}
      {...props}
    >
      <div className="h-full rounded bg-chart-1" style={{ width: `${percent}%` }} />
    </div>
  );
}

export { Meter };

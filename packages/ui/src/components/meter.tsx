import * as React from "react";

import { cn } from "../lib/utils";
import { ChartTooltip } from "./chart-tooltip";

type MeterProps = Omit<React.ComponentProps<"div">, "children"> & {
  /** Accessible name, e.g. "Website Redesign progress". */
  label: string;
  /** Percentage, 0–100. */
  value: number;
};

/**
 * A single ratio as a bar: the fill and the track are steps of the same hue.
 * Focus, hover or tap shows "label: N%"; only that tooltip is a client island.
 */
function Meter({ label, value, className, ...props }: MeterProps) {
  const percent = Math.min(100, Math.max(0, Math.round(value)));
  return (
    <ChartTooltip content={`${label}: ${percent}%`}>
      <div
        role="progressbar"
        aria-label={label}
        aria-valuenow={percent}
        aria-valuemin={0}
        aria-valuemax={100}
        tabIndex={0}
        className={cn(
          "h-2 w-full overflow-hidden rounded bg-chart-track focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 focus-visible:ring-offset-background",
          className,
        )}
        {...props}
      >
        <div className="h-full rounded bg-chart-1" style={{ width: `${percent}%` }} />
      </div>
    </ChartTooltip>
  );
}

export { Meter };

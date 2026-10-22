import * as React from "react";

import { cn } from "../lib/utils";

export type StackedBarSegment = { label: string; value: number };

type StackedBarProps = Omit<React.ComponentProps<"figure">, "children"> & {
  /** Accessible name of the chart, e.g. "Tasks by status". */
  label: string;
  /** Up to five segments, colored in fixed order (chart-1 … chart-5). */
  segments: StackedBarSegment[];
  emptyText?: string;
};

// Fixed order, never cycled: validated as adjacent pairs for color-vision deficiency in light and dark.
const SEGMENT_COLORS = ["bg-chart-1", "bg-chart-2", "bg-chart-3", "bg-chart-4", "bg-chart-5"];

/** Part-to-whole in one bar. The legend repeats each value, so color is never the only cue. */
function StackedBar({ label, segments, emptyText = "No data yet", className, ...props }: StackedBarProps) {
  if (segments.length > SEGMENT_COLORS.length) {
    throw new Error(`StackedBar supports at most ${SEGMENT_COLORS.length} segments; fold the rest into "Other".`);
  }
  const total = segments.reduce((sum, s) => sum + s.value, 0);

  return (
    <figure aria-label={label} className={cn("space-y-3", className)} {...props}>
      {total === 0 ? (
        <>
          <div className="h-3 rounded bg-muted" />
          <p className="text-sm text-muted-foreground">{emptyText}</p>
        </>
      ) : (
        <div className="flex h-3 gap-0.5 overflow-hidden rounded" aria-hidden="true">
          {segments.map((segment, i) =>
            segment.value > 0 ? (
              <div
                key={segment.label}
                data-segment
                title={`${segment.label}: ${segment.value}`}
                className={cn("h-full", SEGMENT_COLORS[i])}
                style={{ flexGrow: segment.value }}
              />
            ) : null,
          )}
        </div>
      )}
      <ul className="flex flex-wrap gap-x-6 gap-y-1 text-sm">
        {segments.map((segment, i) => (
          <li key={segment.label} className="flex items-center gap-2">
            <span aria-hidden="true" className={cn("size-2.5 rounded-sm", SEGMENT_COLORS[i])} />
            <span className="text-muted-foreground">{segment.label}</span>
            <span className="font-medium tabular-nums">{segment.value}</span>
          </li>
        ))}
      </ul>
    </figure>
  );
}

export { StackedBar };

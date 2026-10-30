"use client";

import * as React from "react";

import { Tooltip, TooltipContent, TooltipTrigger } from "./tooltip";

type ChartTooltipProps = {
  /** The text shown, e.g. "In progress: 4 (40%)". */
  content: string;
  /** One focusable chart mark; it stays server-rendered and becomes the trigger. */
  children: React.ReactElement;
};

/**
 * The client island behind chart marks: hover and keyboard focus come from Radix,
 * tap is added here (Radix tooltips ignore touch). Tapping elsewhere closes it.
 */
function ChartTooltip({ content, children }: ChartTooltipProps) {
  const [open, setOpen] = React.useState(false);
  const pointerType = React.useRef("");

  return (
    <Tooltip open={open} onOpenChange={setOpen}>
      <TooltipTrigger
        asChild
        onPointerDown={(event) => {
          pointerType.current = event.pointerType;
        }}
        onClick={(event) => {
          if (pointerType.current !== "touch") return;
          event.preventDefault(); // keep Radix from closing it again on click
          setOpen(true);
        }}
      >
        {children}
      </TooltipTrigger>
      <TooltipContent>{content}</TooltipContent>
    </Tooltip>
  );
}

export { ChartTooltip };

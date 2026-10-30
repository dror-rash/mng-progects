"use client";

import * as React from "react";

import { Button } from "./button";

type CopyButtonProps = Omit<React.ComponentProps<typeof Button>, "onClick" | "children"> & {
  /** The text put on the clipboard. */
  value: string;
  label?: string;
  /** How long "Copied" (or "Copy failed") shows before the label comes back. */
  resetAfterMs?: number;
};

type CopyState = "idle" | "copied" | "failed";

/** Copies `value` to the clipboard and says "Copied" (or "Copy failed") for a moment. */
export function CopyButton({
  value,
  label = "Copy",
  resetAfterMs = 2000,
  variant = "outline",
  size = "sm",
  ...props
}: CopyButtonProps) {
  const [state, setState] = React.useState<CopyState>("idle");

  React.useEffect(() => {
    if (state === "idle") return;
    const timer = setTimeout(() => setState("idle"), resetAfterMs);
    return () => clearTimeout(timer);
  }, [state, resetAfterMs]);

  async function copy() {
    try {
      await navigator.clipboard.writeText(value);
      setState("copied");
    } catch {
      setState("failed");
    }
  }

  return (
    <Button type="button" variant={variant} size={size} onClick={copy} aria-live="polite" {...props}>
      {state === "copied" ? "Copied" : state === "failed" ? "Copy failed" : label}
    </Button>
  );
}

import * as React from "react";

import { cn } from "../lib/utils";

type FieldErrorProps = Omit<React.ComponentProps<"p">, "children"> & { message: string | undefined };

/** A form validation message. role="alert" so screen readers announce it when it appears. */
export function FieldError({ message, className, ...props }: FieldErrorProps) {
  if (!message) return null;
  return (
    <p role="alert" className={cn("text-sm font-medium text-destructive", className)} {...props}>
      {message}
    </p>
  );
}

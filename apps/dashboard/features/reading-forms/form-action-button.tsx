"use client";

import { Button } from "@repo/ui/button";
import { FieldError } from "@repo/ui/field-error";
import { type ReactNode, useActionState } from "react";

import type { FormState } from "@/features/forms/form-state";

export type FormAction = (prev: FormState, formData: FormData) => Promise<FormState>;

/**
 * A one-button form (Publish, Archive, Remove <field>) posting `hidden` to `action`, with the action's error
 * below it: a stale page (another tab published the form) gets the reason, not an error page.
 */
export function FormActionButton({
  action,
  hidden,
  variant = "default",
  size = "default",
  children,
}: {
  action: FormAction;
  hidden: Record<string, string>;
  variant?: "default" | "outline" | "ghost" | "destructive";
  size?: "default" | "sm";
  children: ReactNode;
}) {
  const [state, formAction, pending] = useActionState<FormState, FormData>(action, {});
  return (
    <form action={formAction} className="space-y-1">
      {Object.entries(hidden).map(([name, value]) => (
        <input key={name} type="hidden" name={name} value={value} />
      ))}
      <Button type="submit" variant={variant} size={size} disabled={pending}>
        {children}
      </Button>
      <FieldError message={state.error} />
    </form>
  );
}

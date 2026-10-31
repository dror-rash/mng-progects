"use client";

import { Button } from "@repo/ui/button";
import { FieldError } from "@repo/ui/field-error";
import { useActionState } from "react";

import type { FormState } from "@/features/forms/form-state";

import { restoreAction } from "./actions";
import type { DeletedKind } from "./deleted-kind";

/** The Restore button of one row on the Deleted page (admins only). It gets only what it posts and shows. */
export function RestoreForm({ kind, id, name }: { kind: DeletedKind; id: string; name: string }) {
  const [state, formAction, pending] = useActionState<FormState, FormData>(restoreAction, {});

  return (
    <form action={formAction} className="flex flex-col items-end gap-1">
      <input type="hidden" name="kind" value={kind} />
      <input type="hidden" name="id" value={id} />
      <Button type="submit" variant="outline" size="sm" disabled={pending}>
        Restore<span className="sr-only"> {name}</span>
      </Button>
      <FieldError message={state.error} />
    </form>
  );
}

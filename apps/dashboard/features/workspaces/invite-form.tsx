"use client";

import { Button } from "@repo/ui/button";
import { CopyButton } from "@repo/ui/copy-button";
import { FieldError } from "@repo/ui/field-error";
import { Input } from "@repo/ui/input";
import { useActionState } from "react";

import { createInviteAction, type InviteState } from "./actions";

/** Creates an invite link and shows it once (only its hash is stored). */
export function InviteForm({ workspaceId }: { workspaceId: string }) {
  const [state, formAction, pending] = useActionState<InviteState, FormData>(createInviteAction, {});

  return (
    <form action={formAction} className="space-y-3">
      <input type="hidden" name="workspaceId" value={workspaceId} />
      <Button type="submit" size="sm" disabled={pending}>Create invite link</Button>
      <FieldError message={state.error} />
      {state.link && (
        <div className="space-y-1">
          <label htmlFor="invite-link" className="text-sm font-medium">Invite link</label>
          <div className="flex gap-2">
            <Input id="invite-link" readOnly value={state.link} aria-describedby="invite-link-hint" onFocus={(e) => e.currentTarget.select()} />
            <CopyButton value={state.link} label="Copy invite link" />
          </div>
          <p id="invite-link-hint" className="text-xs text-muted-foreground">
            Copy it now: it won&apos;t be shown again. Anyone with the link can join for 7 days.
          </p>
        </div>
      )}
    </form>
  );
}

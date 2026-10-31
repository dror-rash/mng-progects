"use client";

import { Button } from "@repo/ui/button";
import { CopyButton } from "@repo/ui/copy-button";
import { FieldError } from "@repo/ui/field-error";
import { Input } from "@repo/ui/input";
import { NativeSelect } from "@repo/ui/native-select";
import { useActionState } from "react";

import { ASSIGNABLE_ROLES, roleChoiceLabel, roleChoiceValue } from "@/features/access/roles";

import { createInviteAction, type InviteState } from "./actions";

/**
 * Creates an invite link for a role, or for a user of one of `partners`, and shows it once (only its hash
 * is stored). Auditor is chosen to start with: the least a link can give (ADR-0006).
 */
export function InviteForm({ workspaceId, partners }: { workspaceId: string; partners: { id: string; name: string }[] }) {
  const [state, formAction, pending] = useActionState<InviteState, FormData>(createInviteAction, {});
  const role = state.role ?? state.values?.role ?? "auditor";

  return (
    <form action={formAction} className="space-y-3">
      <input type="hidden" name="workspaceId" value={workspaceId} />
      <div className="flex flex-wrap items-end gap-2">
        <div className="space-y-1">
          <label htmlFor="invite-role" className="text-sm font-medium">Role</label>
          {/* Keyed on the role just submitted, so it stays chosen: React resets the form after a submit,
              and a select only applies defaultValue when it mounts. */}
          <NativeSelect
            key={role}
            id="invite-role"
            name="role"
            defaultValue={role}
            className="w-auto"
          >
            {ASSIGNABLE_ROLES.map((r) => (
              <option key={r.role} value={r.role}>
                {r.label}
              </option>
            ))}
            {partners.map((p) => (
              <option key={p.id} value={roleChoiceValue("partner", p.id)}>
                {roleChoiceLabel("partner", p.name)}
              </option>
            ))}
          </NativeSelect>
        </div>
        <Button type="submit" size="sm" disabled={pending}>Create invite link</Button>
      </div>
      <FieldError message={state.error} />
      {state.link && (
        <div className="space-y-1">
          <label htmlFor="invite-link" className="text-sm font-medium">Invite link</label>
          <div className="flex gap-2">
            <Input id="invite-link" readOnly value={state.link} aria-describedby="invite-link-hint" onFocus={(e) => e.currentTarget.select()} />
            <CopyButton value={state.link} label="Copy invite link" />
          </div>
          <p id="invite-link-hint" className="text-xs text-muted-foreground">
            Copy it now: it won&apos;t be shown again. Anyone with the link can join as {state.roleLabel ?? "Auditor"} for 7 days.
          </p>
        </div>
      )}
    </form>
  );
}

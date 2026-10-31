"use client";

import { Button } from "@repo/ui/button";
import { FieldError } from "@repo/ui/field-error";
import { NativeSelect } from "@repo/ui/native-select";
import { useActionState } from "react";

import { ASSIGNABLE_ROLES, workspaceRoleLabel } from "@/features/access/roles";
import type { FormState } from "@/features/forms/form-state";

import { changeRoleAction, removeMemberAction, revokeInviteAction } from "./actions";

/** What the members page's forms get about a member: no email (it stays server-rendered). */
type Member = { userId: string; name: string; role: string };

/** Changes a member's role (Admin or Auditor). Errors (e.g. the last admin) show on the row. */
export function ChangeRoleForm({ workspaceId, member }: { workspaceId: string; member: Member }) {
  const [state, formAction, pending] = useActionState<FormState, FormData>(changeRoleAction, {});
  const selectId = `role-${member.userId}`;
  const assignable = ASSIGNABLE_ROLES.some((r) => r.role === member.role);

  return (
    <form action={formAction} className="flex flex-col items-end gap-1">
      <input type="hidden" name="workspaceId" value={workspaceId} />
      <input type="hidden" name="userId" value={member.userId} />
      <div className="flex items-center gap-2">
        <label htmlFor={selectId} className="sr-only">Role for {member.name}</label>
        {/* Keyed on the saved role: React resets the form after a submit, and a select only applies
            defaultValue when it mounts. */}
        <NativeSelect key={member.role} id={selectId} name="role" defaultValue={member.role} className="h-8 w-auto">
          {/* A role that can't be given here (a partner's) still shows as what it is. */}
          {!assignable && (
            <option value={member.role} disabled>
              {workspaceRoleLabel(member.role)}
            </option>
          )}
          {ASSIGNABLE_ROLES.map((r) => (
            <option key={r.role} value={r.role}>
              {r.label}
            </option>
          ))}
        </NativeSelect>
        <Button type="submit" variant="ghost" size="sm" disabled={pending}>
          Change role<span className="sr-only"> {member.name}</span>
        </Button>
      </div>
      <FieldError message={state.error} />
    </form>
  );
}

/** Removes a member; optionally also revokes the open invite links so the old link can't bring them back. */
export function RemoveMemberForm({
  workspaceId,
  member,
  hasOpenInvites,
}: {
  workspaceId: string;
  member: Member;
  hasOpenInvites: boolean;
}) {
  const [state, formAction, pending] = useActionState<FormState, FormData>(removeMemberAction, {});
  const checkboxId = `revoke-invites-${member.userId}`;

  return (
    <form action={formAction} className="flex flex-col items-end gap-1">
      <input type="hidden" name="workspaceId" value={workspaceId} />
      <input type="hidden" name="userId" value={member.userId} />
      <div className="flex items-center gap-2">
        {hasOpenInvites && (
          <label htmlFor={checkboxId} className="flex items-center gap-1.5 text-xs text-muted-foreground">
            <input id={checkboxId} type="checkbox" name="revokeInvites" className="size-3.5 accent-primary" />
            Also revoke open invite links
          </label>
        )}
        <Button type="submit" variant="ghost" size="sm" disabled={pending}>
          Remove<span className="sr-only"> {member.name}</span>
        </Button>
      </div>
      <FieldError message={state.error} />
    </form>
  );
}

/** Revokes one invite link. A link already revoked elsewhere shows an error on its row. */
export function RevokeInviteForm({ workspaceId, inviteId, created }: { workspaceId: string; inviteId: string; created: string }) {
  const [state, formAction, pending] = useActionState<FormState, FormData>(revokeInviteAction, {});

  return (
    <form action={formAction} className="flex flex-col items-end gap-1">
      <input type="hidden" name="workspaceId" value={workspaceId} />
      <input type="hidden" name="inviteId" value={inviteId} />
      <Button type="submit" variant="ghost" size="sm" disabled={pending}>
        Revoke invite link<span className="sr-only"> created {created}</span>
      </Button>
      <FieldError message={state.error} />
    </form>
  );
}

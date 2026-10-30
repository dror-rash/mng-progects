"use client";

import { Button } from "@repo/ui/button";
import { FieldError } from "@repo/ui/field-error";
import { useActionState } from "react";

import type { FormState } from "@/features/forms/form-state";

import { changeRoleAction, removeMemberAction, revokeInviteAction } from "./actions";

/** What the members page's forms get about a member: no email (it stays server-rendered). */
type Member = { userId: string; name: string; role: string };

/** Makes an admin a member, or a member an admin. Errors (e.g. the last admin) show on the row. */
export function ChangeRoleForm({ workspaceId, member }: { workspaceId: string; member: Member }) {
  const [state, formAction, pending] = useActionState<FormState, FormData>(changeRoleAction, {});
  const isAdmin = member.role === "admin";

  return (
    <form action={formAction} className="flex flex-col items-end gap-1">
      <input type="hidden" name="workspaceId" value={workspaceId} />
      <input type="hidden" name="userId" value={member.userId} />
      <input type="hidden" name="role" value={isAdmin ? "member" : "admin"} />
      <Button type="submit" variant="ghost" size="sm" disabled={pending}>
        {isAdmin ? "Make member" : "Make admin"}
        <span className="sr-only"> {member.name}</span>
      </Button>
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

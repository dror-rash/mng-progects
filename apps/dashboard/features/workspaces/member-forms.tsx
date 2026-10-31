"use client";

import { Button } from "@repo/ui/button";
import { FieldError } from "@repo/ui/field-error";
import { NativeSelect } from "@repo/ui/native-select";
import { useActionState } from "react";

import { ASSIGNABLE_ROLES, roleChoiceLabel, roleChoiceValue } from "@/features/access/roles";
import type { FormState } from "@/features/forms/form-state";

import { changeRoleAction, removeMemberAction, revokeInviteAction } from "./actions";

/** What the members page's forms get about a member: no email (it stays server-rendered). */
type Member = { userId: string; name: string; role: string; partnerId?: string | null; partnerName?: string | null };

type Partner = { id: string; name: string };

/** Changes a member's role: Admin, Auditor or a user of one of `partners`. Errors (e.g. the last admin) show on the row. */
export function ChangeRoleForm({ workspaceId, member, partners }: { workspaceId: string; member: Member; partners: Partner[] }) {
  const [state, formAction, pending] = useActionState<FormState, FormData>(changeRoleAction, {});
  const selectId = `role-${member.userId}`;
  const current = roleChoiceValue(member.role, member.partnerId ?? null);
  const options = [
    ...ASSIGNABLE_ROLES.map((r) => ({ value: r.role as string, label: r.label as string })),
    ...partners.map((p) => ({ value: roleChoiceValue("partner", p.id), label: roleChoiceLabel("partner", p.name) })),
  ];
  const listed = options.some((o) => o.value === current);

  return (
    <form action={formAction} className="flex flex-col items-end gap-1">
      <input type="hidden" name="workspaceId" value={workspaceId} />
      <input type="hidden" name="userId" value={member.userId} />
      <div className="flex items-center gap-2">
        <label htmlFor={selectId} className="sr-only">Role for {member.name}</label>
        {/* Keyed on the saved role: React resets the form after a submit, and a select only applies
            defaultValue when it mounts. */}
        <NativeSelect key={current} id={selectId} name="role" defaultValue={current} className="h-8 w-auto">
          {/* A role that can't be given here (an unknown one) still shows as what it is. */}
          {!listed && (
            <option value={current} disabled>
              {roleChoiceLabel(member.role, member.partnerName ?? null)}
            </option>
          )}
          {options.map((o) => (
            <option key={o.value} value={o.value}>
              {o.label}
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

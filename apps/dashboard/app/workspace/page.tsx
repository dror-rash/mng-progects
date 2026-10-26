import { Badge } from "@repo/ui/badge";
import { Button } from "@repo/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@repo/ui/card";

import { AppHeader } from "@/features/layout/app-header";
import { changeRoleAction, removeMemberAction, revokeInviteAction } from "@/features/workspaces/actions";
import { InviteForm } from "@/features/workspaces/invite-form";
import { inviteState } from "@/features/workspaces/invite-token";
import { LeaveForm } from "@/features/workspaces/leave-form";
import { listMembers, listOpenInvites } from "@/features/workspaces/members";
import { requireWorkspace } from "@/features/workspaces/require-workspace";
import { workspaceRoleLabel } from "@/features/workspaces/roles";

export const dynamic = "force-dynamic";

const DATE = new Intl.DateTimeFormat("en-US", { dateStyle: "medium", timeZone: "UTC" });

export default async function WorkspacePage() {
  const { session, workspace } = await requireWorkspace("/workspace");
  const isAdmin = workspace.role === "admin";
  const [members, invites] = await Promise.all([
    listMembers(workspace.id),
    isAdmin ? listOpenInvites(workspace.id) : Promise.resolve([]),
  ]);
  const now = new Date();

  return (
    <div className="flex min-h-screen flex-col bg-background text-foreground">
      <AppHeader email={session.user.email} workspaceName={workspace.name} />

      <main className="mx-auto w-full max-w-3xl space-y-6 p-6">
        <h1 className="text-2xl font-bold tracking-tight">{workspace.name}</h1>

        <section aria-labelledby="members-heading">
          <Card>
            <CardHeader>
              <CardTitle id="members-heading" className="text-base">Members</CardTitle>
            </CardHeader>
            <CardContent>
              <ul className="divide-y">
                {members.map((m) => {
                  const isMe = m.userId === session.user.id;
                  return (
                    <li key={m.userId} className="flex flex-wrap items-center justify-between gap-3 py-3 first:pt-0">
                      <div className="text-sm">
                        <div className="font-medium">
                          {m.name}
                          {isMe && <span className="text-muted-foreground"> (you)</span>}
                        </div>
                        <div className="text-muted-foreground">{m.email}</div>
                      </div>
                      <div className="flex flex-wrap items-center gap-2">
                        <Badge>{workspaceRoleLabel(m.role)}</Badge>
                        {isAdmin && !isMe && (
                          <>
                            <form action={changeRoleAction}>
                              <input type="hidden" name="userId" value={m.userId} />
                              <input type="hidden" name="role" value={m.role === "admin" ? "member" : "admin"} />
                              <Button type="submit" variant="ghost" size="sm">
                                {m.role === "admin" ? "Make member" : "Make admin"}
                                <span className="sr-only"> {m.name}</span>
                              </Button>
                            </form>
                            <form action={removeMemberAction}>
                              <input type="hidden" name="userId" value={m.userId} />
                              <Button type="submit" variant="ghost" size="sm">
                                Remove<span className="sr-only"> {m.name}</span>
                              </Button>
                            </form>
                          </>
                        )}
                      </div>
                    </li>
                  );
                })}
              </ul>
            </CardContent>
          </Card>
        </section>

        {isAdmin && (
          <section aria-labelledby="invites-heading">
            <Card>
              <CardHeader>
                <CardTitle id="invites-heading" className="text-base">Invite links</CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <InviteForm />
                {invites.length > 0 && (
                  <ul className="divide-y border-t">
                    {invites.map((invite) => {
                      const expired = inviteState({ ...invite, revokedAt: null }, now) === "expired";
                      return (
                        <li key={invite.id} className="flex items-center justify-between gap-3 py-2 text-sm">
                          <span className="text-muted-foreground">
                            Created {DATE.format(invite.createdAt)} ·{" "}
                            {expired ? "expired" : `expires ${DATE.format(invite.expiresAt)}`}
                          </span>
                          <form action={revokeInviteAction}>
                            <input type="hidden" name="inviteId" value={invite.id} />
                            <Button type="submit" variant="ghost" size="sm">
                              Revoke invite link<span className="sr-only"> created {DATE.format(invite.createdAt)}</span>
                            </Button>
                          </form>
                        </li>
                      );
                    })}
                  </ul>
                )}
              </CardContent>
            </Card>
          </section>
        )}

        <LeaveForm />
      </main>
    </div>
  );
}

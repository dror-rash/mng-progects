import { Button } from "@repo/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@repo/ui/card";
import Link from "next/link";

import { requireSession } from "@/features/auth/require-session";
import { joinWorkspaceAction } from "@/features/workspaces/actions";
import { inviteState } from "@/features/workspaces/invite-token";
import { findInvite } from "@/features/workspaces/members";

export const dynamic = "force-dynamic";

export default async function InvitePage({ params }: { params: Promise<{ token: string }> }) {
  const { token } = await params;
  // Signed-out visitors log in (or sign up) first and come back here.
  await requireSession(`/invite/${token}`);
  const invite = await findInvite(token);
  const valid = invite !== null && inviteState(invite, new Date()) === "valid";

  return (
    <main className="mx-auto flex min-h-screen max-w-md items-center p-6">
      <Card className="w-full">
        {valid ? (
          <>
            <CardHeader>
              <CardTitle>Join {invite.workspaceName}</CardTitle>
              <CardDescription>You&apos;ll see its projects, tasks and customers, and can work on them.</CardDescription>
            </CardHeader>
            <CardContent>
              <form action={joinWorkspaceAction}>
                <input type="hidden" name="token" value={token} />
                <Button type="submit">Join workspace</Button>
              </form>
            </CardContent>
          </>
        ) : (
          <>
            <CardHeader>
              <CardTitle>This invite link is invalid or has expired</CardTitle>
              <CardDescription>Ask a workspace admin for a new link.</CardDescription>
            </CardHeader>
            <CardContent>
              <Button asChild variant="outline">
                <Link href="/">Go to your dashboard</Link>
              </Button>
            </CardContent>
          </>
        )}
      </Card>
    </main>
  );
}

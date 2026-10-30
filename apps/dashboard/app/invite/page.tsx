import { Button } from "@repo/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@repo/ui/card";
import { cookies } from "next/headers";
import Link from "next/link";

import { requireSession } from "@/features/auth/require-session";
import { inviteState, readInviteToken } from "@/features/workspaces/invite-token";
import { JoinForm } from "@/features/workspaces/join-form";
import { findInvite } from "@/features/workspaces/members";

export const dynamic = "force-dynamic";

/** An invite link (/invite/<token>) stashes its token in a cookie and comes here, so no URL carries it. */
export default async function InvitePage() {
  // Signed-out visitors log in (or sign up) first and come back here; the cookie waits for them.
  await requireSession("/invite");
  const token = readInviteToken(await cookies());
  const invite = token ? await findInvite(token) : null;
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
              <JoinForm />
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

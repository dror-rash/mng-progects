import { SignOutButton } from "@repo/auth/components";
import { getSession } from "@repo/auth/server";
import { Button } from "@repo/ui/button";

export const dynamic = "force-dynamic";
export default async function AccountPage() {
  // Middleware only checks that a cookie exists. This validates it against the database.
  const session = await getSession();

  if (!session) {
    return (
      <main className="mx-auto max-w-2xl space-y-4 p-8">
        <h1 className="text-2xl font-semibold">Session expired</h1>
        <Button asChild>
          <a href="/login?next=%2Fexample%2Faccount">Log in again</a>
        </Button>
      </main>
    );
  }

  return (
    <main className="mx-auto max-w-2xl space-y-4 p-8">
      <h1 className="text-2xl font-semibold">Your account</h1>
      <p>Signed in as {session.user.email}</p>
      <SignOutButton />
    </main>
  );
}

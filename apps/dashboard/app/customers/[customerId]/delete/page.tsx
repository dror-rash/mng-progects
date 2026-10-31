import { Button } from "@repo/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@repo/ui/card";
import Link from "next/link";
import { notFound } from "next/navigation";

import { deleteCustomerAction } from "@/features/organizations/actions";
import { getOrganizationForUser } from "@/features/organizations/queries";
import { requireWorkspace } from "@/features/workspaces/require-workspace";

export const dynamic = "force-dynamic";

export default async function DeleteCustomerPage({ params }: { params: Promise<{ customerId: string }> }) {
  const { customerId } = await params;
  const { session } = await requireWorkspace(`/customers/${customerId}/delete`);
  const customer = await getOrganizationForUser(session.user.id, customerId, "customer");
  // Someone who can't change it gets the same page as for a missing customer.
  if (!customer?.canChange) {
    notFound();
  }

  return (
    <main className="mx-auto flex min-h-screen max-w-lg items-center p-6">
      <Card className="w-full">
        <CardHeader>
          <CardTitle>Delete &ldquo;{customer.name}&rdquo;?</CardTitle>
          <CardDescription>
            This deletes the customer and its details. Projects and tasks linked to it are kept. It can&apos;t be undone.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <form action={deleteCustomerAction} className="flex gap-2">
            <input type="hidden" name="customerId" value={customer.id} />
            <Button type="submit" variant="destructive">Yes, delete customer</Button>
            <Button asChild variant="ghost">
              <Link href={`/customers/${customer.id}`}>Cancel</Link>
            </Button>
          </form>
        </CardContent>
      </Card>
    </main>
  );
}

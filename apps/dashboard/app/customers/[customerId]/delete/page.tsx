import { Button } from "@repo/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@repo/ui/card";
import Link from "next/link";
import { notFound } from "next/navigation";

import { deleteCustomerAction } from "@/features/organizations/actions";
import { getOrganizationForUser, listSubCompanies } from "@/features/organizations/queries";
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
  // A company can't be deleted before its sub-companies (task 053).
  const subCompanies = await listSubCompanies(session.user.id, customer.workspaceId, customer.id);

  return (
    <main className="mx-auto flex min-h-screen max-w-lg items-center p-6">
      <Card className="w-full">
        <CardHeader>
          <CardTitle>Delete &ldquo;{customer.name}&rdquo;?</CardTitle>
          <CardDescription>
            {subCompanies.length > 0 ? (
              <>Delete its sub-companies first: {subCompanies.map((c) => c.name).join(", ")}</>
            ) : (
              <>
                This deletes the customer with its contacts and notes. Projects and tasks linked to it are kept, but
                partners no longer see them. An admin can restore it from Deleted.
              </>
            )}
          </CardDescription>
        </CardHeader>
        <CardContent>
          {subCompanies.length > 0 ? (
            <Button asChild variant="outline">
              <Link href={`/customers/${customer.id}`}>Back to {customer.name}</Link>
            </Button>
          ) : (
          <form action={deleteCustomerAction} className="flex gap-2">
            <input type="hidden" name="customerId" value={customer.id} />
            <Button type="submit" variant="destructive">Yes, delete customer</Button>
            <Button asChild variant="ghost">
              <Link href={`/customers/${customer.id}`}>Cancel</Link>
            </Button>
          </form>
          )}
        </CardContent>
      </Card>
    </main>
  );
}

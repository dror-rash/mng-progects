import { Card, CardContent, CardHeader, CardTitle } from "@repo/ui/card";
import { notFound } from "next/navigation";

import { AppHeader } from "@/features/layout/app-header";
import { recordWorkspace } from "@/features/layout/record-workspace";
import { ContactForm } from "@/features/organizations/contacts/contact-form";
import { getOrganizationContact } from "@/features/organizations/contacts/queries";
import { getOrganizationForUser } from "@/features/organizations/queries";
import { requireWorkspace } from "@/features/workspaces/require-workspace";

export const dynamic = "force-dynamic";

export default async function EditContactPage({
  params,
}: {
  params: Promise<{ customerId: string; contactId: string }>;
}) {
  const { customerId, contactId } = await params;
  const { session, workspace } = await requireWorkspace(`/customers/${customerId}/contacts/${contactId}/edit`);
  const customer = await getOrganizationForUser(session.user.id, customerId, "customer");
  const contact = customer?.canChange ? await getOrganizationContact(session.user.id, customer.id, contactId) : null;
  // Someone who can't change the customer gets the same page as for a missing contact.
  if (!customer || !contact) {
    notFound();
  }

  return (
    <div className="flex min-h-screen flex-col bg-background text-foreground">
      <AppHeader email={session.user.email} {...await recordWorkspace(session.user.id, workspace, customer.workspaceId)} />
      <main className="mx-auto w-full max-w-2xl p-6">
        <Card>
          <CardHeader>
            <CardTitle>Edit contact at {customer.name}</CardTitle>
          </CardHeader>
          <CardContent>
            <ContactForm customerId={customer.id} contact={contact} />
          </CardContent>
        </Card>
      </main>
    </div>
  );
}

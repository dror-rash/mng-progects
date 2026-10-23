import { Card, CardContent, CardHeader, CardTitle } from "@repo/ui/card";
import { notFound } from "next/navigation";

import { requireSession } from "@/features/auth/require-session";
import { AppHeader } from "@/features/layout/app-header";
import { ContactForm } from "@/features/organizations/contacts/contact-form";
import { getOrganizationContact } from "@/features/organizations/contacts/queries";
import { getOwnedOrganization } from "@/features/organizations/queries";

export const dynamic = "force-dynamic";

export default async function EditContactPage({
  params,
}: {
  params: Promise<{ customerId: string; contactId: string }>;
}) {
  const { customerId, contactId } = await params;
  const session = await requireSession(`/customers/${customerId}/contacts/${contactId}/edit`);
  const customer = await getOwnedOrganization(session.user.id, customerId, "customer");
  const contact = customer ? await getOrganizationContact(customer.id, contactId) : null;
  if (!customer || !contact) {
    notFound();
  }

  return (
    <div className="flex min-h-screen flex-col bg-background text-foreground">
      <AppHeader email={session.user.email} />
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

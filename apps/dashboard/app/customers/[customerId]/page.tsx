import { Badge } from "@repo/ui/badge";
import { Button } from "@repo/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@repo/ui/card";
import Link from "next/link";
import { notFound } from "next/navigation";

import { requireSession } from "@/features/auth/require-session";
import { AppHeader } from "@/features/layout/app-header";
import { ContactsSection } from "@/features/organizations/contacts/contacts-section";
import { listContacts } from "@/features/organizations/contacts/queries";
import { organizationStatusLabel } from "@/features/organizations/organization-kinds";
import { getOwnedOrganization } from "@/features/organizations/queries";

export const dynamic = "force-dynamic";

function Detail({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div className="space-y-1">
      <dt className="text-xs font-medium uppercase tracking-wide text-muted-foreground">{label}</dt>
      <dd className="text-sm">{children}</dd>
    </div>
  );
}

const missing = <span className="text-muted-foreground">—</span>;

export default async function CustomerPage({ params }: { params: Promise<{ customerId: string }> }) {
  const { customerId } = await params;
  const session = await requireSession(`/customers/${customerId}`);
  const customer = await getOwnedOrganization(session.user.id, customerId, "customer");
  if (!customer) {
    notFound();
  }
  const contacts = await listContacts(customer.id);

  return (
    <div className="flex min-h-screen flex-col bg-background text-foreground">
      <AppHeader email={session.user.email} />

      <main className="mx-auto w-full max-w-4xl space-y-6 p-6">
        <nav aria-label="Breadcrumb" className="text-sm text-muted-foreground">
          <Link href="/customers" className="hover:underline">Customers</Link>
        </nav>

        <section className="flex flex-wrap items-start justify-between gap-4">
          <div className="space-y-2">
            <h1 className="text-2xl font-bold tracking-tight">{customer.name}</h1>
            <div className="flex flex-wrap items-center gap-2">
              <Badge>{organizationStatusLabel(customer.status)}</Badge>
              {customer.tags.map((t) => (
                <Badge key={t} variant="outline">{t}</Badge>
              ))}
            </div>
          </div>
          <div className="flex gap-2">
            <Button asChild variant="outline" size="sm">
              <Link href={`/customers/${customer.id}/edit`}>Edit customer</Link>
            </Button>
            <Button asChild variant="ghost" size="sm">
              <Link href={`/customers/${customer.id}/delete`}>Delete customer</Link>
            </Button>
          </div>
        </section>

        <Card>
          <CardHeader>
            <CardTitle className="text-base">Details</CardTitle>
          </CardHeader>
          <CardContent>
            <dl className="grid gap-4 sm:grid-cols-2">
              <Detail label="Email">
                {customer.email ? <a href={`mailto:${customer.email}`} className="hover:underline">{customer.email}</a> : missing}
              </Detail>
              <Detail label="Phone">
                {customer.phone ? <a href={`tel:${customer.phone.replace(/[^\d+]/g, "")}`} className="hover:underline">{customer.phone}</a> : missing}
              </Detail>
              <Detail label="Website">
                {customer.website ? (
                  <a href={customer.website} target="_blank" rel="noopener noreferrer" className="hover:underline">
                    {customer.website}
                  </a>
                ) : missing}
              </Detail>
              <Detail label="Company / tax ID">{customer.companyId ?? missing}</Detail>
              <Detail label="Address">
                {customer.address ? <span className="whitespace-pre-wrap">{customer.address}</span> : missing}
              </Detail>
            </dl>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="text-base">General information</CardTitle>
          </CardHeader>
          <CardContent>
            {customer.about ? (
              <p className="whitespace-pre-wrap text-sm">{customer.about}</p>
            ) : (
              <p className="text-sm text-muted-foreground">Nothing yet. Use &ldquo;Edit customer&rdquo; to add it.</p>
            )}
          </CardContent>
        </Card>

        <ContactsSection customerId={customer.id} contacts={contacts} />
      </main>
    </div>
  );
}

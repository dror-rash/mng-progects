import { Button } from "@repo/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@repo/ui/card";
import Link from "next/link";
import { notFound } from "next/navigation";

import { AppHeader } from "@/features/layout/app-header";
import { recordWorkspace } from "@/features/layout/record-workspace";
import { ContactForm } from "@/features/organizations/contacts/contact-form";
import { removeSiteContactAction } from "@/features/sites/actions";
import { formatCoordinate } from "@/features/sites/coordinates";
import { mapsLink } from "@/features/sites/maps-link";
import { getSiteForUser, listSiteContacts } from "@/features/sites/queries";
import { SiteContactsSection } from "@/features/sites/site-contacts-section";
import { requireWorkspace } from "@/features/workspaces/require-workspace";

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

/**
 * A site (task 054): where it is, how to get in and who to meet. Admins change it; auditors, and partners
 * with a project at it (task 055), read it.
 */
export default async function SitePage({ params }: { params: Promise<{ siteId: string }> }) {
  const { siteId } = await params;
  const { session, workspace } = await requireWorkspace(`/sites/${siteId}`);
  const site = await getSiteForUser(session.user.id, siteId);
  if (!site) {
    notFound();
  }
  const contacts = await listSiteContacts(session.user.id, site.id);
  const maps = mapsLink(site);

  return (
    <div className="flex min-h-screen flex-col bg-background text-foreground">
      <AppHeader email={session.user.email} role={workspace.role} {...await recordWorkspace(session.user.id, workspace, site.workspaceId)} />

      <main className="mx-auto w-full max-w-4xl space-y-6 p-6">
        {site.canSeeCustomer && (
          <nav aria-label="Breadcrumb" className="text-sm text-muted-foreground">
            <Link href="/customers" className="hover:underline">Customers</Link>
          </nav>
        )}

        <section className="flex flex-wrap items-start justify-between gap-4">
          <div className="space-y-1">
            <h1 className="text-2xl font-bold tracking-tight">{site.name}</h1>
            {/* Partners see the site of their project (task 055), and its customer's name only. */}
            {site.customerName && (
              <p className="text-sm text-muted-foreground">
                Site of{" "}
                {site.canSeeCustomer ? (
                  <Link href={`/customers/${site.organizationId}`} className="font-medium text-foreground hover:underline">
                    {site.customerName}
                  </Link>
                ) : (
                  <span className="font-medium text-foreground">{site.customerName}</span>
                )}
              </p>
            )}
          </div>
          {site.canChange && (
            <div className="flex gap-2">
              <Button asChild variant="outline" size="sm">
                <Link href={`/sites/${site.id}/edit`}>Edit site</Link>
              </Button>
              <Button asChild variant="ghost" size="sm">
                <Link href={`/sites/${site.id}/delete`}>Delete site</Link>
              </Button>
            </div>
          )}
        </section>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between gap-4 space-y-0">
            <CardTitle className="text-base">Where</CardTitle>
            {maps && (
              <Button asChild variant="outline" size="sm">
                <a href={maps} target="_blank" rel="noopener noreferrer">Open in maps</a>
              </Button>
            )}
          </CardHeader>
          <CardContent>
            <dl className="grid gap-4 sm:grid-cols-2">
              <Detail label="Address">
                {site.address ? <span className="whitespace-pre-wrap">{site.address}</span> : missing}
              </Detail>
              <Detail label="Coordinates">
                {site.latitude !== null && site.longitude !== null
                  ? `${formatCoordinate(site.latitude)}, ${formatCoordinate(site.longitude)}`
                  : missing}
              </Detail>
            </dl>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="text-base">Access notes</CardTitle>
          </CardHeader>
          <CardContent>
            {site.accessNotes ? (
              <p className="whitespace-pre-wrap text-sm">{site.accessNotes}</p>
            ) : (
              <p className="text-sm text-muted-foreground">
                {site.canChange ? <>Nothing yet. Use &ldquo;Edit site&rdquo; to add gate codes, hours or safety notes.</> : "Nothing yet."}
              </p>
            )}
          </CardContent>
        </Card>

        <SiteContactsSection
          siteId={site.id}
          contacts={contacts}
          removeAction={site.canChange ? removeSiteContactAction : undefined}
          addForm={site.canChange ? <ContactForm owner={{ kind: "site", id: site.id }} /> : undefined}
        />
      </main>
    </div>
  );
}

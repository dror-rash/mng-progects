import { Badge } from "@repo/ui/badge";
import { Button } from "@repo/ui/button";
import { Card } from "@repo/ui/card";
import { cn } from "@repo/ui/lib/utils";
import Link from "next/link";

import { requireSession } from "@/features/auth/require-session";
import { AppHeader } from "@/features/layout/app-header";
import { ORGANIZATION_STATUSES, organizationStatusLabel, parseOrganizationStatus } from "@/features/organizations/organization-kinds";
import { listOrganizations, listOrganizationTags } from "@/features/organizations/queries";

export const dynamic = "force-dynamic";

type SearchParams = Promise<{ status?: string; tag?: string }>;

function FilterLink({ href, active, children }: { href: string; active: boolean; children: React.ReactNode }) {
  return (
    <Link
      href={href}
      aria-current={active ? "page" : undefined}
      className={cn(
        "rounded-full border px-3 py-1 text-sm hover:bg-secondary",
        active && "border-primary bg-primary text-primary-foreground hover:bg-primary/90",
      )}
    >
      {children}
    </Link>
  );
}

export default async function CustomersPage({ searchParams }: { searchParams: SearchParams }) {
  const session = await requireSession("/customers");
  const params = await searchParams;
  const status = parseOrganizationStatus(params.status) ?? undefined;
  const tag = params.tag?.trim() || undefined;

  const [customers, tags] = await Promise.all([
    listOrganizations(session.user.id, "customer", { status, tag }),
    listOrganizationTags(session.user.id, "customer"),
  ]);

  return (
    <div className="flex min-h-screen flex-col bg-background text-foreground">
      <AppHeader email={session.user.email} />

      <main className="mx-auto w-full max-w-6xl space-y-6 p-6">
        <div className="flex items-center justify-between gap-4">
          <h1 className="text-2xl font-bold tracking-tight">Customers</h1>
          <Button asChild>
            <Link href="/customers/new">New customer</Link>
          </Button>
        </div>

        <div className="space-y-3">
          <nav aria-label="Filter by status" className="flex flex-wrap gap-2">
            <FilterLink href="/customers" active={!status && !tag}>All</FilterLink>
            {ORGANIZATION_STATUSES.map((s) => (
              <FilterLink key={s.status} href={`/customers?status=${s.status}`} active={status === s.status}>
                {s.label}
              </FilterLink>
            ))}
          </nav>
          {tags.length > 0 && (
            <nav aria-label="Filter by tag" className="flex flex-wrap items-center gap-2">
              <span className="text-sm text-muted-foreground">Tags:</span>
              {tags.map((t) => (
                <FilterLink key={t} href={`/customers?tag=${encodeURIComponent(t)}`} active={tag === t}>
                  {t}
                </FilterLink>
              ))}
            </nav>
          )}
        </div>

        {customers.length === 0 ? (
          <Card className="border-dashed p-8 text-center text-muted-foreground">
            {status || tag ? "No customers match this filter." : "No customers yet. Add your first one with “New customer”."}
          </Card>
        ) : (
          <ul className="divide-y rounded-lg border">
            {customers.map((c) => (
              <li key={c.id} className="flex flex-wrap items-center justify-between gap-3 p-4">
                <div className="space-y-1">
                  <div className="flex flex-wrap items-center gap-2">
                    <Link href={`/customers/${c.id}`} className="font-medium hover:underline">
                      {c.name}
                    </Link>
                    <Badge>{organizationStatusLabel(c.status)}</Badge>
                  </div>
                  {c.tags.length > 0 && (
                    <div className="flex flex-wrap gap-1">
                      {c.tags.map((t) => (
                        <Badge key={t} variant="outline">{t}</Badge>
                      ))}
                    </div>
                  )}
                </div>
                <div className="text-right text-sm text-muted-foreground">
                  {c.email && <div>{c.email}</div>}
                  {c.phone && <div>{c.phone}</div>}
                </div>
              </li>
            ))}
          </ul>
        )}
      </main>
    </div>
  );
}

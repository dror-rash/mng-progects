import { Badge } from "@repo/ui/badge";
import { Button } from "@repo/ui/button";
import { Card } from "@repo/ui/card";
import { FilterChip } from "@repo/ui/filter-chip";
import Link from "next/link";

import { requireSession } from "@/features/auth/require-session";
import { AppHeader } from "@/features/layout/app-header";
import { firstParam, withParams } from "@/features/navigation/search-params";
import { firstContactNames } from "@/features/organizations/contacts/queries";
import { ORGANIZATION_STATUSES, organizationStatusLabel, parseOrganizationStatus } from "@/features/organizations/organization-kinds";
import { listOrganizations, listOrganizationTags } from "@/features/organizations/queries";
import { sameTag } from "@/features/organizations/tag-list";

export const dynamic = "force-dynamic";

type SearchParams = Promise<Record<string, string | string[] | undefined>>;

export default async function CustomersPage({ searchParams }: { searchParams: SearchParams }) {
  const params = await searchParams;
  const status = parseOrganizationStatus(firstParam(params.status)) ?? undefined;
  const tag = firstParam(params.tag);
  // Each filter link changes its own filter and keeps the other one.
  const link = (next: { status?: string; tag?: string }) => withParams("/customers", { status, tag, ...next });
  const session = await requireSession(link({}));

  const [customers, tags] = await Promise.all([
    listOrganizations(session.user.id, "customer", { status, tag }),
    listOrganizationTags(session.user.id, "customer"),
  ]);
  const contactNames = await firstContactNames(customers.map((c) => c.id));

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
            <FilterChip selected={!status}>
              <Link href={link({ status: undefined })}>All statuses</Link>
            </FilterChip>
            {ORGANIZATION_STATUSES.map((s) => (
              <FilterChip key={s.status} selected={status === s.status}>
                <Link href={link({ status: s.status })}>{s.label}</Link>
              </FilterChip>
            ))}
          </nav>
          {(tags.length > 0 || tag) && (
            <nav aria-label="Filter by tag" className="flex flex-wrap items-center gap-2">
              <span className="text-sm text-muted-foreground">Tags:</span>
              <FilterChip selected={!tag}>
                <Link href={link({ tag: undefined })}>Any tag</Link>
              </FilterChip>
              {tags.map((t) => (
                <FilterChip key={t} selected={sameTag(tag, t)}>
                  <Link href={link({ tag: t })}>{t}</Link>
                </FilterChip>
              ))}
              {/* A filter from an old link or a typo still shows, so it can be seen and cleared. */}
              {tag && !tags.some((t) => sameTag(tag, t)) && (
                <FilterChip selected>
                  <Link href={link({ tag })}>{tag}</Link>
                </FilterChip>
              )}
            </nav>
          )}
        </div>

        {customers.length === 0 ? (
          <Card className="border-dashed p-8 text-center text-muted-foreground">
            {status || tag ? (
              <>
                No customers match these filters.{" "}
                <Link href="/customers" className="underline">Clear filters</Link>
              </>
            ) : (
              "No customers yet. Add your first one with “New customer”."
            )}
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
                  {contactNames.has(c.id) && <div className="font-medium text-foreground">{contactNames.get(c.id)}</div>}
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

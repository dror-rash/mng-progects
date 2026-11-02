import { Badge } from "@repo/ui/badge";
import { Button } from "@repo/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@repo/ui/card";
import Link from "next/link";

import { organizationStatusLabel } from "./organization-kinds";

type SubCompany = { id: string; name: string; status: string; primaryContactName: string | null };

/**
 * A top-level customer's sub-companies (task 053), with a "New sub-company" link for admins
 * (`canAdd`). Links are `next/link` paths within the zone.
 */
export function SubCompaniesSection({
  parentId,
  subCompanies,
  canAdd,
}: {
  parentId: string;
  subCompanies: SubCompany[];
  canAdd: boolean;
}) {
  return (
    <section aria-labelledby="sub-companies-heading">
      <Card>
        <CardHeader className="flex flex-row items-center justify-between gap-4 space-y-0">
          <CardTitle id="sub-companies-heading" className="text-base">Sub-companies</CardTitle>
          {canAdd && (
            <Button asChild variant="outline" size="sm">
              <Link href={`/customers/new?parent=${parentId}`}>New sub-company</Link>
            </Button>
          )}
        </CardHeader>
        <CardContent>
          {subCompanies.length === 0 ? (
            <p className="text-sm text-muted-foreground">
              {canAdd ? <>No sub-companies. Use &ldquo;New sub-company&rdquo; for a brand or company it owns.</> : "No sub-companies."}
            </p>
          ) : (
            <ul className="divide-y">
              {subCompanies.map((c) => (
                <li key={c.id} className="flex flex-wrap items-center justify-between gap-2 py-2 first:pt-0 last:pb-0">
                  <span className="flex items-center gap-2">
                    <Link href={`/customers/${c.id}`} className="text-sm font-medium hover:underline">{c.name}</Link>
                    <Badge variant="outline">{organizationStatusLabel(c.status)}</Badge>
                  </span>
                  {c.primaryContactName && <span className="text-xs text-muted-foreground">{c.primaryContactName}</span>}
                </li>
              ))}
            </ul>
          )}
        </CardContent>
      </Card>
    </section>
  );
}

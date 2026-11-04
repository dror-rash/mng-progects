import { Button } from "@repo/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@repo/ui/card";
import Link from "next/link";

type SiteRow = { id: string; name: string; address: string | null };

/**
 * A customer's own sites (task 054); a sub-company's sites are on its own page (task 072). Admins get
 * "New site" (`canAdd`).
 */
export function SitesSection({ customerId, sites, canAdd }: { customerId: string; sites: SiteRow[]; canAdd: boolean }) {
  return (
    <section aria-labelledby="sites-heading">
      <Card>
        <CardHeader className="flex flex-row items-center justify-between gap-4 space-y-0">
          <CardTitle id="sites-heading" className="text-base">Sites</CardTitle>
          {canAdd && (
            <Button asChild variant="outline" size="sm">
              <Link href={`/sites/new?customer=${customerId}`}>New site</Link>
            </Button>
          )}
        </CardHeader>
        <CardContent>
          {sites.length === 0 ? (
            <p className="text-sm text-muted-foreground">
              {canAdd ? <>No sites yet. Use &ldquo;New site&rdquo; for each place where work happens.</> : "No sites yet."}
            </p>
          ) : (
            <ul className="divide-y">
              {sites.map((s) => (
                <li key={s.id} className="flex flex-wrap items-center justify-between gap-2 py-2 first:pt-0 last:pb-0">
                  <Link href={`/sites/${s.id}`} className="text-sm font-medium hover:underline">{s.name}</Link>
                  {s.address && <span className="text-xs text-muted-foreground">{s.address}</span>}
                </li>
              ))}
            </ul>
          )}
        </CardContent>
      </Card>
    </section>
  );
}

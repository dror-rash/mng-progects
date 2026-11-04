import { Badge } from "@repo/ui/badge";
import { Card } from "@repo/ui/card";
import { Table, TableBody, TableCaption, TableCell, TableHead, TableHeader, TableRow } from "@repo/ui/table";
import Link from "next/link";

import { organizationStatusLabel } from "./organization-kinds";

type CustomerRow = {
  id: string;
  name: string;
  status: string;
  tags: string[];
  subCompanyCount: number;
  siteCount: number;
  projectCount: number;
  primaryContactName: string | null;
};

const COLUMNS = ["Customer", "Status", "Sub-companies", "Sites", "Projects", "Primary contact"];

/**
 * The Customers table (task 072): top-level customers, each named by its link with its tags under it,
 * with its status, how many sub-companies, sites and projects it has (with its sub-companies'), and its
 * primary contact. Says so when there are none, or none match the filters (`filtered`).
 */
export function CustomersTable({
  customers,
  filtered,
  canAdd,
}: {
  customers: CustomerRow[];
  filtered: boolean;
  /** Admins add customers: the empty table says how. */
  canAdd: boolean;
}) {
  if (customers.length === 0) {
    return (
      <Card className="border-dashed p-8 text-center text-muted-foreground">
        {filtered ? (
          <>
            No customers match these filters.{" "}
            <Link href="/customers" className="underline">Clear filters</Link>
          </>
        ) : canAdd ? (
          "No customers yet. Add your first one with “New customer”."
        ) : (
          "No customers yet."
        )}
      </Card>
    );
  }

  return (
    <Table>
      <TableCaption className="sr-only">Customers</TableCaption>
      <TableHeader>
        <TableRow>
          {COLUMNS.map((column) => (
            <TableHead key={column}>{column}</TableHead>
          ))}
        </TableRow>
      </TableHeader>
      <TableBody>
        {customers.map((c) => (
          <TableRow key={c.id}>
            <TableHead scope="row" className="h-auto py-2 whitespace-normal">
              <Link href={`/customers/${c.id}`} className="hover:underline">
                {c.name}
              </Link>
              {c.tags.length > 0 && (
                <div className="mt-1 flex flex-wrap gap-1">
                  {c.tags.map((t) => (
                    <Badge key={t} variant="outline">{t}</Badge>
                  ))}
                </div>
              )}
            </TableHead>
            <TableCell>
              <Badge>{organizationStatusLabel(c.status)}</Badge>
            </TableCell>
            <TableCell className="tabular-nums">{c.subCompanyCount}</TableCell>
            <TableCell className="tabular-nums">{c.siteCount}</TableCell>
            <TableCell className="tabular-nums">{c.projectCount}</TableCell>
            <TableCell>{c.primaryContactName ?? <span className="text-muted-foreground">—</span>}</TableCell>
          </TableRow>
        ))}
      </TableBody>
    </Table>
  );
}

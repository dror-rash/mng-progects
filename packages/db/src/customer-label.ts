import { type AnyColumn, sql } from "drizzle-orm";

import { customerName } from "./schema";

/**
 * A record's customer label ("Parent › Sub-company", or the name) from the `customer_name` view, or null
 * when there is none the user may see (task 071). A subquery per record, not a join: `customer_name` is a
 * security-barrier view, so a join can't use the record's customer id and checks access on every customer
 * in the database first. `organizationId` and `workspaceId` are the record's columns.
 */
export function customerLabelOf(organizationId: AnyColumn, workspaceId: AnyColumn) {
  return sql<string | null>`(select ${customerName.label} from ${customerName} where ${customerName.id} = ${organizationId} and ${customerName.workspaceId} = ${workspaceId})`;
}

import { getMaintenanceDb } from "./maintenance";
import * as schema from "./schema";

// Shared fixtures for the database tests (`*.db.test.ts`); not exported from the package. Every project
// has a customer and one of its sites (task 071), so tests that need a project make both first.

/** A site of the customer `organizationId`, with the id `<organizationId>-site`; returns that id. */
export async function insertSiteOf(workspaceId: string, organizationId: string, name = "Site") {
  const id = `${organizationId}-site`;
  await getMaintenanceDb().insert(schema.site).values({ id, workspaceId, organizationId, name });
  return id;
}

/** A customer with the id `id` and one site, for a project to be for and at; returns both ids. */
export async function insertCustomerWithSite(workspaceId: string, id: string, name = "Customer") {
  await getMaintenanceDb().insert(schema.organization).values({ id, workspaceId, name });
  return { organizationId: id, siteId: await insertSiteOf(workspaceId, id, `${name} site`) };
}

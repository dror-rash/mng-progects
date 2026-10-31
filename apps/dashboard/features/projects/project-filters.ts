import { firstParam } from "@/features/navigation/search-params";

import { parseProjectStatus, type ProjectStatus } from "./project-status";

/** The customer filter's value for projects without a customer. */
export const NO_CUSTOMER = "none";

export type ProjectView = "table" | "tiles";

export type ProjectFilters = {
  /** A customer id, or `NO_CUSTOMER`. */
  customer?: string;
  status?: ProjectStatus;
  /** Only projects with an open task due before today. */
  overdue: boolean;
  /** Part of the project name, any case. */
  q?: string;
  view: ProjectView;
};

type SearchParams = Record<string, string | string[] | undefined>;

/** Filters from the URL. Values that don't apply (another workspace's customer, a typo) are ignored. */
export function parseProjectFilters(params: SearchParams, customerIds: string[]): ProjectFilters {
  const customer = firstParam(params.customer);
  const status = parseProjectStatus(firstParam(params.status));
  const q = firstParam(params.q);
  return {
    ...(customer && (customer === NO_CUSTOMER || customerIds.includes(customer)) && { customer }),
    ...(status && { status }),
    overdue: firstParam(params.overdue) === "1",
    ...(q && { q }),
    view: firstParam(params.view) === "tiles" ? "tiles" : "table",
  };
}

/** The filters as URL params for `withParams`, leaving out the defaults. */
export function filterParams(filters: ProjectFilters): Record<string, string> {
  return {
    ...(filters.customer && { customer: filters.customer }),
    ...(filters.status && { status: filters.status }),
    ...(filters.overdue && { overdue: "1" }),
    ...(filters.q && { q: filters.q }),
    ...(filters.view === "tiles" && { view: "tiles" }),
  };
}

type FilterableProject = { name: string; organizationId: string | null; status: ProjectStatus; overdue: number };

/** The projects matching every filter, in their original order. */
export function filterProjects<T extends FilterableProject>(projects: T[], filters: ProjectFilters): T[] {
  const q = filters.q?.toLowerCase();
  return projects.filter(
    (p) =>
      (!filters.customer || (filters.customer === NO_CUSTOMER ? p.organizationId === null : p.organizationId === filters.customer)) &&
      (!filters.status || p.status === filters.status) &&
      (!filters.overdue || p.overdue > 0) &&
      (!q || p.name.toLowerCase().includes(q)),
  );
}

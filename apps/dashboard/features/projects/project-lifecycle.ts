/**
 * A project's lifecycle, set by hand (ADR-0006 rule 4b): active, or canceled by anyone who can change the
 * project, and reopened the same way. Stored in `project.status` (the Drizzle property `lifecycle`), apart
 * from the status derived from its tasks (`project-status.ts`), which "Canceled" replaces.
 */
export const PROJECT_LIFECYCLE = [
  { status: "active", label: "Active" },
  { status: "canceled", label: "Canceled" },
] as const;

export type ProjectLifecycle = (typeof PROJECT_LIFECYCLE)[number]["status"];

const DEFAULT_LIFECYCLE: ProjectLifecycle = "active";

export function parseProjectLifecycle(value: unknown): ProjectLifecycle | null {
  return PROJECT_LIFECYCLE.find((l) => l.status === value)?.status ?? null;
}

/** The label for a stored lifecycle; an unknown value counts as active. */
export function projectLifecycleLabel(value: string): string {
  const lifecycle = parseProjectLifecycle(value) ?? DEFAULT_LIFECYCLE;
  return PROJECT_LIFECYCLE.find((l) => l.status === lifecycle)!.label;
}

/** Whether a stored lifecycle is canceled (an unknown value counts as active). */
export function isCanceled(value: string): boolean {
  return parseProjectLifecycle(value) === "canceled";
}

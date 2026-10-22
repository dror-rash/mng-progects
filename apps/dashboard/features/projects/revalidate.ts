import { revalidatePath } from "next/cache";

/** Pages that list projects with progress. Paths are relative to the basePath: "/" is /dashboard. */
export function revalidateOverviews() {
  revalidatePath("/");
  revalidatePath("/projects");
}

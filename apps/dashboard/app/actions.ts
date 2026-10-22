"use server";

import { getSession } from "@repo/auth/server";
import { getDb, schema } from "@repo/db";
import { revalidatePath } from "next/cache";

import { parseProjectInput } from "@/features/projects/project-input";

export async function createProjectAction(formData: FormData) {
  const session = await getSession();
  if (!session) {
    throw new Error("Unauthorized");
  }

  const input = parseProjectInput(formData);
  if (!input.ok) {
    throw new Error(input.error);
  }

  const db = getDb();
  await db.insert(schema.project).values({
    id: crypto.randomUUID(),
    ...input.value,
    ownerId: session.user.id,
  });

  revalidatePath("/dashboard");
}

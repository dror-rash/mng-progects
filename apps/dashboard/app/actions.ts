"use server";

import { getSession } from "@repo/auth/server";
import { getDb, schema } from "@repo/db";
import { revalidatePath } from "next/cache";

export async function createProjectAction(formData: FormData) {
  const session = await getSession();
  if (!session) {
    throw new Error("Unauthorized");
  }

  const name = String(formData.get("name") ?? "").trim();
  const description = String(formData.get("description") ?? "").trim();

  if (!name) {
    throw new Error("Project name is required");
  }

  const db = getDb();
  await db.insert(schema.project).values({
    id: crypto.randomUUID(),
    name,
    description: description || null,
    ownerId: session.user.id,
  });

  revalidatePath("/dashboard");
}

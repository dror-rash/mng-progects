import { getSession } from "@repo/auth/server";
import { redirect } from "next/navigation";

export const dynamic = "force-dynamic";

/** `/` has no page of its own (task 070): signed in → the dashboard overview, signed out → the login page. */
export default async function HomePage() {
  const session = await getSession();
  redirect(session ? "/dashboard" : "/login");
}

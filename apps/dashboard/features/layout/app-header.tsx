import { SignOutButton } from "@repo/auth/components";
import { Button } from "@repo/ui/button";
import { parseTheme, THEME_COOKIE } from "@repo/ui/theme";
import { ThemeToggle } from "@repo/ui/theme-toggle";
import { cookies } from "next/headers";
import Link from "next/link";

import type { WorkspaceRole } from "@/features/access/roles";
import { canSeeCustomers, canSeeDeleted, canSeePartners } from "@/features/access/scope";

const NAV = [
  { href: "/", label: "Overview" },
  { href: "/projects", label: "All projects" },
  { href: "/customers", label: "Customers" },
  { href: "/my-tasks", label: "My tasks" },
];

/** Shown to admins and auditors of the current workspace only. */
const PARTNERS = { href: "/partners", label: "Partners" };
const DELETED = { href: "/deleted", label: "Deleted" };

/** The links for my role: partners get no Customers (names only); admins and auditors also get Partners and Deleted. */
function navFor(role: WorkspaceRole) {
  const nav = canSeeCustomers(role) ? NAV : NAV.filter((item) => item.href !== "/customers");
  const withPartners = canSeePartners(role) ? [...nav.slice(0, 3), PARTNERS, ...nav.slice(3)] : nav;
  return canSeeDeleted(role) ? [...withPartners, DELETED] : withPartners;
}

/**
 * Zone header. Links inside the zone use next/link; "Home" is the shell, so it's a plain <a>.
 * Below `xl` the nav takes its own row and wraps, so nothing is pushed off-screen from 360px up.
 * `workspaceName` is the workspace of what the page shows: a record's own workspace on record pages,
 * with `otherWorkspace` set when that isn't the current one. `role` is mine in the current workspace (the
 * nav links go there): partners get no Customers, admins and auditors also get Partners and Deleted.
 */
export async function AppHeader({
  email,
  role,
  workspaceName,
  otherWorkspace = false,
}: {
  email: string;
  role: WorkspaceRole;
  workspaceName: string;
  otherWorkspace?: boolean;
}) {
  const theme = parseTheme((await cookies()).get(THEME_COOKIE)?.value);
  const nav = navFor(role);

  return (
    <header className="border-b bg-card">
      <div className="mx-auto flex max-w-6xl flex-wrap items-center gap-x-3 gap-y-2 px-4 py-3 sm:px-6 xl:h-16 xl:flex-nowrap xl:py-0">
        <Link
          href="/"
          className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-primary font-bold text-primary-foreground"
        >
          <span className="sr-only">Dashboard home</span>
          <span aria-hidden="true">W</span>
        </Link>
        <div className="flex min-w-0 flex-1 flex-col xl:min-w-24 xl:max-w-48 xl:flex-initial">
          <Link
            href="/workspaces"
            className="truncate text-sm font-semibold hover:underline"
            aria-label={`${workspaceName}: switch workspace`}
            title={`${workspaceName}: switch workspace`}
          >
            {workspaceName}
          </Link>
          {otherWorkspace && <span className="truncate text-xs text-muted-foreground">in another workspace</span>}
        </div>
        <nav
          aria-label="Dashboard"
          className="order-last -ml-3 flex w-full flex-wrap items-center gap-1 xl:order-none xl:ml-0 xl:w-auto xl:flex-nowrap"
        >
          {nav.map((item) => (
            <Button key={item.href} asChild variant="ghost" size="sm">
              <Link href={item.href}>{item.label}</Link>
            </Button>
          ))}
        </nav>
        {/* Only the email gives way when the nav is long (admins and auditors): never the workspace name. */}
        <div className="ml-auto flex min-w-0 items-center gap-2">
          <span className="hidden min-w-0 max-w-56 truncate text-sm text-muted-foreground xl:inline">{email}</span>
          <ThemeToggle theme={theme} />
          <Button asChild variant="outline" size="sm">
            <a href="/">Home</a>
          </Button>
          <SignOutButton />
        </div>
      </div>
    </header>
  );
}

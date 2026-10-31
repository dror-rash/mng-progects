import { SignOutButton } from "@repo/auth/components";
import { Button } from "@repo/ui/button";
import { parseTheme, THEME_COOKIE } from "@repo/ui/theme";
import { ThemeToggle } from "@repo/ui/theme-toggle";
import { cookies } from "next/headers";
import Link from "next/link";

import type { WorkspaceRole } from "@/features/access/roles";
import { canSeeCustomers, canSeePartners } from "@/features/access/scope";

const NAV = [
  { href: "/", label: "Overview" },
  { href: "/projects", label: "All projects" },
  { href: "/customers", label: "Customers" },
  { href: "/my-tasks", label: "My tasks" },
];

/** Shown to admins and auditors of the current workspace only. */
const PARTNERS = { href: "/partners", label: "Partners" };

/** The links for my role: partners get no Customers (names only); admins and auditors also get Partners. */
function navFor(role: WorkspaceRole) {
  const nav = canSeeCustomers(role) ? NAV : NAV.filter((item) => item.href !== "/customers");
  return canSeePartners(role) ? [...nav.slice(0, 3), PARTNERS, ...nav.slice(3)] : nav;
}

/**
 * Zone header. Links inside the zone use next/link; "Home" is the shell, so it's a plain <a>.
 * Below `lg` the nav takes its own row and wraps, so nothing is pushed off-screen from 360px up.
 * `workspaceName` is the workspace of what the page shows: a record's own workspace on record pages,
 * with `otherWorkspace` set when that isn't the current one. `role` is mine in the current workspace (the
 * nav links go there): partners get no Customers, admins and auditors also get Partners.
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
      <div className="mx-auto flex max-w-6xl flex-wrap items-center gap-x-3 gap-y-2 px-4 py-3 sm:px-6 lg:h-16 lg:flex-nowrap lg:py-0">
        <Link
          href="/"
          className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-primary font-bold text-primary-foreground"
        >
          <span className="sr-only">Dashboard home</span>
          <span aria-hidden="true">W</span>
        </Link>
        <div className="flex min-w-0 flex-1 flex-col lg:max-w-48 lg:flex-initial">
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
          className="order-last -ml-3 flex w-full flex-wrap items-center gap-1 lg:order-none lg:ml-0 lg:w-auto lg:flex-nowrap"
        >
          {nav.map((item) => (
            <Button key={item.href} asChild variant="ghost" size="sm">
              <Link href={item.href}>{item.label}</Link>
            </Button>
          ))}
        </nav>
        <div className="ml-auto flex shrink-0 items-center gap-2">
          <span className="hidden max-w-56 truncate text-sm text-muted-foreground xl:inline">{email}</span>
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

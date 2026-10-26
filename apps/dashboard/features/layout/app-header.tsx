import { SignOutButton } from "@repo/auth/components";
import { Button } from "@repo/ui/button";
import Link from "next/link";

const NAV = [
  { href: "/", label: "Overview" },
  { href: "/projects", label: "All projects" },
  { href: "/customers", label: "Customers" },
];

/**
 * Zone header. Links inside the zone use next/link; "Home" is the shell, so it's a plain <a>.
 * On narrow screens the nav wraps onto its own row so nothing is pushed off-screen.
 */
export function AppHeader({ email }: { email: string }) {
  return (
    <header className="border-b bg-card">
      <div className="mx-auto flex max-w-6xl flex-wrap items-center gap-x-3 gap-y-1 px-4 py-3 sm:h-16 sm:flex-nowrap sm:px-6 sm:py-0">
        <Link
          href="/"
          className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-primary font-bold text-primary-foreground"
        >
          <span className="sr-only">Dashboard home</span>
          <span aria-hidden="true">W</span>
        </Link>
        <nav aria-label="Dashboard" className="order-last -ml-3 flex w-full items-center gap-1 sm:order-none sm:ml-0 sm:w-auto">
          {NAV.map((item) => (
            <Button key={item.href} asChild variant="ghost" size="sm">
              <Link href={item.href}>{item.label}</Link>
            </Button>
          ))}
        </nav>
        <div className="ml-auto flex items-center gap-2 sm:gap-4">
          <span className="hidden text-sm text-muted-foreground md:inline">{email}</span>
          <Button asChild variant="outline" size="sm">
            <a href="/">Home</a>
          </Button>
          <SignOutButton />
        </div>
      </div>
    </header>
  );
}

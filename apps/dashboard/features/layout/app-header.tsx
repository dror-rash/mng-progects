import { SignOutButton } from "@repo/auth/components";
import { Button } from "@repo/ui/button";
import Link from "next/link";

/** Zone header. Links inside the zone use next/link; "Home" is the shell, so it's a plain <a>. */
export function AppHeader({ email }: { email: string }) {
  return (
    <header className="border-b bg-card">
      <div className="mx-auto flex h-16 max-w-6xl items-center justify-between gap-2 px-4 sm:px-6">
        <nav aria-label="Dashboard" className="flex items-center gap-1">
          <Link href="/" className="mr-1 flex h-9 w-9 shrink-0 sm:mr-3 items-center justify-center rounded-lg bg-primary font-bold text-primary-foreground">
            <span className="sr-only">Dashboard home</span>
            <span aria-hidden="true">W</span>
          </Link>
          <Button asChild variant="ghost" size="sm">
            <Link href="/">Overview</Link>
          </Button>
          <Button asChild variant="ghost" size="sm">
            <Link href="/projects">All projects</Link>
          </Button>
        </nav>
        <div className="flex items-center gap-2 sm:gap-4">
          <span className="hidden text-sm text-muted-foreground md:inline">{email}</span>
          <Button asChild variant="outline" size="sm" className="hidden sm:inline-flex">
            <a href="/">Home</a>
          </Button>
          <SignOutButton />
        </div>
      </div>
    </header>
  );
}

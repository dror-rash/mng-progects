import { SignOutButton } from "@repo/auth/components";
import { getSession } from "@repo/auth/server";
import { Button } from "@repo/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@repo/ui/card";
import { parseTheme, THEME_COOKIE } from "@repo/ui/theme";
import { ThemeToggle } from "@repo/ui/theme-toggle";
import { cookies } from "next/headers";

export const dynamic = "force-dynamic";

export default async function HomePage() {
  const session = await getSession();
  const theme = parseTheme((await cookies()).get(THEME_COOKIE)?.value);

  return (
    <div className="flex min-h-screen flex-col bg-background text-foreground">
      {/* Navigation Header */}
      <header className="sticky top-0 z-50 border-b bg-background/80 backdrop-blur-sm">
        <div className="mx-auto flex h-16 max-w-6xl items-center justify-between px-6">
          <div className="flex items-center gap-3">
            <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-primary text-primary-foreground font-bold text-lg">
              W
            </div>
            <h1 className="text-xl font-bold tracking-tight">Waypoint</h1>
            <span className="rounded-full bg-secondary px-2.5 py-0.5 text-xs font-medium text-secondary-foreground">
              Project Hub
            </span>
          </div>

          <nav className="flex items-center gap-3">
            <ThemeToggle theme={theme} />

            <Button asChild variant="ghost" size="sm">
              {/* Plain <a>: crossing zones is a hard navigation */}
              <a href="/example">Example zone</a>
            </Button>

            {session ? (
              <div className="flex items-center gap-3">
                <span className="text-sm text-muted-foreground">{session.user.email}</span>
                <Button asChild size="sm">
                  <a href="/dashboard">Dashboard</a>
                </Button>
                <SignOutButton />
              </div>
            ) : (
              <div className="flex items-center gap-2">
                <Button asChild variant="outline" size="sm">
                  <a href="/login">Log in</a>
                </Button>
                <Button asChild size="sm">
                  <a href="/signup">Sign up</a>
                </Button>
              </div>
            )}
          </nav>
        </div>
      </header>

      {/* Hero Section */}
      <section className="mx-auto max-w-5xl px-6 py-20 text-center">
        <div className="inline-flex items-center gap-2 rounded-full border bg-secondary/50 px-3 py-1 text-sm font-medium text-secondary-foreground mb-6">
          <span className="h-2 w-2 rounded-full bg-emerald-500 animate-pulse" />
          Next-generation Project Management
        </div>

        <h2 className="text-4xl font-extrabold tracking-tight sm:text-5xl lg:text-6xl text-balance">
          Deliver high-impact projects with precision and speed
        </h2>

        <p className="mx-auto mt-6 max-w-2xl text-lg text-muted-foreground text-balance">
          Coordinate sprints, manage cross-functional roadmaps, and track task progress in an
          isolated, high-performance multi-zone architecture.
        </p>

        <div className="mt-8 flex flex-wrap items-center justify-center gap-4">
          {session ? (
            <Button asChild size="lg">
              <a href="/dashboard">Open Project Dashboard</a>
            </Button>
          ) : (
            <>
              <Button asChild size="lg">
                <a href="/signup">Get Started</a>
              </Button>
              <Button asChild variant="outline" size="lg">
                <a href="/login">Account Access</a>
              </Button>
            </>
          )}
        </div>
      </section>

      {/* Features Grid */}
      <section className="border-t bg-secondary/20 py-16">
        <div className="mx-auto max-w-6xl px-6">
          <div className="mb-12 text-center">
            <h3 className="text-2xl font-bold tracking-tight">Engineered for modern engineering teams</h3>
            <p className="mt-2 text-muted-foreground">
              Everything you need to plan, track, and ship products without friction.
            </p>
          </div>

          <div className="grid gap-6 md:grid-cols-3">
            <Card className="border bg-card">
              <CardHeader>
                <CardTitle className="text-lg font-semibold">Agile Boards & Sprints</CardTitle>
                <CardDescription>
                  Organize backlogs into sprints and track task execution across dynamic status columns.
                </CardDescription>
              </CardHeader>
              <CardContent className="text-sm text-muted-foreground">
                Drag-and-drop workflow status, milestone velocity tracking, and instant priority tagging.
              </CardContent>
            </Card>

            <Card className="border bg-card">
              <CardHeader>
                <CardTitle className="text-lg font-semibold">Multi-Zone Architecture</CardTitle>
                <CardDescription>
                  Decoupled sub-apps deployed independently on Google Cloud Run behind a unified root shell.
                </CardDescription>
              </CardHeader>
              <CardContent className="text-sm text-muted-foreground">
                Zero monolithic blast radius with instant zero-downtime micro-frontend deployments.
              </CardContent>
            </Card>

            <Card className="border bg-card">
              <CardHeader>
                <CardTitle className="text-lg font-semibold">Reliable Auth & DB Layer</CardTitle>
                <CardDescription>
                  Unified Better Auth sessions sharing Postgres persistence managed with Drizzle ORM.
                </CardDescription>
              </CardHeader>
              <CardContent className="text-sm text-muted-foreground">
                Strict type safety from schema definitions to UI components with complete test coverage.
              </CardContent>
            </Card>
          </div>
        </div>
      </section>

      {/* Footer */}
      <footer className="mt-auto border-t py-8 text-center text-sm text-muted-foreground">
        <div className="mx-auto max-w-6xl px-6 flex flex-col sm:flex-row items-center justify-between gap-4">
          <p>© 2026 Waypoint. Built for reliable project execution.</p>
          <div className="flex gap-6">
            <a href="https://github.com" className="hover:underline">Documentation</a>
            <a href="https://github.com" className="hover:underline">Architecture</a>
          </div>
        </div>
      </footer>
    </div>
  );
}

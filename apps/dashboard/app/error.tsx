"use client";

import { Button } from "@repo/ui/button";
import { Card } from "@repo/ui/card";

/** Fallback for unexpected errors. Invalid form input never lands here; forms show it inline. */
export default function DashboardError({ reset }: { error: Error & { digest?: string }; reset: () => void }) {
  return (
    <main className="mx-auto flex min-h-screen max-w-md items-center p-6">
      <Card className="w-full space-y-4 p-8 text-center">
        <h1 className="text-xl font-semibold">Something went wrong</h1>
        <p className="text-sm text-muted-foreground">Please try again. If it keeps happening, reload the page.</p>
        <Button onClick={reset}>Try again</Button>
      </Card>
    </main>
  );
}

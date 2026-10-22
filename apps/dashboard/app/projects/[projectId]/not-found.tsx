import { Button } from "@repo/ui/button";
import { Card } from "@repo/ui/card";
import Link from "next/link";

export default function ProjectNotFound() {
  return (
    <main className="mx-auto flex min-h-screen max-w-md items-center p-6">
      <Card className="w-full space-y-4 p-8 text-center">
        <h1 className="text-xl font-semibold">Project not found</h1>
        <p className="text-sm text-muted-foreground">It may have been deleted, or you don&apos;t have access to it.</p>
        <Button asChild variant="outline">
          <Link href="/">Back to dashboard</Link>
        </Button>
      </Card>
    </main>
  );
}

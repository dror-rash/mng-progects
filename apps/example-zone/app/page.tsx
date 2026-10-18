import { Button } from "@repo/ui/button";

export default function ExampleZonePage() {
  return (
    <main className="mx-auto max-w-2xl space-y-4 p-8">
      <h1 className="text-2xl font-semibold">Example zone</h1>
      <p className="text-muted-foreground">Served by its own app and deployment, behind the shell.</p>
      <Button asChild variant="outline">
        {/* basePath is not applied to plain <a>, so "/" reaches the shell. */}
        <a href="/">Back to shell</a>
      </Button>
    </main>
  );
}

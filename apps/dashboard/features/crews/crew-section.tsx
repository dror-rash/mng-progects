import { Button } from "@repo/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@repo/ui/card";
import type { ReactNode } from "react";

type CrewMember = { userId: string; name: string };

/**
 * A project's crew (task 056): the workers who see it and work on its tasks. Admins get "Remove <name>" on
 * each and the `addForm`; without `removeAction` it is a plain list. The page passes the server action and
 * the form, so this stays free of server code.
 */
export function CrewSection({
  projectId,
  crew,
  removeAction,
  addForm,
}: {
  projectId: string;
  crew: CrewMember[];
  removeAction?: (formData: FormData) => void | Promise<void>;
  addForm?: ReactNode;
}) {
  return (
    <section aria-labelledby="crew-heading">
      <Card>
        <CardHeader>
          <CardTitle id="crew-heading" className="text-base">Crew</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4 text-sm">
          {crew.length === 0 ? (
            <p className="text-muted-foreground">No workers on this project yet.</p>
          ) : (
            <ul className="divide-y">
              {crew.map((member) => (
                <li key={member.userId} className="flex items-center justify-between gap-3 py-2 first:pt-0">
                  <span className="font-medium">{member.name}</span>
                  {removeAction && (
                    <form action={removeAction}>
                      <input type="hidden" name="projectId" value={projectId} />
                      <input type="hidden" name="userId" value={member.userId} />
                      <Button type="submit" variant="ghost" size="sm">
                        Remove<span className="sr-only"> {member.name}</span>
                      </Button>
                    </form>
                  )}
                </li>
              ))}
            </ul>
          )}
          {addForm && <div className="border-t pt-4">{addForm}</div>}
        </CardContent>
      </Card>
    </section>
  );
}

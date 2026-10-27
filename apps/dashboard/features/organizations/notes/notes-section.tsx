import { Button } from "@repo/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@repo/ui/card";

import { deleteNoteAction } from "./actions";
import { NoteForm } from "./note-form";

type Note = { id: string; body: string; createdAt: Date; authorName: string | null };

// UTC for now, like other dates in the app (time-zone item parked in task 010).
const STAMP = new Intl.DateTimeFormat("en-US", { dateStyle: "medium", timeStyle: "short", timeZone: "UTC" });

export function NotesSection({ customerId, notes }: { customerId: string; notes: Note[] }) {
  return (
    <section aria-labelledby="notes-heading">
      <Card>
        <CardHeader>
          <CardTitle id="notes-heading" className="text-base">Notes</CardTitle>
        </CardHeader>
        <CardContent className="space-y-6">
          <NoteForm customerId={customerId} />
          {notes.length === 0 ? (
            <p className="text-sm text-muted-foreground">No notes yet.</p>
          ) : (
            <ol className="space-y-4 border-t pt-4">
              {notes.map((note) => (
                <li key={note.id} className="flex items-start justify-between gap-3">
                  <div className="space-y-1">
                    <time dateTime={note.createdAt.toISOString()} className="text-xs text-muted-foreground">
                      {STAMP.format(note.createdAt)} UTC
                    </time>
                    {note.authorName && <span className="text-xs text-muted-foreground"> · by {note.authorName}</span>}
                    <p className="whitespace-pre-wrap text-sm">{note.body}</p>
                  </div>
                  <form action={deleteNoteAction}>
                    <input type="hidden" name="customerId" value={customerId} />
                    <input type="hidden" name="noteId" value={note.id} />
                    <Button type="submit" variant="ghost" size="sm">
                      Delete note<span className="sr-only"> from {STAMP.format(note.createdAt)}</span>
                    </Button>
                  </form>
                </li>
              ))}
            </ol>
          )}
        </CardContent>
      </Card>
    </section>
  );
}

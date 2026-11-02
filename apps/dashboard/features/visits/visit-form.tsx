"use client";

import { Button } from "@repo/ui/button";
import { FieldError } from "@repo/ui/field-error";
import { Input } from "@repo/ui/input";
import { Textarea } from "@repo/ui/textarea";
import Link from "next/link";
import { useActionState, useState } from "react";

import type { FormState } from "@/features/forms/form-state";

import { createVisitAction, updateVisitAction } from "./actions";

type Person = { userId: string; name: string };
type Visit = { id: string; visitedOn: string; notes: string | null; memberIds: string[] };

/**
 * Record a visit, or edit one when `visit` is given (task 058). A new visit's id is made here, once per
 * form, so sending the form again (a retry, a double click) lands on the same visit instead of a second one.
 */
export function VisitForm({
  projectId,
  people,
  visit,
  defaultMemberIds,
  today,
  cancelHref,
}: {
  projectId: string;
  /** Who can be marked as there: the project's people. */
  people: Person[];
  visit?: Visit;
  /** For a new visit: who is checked to start with (the recorder). */
  defaultMemberIds?: string[];
  /** Today in UTC ("YYYY-MM-DD"): the new visit's day. A later one is refused by the server, with its message. */
  today: string;
  cancelHref: string;
}) {
  const [state, formAction, pending] = useActionState<FormState, FormData>(visit ? updateVisitAction : createVisitAction, {});
  const [visitId] = useState(() => visit?.id ?? crypto.randomUUID());
  // Controlled, so the boxes keep their state when React resets the form after an error.
  const [checked, setChecked] = useState<string[]>(visit?.memberIds ?? defaultMemberIds ?? []);
  const error = (field: string) => (state.field === field ? state.error : undefined);
  const visitedOn = state.values?.visitedOn ?? visit?.visitedOn ?? today;
  const notes = state.values?.notes ?? visit?.notes ?? "";

  return (
    <form action={formAction} className="space-y-4">
      <input type="hidden" name="projectId" value={projectId} />
      <input type="hidden" name="visitId" value={visitId} />
      <div className="space-y-1">
        <label htmlFor="visitedOn" className="text-sm font-medium">Visited on</label>
        {/* Keyed on the value: React resets the form after each submit, and this keeps what was sent. */}
        <Input
          key={visitedOn}
          id="visitedOn"
          name="visitedOn"
          type="date"
          defaultValue={visitedOn}
          aria-invalid={error("visitedOn") ? true : undefined}
          aria-describedby={error("visitedOn") ? "visitedOn-error" : undefined}
          required
        />
        <FieldError id="visitedOn-error" message={error("visitedOn")} />
      </div>
      <fieldset className="space-y-2" aria-describedby={error("memberIds") ? "memberIds-error" : undefined}>
        <legend className="text-sm font-medium">Who was there</legend>
        <div className="flex flex-wrap gap-x-6 gap-y-2">
          {people.map((person) => (
            <div key={person.userId} className="flex items-center gap-2 text-sm">
              <input
                type="checkbox"
                id={`member-${person.userId}`}
                name="memberIds"
                value={person.userId}
                checked={checked.includes(person.userId)}
                onChange={(e) =>
                  setChecked((current) => (e.target.checked ? [...current, person.userId] : current.filter((id) => id !== person.userId)))
                }
                className="size-4"
              />
              <label htmlFor={`member-${person.userId}`}>{person.name}</label>
            </div>
          ))}
        </div>
        <FieldError id="memberIds-error" message={error("memberIds")} />
      </fieldset>
      <div className="space-y-1">
        <label htmlFor="notes" className="text-sm font-medium">Notes</label>
        <Textarea key={notes} id="notes" name="notes" rows={5} placeholder="What was done, what was found" defaultValue={notes} />
      </div>
      {state.error && !state.field && <FieldError id="visit-error" message={state.error} />}
      <div className="flex gap-2">
        <Button type="submit" disabled={pending}>Save visit</Button>
        <Button asChild variant="ghost">
          <Link href={cancelHref}>Cancel</Link>
        </Button>
      </div>
    </form>
  );
}

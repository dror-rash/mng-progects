import { cleanText } from "@/features/forms/clean-text";
import { type CalendarDate, parseDueDate } from "@/features/tasks/due-dates";

/** A visit from its form (task 058): the client-made id, the day, who was there and the notes (null when none). */
export type VisitInput = { visitId: string; visitedOn: CalendarDate; memberIds: string[]; notes: string | null };

const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/;

/**
 * Parses the visit form. The day is required and not after `today` (UTC); at least one person. The people
 * still have to be the project's choices (checked by the action). A client id that isn't a UUID means a
 * tampered form: it throws, like other tampered ids.
 */
export function parseVisitInput(
  formData: FormData,
  today: CalendarDate,
): { ok: true; value: VisitInput } | { ok: false; field: "visitedOn" | "memberIds"; error: string } {
  const visitId = String(formData.get("visitId") ?? "");
  if (!UUID.test(visitId)) {
    throw new Error("Invalid visit id");
  }
  const day = parseDueDate(formData.get("visitedOn"));
  const visitedOn = day.ok ? day.value : null;
  if (!visitedOn) {
    return { ok: false, field: "visitedOn", error: "Choose the visit's date" };
  }
  if (visitedOn > today) {
    return { ok: false, field: "visitedOn", error: "A visit can't be in the future" };
  }
  const memberIds = [...new Set(formData.getAll("memberIds").map(String).filter(Boolean))];
  if (memberIds.length === 0) {
    return { ok: false, field: "memberIds", error: "Choose who was there" };
  }
  const notes = cleanText(formData.get("notes"));
  return { ok: true, value: { visitId, visitedOn, memberIds, notes: notes || null } };
}

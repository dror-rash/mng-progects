import { describe, expect, it } from "vitest";

import { parseTaskInput } from "./task-input";

function form(fields: Record<string, string>) {
  const data = new FormData();
  for (const [key, value] of Object.entries(fields)) data.set(key, value);
  return data;
}

describe("parseTaskInput", () => {
  it("trims the title and description", () => {
    expect(parseTaskInput(form({ title: "  Write copy ", description: " Hero section " }))).toEqual({
      ok: true,
      value: { title: "Write copy", description: "Hero section", organizationId: undefined },
    });
  });

  it("rejects an empty title", () => {
    expect(parseTaskInput(form({ title: "   " }))).toEqual({ ok: false, error: "Task title is required" });
  });

  it("stores a missing or empty description as null", () => {
    expect(parseTaskInput(form({ title: "Write copy" }))).toEqual({
      ok: true,
      value: { title: "Write copy", description: null, organizationId: undefined },
    });
  });

  it("reads the chosen customer, an empty choice as none, and a missing field as 'leave as is'", () => {
    const chosen = parseTaskInput(form({ title: "Call", customerId: "cust-1" }));
    const none = parseTaskInput(form({ title: "Call", customerId: "" }));
    const absent = parseTaskInput(form({ title: "Call" }));

    expect(chosen.ok && chosen.value.organizationId).toBe("cust-1");
    expect(none.ok && none.value.organizationId).toBeNull();
    expect(absent.ok && absent.value.organizationId).toBeUndefined();
  });

  it("reads the priority, leaves it unchanged when the form has no priority field, and rejects unknown values", () => {
    const high = parseTaskInput(form({ title: "Call", priority: "high" }));
    const absent = parseTaskInput(form({ title: "Call" }));

    expect(high.ok && high.value.priority).toBe("high");
    expect(absent.ok && absent.value.priority).toBeUndefined();
    expect(parseTaskInput(form({ title: "Call", priority: "urgent" }))).toEqual({
      ok: false,
      field: "priority",
      error: "Choose a priority",
    });
  });

  it("reads the due date, clears it when empty, and rejects an invalid date", () => {
    const set = parseTaskInput(form({ title: "Call", dueDate: "2026-11-02" }));
    const cleared = parseTaskInput(form({ title: "Call", dueDate: "" }));

    expect(set.ok && set.value.dueDate).toBe("2026-11-02");
    expect(cleared.ok && cleared.value.dueDate).toBeNull();
    expect(parseTaskInput(form({ title: "Call", dueDate: "2026-02-30" }))).toEqual({
      ok: false,
      field: "dueDate",
      error: "Enter a valid date",
    });
  });
});

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
      value: { title: "Write copy", description: "Hero section" },
    });
  });

  it("rejects an empty title", () => {
    expect(parseTaskInput(form({ title: "   " }))).toEqual({ ok: false, error: "Task title is required" });
  });

  it("stores a missing or empty description as null", () => {
    expect(parseTaskInput(form({ title: "Write copy" }))).toEqual({
      ok: true,
      value: { title: "Write copy", description: null },
    });
  });
});

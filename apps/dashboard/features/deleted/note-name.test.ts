import { describe, expect, it } from "vitest";

import { noteName } from "./note-name";

describe("noteName", () => {
  it("is a short note as it is", () => {
    expect(noteName("Call on Monday")).toBe("Call on Monday");
  });

  it("is the first line of a longer note", () => {
    expect(noteName("  Call on Monday\nAsk about the invoice  ")).toBe("Call on Monday");
  });

  it("shortens a long first line to 60 characters", () => {
    const name = noteName("x".repeat(80));

    expect(name).toHaveLength(60);
    expect(name.endsWith("…")).toBe(true);
  });
});

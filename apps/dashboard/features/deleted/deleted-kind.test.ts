import { describe, expect, it } from "vitest";

import { DELETED_KINDS, deletedKindLabel, parseDeletedKind } from "./deleted-kind";

describe("parseDeletedKind", () => {
  it("accepts every kind that can be deleted and restored", () => {
    for (const kind of ["project", "task", "customer", "contact", "note", "partner"]) {
      expect(parseDeletedKind(kind)).toBe(kind);
    }
  });

  it("rejects anything else", () => {
    expect(parseDeletedKind("workspace")).toBeNull();
    expect(parseDeletedKind("invite")).toBeNull();
    expect(parseDeletedKind("Project")).toBeNull();
    expect(parseDeletedKind("")).toBeNull();
    expect(parseDeletedKind(undefined)).toBeNull();
    expect(parseDeletedKind(null)).toBeNull();
  });
});

describe("deletedKindLabel", () => {
  it("gives the label for a kind", () => {
    expect(deletedKindLabel("project")).toBe("Project");
    expect(deletedKindLabel("note")).toBe("Note");
    expect(deletedKindLabel("partner")).toBe("Partner");
  });
});

describe("DELETED_KINDS", () => {
  it("lists the kinds with their labels", () => {
    expect(DELETED_KINDS.map((k) => `${k.kind}:${k.label}`)).toEqual([
      "project:Project",
      "task:Task",
      "customer:Customer",
      "contact:Contact",
      "note:Note",
      "partner:Partner",
    ]);
  });
});

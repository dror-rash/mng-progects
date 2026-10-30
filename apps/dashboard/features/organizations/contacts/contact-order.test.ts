import { describe, expect, it } from "vitest";

import { primaryFirst } from "./contact-order";

const contacts = [
  { id: "c1", name: "dana Levi" },
  { id: "c2", name: "Avi Cohen" },
  { id: "c3", name: "Noa Bar" },
];

describe("primaryFirst", () => {
  it("lists the primary contact first, then the rest by name", () => {
    expect(primaryFirst(contacts, "c3").map((c) => c.name)).toEqual(["Noa Bar", "Avi Cohen", "dana Levi"]);
  });

  it("lists every contact by name, ignoring case, when there is no primary", () => {
    expect(primaryFirst(contacts, null).map((c) => c.name)).toEqual(["Avi Cohen", "dana Levi", "Noa Bar"]);
  });

  it("ignores a primary id that isn't one of the contacts", () => {
    expect(primaryFirst(contacts, "gone").map((c) => c.id)).toEqual(["c2", "c1", "c3"]);
  });

  it("does not change the list it is given", () => {
    const copy = [...contacts];
    primaryFirst(contacts, "c3");
    expect(contacts).toEqual(copy);
  });
});

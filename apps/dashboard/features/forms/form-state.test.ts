import { describe, expect, it } from "vitest";

import { invalid } from "./form-state";

describe("invalid", () => {
  it("returns the error with what the user typed, so the form can show it again", () => {
    const data = new FormData();
    data.set("name", "   ");
    data.set("description", "Keep this text");

    expect(invalid("Project name is required", data)).toEqual({
      error: "Project name is required",
      values: { name: "   ", description: "Keep this text" },
    });
  });

  it("leaves out uploaded files", () => {
    const data = new FormData();
    data.set("name", "x");
    data.set("file", new Blob(["a"]));

    expect(invalid("Bad", data).values).toEqual({ name: "x" });
  });

  it("names the field the error belongs to, when given", () => {
    const data = new FormData();
    data.set("email", "nope");

    expect(invalid("Enter a valid email address", data, "email")).toEqual({
      error: "Enter a valid email address",
      field: "email",
      values: { email: "nope" },
    });
  });
});

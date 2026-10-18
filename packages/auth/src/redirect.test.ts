import { describe, expect, it } from "vitest";

import { loginUrl, safeNext } from "./redirect";

describe("safeNext", () => {
  it("keeps same-origin paths, including other zones", () => {
    expect(safeNext("/example/account?tab=1")).toBe("/example/account?tab=1");
  });

  it.each([undefined, null, "", "https://evil.example", "//evil.example", "/\\evil.example", "example/account"])(
    "falls back to / for %s",
    (value) => {
      expect(safeNext(value)).toBe("/");
    },
  );

  it("supports a custom fallback", () => {
    expect(safeNext("https://evil.example", "/home")).toBe("/home");
  });
});

describe("loginUrl", () => {
  it("encodes the page the visitor wanted", () => {
    expect(loginUrl("/example/account?tab=1")).toBe("/login?next=%2Fexample%2Faccount%3Ftab%3D1");
  });
});

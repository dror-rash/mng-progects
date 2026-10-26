import { describe, expect, it } from "vitest";

import { normalizeTags, parseOrganizationInput } from "./organization-input";

function form(fields: Record<string, string>) {
  const data = new FormData();
  for (const [key, value] of Object.entries(fields)) data.set(key, value);
  return data;
}

describe("parseOrganizationInput", () => {
  it("trims every field and stores empty optional fields as null", () => {
    expect(parseOrganizationInput(form({ name: "  Acme Ltd ", status: "active", email: " ", phone: "" }))).toEqual({
      ok: true,
      value: {
        name: "Acme Ltd",
        status: "active",
        email: null,
        phone: null,
        address: null,
        website: null,
        companyId: null,
        about: null,
        tags: [],
      },
    });
  });

  it("requires a name", () => {
    expect(parseOrganizationInput(form({ name: " ", status: "lead" }))).toEqual({
      ok: false,
      field: "name",
      error: "Customer name is required",
    });
  });

  it("rejects an unknown status", () => {
    expect(parseOrganizationInput(form({ name: "Acme", status: "archived" }))).toMatchObject({ ok: false, field: "status" });
  });

  it("rejects an invalid email", () => {
    expect(parseOrganizationInput(form({ name: "Acme", status: "lead", email: "not-an-email" }))).toEqual({
      ok: false,
      field: "email",
      error: "Enter a valid email address",
    });
  });

  it("adds https:// to a website without a scheme", () => {
    const result = parseOrganizationInput(form({ name: "Acme", status: "lead", website: "acme.example" }));
    expect(result.ok && result.value.website).toBe("https://acme.example");
  });

  it("keeps an http:// website as given", () => {
    const result = parseOrganizationInput(form({ name: "Acme", status: "lead", website: "http://acme.example/about" }));
    expect(result.ok && result.value.website).toBe("http://acme.example/about");
  });

  it("rejects a website that isn't an address", () => {
    expect(parseOrganizationInput(form({ name: "Acme", status: "lead", website: "not a site" }))).toEqual({
      ok: false,
      field: "website",
      error: "Enter a valid website address",
    });
  });

  it("rejects a website with a non-web scheme", () => {
    expect(parseOrganizationInput(form({ name: "Acme", status: "lead", website: "javascript:alert(1)" }))).toMatchObject({
      ok: false,
      field: "website",
    });
  });
});

describe("normalizeTags", () => {
  it("splits on commas, trims, and drops empty entries", () => {
    expect(normalizeTags(" retail, enterprise ,, ")).toEqual(["retail", "enterprise"]);
  });

  it("removes duplicates regardless of case, keeping the first spelling", () => {
    expect(normalizeTags("Retail, retail, RETAIL, b2b")).toEqual(["Retail", "b2b"]);
  });
});

describe("parseOrganizationInput hardening", () => {
  const base = { name: "Acme", status: "lead" };

  it("accepts a website with a port and no scheme", () => {
    const result = parseOrganizationInput(form({ ...base, website: "acme.example:8080" }));
    expect(result.ok && result.value.website).toBe("https://acme.example:8080");
  });

  it.each(["https://acme.com@evil.example", "JAVASCRIPT:alert(1)", "java\tscript:alert(1)", "data:text/html,x.y", "vbscript:x.y"])(
    "rejects the unsafe website %s",
    (website) => {
      expect(parseOrganizationInput(form({ ...base, website }))).toEqual({
        ok: false,
        field: "website",
        error: "Enter a valid website address",
      });
    },
  );

  it("stores a website in its canonical form", () => {
    const result = parseOrganizationInput(form({ ...base, website: "HTTPS://Acme.Example/About" }));
    expect(result.ok && result.value.website).toBe("https://acme.example/About");
  });

  it.each(["a@b.co?cc=x@evil.io", "a@b.co&x", "a@b.co#x", "a,b@c.co", "<a@b.co>"])("rejects the email %s", (email) => {
    expect(parseOrganizationInput(form({ ...base, email }))).toMatchObject({ ok: false, field: "email" });
  });

  it("strips control characters from text fields", () => {
    const result = parseOrganizationInput(form({ ...base, name: "Ac\u0000me", about: "line\u0007" }));
    expect(result.ok && [result.value.name, result.value.about]).toEqual(["Acme", "line"]);
  });

  it("limits the length of a name", () => {
    expect(parseOrganizationInput(form({ ...base, name: "x".repeat(201) }))).toEqual({
      ok: false,
      field: "name",
      error: "Keep the name under 200 characters",
    });
  });

  it("limits the number of tags", () => {
    const tags = Array.from({ length: 21 }, (_, i) => `t${i}`).join(",");
    expect(parseOrganizationInput(form({ ...base, tags }))).toMatchObject({ ok: false, field: "tags" });
  });
});


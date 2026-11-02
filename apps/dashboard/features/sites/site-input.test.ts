import { describe, expect, it } from "vitest";

import { parseSiteInput } from "./site-input";

function form(fields: Record<string, string>) {
  const data = new FormData();
  for (const [key, value] of Object.entries(fields)) data.set(key, value);
  return data;
}

describe("parseSiteInput", () => {
  it("trims fields and stores empty ones as null", () => {
    expect(parseSiteInput(form({ name: " Haifa warehouse ", address: " ", accessNotes: "", latitude: "", longitude: "" }))).toEqual({
      ok: true,
      value: { name: "Haifa warehouse", address: null, accessNotes: null, latitude: null, longitude: null },
    });
  });

  it("requires a name", () => {
    expect(parseSiteInput(form({ name: "   " }))).toEqual({ ok: false, field: "name", error: "Site name is required" });
  });

  it("keeps a name, address and access notes within their limits", () => {
    expect(parseSiteInput(form({ name: "x".repeat(201) }))).toMatchObject({ ok: false, field: "name" });
    expect(parseSiteInput(form({ name: "Site", address: "x".repeat(501) }))).toMatchObject({ ok: false, field: "address" });
    expect(parseSiteInput(form({ name: "Site", accessNotes: "x".repeat(5001) }))).toMatchObject({ ok: false, field: "accessNotes" });
  });

  it("reads coordinates as decimal strings", () => {
    const result = parseSiteInput(form({ name: "Site", latitude: " 32.8 ", longitude: "35" }));
    expect(result).toMatchObject({ ok: true, value: { latitude: "32.8", longitude: "35" } });
  });

  it("refuses a latitude out of range or not a number", () => {
    const error = { ok: false, field: "latitude", error: "Enter a latitude between -90 and 90" };
    expect(parseSiteInput(form({ name: "Site", latitude: "132.8", longitude: "35" }))).toEqual(error);
    expect(parseSiteInput(form({ name: "Site", latitude: "north", longitude: "35" }))).toEqual(error);
  });

  it("refuses a longitude out of range", () => {
    expect(parseSiteInput(form({ name: "Site", latitude: "32", longitude: "-181" }))).toEqual({
      ok: false,
      field: "longitude",
      error: "Enter a longitude between -180 and 180",
    });
  });

  it("needs both coordinates or neither", () => {
    expect(parseSiteInput(form({ name: "Site", latitude: "32.8" }))).toEqual({
      ok: false,
      field: "longitude",
      error: "Enter both latitude and longitude, or neither",
    });
    expect(parseSiteInput(form({ name: "Site", longitude: "35" }))).toMatchObject({ ok: false, field: "latitude" });
  });

  it("keeps at most six decimals, like the database", () => {
    expect(parseSiteInput(form({ name: "Site", latitude: "32.1234567", longitude: "35" }))).toMatchObject({
      ok: false,
      field: "latitude",
    });
  });
});

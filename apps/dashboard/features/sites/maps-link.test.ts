import { describe, expect, it } from "vitest";

import { mapsLink } from "./maps-link";

describe("mapsLink", () => {
  it("searches the coordinates when the site has them", () => {
    expect(mapsLink({ address: "12 Port Rd, Haifa", latitude: "32.8", longitude: "35" })).toBe(
      "https://www.google.com/maps/search/?api=1&query=32.8%2C35",
    );
  });

  it("searches the address otherwise, encoded", () => {
    expect(mapsLink({ address: "12 Port Rd, Haifa & Co", latitude: null, longitude: null })).toBe(
      "https://www.google.com/maps/search/?api=1&query=12%20Port%20Rd%2C%20Haifa%20%26%20Co",
    );
  });

  it("has no link without coordinates or an address", () => {
    expect(mapsLink({ address: null, latitude: null, longitude: null })).toBeNull();
  });
});

import { describe, expect, it } from "vitest";

import { siteCountLabel } from "./site-count";

describe("siteCountLabel", () => {
  it("says there are no sites", () => {
    expect(siteCountLabel(0)).toBe("No sites");
  });

  it("counts one site", () => {
    expect(siteCountLabel(1)).toBe("1 site");
  });

  it("counts several sites", () => {
    expect(siteCountLabel(2)).toBe("2 sites");
  });
});

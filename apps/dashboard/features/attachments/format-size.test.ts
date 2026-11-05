import { describe, expect, it } from "vitest";

import { formatSize } from "./format-size";

describe("formatSize", () => {
  it("shows bytes under 1 KB", () => {
    expect(formatSize(0)).toBe("0 B");
    expect(formatSize(1023)).toBe("1023 B");
  });

  it("shows whole KB under 1 MB", () => {
    expect(formatSize(1024)).toBe("1 KB");
    expect(formatSize(86_000)).toBe("84 KB");
    expect(formatSize(1024 * 1024 - 1)).toBe("1024 KB");
  });

  it("shows MB with one decimal from 1 MB", () => {
    expect(formatSize(1024 * 1024)).toBe("1.0 MB");
    expect(formatSize(1_240_000)).toBe("1.2 MB");
    expect(formatSize(50 * 1024 * 1024)).toBe("50.0 MB");
  });
});

import { describe, expect, it } from "vitest";

import { PROJECT_LIFECYCLE, parseProjectLifecycle, projectLifecycleLabel } from "./project-lifecycle";

describe("parseProjectLifecycle", () => {
  it("accepts active and canceled", () => {
    expect(parseProjectLifecycle("active")).toBe("active");
    expect(parseProjectLifecycle("canceled")).toBe("canceled");
  });

  it("rejects anything else", () => {
    expect(parseProjectLifecycle("archived")).toBeNull();
    expect(parseProjectLifecycle(undefined)).toBeNull();
    expect(parseProjectLifecycle(null)).toBeNull();
  });
});

describe("projectLifecycleLabel", () => {
  it("gives the label for a lifecycle", () => {
    expect(projectLifecycleLabel("canceled")).toBe("Canceled");
    expect(projectLifecycleLabel("active")).toBe("Active");
  });

  it("treats an unknown stored value as active", () => {
    expect(projectLifecycleLabel("archived")).toBe("Active");
  });
});

describe("PROJECT_LIFECYCLE", () => {
  it("lists active first, the default", () => {
    expect(PROJECT_LIFECYCLE.map((l) => l.status)).toEqual(["active", "canceled"]);
  });
});

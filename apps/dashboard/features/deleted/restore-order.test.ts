import { describe, expect, it } from "vitest";

import { projectRestoreBlock } from "./restore-order";

const live = { customerDeleted: false, siteDeleted: false, siteCompanyDeleted: false };

describe("projectRestoreBlock", () => {
  it("lets a project come back when its customer and site are there", () => {
    expect(projectRestoreBlock(live)).toBeNull();
  });

  it("asks for the customer first when it is deleted", () => {
    expect(projectRestoreBlock({ ...live, customerDeleted: true })).toBe("Restore its customer first");
  });

  it("asks for the site first when it is deleted", () => {
    expect(projectRestoreBlock({ ...live, siteDeleted: true })).toBe("Restore its site first");
  });

  it("asks for the customer before the site when both are deleted", () => {
    expect(projectRestoreBlock({ customerDeleted: true, siteDeleted: true, siteCompanyDeleted: true })).toBe(
      "Restore its customer first",
    );
  });

  it("asks for the site's sub-company first when only that is deleted", () => {
    expect(projectRestoreBlock({ ...live, siteCompanyDeleted: true })).toBe("Restore its site's customer first");
  });
});

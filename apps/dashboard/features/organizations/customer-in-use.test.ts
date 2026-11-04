import { describe, expect, it } from "vitest";

import { customerInUseMessage } from "./customer-in-use";

describe("customerInUseMessage", () => {
  it("names the projects for the customer or at its sites", () => {
    expect(customerInUseMessage(["Forklift bay"])).toBe(
      "Projects for this customer or at its sites: Forklift bay. Move or delete them first.",
    );
  });

  it("lists several projects in the order given", () => {
    expect(customerInUseMessage(["Dock lights", "Forklift bay"])).toBe(
      "Projects for this customer or at its sites: Dock lights, Forklift bay. Move or delete them first.",
    );
  });
});

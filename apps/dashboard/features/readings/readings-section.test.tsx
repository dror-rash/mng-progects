// @vitest-environment jsdom
import { cleanup, render, screen, within } from "@testing-library/react";
import { afterEach, describe, expect, it } from "vitest";

import { ReadingsSection } from "./readings-section";

const readings = [
  { id: "r2", visitId: "v2", formName: "Panel check", visitedOn: "2026-11-03", authorName: "Rina Cohen" },
  { id: "r1", visitId: "v1", formName: "Site check", visitedOn: "2026-10-28", authorName: null },
];

afterEach(cleanup);

describe("ReadingsSection", () => {
  it("lists readings in the order given, each a link to its page, with the visit's day and who filled it", () => {
    render(<ReadingsSection projectId="p1" readings={readings} showVisitDates />);

    const region = screen.getByRole("region", { name: "Readings" });
    const items = within(region).getAllByRole("listitem");
    expect(items).toHaveLength(2);
    const first = within(items[0]!).getByRole("link", { name: "Panel check" });
    expect(first.getAttribute("href")).toBe("/projects/p1/visits/v2/readings/r2");
    expect(items[0]!.textContent).toContain("Nov 3, 2026");
    expect(items[0]!.textContent).toContain("Rina Cohen");
  });

  it("leaves out the visit's day on the visit's own page", () => {
    render(<ReadingsSection projectId="p1" readings={readings} showVisitDates={false} />);
    expect(screen.getByRole("region", { name: "Readings" }).textContent).not.toContain("Nov 3, 2026");
  });

  it("says when there are none", () => {
    render(<ReadingsSection projectId="p1" readings={[]} showVisitDates />);
    const region = screen.getByRole("region", { name: "Readings" });
    expect(region.textContent).toContain("No readings yet.");
    expect(within(region).queryAllByRole("listitem")).toHaveLength(0);
  });

  it("offers Add a reading only with its address", () => {
    render(<ReadingsSection projectId="p1" readings={[]} showVisitDates={false} addHref="/projects/p1/visits/v1/readings/new" />);
    expect(screen.getByRole("link", { name: "Add a reading" }).getAttribute("href")).toBe("/projects/p1/visits/v1/readings/new");
    cleanup();
    render(<ReadingsSection projectId="p1" readings={[]} showVisitDates={false} />);
    expect(screen.queryByRole("link", { name: "Add a reading" })).toBeNull();
  });
});

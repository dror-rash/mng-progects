// @vitest-environment jsdom
import { cleanup, render, screen, within } from "@testing-library/react";
import { afterEach, describe, expect, it } from "vitest";

import { SiteProjectsSection } from "./site-projects-section";

const project = { id: "p1", name: "Store wiring", description: null, createdAt: new Date("2026-11-01T00:00:00Z") };

afterEach(cleanup);

describe("SiteProjectsSection", () => {
  it("lists the projects at the site, each a link", () => {
    render(<SiteProjectsSection siteId="s1" projects={[project]} progress={new Map()} canStart={false} />);

    const region = screen.getByRole("region", { name: "Projects" });
    expect(within(region).getByRole("link", { name: "Store wiring" })).toHaveProperty("pathname", "/projects/p1");
  });

  it("says when there are no projects at the site", () => {
    render(<SiteProjectsSection siteId="s1" projects={[]} progress={new Map()} canStart={false} />);

    expect(screen.getByText("No projects at this site yet.")).toBeTruthy();
  });

  it("starts a new project at the site for those who may", () => {
    render(<SiteProjectsSection siteId="s1" projects={[]} progress={new Map()} canStart />);

    const link = screen.getByRole("link", { name: "New project" });
    expect(link.getAttribute("href")).toBe("/projects/new?site=s1");
  });

  it("has no New project link for those who may not start one here", () => {
    render(<SiteProjectsSection siteId="s1" projects={[project]} progress={new Map()} canStart={false} />);

    expect(screen.queryByRole("link", { name: "New project" })).toBeNull();
  });
});

import type { Meta, StoryObj } from "@storybook/react-vite";

import { SiteProjectsSection } from "./site-projects-section";

const meta = {
  title: "Dashboard/SiteProjectsSection",
  component: SiteProjectsSection,
  parameters: { layout: "padded" },
  args: {
    siteId: "haifa",
    canStart: true,
    projects: [
      { id: "p1", name: "Forklift bay", description: "New charging points", createdAt: new Date("2026-10-20T00:00:00Z") },
      { id: "p2", name: "Store wiring", description: null, createdAt: new Date("2026-09-02T00:00:00Z") },
    ],
    progress: new Map([["p1", { total: 4, done: 1, open: 3, completionRate: 25 }]]),
  },
} satisfies Meta<typeof SiteProjectsSection>;

export default meta;
type Story = StoryObj<typeof meta>;

export const SeveralProjects: Story = {};
export const ReadOnly: Story = { args: { canStart: false } };
export const EmptyWithNewProject: Story = { args: { projects: [] } };
export const EmptyReadOnly: Story = { args: { projects: [], canStart: false } };

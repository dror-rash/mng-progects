import type { Meta, StoryObj } from "@storybook/react-vite";

import { VisitsSection } from "./visits-section";

const visits = [
  { id: "v2", visitedOn: "2026-10-31", notes: "Panel delivered\nInstalled Monday", memberNames: "Avi Peretz, Rina Cohen" },
  { id: "v1", visitedOn: "2026-10-28", notes: null, memberNames: "Avi Peretz" },
];

const meta = {
  title: "Dashboard/VisitsSection",
  component: VisitsSection,
  parameters: { layout: "padded" },
  args: { projectId: "p1", visits, canRecord: true },
} satisfies Meta<typeof VisitsSection>;

export default meta;
type Story = StoryObj<typeof meta>;

export const WithVisits: Story = {};
export const NoVisits: Story = { args: { visits: [] } };
export const ReadOnly: Story = { args: { canRecord: false } };

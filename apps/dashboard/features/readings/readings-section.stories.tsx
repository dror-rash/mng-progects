import type { Meta, StoryObj } from "@storybook/react-vite";

import { ReadingsSection } from "./readings-section";

const readings = [
  { id: "r2", visitId: "v2", formName: "Panel check", visitedOn: "2026-11-03", authorName: "Rina Cohen" },
  { id: "r1", visitId: "v1", formName: "Site check", visitedOn: "2026-10-28", authorName: "Avi Peretz" },
];

const meta = {
  title: "Dashboard/ReadingsSection",
  component: ReadingsSection,
  parameters: { layout: "padded" },
  args: { projectId: "p1", readings, showVisitDates: true },
} satisfies Meta<typeof ReadingsSection>;

export default meta;
type Story = StoryObj<typeof meta>;

/** On the project page: every visit's readings, with the visit's day. */
export const OnProject: Story = {};
/** On a visit's page, for someone who can work on the project. */
export const OnVisit: Story = { args: { showVisitDates: false, addHref: "/projects/p1/visits/v1/readings/new" } };
export const NoReadings: Story = { args: { readings: [], showVisitDates: false, addHref: "/projects/p1/visits/v1/readings/new" } };
/** An auditor's view of a visit: no "Add a reading". */
export const ReadOnly: Story = { args: { showVisitDates: false } };

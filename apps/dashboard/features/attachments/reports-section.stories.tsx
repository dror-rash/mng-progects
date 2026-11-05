import type { Meta, StoryObj } from "@storybook/react-vite";

import { ReportsSection } from "./reports-section";

const reports = [
  { id: "r1", fileName: "inspection-report.pdf", sizeBytes: 1_240_000, uploaderName: "Avi Peretz", uploadedAt: new Date("2026-11-04T09:30:00Z"), canDelete: true },
  { id: "r2", fileName: "handover-summary.docx", sizeBytes: 86_000, uploaderName: "Rina Cohen", uploadedAt: new Date("2026-10-28T14:00:00Z"), canDelete: false },
];

const meta = {
  title: "Dashboard/ReportsSection",
  component: ReportsSection,
  parameters: { layout: "padded" },
  args: { projectId: "p1", reports, deleteAction: () => {} },
} satisfies Meta<typeof ReportsSection>;

export default meta;
type Story = StoryObj<typeof meta>;

export const Reports: Story = {};
export const Empty: Story = { args: { reports: [] } };
export const ReadOnly: Story = { args: { deleteAction: undefined } };

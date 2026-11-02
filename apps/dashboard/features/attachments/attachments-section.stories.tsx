import type { Meta, StoryObj } from "@storybook/react-vite";

import { AttachmentsSection } from "./attachments-section";

const items = [
  { id: "a1", kind: "photo", fileName: "panel.jpg", sizeBytes: 2_400_000, uploaderName: "Avi Peretz", visitId: "v1", visitedOn: "2026-10-31", visitNotes: "Panel delivered", canDelete: true },
  { id: "a2", kind: "photo", fileName: "breaker.jpg", sizeBytes: 1_900_000, uploaderName: "Rina Cohen", visitId: null, visitedOn: null, visitNotes: null, canDelete: false },
  { id: "a3", kind: "file", fileName: "wiring-plan.pdf", sizeBytes: 840_000, uploaderName: "Avi Peretz", visitId: null, visitedOn: null, visitNotes: null, canDelete: true },
];

const meta = {
  title: "Dashboard/AttachmentsSection",
  component: AttachmentsSection,
  parameters: { layout: "padded" },
  args: { projectId: "p1", items, showVisits: true, deleteAction: () => {} },
} satisfies Meta<typeof AttachmentsSection>;

export default meta;
type Story = StoryObj<typeof meta>;

export const PhotosAndFiles: Story = {};
export const Empty: Story = { args: { items: [] } };
export const ReadOnly: Story = { args: { deleteAction: undefined } };
export const OnAVisit: Story = { args: { showVisits: false } };

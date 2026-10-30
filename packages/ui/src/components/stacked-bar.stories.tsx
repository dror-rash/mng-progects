import type { Meta, StoryObj } from "@storybook/react-vite";
import { expect, screen, userEvent } from "storybook/test";

import { StackedBar } from "./stacked-bar";

const meta = {
  title: "Components/StackedBar",
  component: StackedBar,
  args: {
    label: "Tasks by status",
    segments: [
      { label: "To do", value: 5 },
      { label: "In progress", value: 3 },
      { label: "Done", value: 8 },
    ],
  },
  decorators: [(Story) => <div className="w-96 pt-10"><Story /></div>],
} satisfies Meta<typeof StackedBar>;

export default meta;
type Story = StoryObj<typeof meta>;

export const Mixed: Story = {};

/** Tab reaches the segments in order; the focused one shows label, count and share. */
export const SegmentFocused: Story = {
  play: async () => {
    await userEvent.tab();
    await userEvent.tab();
    await expect(await screen.findByRole("tooltip")).toHaveTextContent("In progress: 3 (19%)");
  },
};

export const SegmentHovered: Story = {
  play: async ({ canvas }) => {
    await userEvent.hover(canvas.getByRole("img", { name: "Done: 8 (50%)" }));
    await expect(await screen.findByRole("tooltip")).toHaveTextContent("Done: 8 (50%)");
  },
};
export const SingleStatus: Story = {
  args: {
    segments: [
      { label: "To do", value: 0 },
      { label: "In progress", value: 0 },
      { label: "Done", value: 4 },
    ],
  },
};
export const Empty: Story = {
  args: {
    segments: [
      { label: "To do", value: 0 },
      { label: "In progress", value: 0 },
      { label: "Done", value: 0 },
    ],
    emptyText: "No tasks yet",
  },
};

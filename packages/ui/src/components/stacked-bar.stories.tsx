import type { Meta, StoryObj } from "@storybook/react-vite";

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
  decorators: [(Story) => <div className="w-96"><Story /></div>],
} satisfies Meta<typeof StackedBar>;

export default meta;
type Story = StoryObj<typeof meta>;

export const Mixed: Story = {};
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

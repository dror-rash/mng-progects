import type { Meta, StoryObj } from "@storybook/react-vite";

import { Meter } from "./meter";

const meta = {
  title: "Components/Meter",
  component: Meter,
  args: { label: "Project progress", value: 40 },
  decorators: [(Story) => <div className="w-64"><Story /></div>],
} satisfies Meta<typeof Meter>;

export default meta;
type Story = StoryObj<typeof meta>;

export const Empty: Story = { args: { value: 0 } };
export const Partial: Story = {};
export const Complete: Story = { args: { value: 100 } };

import type { Meta, StoryObj } from "@storybook/react-vite";

import { Textarea } from "./textarea";

const meta = {
  title: "Components/Textarea",
  component: Textarea,
  args: { "aria-label": "Description", placeholder: "What does this task involve?" },
  decorators: [(Story) => <div className="w-80"><Story /></div>],
} satisfies Meta<typeof Textarea>;

export default meta;
type Story = StoryObj<typeof meta>;

export const Empty: Story = {};
export const Filled: Story = { args: { defaultValue: "Hero, features, and pricing sections" } };
export const Disabled: Story = { args: { defaultValue: "Read only", disabled: true } };

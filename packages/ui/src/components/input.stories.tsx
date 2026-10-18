import type { Meta, StoryObj } from "@storybook/react-vite";

import { Input } from "./input";

const meta = {
  title: "Components/Input",
  component: Input,
  args: { "aria-label": "Email", placeholder: "you@example.com" },
} satisfies Meta<typeof Input>;

export default meta;
type Story = StoryObj<typeof meta>;

export const Default: Story = {};
export const Password: Story = { args: { type: "password", placeholder: "At least 8 characters", "aria-label": "Password" } };
export const Disabled: Story = { args: { disabled: true } };

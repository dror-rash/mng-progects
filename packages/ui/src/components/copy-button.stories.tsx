import type { Meta, StoryObj } from "@storybook/react-vite";
import { expect, userEvent, within } from "storybook/test";

import { CopyButton } from "./copy-button";

const meta = {
  title: "Components/CopyButton",
  component: CopyButton,
  args: { value: "https://example.com/dashboard/invite/abc123", label: "Copy invite link" },
} satisfies Meta<typeof CopyButton>;

export default meta;
type Story = StoryObj<typeof meta>;

export const Idle: Story = {};

export const Copied: Story = {
  play: async ({ canvasElement }) => {
    const canvas = within(canvasElement);
    await userEvent.click(canvas.getByRole("button", { name: "Copy invite link" }));
    await expect(await canvas.findByRole("button", { name: /Copied|Copy failed/ })).toBeInTheDocument();
  },
};

import type { Meta, StoryObj } from "@storybook/react-vite";
import { expect, screen, userEvent } from "storybook/test";

import { Meter } from "./meter";

const meta = {
  title: "Components/Meter",
  component: Meter,
  args: { label: "Project progress", value: 40 },
  decorators: [(Story) => <div className="w-64 pt-10"><Story /></div>],
} satisfies Meta<typeof Meter>;

export default meta;
type Story = StoryObj<typeof meta>;

export const Empty: Story = { args: { value: 0 } };
export const Partial: Story = {};
export const Complete: Story = { args: { value: 100 } };

export const Focused: Story = {
  play: async () => {
    await userEvent.tab();
    await expect(await screen.findByRole("tooltip")).toHaveTextContent("Project progress: 40%");
  },
};

export const Hovered: Story = {
  play: async ({ canvas }) => {
    await userEvent.hover(canvas.getByRole("progressbar", { name: "Project progress" }));
    await expect(await screen.findByRole("tooltip")).toHaveTextContent("Project progress: 40%");
  },
};

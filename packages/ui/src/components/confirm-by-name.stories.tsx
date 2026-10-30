import type { Meta, StoryObj } from "@storybook/react-vite";

import { ConfirmByName } from "./confirm-by-name";

const meta = {
  title: "Components/ConfirmByName",
  component: ConfirmByName,
  args: { name: "Acme Team", action: "Delete workspace" },
  decorators: [(Story) => <form onSubmit={(e) => e.preventDefault()}><Story /></form>],
} satisfies Meta<typeof ConfirmByName>;

export default meta;
type Story = StoryObj<typeof meta>;

export const Default: Story = {};
export const WrongName: Story = { args: { error: "Type the workspace name exactly to delete it" } };
export const Pending: Story = { args: { pending: true } };
export const LongName: Story = { args: { name: "Acme Team — Northern Europe sales and customer success, 2026" } };

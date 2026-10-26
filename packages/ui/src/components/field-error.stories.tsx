import type { Meta, StoryObj } from "@storybook/react-vite";

import { FieldError } from "./field-error";

const meta = {
  title: "Components/FieldError",
  component: FieldError,
  args: { message: "Project name is required" },
} satisfies Meta<typeof FieldError>;

export default meta;
type Story = StoryObj<typeof meta>;

export const WithMessage: Story = {};
export const Empty: Story = { args: { message: undefined } };

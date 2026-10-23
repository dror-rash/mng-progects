import type { Meta, StoryObj } from "@storybook/react-vite";

import { NativeSelect } from "./native-select";

const meta = {
  title: "Components/NativeSelect",
  component: NativeSelect,
  args: {
    "aria-label": "Status",
    children: (
      <>
        <option value="lead">Lead</option>
        <option value="active">Active</option>
        <option value="past">Past</option>
      </>
    ),
  },
  decorators: [(Story) => <div className="w-64"><Story /></div>],
} satisfies Meta<typeof NativeSelect>;

export default meta;
type Story = StoryObj<typeof meta>;

export const Default: Story = {};
export const WithValue: Story = { args: { defaultValue: "active" } };
export const Disabled: Story = { args: { disabled: true } };

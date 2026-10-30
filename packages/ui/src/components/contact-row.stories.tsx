import type { Meta, StoryObj } from "@storybook/react-vite";

import { Button } from "./button";
import { ContactRow } from "./contact-row";

const meta = {
  title: "Components/ContactRow",
  component: ContactRow,
  args: { name: "Dana Levi", role: "Head of Marketing", email: "dana@acme.example", phone: "+972 3-555-0101" },
  decorators: [(Story) => <ul className="max-w-xl divide-y">{Story()}</ul>],
} satisfies Meta<typeof ContactRow>;

export default meta;
type Story = StoryObj<typeof meta>;

export const Default: Story = {};
export const Primary: Story = { args: { primary: true } };
export const NameOnly: Story = { args: { role: null, email: null, phone: null } };
export const WithActions: Story = {
  args: {
    actions: (
      <>
        <Button variant="ghost" size="sm">Make primary</Button>
        <Button variant="ghost" size="sm">Edit</Button>
        <Button variant="ghost" size="sm">Remove</Button>
      </>
    ),
  },
};
export const List: Story = {
  render: () => (
    <>
      <ContactRow name="Dana Levi" role="Head of Marketing" email="dana@acme.example" primary />
      <ContactRow name="Avi Cohen" role="CFO" phone="+972 3-555-0102" />
    </>
  ),
};

import type { Meta, StoryObj } from "@storybook/react-vite";
import { fn } from "storybook/test";

import { SiteContactsSection } from "./site-contacts-section";

const contacts = [
  { id: "1", name: "Yossi Mizrahi", role: "Facility manager", phone: "+972 4 555 0123", email: null },
  { id: "2", name: "Rina Cohen", role: "Security", phone: null, email: "rina@acme.example" },
];

const meta = {
  title: "Dashboard/SiteContactsSection",
  component: SiteContactsSection,
  parameters: { layout: "padded" },
  args: { siteId: "warehouse", contacts },
} satisfies Meta<typeof SiteContactsSection>;

export default meta;
type Story = StoryObj<typeof meta>;

export const ReadOnly: Story = {};
export const ForAdmins: Story = {
  args: { removeAction: fn(), addForm: <p className="text-sm text-muted-foreground">(The add-contact form goes here.)</p> },
};
export const Empty: Story = { args: { contacts: [] } };

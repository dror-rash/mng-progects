import type { Meta, StoryObj } from "@storybook/react-vite";

import { ProjectSiteSection } from "./project-site-section";

const site = {
  id: "s1",
  name: "Haifa warehouse",
  address: "12 Port Rd, Haifa",
  accessNotes: "Gate code 4512. Report to security at gate 2.",
  mapsHref: "https://www.google.com/maps/search/?api=1&query=12%20Port%20Rd%2C%20Haifa",
  contacts: [
    { id: "c1", name: "Yossi Mizrahi", role: "Facility manager", phone: "+972 50 000 0000", email: "yossi@example.com" },
    { id: "c2", name: "Dana Levi", role: null, phone: null, email: null },
  ],
};

const meta = {
  title: "Dashboard/ProjectSiteSection",
  component: ProjectSiteSection,
  parameters: { layout: "padded" },
  args: { site },
} satisfies Meta<typeof ProjectSiteSection>;

export default meta;
type Story = StoryObj<typeof meta>;

export const WithSite: Story = {};
export const NoContactsOrNotes: Story = { args: { site: { ...site, accessNotes: null, contacts: [] } } };
export const NoAddress: Story = { args: { site: { ...site, address: null, mapsHref: null } } };
export const NoSiteYet: Story = { args: { site: null, addSiteHref: "/projects/p1/edit" } };
export const NoSiteYetReadOnly: Story = { args: { site: null } };

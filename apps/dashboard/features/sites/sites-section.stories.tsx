import type { Meta, StoryObj } from "@storybook/react-vite";

import { SitesSection } from "./sites-section";

const meta = {
  title: "Dashboard/SitesSection",
  component: SitesSection,
  parameters: { layout: "padded" },
  args: {
    customerId: "acme",
    canAdd: true,
    sites: [
      { id: "hq", name: "Head office", address: "1 Harbor St, Tel Aviv" },
      { id: "warehouse", name: "Haifa warehouse", address: "12 Port Rd, Haifa" },
    ],
  },
} satisfies Meta<typeof SitesSection>;

export default meta;
type Story = StoryObj<typeof meta>;

export const OwnSites: Story = {};
export const EmptyForAdmins: Story = { args: { sites: [] } };
export const EmptyReadOnly: Story = { args: { sites: [], canAdd: false } };

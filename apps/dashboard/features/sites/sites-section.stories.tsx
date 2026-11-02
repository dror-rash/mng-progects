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
      { id: "hq", name: "Head office", address: "1 Harbor St, Tel Aviv", subCompanyId: null, subCompanyName: null },
      { id: "warehouse", name: "Haifa warehouse", address: "12 Port Rd, Haifa", subCompanyId: null, subCompanyName: null },
    ],
  },
} satisfies Meta<typeof SitesSection>;

export default meta;
type Story = StoryObj<typeof meta>;

export const OwnSites: Story = {};
export const WithSubCompanySites: Story = {
  args: {
    sites: [
      { id: "store", name: "Dizengoff store", address: null, subCompanyId: "retail", subCompanyName: "Acme Retail" },
      { id: "hq", name: "Head office", address: "1 Harbor St, Tel Aviv", subCompanyId: null, subCompanyName: null },
    ],
  },
};
export const EmptyForAdmins: Story = { args: { sites: [] } };
export const EmptyReadOnly: Story = { args: { sites: [], canAdd: false } };

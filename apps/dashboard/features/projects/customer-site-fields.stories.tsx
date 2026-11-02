import type { Meta, StoryObj } from "@storybook/react-vite";

import { CustomerSiteFields } from "./customer-site-fields";

const customers = [
  { id: "acme", name: "Acme Ltd" },
  { id: "retail", name: "Acme Ltd › Acme Retail" },
  { id: "globex", name: "Globex" },
];
const sites = [
  { id: "s1", name: "Haifa warehouse", organizationId: "acme", customerParentId: null, customerName: "Acme Ltd" },
  { id: "s2", name: "Dizengoff store", organizationId: "retail", customerParentId: "acme", customerName: "Acme Retail" },
];

const meta = {
  title: "Dashboard/CustomerSiteFields",
  component: CustomerSiteFields,
  parameters: { layout: "padded" },
  args: { customers, sites, customerId: "", siteId: "", chooseCustomer: true, canAddSite: true },
} satisfies Meta<typeof CustomerSiteFields>;

export default meta;
type Story = StoryObj<typeof meta>;

export const NothingChosen: Story = {};
export const CustomerWithSubCompanySites: Story = { args: { customerId: "acme" } };
export const SiteChosen: Story = { args: { customerId: "acme", siteId: "s1" } };
export const CustomerWithoutSites: Story = { args: { customerId: "globex" } };
export const PartnerWithoutSites: Story = { args: { customerId: "globex", chooseCustomer: false, canAddSite: false } };
export const PartnerFirstCustomer: Story = { args: { chooseCustomer: false, canAddSite: false } };
export const MissingCustomer: Story = { args: { customerError: "Choose a customer" } };
export const SiteOfAnotherCustomer: Story = { args: { customerId: "acme", siteError: "Choose a site of this customer" } };

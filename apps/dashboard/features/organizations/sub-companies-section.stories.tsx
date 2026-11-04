import type { Meta, StoryObj } from "@storybook/react-vite";

import { SubCompaniesSection } from "./sub-companies-section";

const meta = {
  title: "Dashboard/SubCompaniesSection",
  component: SubCompaniesSection,
  parameters: { layout: "padded" },
  args: {
    parentId: "acme",
    canAdd: true,
    subCompanies: [
      { id: "retail", name: "Acme Retail", status: "active", primaryContactName: "Dana Levi", siteCount: 2 },
      { id: "online", name: "Acme Online", status: "lead", primaryContactName: null, siteCount: 0 },
    ],
  },
} satisfies Meta<typeof SubCompaniesSection>;

export default meta;
type Story = StoryObj<typeof meta>;

export const SeveralSubCompanies: Story = {};
export const EmptyForAdmins: Story = { args: { subCompanies: [] } };
export const EmptyReadOnly: Story = { args: { subCompanies: [], canAdd: false } };
export const ReadOnly: Story = { args: { canAdd: false } };
export const OneSiteEach: Story = {
  args: {
    subCompanies: [
      { id: "retail", name: "Acme Retail", status: "active", primaryContactName: "Dana Levi", siteCount: 1 },
      { id: "online", name: "Acme Online", status: "lead", primaryContactName: null, siteCount: 1 },
    ],
  },
};

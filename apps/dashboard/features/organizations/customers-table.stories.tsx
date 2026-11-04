import type { Meta, StoryObj } from "@storybook/react-vite";

import { CustomersTable } from "./customers-table";

const meta = {
  title: "Dashboard/CustomersTable",
  component: CustomersTable,
  parameters: { layout: "padded" },
  args: {
    filtered: false,
    canAdd: true,
    customers: [
      {
        id: "acme",
        name: "Acme Ltd",
        status: "active",
        tags: ["retail", "vip"],
        subCompanyCount: 2,
        siteCount: 5,
        projectCount: 7,
        primaryContactName: "Dana Levi",
      },
      {
        id: "globex",
        name: "Globex",
        status: "lead",
        tags: ["b2b"],
        subCompanyCount: 0,
        siteCount: 1,
        projectCount: 0,
        primaryContactName: null,
      },
      {
        id: "initech",
        name: "Initech",
        status: "inactive",
        tags: [],
        subCompanyCount: 0,
        siteCount: 0,
        projectCount: 0,
        primaryContactName: "Bill Lumbergh",
      },
    ],
  },
} satisfies Meta<typeof CustomersTable>;

export default meta;
type Story = StoryObj<typeof meta>;

export const SeveralCustomers: Story = {};
export const EmptyForAdmins: Story = { args: { customers: [] } };
export const EmptyReadOnly: Story = { args: { customers: [], canAdd: false } };
export const FilteredEmpty: Story = { args: { customers: [], filtered: true } };

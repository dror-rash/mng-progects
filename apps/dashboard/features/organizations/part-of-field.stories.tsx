import type { Meta, StoryObj } from "@storybook/react-vite";

import { PartOfField } from "./part-of-field";

const choices = [
  { id: "acme", name: "Acme Ltd" },
  { id: "globex", name: "Globex" },
];

const meta = {
  title: "Dashboard/PartOfField",
  component: PartOfField,
  parameters: { layout: "padded" },
  args: { name: "Acme Retail", choices, locked: false, chosen: "" },
} satisfies Meta<typeof PartOfField>;

export default meta;
type Story = StoryObj<typeof meta>;

export const NoParent: Story = {};
export const PartOfACompany: Story = { args: { chosen: "acme" } };
export const NoChoices: Story = { args: { choices: [] } };
export const HasSubCompanies: Story = { args: { name: "Acme Ltd", choices: [], locked: true } };
export const NotAChoice: Story = { args: { error: "Choose a company from the list" } };

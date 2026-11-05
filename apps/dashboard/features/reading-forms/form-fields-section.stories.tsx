import type { Meta, StoryObj } from "@storybook/react-vite";

import { AddFieldForm } from "./add-field-form";
import { FormFieldsSection } from "./form-fields-section";

const fields = [
  { id: "f1", label: "Voltage", type: "number", required: true, unit: "V", options: null },
  { id: "f2", label: "Breaker trips", type: "yes_no", required: false, unit: null, options: null },
  { id: "f3", label: "Cable condition", type: "choice", required: false, unit: null, options: ["Good", "Worn", "Damaged"] },
  { id: "f4", label: "Next inspection", type: "date", required: false, unit: null, options: null },
];

const accepted = async () => ({});
const stale = async () => ({ error: "A published form can't change" });

const meta = {
  title: "Dashboard/FormFieldsSection",
  component: FormFieldsSection,
  parameters: { layout: "padded" },
  args: { fields },
} satisfies Meta<typeof FormFieldsSection>;

export default meta;
type Story = StoryObj<typeof meta>;

/** A published form, or any form for an auditor: read-only. */
export const ReadOnly: Story = {};

/** A draft for an admin: Remove per field and the add-field form below. */
export const Draft: Story = {
  args: {
    removeAction: accepted,
    hidden: { workspaceId: "w1", formId: "t1" },
    addForm: <AddFieldForm action={accepted} workspaceId="w1" formId="t1" />,
  },
};

/** A draft with no fields yet. */
export const Empty: Story = {
  args: { fields: [], removeAction: accepted, addForm: <AddFieldForm action={accepted} workspaceId="w1" formId="t1" /> },
};

/** Remove pressed on a page left open after the form was published in another tab. */
export const StaleRemove: Story = {
  args: { removeAction: stale, hidden: { workspaceId: "w1", formId: "t1" } },
};

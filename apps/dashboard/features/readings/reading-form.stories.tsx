import type { Meta, StoryObj } from "@storybook/react-vite";
import { expect, userEvent, within } from "storybook/test";

import type { FormState } from "@/features/forms/form-state";

import { ReadingForm } from "./reading-form";
import { fieldInputName, type ReadingField } from "./reading-values";

const fields: ReadingField[] = [
  { id: "f1", label: "Voltage", type: "number", required: true, unit: "V", options: null },
  { id: "f2", label: "Breaker trips", type: "yes_no", required: false, unit: null, options: null },
  { id: "f3", label: "Cable condition", type: "choice", required: false, unit: null, options: ["Good", "Worn", "Damaged"] },
  { id: "f4", label: "Remarks", type: "text", required: false, unit: null, options: null },
  { id: "f5", label: "Checked on", type: "date", required: false, unit: null, options: null },
];

/** An action that refuses with `error` on `field`, sending back what was posted (as `invalid()` does). */
const refuses = (error: string, field?: string) => async (_prev: FormState, data: FormData): Promise<FormState> => {
  const values: Record<string, string> = {};
  data.forEach((value, key) => (values[key] = String(value)));
  return field ? { error, field, values } : { error, values };
};

const meta = {
  title: "Dashboard/ReadingForm",
  component: ReadingForm,
  parameters: { layout: "padded" },
  args: { projectId: "p1", visitId: "v1", versionId: "ver1", fields, cancelHref: "#", action: async () => ({}) },
} satisfies Meta<typeof ReadingForm>;

export default meta;
type Story = StoryObj<typeof meta>;

/** Every field type: Number with its unit, Yes/no, Choice, Text and Date. */
export const EveryType: Story = {};

/** A required field left empty: the error shows on it, and the other values stay. */
export const RequiredMissing: Story = {
  args: { action: refuses("Voltage is required", fieldInputName("f1")) },
  play: async ({ canvasElement }) => {
    const canvas = within(canvasElement);
    await userEvent.selectOptions(canvas.getByLabelText("Cable condition"), "Worn");
    await userEvent.click(canvas.getByRole("button", { name: "Save reading" }));
    await expect(await canvas.findByRole("alert")).toHaveTextContent("Voltage is required");
    await expect(canvas.getByLabelText("Cable condition")).toHaveValue("Worn");
  },
};

/** The form was archived meanwhile (or the page was tampered with): the message shows above the button. */
export const FormNoLongerOffered: Story = {
  args: { action: refuses("Choose a form from the list") },
  play: async ({ canvasElement }) => {
    const canvas = within(canvasElement);
    await userEvent.click(canvas.getByRole("button", { name: "Save reading" }));
    await expect(await canvas.findByRole("alert")).toHaveTextContent("Choose a form from the list");
  },
};

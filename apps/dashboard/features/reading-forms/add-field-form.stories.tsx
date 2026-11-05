import type { Meta, StoryObj } from "@storybook/react-vite";
import { expect, userEvent, within } from "storybook/test";

import { AddFieldForm } from "./add-field-form";

const meta = {
  title: "Dashboard/AddFieldForm",
  component: AddFieldForm,
  parameters: { layout: "padded" },
  args: { workspaceId: "w1", formId: "t1", action: async () => ({}) },
} satisfies Meta<typeof AddFieldForm>;

export default meta;
type Story = StoryObj<typeof meta>;

export const Default: Story = {};

/** A field without a label: the error shows under Label. */
export const MissingLabel: Story = {
  args: { action: async () => ({ error: "Field label is required", field: "label" }) },
  play: async ({ canvasElement }) => {
    const canvas = within(canvasElement);
    await userEvent.click(canvas.getByRole("button", { name: "Add field" }));
    await expect(await canvas.findByRole("alert")).toHaveTextContent("Field label is required");
  },
};

/** A choice with one option: the error shows under Options. */
export const TooFewOptions: Story = {
  args: { action: async () => ({ error: "Add at least two options, one per line", field: "options" }) },
  play: async ({ canvasElement }) => {
    const canvas = within(canvasElement);
    await userEvent.type(canvas.getByLabelText("Label"), "Cable condition");
    await userEvent.selectOptions(canvas.getByLabelText("Type"), "Choice");
    await userEvent.type(canvas.getByLabelText("Options"), "Good");
    await userEvent.click(canvas.getByRole("button", { name: "Add field" }));
    await expect(await canvas.findByRole("alert")).toHaveTextContent("Add at least two options, one per line");
  },
};

/** The form was published in another tab: the message shows above the fields. */
export const PublishedMeanwhile: Story = {
  args: { action: async () => ({ error: "A published form can't change" }) },
  play: async ({ canvasElement }) => {
    const canvas = within(canvasElement);
    await userEvent.type(canvas.getByLabelText("Label"), "Extra");
    await userEvent.click(canvas.getByRole("button", { name: "Add field" }));
    await expect(await canvas.findByRole("alert")).toHaveTextContent("A published form can't change");
  },
};

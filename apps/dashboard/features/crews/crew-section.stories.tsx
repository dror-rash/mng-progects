import type { Meta, StoryObj } from "@storybook/react-vite";

import { CrewSection } from "./crew-section";

const crew = [
  { userId: "w1", name: "Avi Peretz" },
  { userId: "w2", name: "Rina Cohen" },
];

const meta = {
  title: "Dashboard/CrewSection",
  component: CrewSection,
  parameters: { layout: "padded" },
  args: { projectId: "p1", crew },
} satisfies Meta<typeof CrewSection>;

export default meta;
type Story = StoryObj<typeof meta>;

export const ReadOnly: Story = {};
export const Empty: Story = { args: { crew: [] } };
export const ForAnAdmin: Story = {
  args: {
    removeAction: () => {},
    addForm: (
      <form className="flex items-end gap-2">
        <label className="text-sm font-medium">
          Worker to add{" "}
          <select className="ml-2 rounded border px-2 py-1">
            <option>Dana Levi</option>
          </select>
        </label>
        <button type="button" className="rounded border px-3 py-1 text-sm">Add to crew</button>
      </form>
    ),
  },
};

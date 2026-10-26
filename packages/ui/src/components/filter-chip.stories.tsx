import type { Meta, StoryObj } from "@storybook/react-vite";

import { FilterChip } from "./filter-chip";

const meta = {
  title: "Components/FilterChip",
  component: FilterChip,
  args: { children: <a href="#">Active</a> },
} satisfies Meta<typeof FilterChip>;

export default meta;
type Story = StoryObj<typeof meta>;

export const Default: Story = {};
export const Selected: Story = { args: { selected: true } };
export const Group: Story = {
  render: () => (
    <nav aria-label="Filter by status" className="flex gap-2">
      <FilterChip selected><a href="#">All</a></FilterChip>
      <FilterChip><a href="#">Lead</a></FilterChip>
      <FilterChip><a href="#">Active</a></FilterChip>
      <FilterChip><a href="#">Past</a></FilterChip>
    </nav>
  ),
};

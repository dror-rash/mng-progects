import type { Meta, StoryObj } from "@storybook/react-vite";

import { Badge } from "./badge";
import { Meter } from "./meter";
import { Table, TableBody, TableCaption, TableCell, TableHead, TableHeader, TableRow, TableSortIndicator } from "./table";

const meta = {
  title: "Components/Table",
  component: Table,
} satisfies Meta<typeof Table>;

export default meta;
type Story = StoryObj<typeof meta>;

const rows = [
  { name: "Website Redesign", customer: "Acme Ltd", status: "In progress", rate: 40, progress: "2 of 5 done", overdue: 1 },
  { name: "Mobile App", customer: "Globex", status: "Done", rate: 100, progress: "6 of 6 done", overdue: 0 },
  { name: "Internal Ops", customer: "—", status: "No tasks", rate: 0, progress: "No tasks yet", overdue: 0 },
];

export const Default: Story = {
  render: () => (
    <Table>
      <TableCaption>Projects</TableCaption>
      <TableHeader>
        <TableRow>
          <TableHead>Name</TableHead>
          <TableHead>Customer</TableHead>
          <TableHead>Status</TableHead>
          <TableHead>Progress</TableHead>
          <TableHead>Overdue</TableHead>
        </TableRow>
      </TableHeader>
      <TableBody>
        {rows.map((r) => (
          <TableRow key={r.name}>
            <TableHead scope="row">{r.name}</TableHead>
            <TableCell>{r.customer}</TableCell>
            <TableCell><Badge variant="outline">{r.status}</Badge></TableCell>
            <TableCell className="min-w-40">
              <Meter label={`${r.name} progress`} value={r.rate} />
              <span className="text-xs text-muted-foreground">{r.progress}</span>
            </TableCell>
            <TableCell>{r.overdue > 0 ? `${r.overdue} overdue` : "—"}</TableCell>
          </TableRow>
        ))}
      </TableBody>
    </Table>
  ),
};

export const Empty: Story = {
  render: () => (
    <Table>
      <TableCaption>Projects</TableCaption>
      <TableHeader>
        <TableRow>
          <TableHead>Name</TableHead>
          <TableHead>Status</TableHead>
        </TableRow>
      </TableHeader>
      <TableBody>
        <TableRow>
          <TableCell colSpan={2} className="py-8 text-center text-muted-foreground">No projects match these filters.</TableCell>
        </TableRow>
      </TableBody>
    </Table>
  ),
};

const sortLink = "inline-flex items-center gap-1 hover:text-foreground";

/** Column headers that sort: the sorted one shows its direction (and has `aria-sort`), the others a faint marker. */
function SortableTable({ direction }: { direction: "ascending" | "descending" }) {
  const sorted = direction === "ascending" ? rows : [...rows].reverse();
  return (
    <Table>
      <TableCaption>Projects</TableCaption>
      <TableHeader>
        <TableRow>
          <TableHead aria-sort={direction}>
            <a href="#name" className={sortLink}>Name <TableSortIndicator direction={direction} /></a>
          </TableHead>
          <TableHead>
            <a href="#customer" className={sortLink}>Customer <TableSortIndicator /></a>
          </TableHead>
          <TableHead>
            <a href="#overdue" className={sortLink}>Overdue <TableSortIndicator /></a>
          </TableHead>
        </TableRow>
      </TableHeader>
      <TableBody>
        {sorted.map((r) => (
          <TableRow key={r.name}>
            <TableHead scope="row">{r.name}</TableHead>
            <TableCell>{r.customer}</TableCell>
            <TableCell>{r.overdue > 0 ? `${r.overdue} overdue` : "—"}</TableCell>
          </TableRow>
        ))}
      </TableBody>
    </Table>
  );
}

export const SortedAscending: Story = { render: () => <SortableTable direction="ascending" /> };

export const SortedDescending: Story = { render: () => <SortableTable direction="descending" /> };

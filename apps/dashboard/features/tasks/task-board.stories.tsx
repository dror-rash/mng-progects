import type { Meta, StoryObj } from "@storybook/react-vite";
import { expect, fn, userEvent, within } from "storybook/test";

import { type BoardTask, TaskBoard } from "./task-board";

const tasks: BoardTask[] = [
  { id: "1", title: "Write homepage copy", status: "todo", priority: "high", dueDate: "2026-10-20", assigneeName: "Ada", customerName: null },
  { id: "2", title: "Collect logos", status: "todo", priority: "medium", dueDate: null, assigneeName: null, customerName: "Acme" },
  { id: "3", title: "Design the hero", status: "in_progress", priority: "low", dueDate: "2026-11-12", assigneeName: "Grace", customerName: null },
  { id: "4", title: "Pick a domain", status: "done", priority: "medium", dueDate: null, assigneeName: null, customerName: null },
];

const meta = {
  title: "Dashboard/TaskBoard",
  component: TaskBoard,
  parameters: { layout: "padded" },
  args: {
    projectId: "project-1",
    tasks,
    today: "2026-10-30",
    moveAction: fn(async () => {}),
    deleteAction: fn(async () => {}),
  },
} satisfies Meta<typeof TaskBoard>;

export default meta;
type Story = StoryObj<typeof meta>;

export const TasksInEachColumn: Story = {};

export const EmptyColumns: Story = {
  args: { tasks: [tasks[0]!] },
};

/** Picked up with the keyboard and moved over In progress: the card lifts and the column lights up. */
export const Dragging: Story = {
  play: async ({ canvasElement }) => {
    const canvas = within(canvasElement);
    canvas.getByRole("button", { name: "Drag Write homepage copy" }).focus();
    await userEvent.keyboard(" ");
    await userEvent.keyboard("{ArrowRight}");
    await expect(within(document.body).getByRole("status")).toHaveTextContent("Write homepage copy is over In progress.");
  },
};

/** The save failed: the card is back in its column and an alert says so. */
export const MoveFailed: Story = {
  args: { moveAction: fn(async () => Promise.reject(new Error("Task not found"))) },
  play: async ({ canvasElement }) => {
    const canvas = within(canvasElement);
    canvas.getByRole("button", { name: "Drag Collect logos" }).focus();
    await userEvent.keyboard(" ");
    await userEvent.keyboard("{ArrowRight}");
    await userEvent.keyboard(" ");
    await expect(await canvas.findByRole("alert")).toHaveTextContent("Couldn't move Collect logos. It is back in To do.");
  },
};

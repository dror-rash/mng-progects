// @vitest-environment jsdom
import { act, cleanup, render, screen, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

import { type BoardTask, TaskBoard } from "./task-board";

const task = (overrides: Partial<BoardTask> = {}): BoardTask => ({
  id: "task-1",
  title: "Write homepage copy",
  status: "todo",
  priority: "medium",
  dueDate: null,
  assigneeName: null,
  customerName: null,
  ...overrides,
});

// jsdom has no layout. Lay the columns out side by side (300px apart) and give everything
// inside a column its column's box, so drag collision detection has something to measure.
function layOutColumns() {
  vi.spyOn(Element.prototype, "getBoundingClientRect").mockImplementation(function (this: Element) {
    const column = this.closest("section");
    const index = column ? [...document.querySelectorAll("section")].indexOf(column) : -1;
    const left = Math.max(index, 0) * 300;
    return { x: left, y: 0, left, top: 0, right: left + 280, bottom: 600, width: 280, height: 600, toJSON: () => ({}) } as DOMRect;
  });
}

function column(name: string) {
  return within(screen.getByRole("region", { name: new RegExp(`^${name}`) }));
}

function renderBoard(tasks: BoardTask[], moveAction: (formData: FormData) => Promise<void> = vi.fn(async () => {})) {
  return render(
    <TaskBoard projectId="project-1" tasks={tasks} today="2026-10-30" moveAction={moveAction} deleteAction={vi.fn(async () => {})} />,
  );
}

/** Picks the card up with the keyboard, moves it one column right, and drops it. */
async function dragOneColumnRight(title: string) {
  const user = userEvent.setup();
  screen.getByRole("button", { name: `Drag ${title}` }).focus();
  await user.keyboard(" ");
  await user.keyboard("{ArrowRight}");
  await user.keyboard(" ");
}

describe("TaskBoard", () => {
  beforeEach(layOutColumns);
  afterEach(() => {
    cleanup();
    vi.restoreAllMocks();
  });

  it("shows a column per status with its tasks and their move buttons", () => {
    renderBoard([task(), task({ id: "task-2", title: "Ship it", status: "done" })]);

    expect(column("To do").getByRole("link", { name: "Write homepage copy" })).toBeInTheDocument();
    expect(column("In progress").getByText("No tasks")).toBeInTheDocument();
    expect(column("Done").getByRole("link", { name: "Ship it" })).toBeInTheDocument();
    expect(column("To do").getByRole("button", { name: "Move to In progress" })).toBeInTheDocument();
    expect(column("To do").queryByRole("button", { name: "Move to To do" })).not.toBeInTheDocument();
  });

  it("moves a dropped card right away, saves the new status, and announces the move", async () => {
    const saved: FormData[] = [];
    // Never resolves: the card shows where it was dropped while the save is in flight.
    const moveAction = vi.fn((formData: FormData) => {
      saved.push(formData);
      return new Promise<void>(() => {});
    });
    renderBoard([task()], moveAction);

    await dragOneColumnRight("Write homepage copy");

    expect(column("In progress").getByRole("link", { name: "Write homepage copy" })).toBeInTheDocument();
    expect(column("To do").queryByRole("link", { name: "Write homepage copy" })).not.toBeInTheDocument();
    expect(saved).toHaveLength(1);
    expect(Object.fromEntries(saved[0]!)).toEqual({ projectId: "project-1", taskId: "task-1", status: "in_progress" });
    expect(screen.getByRole("status")).toHaveTextContent("Moved Write homepage copy to In progress.");
  });

  it("puts the card back and says so when the save fails", async () => {
    let fail!: () => void;
    const moveAction = vi.fn(() => new Promise<void>((_, reject) => (fail = () => reject(new Error("Task not found")))));
    renderBoard([task()], moveAction);

    await dragOneColumnRight("Write homepage copy");
    expect(column("In progress").getByRole("link", { name: "Write homepage copy" })).toBeInTheDocument();
    await act(async () => fail());

    expect(column("To do").getByRole("link", { name: "Write homepage copy" })).toBeInTheDocument();
    expect(screen.getByRole("alert")).toHaveTextContent("Couldn't move Write homepage copy. It is back in To do.");
  });

  it("does nothing when a card is dropped on its own column", async () => {
    const moveAction = vi.fn(async () => {});
    renderBoard([task()], moveAction);
    const user = userEvent.setup();

    screen.getByRole("button", { name: "Drag Write homepage copy" }).focus();
    await user.keyboard(" ");
    await user.keyboard(" ");

    expect(moveAction).not.toHaveBeenCalled();
    expect(column("To do").getByRole("link", { name: "Write homepage copy" })).toBeInTheDocument();
  });
});

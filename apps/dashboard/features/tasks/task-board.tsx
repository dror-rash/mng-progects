"use client";

import {
  type Announcements,
  type CollisionDetection,
  DndContext,
  type DragEndEvent,
  type KeyboardCoordinateGetter,
  KeyboardSensor,
  PointerSensor,
  pointerWithin,
  rectIntersection,
  useDraggable,
  useDroppable,
  useSensor,
  useSensors,
} from "@dnd-kit/core";
import { Button } from "@repo/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@repo/ui/card";
import { cn } from "@repo/ui/lib/utils";
import Link from "next/link";
import { startTransition, useOptimistic, useState, useSyncExternalStore } from "react";

import { dueState, formatDueDate } from "./due-dates";
import { DEFAULT_PRIORITY, normalizeTaskPriority, priorityLabel } from "./task-priority";
import { groupTasksByStatus, parseTaskStatus, TASK_STATUSES, type TaskStatus } from "./task-status";

/** The fields a board card shows. */
export type BoardTask = {
  id: string;
  title: string;
  status: string;
  priority: string;
  dueDate: string | null;
  assigneeName: string | null;
  customerName: string | null;
};

type TaskAction = (formData: FormData) => Promise<void>;

type TaskBoardProps = {
  projectId: string;
  /** In the order each column lists them (most urgent first). */
  tasks: BoardTask[];
  today: string;
  /** Saves a task's status: `projectId`, `taskId`, `status`. Also the "Move to" forms' action, so they work without JavaScript. */
  moveAction: TaskAction;
  deleteAction: TaskAction;
};

type DragData = { title: string; status: TaskStatus };

const statusLabel = (status: unknown) => TASK_STATUSES.find((s) => s.status === status)?.label ?? "";
const dragData = (data: { current?: Record<string, unknown> } | undefined) => data?.current as DragData | undefined;

/** The column under the pointer; for keyboard drags (no pointer), the column the card overlaps most. */
const columnCollisions: CollisionDetection = (args) => {
  const underPointer = pointerWithin(args);
  return underPointer.length > 0 ? underPointer : rectIntersection(args);
};

/** Arrow keys jump the card to the next or previous column (Right/Down and Left/Up), whatever the layout. */
const columnKeyboardCoordinates: KeyboardCoordinateGetter = (event, { context }) => {
  const step = ["ArrowRight", "ArrowDown"].includes(event.code) ? 1 : ["ArrowLeft", "ArrowUp"].includes(event.code) ? -1 : 0;
  const card = context.collisionRect;
  const current = context.over?.id ?? dragData(context.active?.data)?.status;
  const index = TASK_STATUSES.findIndex((s) => s.status === current);
  const next = TASK_STATUSES[index + step];
  const column = next && context.droppableRects.get(next.status);
  if (step === 0 || !card || !column) {
    return undefined;
  }
  event.preventDefault();
  return { x: column.left + (column.width - card.width) / 2, y: column.top };
};

const announcements: Announcements = {
  onDragStart: ({ active }) => `Picked up ${dragData(active.data)?.title}.`,
  onDragOver: ({ active, over }) =>
    over ? `${dragData(active.data)?.title} is over ${statusLabel(over.id)}.` : `${dragData(active.data)?.title} is not over a column.`,
  onDragEnd: ({ active, over }) => {
    const task = dragData(active.data);
    if (!task) return undefined;
    return over && over.id !== task.status
      ? `Moved ${task.title} to ${statusLabel(over.id)}.`
      : `${task.title} stays in ${statusLabel(task.status)}.`;
  },
  onDragCancel: ({ active }) => {
    const task = dragData(active.data);
    return task && `Cancelled. ${task.title} stays in ${statusLabel(task.status)}.`;
  },
};

const screenReaderInstructions = {
  draggable:
    "To move this task to another column, press Space or Enter to pick it up, use the arrow keys to choose a column, " +
    "then press Space or Enter to drop it, or Escape to cancel. The Move to buttons do the same.",
};

const noSubscription = () => () => {};

/** True once React has hydrated; dragging needs JavaScript, so the handles appear only then. */
function useInteractive() {
  return useSyncExternalStore(noSubscription, () => true, () => false);
}

/** The project board: drag a card to another column, or use its "Move to" buttons. */
export function TaskBoard({ projectId, tasks, today, moveAction, deleteAction }: TaskBoardProps) {
  const [shownTasks, showMove] = useOptimistic(tasks, (current, move: { taskId: string; status: TaskStatus }) =>
    current.map((t) => (t.id === move.taskId ? { ...t, status: move.status } : t)),
  );
  const [failure, setFailure] = useState<string | null>(null);
  const interactive = useInteractive();
  const sensors = useSensors(
    // A short distance first, so a click on a handle stays a click.
    useSensor(PointerSensor, { activationConstraint: { distance: 5 } }),
    useSensor(KeyboardSensor, { coordinateGetter: columnKeyboardCoordinates }),
  );

  function handleDragEnd({ active, over }: DragEndEvent) {
    const task = dragData(active.data);
    const status = parseTaskStatus(over?.id);
    if (!task || !status || status === task.status) {
      return;
    }
    const formData = new FormData();
    formData.set("projectId", projectId);
    formData.set("taskId", String(active.id));
    formData.set("status", status);
    startTransition(async () => {
      showMove({ taskId: String(active.id), status });
      try {
        await moveAction(formData);
      } catch {
        // The optimistic move ends with the transition, so the card goes back on its own.
        setFailure(`Couldn't move ${task.title}. It is back in ${statusLabel(task.status)}.`);
      }
    });
  }

  return (
    <DndContext
      id="task-board"
      sensors={sensors}
      collisionDetection={columnCollisions}
      accessibility={{ announcements, screenReaderInstructions }}
      onDragStart={() => setFailure(null)}
      onDragEnd={handleDragEnd}
    >
      {failure && (
        <p role="alert" className="text-sm font-medium text-destructive">
          {failure}
        </p>
      )}
      <div className="grid gap-4 md:grid-cols-3">
        {groupTasksByStatus(shownTasks).map((column) => (
          <BoardColumn key={column.status} status={column.status} label={column.label} count={column.tasks.length}>
            {column.tasks.length === 0 ? (
              <p className="py-4 text-center text-xs text-muted-foreground">No tasks</p>
            ) : (
              <ul className="space-y-2">
                {column.tasks.map((task) => (
                  <BoardCard
                    key={task.id}
                    task={task}
                    status={column.status}
                    projectId={projectId}
                    today={today}
                    draggable={interactive}
                    moveAction={moveAction}
                    deleteAction={deleteAction}
                  />
                ))}
              </ul>
            )}
          </BoardColumn>
        ))}
      </div>
    </DndContext>
  );
}

function BoardColumn({ status, label, count, children }: { status: TaskStatus; label: string; count: number; children: React.ReactNode }) {
  const { setNodeRef, isOver } = useDroppable({ id: status });
  return (
    <section
      ref={setNodeRef}
      aria-labelledby={`column-${status}`}
      className={cn("space-y-3 rounded-lg bg-muted/50 p-3 transition-colors", isOver && "bg-muted ring-2 ring-ring")}
    >
      <h2 id={`column-${status}`} className="flex items-center justify-between text-sm font-semibold">
        {label}
        <span className="rounded-full bg-secondary px-2 text-xs text-secondary-foreground">{count}</span>
      </h2>
      {children}
    </section>
  );
}

type BoardCardProps = {
  task: BoardTask;
  status: TaskStatus;
  projectId: string;
  today: string;
  draggable: boolean;
  moveAction: TaskAction;
  deleteAction: TaskAction;
};

function BoardCard({ task, status, projectId, today, draggable, moveAction, deleteAction }: BoardCardProps) {
  const { attributes, listeners, setNodeRef, setActivatorNodeRef, transform, isDragging } = useDraggable({
    id: task.id,
    data: { title: task.title, status } satisfies DragData,
  });

  return (
    <li
      ref={setNodeRef}
      style={transform ? { transform: `translate3d(${transform.x}px, ${transform.y}px, 0)` } : undefined}
      className={cn("relative", isDragging && "z-10")}
    >
      <Card className={cn(isDragging && "shadow-lg ring-2 ring-ring")}>
        <CardHeader className="pb-2">
          <div className="flex items-start justify-between gap-2">
            <CardTitle className="text-sm font-medium">
              <Link href={`/projects/${projectId}/tasks/${task.id}`} className="hover:underline">
                {task.title}
              </Link>
            </CardTitle>
            {draggable && (
              <button
                ref={setActivatorNodeRef}
                type="button"
                aria-label={`Drag ${task.title}`}
                className="-m-1 cursor-grab touch-none rounded p-1 text-muted-foreground hover:bg-muted focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring active:cursor-grabbing"
                {...attributes}
                {...listeners}
              >
                <GripIcon />
              </button>
            )}
          </div>
          {normalizeTaskPriority(task.priority) !== DEFAULT_PRIORITY && (
            <p className="text-xs font-medium">{priorityLabel(task.priority)} priority</p>
          )}
          {task.dueDate && (
            <p className="text-xs text-muted-foreground">
              Due <time dateTime={task.dueDate}>{formatDueDate(task.dueDate, "short", today)}</time>{" "}
              {dueState(task.dueDate, task.status, today) === "overdue" && (
                <span className="ml-2 font-medium text-destructive">Overdue</span>
              )}
            </p>
          )}
          {task.assigneeName && <p className="text-xs text-muted-foreground">Assigned to {task.assigneeName}</p>}
          {task.customerName && <p className="text-xs text-muted-foreground">For {task.customerName}</p>}
        </CardHeader>
        <CardContent className="flex flex-wrap gap-1">
          {TASK_STATUSES.filter((s) => s.status !== status).map((target) => (
            <form key={target.status} action={moveAction}>
              <input type="hidden" name="projectId" value={projectId} />
              <input type="hidden" name="taskId" value={task.id} />
              <input type="hidden" name="status" value={target.status} />
              <Button type="submit" variant="outline" size="sm">
                Move to {target.label}
              </Button>
            </form>
          ))}
          <form action={deleteAction}>
            <input type="hidden" name="projectId" value={projectId} />
            <input type="hidden" name="taskId" value={task.id} />
            <Button type="submit" variant="ghost" size="sm">
              Delete task
            </Button>
          </form>
        </CardContent>
      </Card>
    </li>
  );
}

function GripIcon() {
  return (
    <svg aria-hidden="true" width="16" height="16" viewBox="0 0 16 16" fill="currentColor">
      {[4, 8, 12].flatMap((y) => [6, 10].map((x) => <circle key={`${x}-${y}`} cx={x} cy={y} r="1.25" />))}
    </svg>
  );
}

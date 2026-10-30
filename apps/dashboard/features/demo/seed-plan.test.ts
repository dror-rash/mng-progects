import { describe, expect, it } from "vitest";

import { ORGANIZATION_STATUSES } from "@/features/organizations/organization-kinds";
import { TASK_PRIORITIES } from "@/features/tasks/task-priority";
import { TASK_STATUSES } from "@/features/tasks/task-status";

import { buildDemoPlan, DEMO_TAG } from "./seed-plan";

const now = new Date("2026-10-30T12:00:00Z");
const today = "2026-10-30";
const plan = buildDemoPlan(now);
const projects = plan.flatMap((c) => c.projects);
const tasks = projects.flatMap((p) => p.tasks);
const open = tasks.filter((t) => t.status !== "done");

describe("buildDemoPlan", () => {
  it("makes 5 customers with 15 projects each", () => {
    expect(plan).toHaveLength(5);
    expect(plan.map((c) => c.projects.length)).toEqual([15, 15, 15, 15, 15]);
  });

  it("tags every customer so a rerun can find and replace them", () => {
    expect(plan.every((c) => c.tags.includes(DEMO_TAG))).toBe(true);
  });

  it("uses every customer status", () => {
    expect(new Set(plan.map((c) => c.status))).toEqual(new Set(ORGANIZATION_STATUSES.map((s) => s.status)));
  });

  it("uses every task status and priority", () => {
    expect(new Set(tasks.map((t) => t.status))).toEqual(new Set(TASK_STATUSES.map((s) => s.status)));
    expect(new Set(tasks.map((t) => t.priority))).toEqual(new Set(TASK_PRIORITIES.map((p) => p.priority)));
  });

  it("gives each customer an empty project, a finished one and one not started", () => {
    for (const customer of plan) {
      const states = customer.projects.map((p) => p.tasks);
      expect(states.some((t) => t.length === 0)).toBe(true);
      expect(states.some((t) => t.length > 0 && t.every((x) => x.status === "done"))).toBe(true);
      expect(states.some((t) => t.length > 0 && t.every((x) => x.status === "todo"))).toBe(true);
    }
  });

  it("has open tasks that are overdue, due this week and undated", () => {
    expect(open.some((t) => t.dueDate !== null && t.dueDate < today)).toBe(true);
    expect(open.some((t) => t.dueDate !== null && t.dueDate >= today && t.dueDate <= "2026-11-05")).toBe(true);
    expect(open.some((t) => t.dueDate === null)).toBe(true);
  });

  it("completes done tasks in the past, some within the last week", () => {
    const done = tasks.filter((t) => t.status === "done");
    expect(done.every((t) => t.completedAt !== null && t.completedAt <= now)).toBe(true);
    expect(done.some((t) => now.getTime() - t.completedAt!.getTime() < 7 * 86_400_000)).toBe(true);
    expect(open.every((t) => t.completedAt === null)).toBe(true);
  });

  it("assigns some tasks to me and leaves others unassigned", () => {
    expect(tasks.some((t) => t.assignedToMe)).toBe(true);
    expect(tasks.some((t) => !t.assignedToMe)).toBe(true);
  });

  it("starts projects at different times, all in the past", () => {
    const starts = projects.map((p) => p.createdAt.getTime());
    expect(new Set(starts).size).toBeGreaterThan(10);
    expect(starts.every((s) => s <= now.getTime())).toBe(true);
  });

  it("gives each customer contacts with one primary, and notes", () => {
    for (const customer of plan) {
      expect(customer.contacts.length).toBeGreaterThanOrEqual(2);
      expect(customer.contacts.filter((c) => c.primary)).toHaveLength(1);
      expect(customer.notes.length).toBeGreaterThanOrEqual(1);
    }
  });

  it("is the same for the same day", () => {
    expect(buildDemoPlan(now)).toEqual(plan);
  });
});

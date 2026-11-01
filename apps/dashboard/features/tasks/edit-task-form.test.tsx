// @vitest-environment jsdom
import { cleanup, render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { afterEach, describe, expect, it, vi } from "vitest";

// The server action is the form's boundary here; these tests are about what the form posts.
vi.mock("./actions", () => ({ updateTaskAction: vi.fn() }));

import { EditTaskForm } from "./edit-task-form";

const task = (organizationId: string | null) => ({
  id: "task-1",
  title: "Copy",
  description: null,
  organizationId,
  priority: "medium",
  dueDate: null,
  assigneeId: null,
});
const customers = [{ id: "acme", name: "Acme Ltd" }];
const members = [{ userId: "ann", name: "Ann" }];

function posted() {
  return new FormData(screen.getByRole("button", { name: "Save changes" }).closest("form")!);
}

afterEach(cleanup);

describe("EditTaskForm", () => {
  it("posts the chosen customer", () => {
    render(<EditTaskForm projectId="p" task={task("acme")} customers={customers} members={[]} />);

    expect(posted().get("customerId")).toBe("acme");
  });

  it("posts an empty customer when No customer is chosen", () => {
    render(<EditTaskForm projectId="p" task={task(null)} customers={customers} members={[]} />);

    expect(posted().get("customerId")).toBe("");
  });

  it("doesn't post the customer when the current one isn't among my choices, so it is kept", () => {
    render(<EditTaskForm projectId="p" task={task("initech")} customers={customers} members={[]} />);

    expect(screen.getByLabelText("Customer")).toHaveProperty("value", "");
    expect(posted().has("customerId")).toBe(false);
  });

  it("doesn't post the customer when it is hidden from me, without being given its id", () => {
    render(<EditTaskForm projectId="p" task={{ ...task(null), customerHidden: true }} customers={customers} members={[]} />);

    expect(screen.getByLabelText("Customer")).toHaveProperty("value", "");
    expect(posted().has("customerId")).toBe(false);
  });

  it("posts a customer chosen in place of one I can't see", async () => {
    render(<EditTaskForm projectId="p" task={task("initech")} customers={customers} members={[]} />);

    await userEvent.selectOptions(screen.getByLabelText("Customer"), "Acme Ltd");

    expect(posted().get("customerId")).toBe("acme");
  });

  it("posts the chosen assignee", () => {
    render(<EditTaskForm projectId="p" task={{ ...task(null), assigneeId: "ann" }} customers={customers} members={members} />);

    expect(posted().get("assigneeId")).toBe("ann");
  });

  it("doesn't post the assignee when they aren't one of the choices (an auditor), so they are kept", () => {
    render(<EditTaskForm projectId="p" task={{ ...task(null), assigneeId: "aud" }} customers={customers} members={members} />);

    expect(screen.getByLabelText("Assignee")).toHaveProperty("value", "");
    expect(posted().has("assigneeId")).toBe(false);
  });

  it("doesn't post the assignee when it is hidden from me, without being given their id", () => {
    render(<EditTaskForm projectId="p" task={{ ...task(null), assigneeHidden: true }} customers={customers} members={members} />);

    expect(posted().has("assigneeId")).toBe(false);
  });

  it("posts an assignee chosen in place of one who isn't a choice", async () => {
    render(<EditTaskForm projectId="p" task={{ ...task(null), assigneeHidden: true }} customers={customers} members={members} />);

    await userEvent.selectOptions(screen.getByLabelText("Assignee"), "Unassigned");

    expect(posted().get("assigneeId")).toBe("");
  });
});

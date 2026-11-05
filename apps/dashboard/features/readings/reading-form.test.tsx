// @vitest-environment jsdom
import { act, cleanup, fireEvent, render, screen, waitFor, within } from "@testing-library/react";
import { afterEach, describe, expect, it } from "vitest";

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

const props = { projectId: "p1", visitId: "v1", versionId: "ver1", fields, cancelHref: "/projects/p1/visits/v1" };

afterEach(cleanup);

const hidden = (name: string) =>
  (screen.getByRole("button", { name: "Save reading" }).closest("form")!.querySelector(`input[name="${name}"]`) as HTMLInputElement)
    .value;

describe("ReadingForm", () => {
  it("shows each field as the input for its type", () => {
    render(<ReadingForm {...props} action={async () => ({})} />);

    const voltage = screen.getByLabelText("Voltage") as HTMLInputElement;
    expect(voltage.type).toBe("number");
    expect(voltage.name).toBe(fieldInputName("f1"));
    expect(screen.getByText("V")).toBeTruthy();
    const trips = screen.getByRole("group", { name: "Breaker trips" });
    expect(within(trips).getAllByRole("radio").map((r) => (r as HTMLInputElement).value)).toEqual(["yes", "no"]);
    expect(within(trips).getByLabelText("Yes")).toBeTruthy();
    const condition = screen.getByLabelText("Cable condition") as HTMLSelectElement;
    expect([...condition.options].map((o) => o.textContent)).toEqual(["Not filled in", "Good", "Worn", "Damaged"]);
    expect((screen.getByLabelText("Remarks") as HTMLInputElement).type).toBe("text");
    expect((screen.getByLabelText("Checked on") as HTMLInputElement).type).toBe("date");
    expect(screen.getByRole("button", { name: "Save reading" })).toBeTruthy();
  });

  it("posts the visit, the form version and an id made once for the reading", () => {
    render(<ReadingForm {...props} action={async () => ({})} />);

    expect(hidden("projectId")).toBe("p1");
    expect(hidden("visitId")).toBe("v1");
    expect(hidden("versionId")).toBe("ver1");
    expect(hidden("readingId")).toMatch(/^[0-9a-f-]{36}$/);
  });

  it("shows a refused value's error on its field and keeps every value entered, with the same id", async () => {
    let sent: FormData | undefined;
    const action = async (_prev: FormState, data: FormData): Promise<FormState> => {
      sent = data;
      const values: Record<string, string> = {};
      data.forEach((value, key) => (values[key] = String(value)));
      return { error: "Voltage is required", field: fieldInputName("f1"), values };
    };
    render(<ReadingForm {...props} action={action} />);
    const id = hidden("readingId");

    fireEvent.click(screen.getByLabelText("Yes"));
    fireEvent.change(screen.getByLabelText("Cable condition"), { target: { value: "Worn" } });
    fireEvent.change(screen.getByLabelText("Remarks"), { target: { value: "Dusty" } });
    await act(async () => {
      fireEvent.click(screen.getByRole("button", { name: "Save reading" }));
    });

    await waitFor(() => expect(screen.getByRole("alert").textContent).toBe("Voltage is required"));
    expect(sent?.get(fieldInputName("f3"))).toBe("Worn");
    const voltage = screen.getByLabelText("Voltage");
    expect(voltage.getAttribute("aria-invalid")).toBe("true");
    expect(voltage.getAttribute("aria-describedby")).toContain(screen.getByRole("alert").id);
    expect((screen.getByLabelText("Cable condition") as HTMLSelectElement).value).toBe("Worn");
    expect((screen.getByLabelText("Yes") as HTMLInputElement).checked).toBe(true);
    expect((screen.getByLabelText("Remarks") as HTMLInputElement).value).toBe("Dusty");
    expect(hidden("readingId")).toBe(id);
  });

  it("shows an error about the form itself above the button", async () => {
    render(<ReadingForm {...props} action={async () => ({ error: "Choose a form from the list" })} />);
    await act(async () => {
      fireEvent.click(screen.getByRole("button", { name: "Save reading" }));
    });
    await waitFor(() => expect(screen.getByRole("alert").textContent).toBe("Choose a form from the list"));
  });
});

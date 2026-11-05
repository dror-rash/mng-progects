// @vitest-environment jsdom
import { act, cleanup, fireEvent, render, screen, waitFor } from "@testing-library/react";
import { afterEach, describe, expect, it } from "vitest";

import { AddFieldForm } from "./add-field-form";

const action = async () => ({});

afterEach(cleanup);

describe("AddFieldForm", () => {
  it("asks for a label, a type, a unit, options and Required", () => {
    render(<AddFieldForm action={action} workspaceId="w1" formId="t1" />);

    expect(screen.getByLabelText("Label")).toBeTruthy();
    const type = screen.getByLabelText("Type") as HTMLSelectElement;
    expect([...type.options].map((o) => o.textContent)).toEqual(["Number", "Text", "Yes/no", "Choice", "Date"]);
    expect(type.value).toBe("number");
    expect(screen.getByLabelText("Unit")).toBeTruthy();
    expect(screen.getByLabelText("Options").tagName).toBe("TEXTAREA");
    expect((screen.getByLabelText("Required") as HTMLInputElement).type).toBe("checkbox");
    expect(screen.getByRole("button", { name: "Add field" })).toBeTruthy();
  });

  it("posts the form's workspace and id in hidden fields", () => {
    render(<AddFieldForm action={action} workspaceId="w1" formId="t1" />);

    const form = screen.getByRole("button", { name: "Add field" }).closest("form")!;
    expect((form.querySelector('input[name="workspaceId"]') as HTMLInputElement).value).toBe("w1");
    expect((form.querySelector('input[name="formId"]') as HTMLInputElement).value).toBe("t1");
  });
});

describe("AddFieldForm after adding a field", () => {
  it("clears what was sent but keeps what was typed while it was being added", async () => {
    let finish: (state: object) => void = () => {};
    const slow = (_prev: object, _data: FormData) => new Promise<object>((resolve) => (finish = resolve));
    render(<AddFieldForm action={slow} workspaceId="w1" formId="t1" />);
    const label = screen.getByLabelText("Label") as HTMLInputElement;
    const unit = screen.getByLabelText("Unit") as HTMLInputElement;

    fireEvent.change(label, { target: { value: "Voltage" } });
    fireEvent.change(unit, { target: { value: "V" } });
    fireEvent.submit(label.closest("form")!);
    fireEvent.change(label, { target: { value: "Breaker trips" } });
    await act(async () => finish({}));

    await waitFor(() => expect(unit.value).toBe(""));
    expect(label.value).toBe("Breaker trips");
  });

  it("keeps everything when the field is refused", async () => {
    const refuse = async () => ({ error: "Field label is required", field: "label" });
    render(<AddFieldForm action={refuse} workspaceId="w1" formId="t1" />);
    const unit = screen.getByLabelText("Unit") as HTMLInputElement;

    fireEvent.change(unit, { target: { value: "V" } });
    await act(async () => fireEvent.submit(unit.closest("form")!));

    expect(await screen.findByRole("alert")).toHaveProperty("textContent", "Field label is required");
    expect(unit.value).toBe("V");
  });
});

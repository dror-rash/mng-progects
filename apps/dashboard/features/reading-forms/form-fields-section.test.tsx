// @vitest-environment jsdom
import { cleanup, render, screen, within } from "@testing-library/react";
import { afterEach, describe, expect, it } from "vitest";

import { FormFieldsSection } from "./form-fields-section";

const fields = [
  { id: "f1", label: "Voltage", type: "number", required: true, unit: "V", options: null },
  { id: "f2", label: "Cable condition", type: "choice", required: false, unit: null, options: ["Good", "Worn", "Damaged"] },
];

const remove = async () => ({});

afterEach(cleanup);

describe("FormFieldsSection", () => {
  it("lists the fields in order, each label a row header with its type, unit, options and Required", () => {
    render(<FormFieldsSection fields={fields} />);

    const region = screen.getByRole("region", { name: "Fields" });
    expect(within(region).getAllByRole("rowheader").map((cell) => cell.textContent)).toEqual(["Voltage", "Cable condition"]);
    const voltage = within(region).getByRole("row", { name: /Voltage/ });
    expect(voltage.textContent).toContain("Number");
    expect(voltage.textContent).toContain("V");
    expect(voltage.textContent).toContain("Required");
    expect(within(region).getByRole("row", { name: /Cable condition/ }).textContent).toContain("Good, Worn, Damaged");
  });

  it("says when there are no fields", () => {
    render(<FormFieldsSection fields={[]} />);

    expect(within(screen.getByRole("region", { name: "Fields" })).getByText("No fields yet.")).toBeTruthy();
  });

  it("has no Remove buttons without a remove action", () => {
    render(<FormFieldsSection fields={fields} />);

    expect(screen.queryByRole("button", { name: /Remove/ })).toBeNull();
  });

  it("gives each field a Remove button posting the form's and the field's ids", () => {
    render(<FormFieldsSection fields={fields} removeAction={remove} hidden={{ workspaceId: "w1", formId: "t1" }} />);

    const button = screen.getByRole("button", { name: "Remove Voltage" });
    const form = button.closest("form")!;
    const hidden = Object.fromEntries(
      [...form.querySelectorAll<HTMLInputElement>('input[type="hidden"]')].map((input) => [input.name, input.value]),
    );
    expect(hidden).toEqual({ workspaceId: "w1", formId: "t1", fieldId: "f1" });
  });
});

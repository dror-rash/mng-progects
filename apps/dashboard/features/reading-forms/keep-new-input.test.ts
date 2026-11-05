// @vitest-environment jsdom
import { describe, expect, it } from "vitest";

import { clearUnchanged, snapshotFields } from "./keep-new-input";

function makeForm() {
  const form = document.createElement("form");
  form.innerHTML = `
    <input type="hidden" name="formId" value="t1" />
    <input name="label" />
    <input name="unit" />
    <select name="type"><option value="number">Number</option><option value="text">Text</option></select>
    <textarea name="options"></textarea>
    <input type="checkbox" name="required" />`;
  document.body.append(form);
  return form;
}

const field = <T extends Element>(form: HTMLFormElement, name: string) => form.elements.namedItem(name) as unknown as T;

describe("clearUnchanged", () => {
  it("clears the fields that still hold what was sent", () => {
    const form = makeForm();
    field<HTMLInputElement>(form, "label").value = "Voltage";
    field<HTMLInputElement>(form, "unit").value = "V";
    field<HTMLSelectElement>(form, "type").value = "text";
    field<HTMLTextAreaElement>(form, "options").value = "A\nB";
    field<HTMLInputElement>(form, "required").checked = true;
    const sent = snapshotFields(form);

    clearUnchanged(form, sent);

    expect(field<HTMLInputElement>(form, "label").value).toBe("");
    expect(field<HTMLInputElement>(form, "unit").value).toBe("");
    expect(field<HTMLSelectElement>(form, "type").value).toBe("number");
    expect(field<HTMLTextAreaElement>(form, "options").value).toBe("");
    expect(field<HTMLInputElement>(form, "required").checked).toBe(false);
  });

  it("keeps what was typed or chosen after sending", () => {
    const form = makeForm();
    field<HTMLInputElement>(form, "label").value = "Voltage";
    field<HTMLInputElement>(form, "unit").value = "V";
    const sent = snapshotFields(form);
    field<HTMLInputElement>(form, "label").value = "Breaker trips";
    field<HTMLSelectElement>(form, "type").value = "text";

    clearUnchanged(form, sent);

    expect(field<HTMLInputElement>(form, "label").value).toBe("Breaker trips");
    expect(field<HTMLSelectElement>(form, "type").value).toBe("text");
    expect(field<HTMLInputElement>(form, "unit").value).toBe("");
  });

  it("leaves hidden fields alone", () => {
    const form = makeForm();
    clearUnchanged(form, snapshotFields(form));

    expect(field<HTMLInputElement>(form, "formId").value).toBe("t1");
  });
});

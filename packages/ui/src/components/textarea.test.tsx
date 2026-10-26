import { render, screen } from "@testing-library/react";
import { describe, expect, it } from "vitest";

import { Textarea } from "./textarea";

describe("Textarea", () => {
  it("is a labelled multi-line text field", () => {
    render(
      <>
        <label htmlFor="notes">Description</label>
        <Textarea id="notes" defaultValue="Hero section" />
      </>,
    );

    expect(screen.getByRole("textbox", { name: "Description" })).toHaveValue("Hero section");
  });

  it("merges a custom className", () => {
    render(<Textarea aria-label="Notes" className="custom-class" />);
    expect(screen.getByRole("textbox", { name: "Notes" })).toHaveClass("custom-class");
  });
});

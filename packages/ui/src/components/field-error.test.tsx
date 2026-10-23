import { render, screen } from "@testing-library/react";
import { describe, expect, it } from "vitest";

import { FieldError } from "./field-error";

describe("FieldError", () => {
  it("announces the message as an alert", () => {
    render(<FieldError message="Project name is required" />);
    expect(screen.getByRole("alert")).toHaveTextContent("Project name is required");
  });

  it("renders nothing without a message", () => {
    const { container } = render(<FieldError message={undefined} />);
    expect(container).toBeEmptyDOMElement();
  });
});

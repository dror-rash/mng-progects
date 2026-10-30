import { render, screen } from "@testing-library/react";
import { describe, expect, it } from "vitest";

import { ConfirmByName } from "./confirm-by-name";

describe("ConfirmByName", () => {
  it("asks for the exact name in a labelled field", () => {
    render(<ConfirmByName name="Acme Team" action="Delete workspace" />);
    expect(screen.getByLabelText("Type the name to confirm")).toHaveAttribute("name", "confirmName");
    expect(screen.getByText("Acme Team")).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "Delete workspace" })).toBeEnabled();
  });

  it("shows an error tied to the field", () => {
    render(<ConfirmByName name="Acme Team" action="Delete workspace" error="Type the workspace name exactly to delete it" />);
    expect(screen.getByRole("alert")).toHaveTextContent("Type the workspace name exactly to delete it");
    expect(screen.getByLabelText("Type the name to confirm")).toHaveAttribute("aria-invalid", "true");
    expect(screen.getByLabelText("Type the name to confirm")).toHaveAccessibleDescription(/Type the workspace name exactly/);
  });

  it("disables the button while pending", () => {
    render(<ConfirmByName name="Acme Team" action="Delete workspace" pending />);
    expect(screen.getByRole("button", { name: "Delete workspace" })).toBeDisabled();
  });
});

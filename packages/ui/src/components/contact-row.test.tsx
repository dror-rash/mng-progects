import { render, screen, within } from "@testing-library/react";
import { describe, expect, it } from "vitest";

import { ContactRow } from "./contact-row";

describe("ContactRow", () => {
  it("shows the contact's name, role and ways to reach them", () => {
    render(
      <ul>
        <ContactRow name="Dana Levi" role="CMO" email="dana@acme.example" phone="+972 3-555-0101" />
      </ul>,
    );

    const row = screen.getByRole("listitem");
    expect(row).toHaveTextContent("Dana Levi");
    expect(row).toHaveTextContent("CMO");
    expect(within(row).getByRole("link", { name: "dana@acme.example" })).toHaveAttribute("href", "mailto:dana@acme.example");
    expect(within(row).getByRole("link", { name: "+972 3-555-0101" })).toHaveAttribute("href", "tel:+97235550101");
  });

  it("shows a Primary badge only for the primary contact", () => {
    render(
      <ul>
        <ContactRow name="Dana Levi" primary />
        <ContactRow name="Avi Cohen" />
      </ul>,
    );

    const [dana, avi] = screen.getAllByRole("listitem");
    expect(within(dana!).getByText("Primary")).toBeInTheDocument();
    expect(within(avi!).queryByText("Primary")).not.toBeInTheDocument();
  });

  it("renders the actions it is given", () => {
    render(
      <ul>
        <ContactRow name="Dana Levi" actions={<button type="button">Remove</button>} />
      </ul>,
    );

    expect(screen.getByRole("button", { name: "Remove" })).toBeInTheDocument();
  });
});

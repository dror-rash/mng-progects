import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { describe, expect, it } from "vitest";

import { Input } from "./input";

describe("Input", () => {
  it("accepts typed text", async () => {
    render(<Input aria-label="Email" />);

    await userEvent.type(screen.getByLabelText("Email"), "ada@example.com");

    expect(screen.getByLabelText("Email")).toHaveValue("ada@example.com");
  });

  it("cannot be edited when disabled", async () => {
    render(<Input aria-label="Email" disabled />);

    await userEvent.type(screen.getByLabelText("Email"), "ada");

    expect(screen.getByLabelText("Email")).toHaveValue("");
  });
});

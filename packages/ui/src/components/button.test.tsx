import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { describe, expect, it, vi } from "vitest";

import { Button } from "./button";

describe("Button", () => {
  it("calls onClick when pressed", async () => {
    const onClick = vi.fn();
    render(<Button onClick={onClick}>Save changes</Button>);

    await userEvent.click(screen.getByRole("button", { name: "Save changes" }));

    expect(onClick).toHaveBeenCalledTimes(1);
  });

  it("does not call onClick when disabled", async () => {
    const onClick = vi.fn();
    render(<Button disabled onClick={onClick}>Save changes</Button>);

    await userEvent.click(screen.getByRole("button", { name: "Save changes" }));

    expect(onClick).not.toHaveBeenCalled();
  });

  it("renders as a link when asChild is used", () => {
    render(<Button asChild><a href="/example">Open example</a></Button>);

    expect(screen.getByRole("link", { name: "Open example" })).toHaveAttribute("href", "/example");
  });
});

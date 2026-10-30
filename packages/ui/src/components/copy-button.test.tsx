import { act, render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { afterEach, describe, expect, it, vi } from "vitest";

import { CopyButton } from "./copy-button";

describe("CopyButton", () => {
  afterEach(() => {
    vi.useRealTimers();
  });

  it("copies its value and says Copied", async () => {
    const user = userEvent.setup();
    render(<CopyButton value="https://example.com/invite/abc" label="Copy invite link" />);

    await user.click(screen.getByRole("button", { name: "Copy invite link" }));

    expect(await navigator.clipboard.readText()).toBe("https://example.com/invite/abc");
    expect(screen.getByRole("button", { name: "Copied" })).toBeInTheDocument();
  });

  it("goes back to its label after a moment", async () => {
    vi.useFakeTimers({ shouldAdvanceTime: true });
    const user = userEvent.setup({ advanceTimers: vi.advanceTimersByTime });
    render(<CopyButton value="abc" />);

    await user.click(screen.getByRole("button", { name: "Copy" }));
    expect(screen.getByRole("button", { name: "Copied" })).toBeInTheDocument();

    act(() => {
      vi.advanceTimersByTime(2500);
    });
    expect(screen.getByRole("button", { name: "Copy" })).toBeInTheDocument();
  });

  it("says when copying failed", async () => {
    const user = userEvent.setup();
    render(<CopyButton value="abc" />);
    vi.spyOn(navigator.clipboard, "writeText").mockRejectedValueOnce(new Error("denied"));

    await user.click(screen.getByRole("button", { name: "Copy" }));

    expect(screen.getByRole("button", { name: "Copy failed" })).toBeInTheDocument();
  });
});

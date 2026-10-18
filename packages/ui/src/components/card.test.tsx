import { render, screen } from "@testing-library/react";
import { describe, expect, it } from "vitest";

import {
  Card,
  CardContent,
  CardDescription,
  CardFooter,
  CardHeader,
  CardTitle,
} from "./card";

describe("Card", () => {
  it("renders card subcomponents with correct hierarchy and text", () => {
    render(
      <Card>
        <CardHeader>
          <CardTitle>Project Alpha</CardTitle>
          <CardDescription>A key delivery milestone</CardDescription>
        </CardHeader>
        <CardContent>
          <p>Card body content</p>
        </CardContent>
        <CardFooter>
          <button type="button">View details</button>
        </CardFooter>
      </Card>,
    );

    expect(screen.getByRole("heading", { name: "Project Alpha" })).toBeInTheDocument();
    expect(screen.getByText("A key delivery milestone")).toBeInTheDocument();
    expect(screen.getByText("Card body content")).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "View details" })).toBeInTheDocument();
  });

  it("merges custom className on root card", () => {
    const { container } = render(<Card className="custom-card-class" />);
    expect(container.firstChild).toHaveClass("custom-card-class");
  });
});

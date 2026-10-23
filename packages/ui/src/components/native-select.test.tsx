import { render, screen } from "@testing-library/react";
import { describe, expect, it } from "vitest";

import { NativeSelect } from "./native-select";

describe("NativeSelect", () => {
  it("is a labelled select with the given value", () => {
    render(
      <>
        <label htmlFor="status">Status</label>
        <NativeSelect id="status" defaultValue="active">
          <option value="lead">Lead</option>
          <option value="active">Active</option>
        </NativeSelect>
      </>,
    );

    expect(screen.getByRole("combobox", { name: "Status" })).toHaveValue("active");
  });
});

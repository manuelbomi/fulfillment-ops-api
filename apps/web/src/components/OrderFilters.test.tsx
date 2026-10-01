import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { describe, expect, it, vi } from "vitest";
import { OrderFilters } from "./OrderFilters";

describe("OrderFilters", () => {
  it("calls onChange with the selected status and resets to page 1", async () => {
    const onChange = vi.fn();
    const user = userEvent.setup();
    render(<OrderFilters filters={{ page: 3, pageSize: 10 }} onChange={onChange} />);

    await user.selectOptions(screen.getByTestId("status-filter"), "shipped");

    expect(onChange).toHaveBeenCalledWith({ page: 1, pageSize: 10, status: "shipped" });
  });

  it("calls onChange with slaBreached true when breached-only is selected", async () => {
    const onChange = vi.fn();
    const user = userEvent.setup();
    render(<OrderFilters filters={{ page: 1, pageSize: 10 }} onChange={onChange} />);

    await user.selectOptions(screen.getByTestId("sla-filter"), "true");

    expect(onChange).toHaveBeenCalledWith({ page: 1, pageSize: 10, slaBreached: true });
  });
});

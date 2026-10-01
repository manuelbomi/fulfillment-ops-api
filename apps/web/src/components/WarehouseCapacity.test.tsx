import { render, screen } from "@testing-library/react";
import { describe, expect, it } from "vitest";
import { WarehouseCapacity } from "./WarehouseCapacity";
import type { WarehouseCapacity as WarehouseCapacityPoint } from "../types";

const warehouses: WarehouseCapacityPoint[] = [
  { id: 1, code: "WH-1", name: "Austin", capacityUnits: 500, activeOrders: 100, utilizationPct: 20 },
  { id: 2, code: "WH-2", name: "Reno", capacityUnits: 500, activeOrders: 450, utilizationPct: 90 },
  { id: 3, code: "WH-3", name: "Tampa", capacityUnits: 500, activeOrders: 600, utilizationPct: 120 },
];

describe("WarehouseCapacity", () => {
  it("shows a loading state", () => {
    render(<WarehouseCapacity warehouses={[]} loading error={null} />);
    expect(screen.getByRole("status")).toBeInTheDocument();
  });

  it("renders a progress bar per warehouse with the right status band", () => {
    render(<WarehouseCapacity warehouses={warehouses} loading={false} error={null} />);

    const bars = screen.getAllByRole("progressbar");
    expect(bars).toHaveLength(3);

    expect(screen.getByText("Austin")).toBeInTheDocument();
    expect(screen.getByText("20%")).toBeInTheDocument();
    expect(screen.getByText("90%")).toBeInTheDocument();
    expect(screen.getByText("120%")).toBeInTheDocument();
  });

  it("clamps the visual bar width at 100% even when over capacity", () => {
    render(<WarehouseCapacity warehouses={warehouses} loading={false} error={null} />);
    const overCapacityBar = screen.getByLabelText("Tampa utilization");
    expect(overCapacityBar).toHaveAttribute("aria-valuenow", "100");
  });
});

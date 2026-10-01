import { render, screen } from "@testing-library/react";
import { describe, expect, it } from "vitest";
import { OrdersTable } from "./OrdersTable";
import type { Order } from "../types";

const baseOrder: Order = {
  id: 1,
  orderNumber: "ORD-0001",
  warehouseId: 1,
  customerName: "Jane Doe",
  customerEmail: "jane@example.com",
  status: "shipped",
  orderDate: "2026-01-01T00:00:00.000Z",
  promisedShipDate: "2026-01-02T00:00:00.000Z",
  shippedAt: "2026-01-01T12:00:00.000Z",
  slaBreached: false,
  createdAt: "2026-01-01T00:00:00.000Z",
  updatedAt: "2026-01-01T00:00:00.000Z",
};

describe("OrdersTable", () => {
  it("shows a loading state", () => {
    render(<OrdersTable orders={[]} loading error={null} />);
    expect(screen.getByRole("status")).toHaveTextContent("Loading orders");
  });

  it("shows an error state", () => {
    render(<OrdersTable orders={[]} loading={false} error="network down" />);
    expect(screen.getByRole("alert")).toHaveTextContent("network down");
  });

  it("shows an empty state when there are no orders", () => {
    render(<OrdersTable orders={[]} loading={false} error={null} />);
    expect(screen.getByText(/no orders match/i)).toBeInTheDocument();
  });

  it("renders order rows with sla status", () => {
    const breached: Order = { ...baseOrder, id: 2, orderNumber: "ORD-0002", slaBreached: true };
    render(<OrdersTable orders={[baseOrder, breached]} loading={false} error={null} />);

    expect(screen.getByText("ORD-0001")).toBeInTheDocument();
    expect(screen.getByText("ORD-0002")).toBeInTheDocument();
    expect(screen.getByText("On track")).toBeInTheDocument();
    expect(screen.getByText("Breached")).toBeInTheDocument();
  });
});

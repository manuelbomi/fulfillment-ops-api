import { isSlaBreached } from "../../src/services/orders.service";

describe("isSlaBreached", () => {
  const promised = new Date("2024-01-10T00:00:00Z");

  it("is not breached when cancelled, regardless of dates", () => {
    expect(
      isSlaBreached(
        { status: "cancelled", shipped_at: null, promised_ship_date: promised },
        new Date("2024-02-01T00:00:00Z"),
      ),
    ).toBe(false);
  });

  it("is breached when shipped after the promised date", () => {
    expect(
      isSlaBreached({
        status: "shipped",
        shipped_at: new Date("2024-01-11T00:00:00Z"),
        promised_ship_date: promised,
      }),
    ).toBe(true);
  });

  it("is not breached when shipped on or before the promised date", () => {
    expect(
      isSlaBreached({
        status: "shipped",
        shipped_at: new Date("2024-01-09T00:00:00Z"),
        promised_ship_date: promised,
      }),
    ).toBe(false);
  });

  it("is breached when still unshipped past the promised date", () => {
    expect(
      isSlaBreached(
        { status: "processing", shipped_at: null, promised_ship_date: promised },
        new Date("2024-01-11T00:00:00Z"),
      ),
    ).toBe(true);
  });

  it("is not breached when unshipped but still within the promised window", () => {
    expect(
      isSlaBreached(
        { status: "processing", shipped_at: null, promised_ship_date: promised },
        new Date("2024-01-05T00:00:00Z"),
      ),
    ).toBe(false);
  });
});

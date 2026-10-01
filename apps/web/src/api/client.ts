import type {
  Order,
  OrderAtRisk,
  OrderListFilters,
  OrderVolumePoint,
  Paginated,
  WarehouseCapacity,
} from "../types";

const BASE_URL = import.meta.env.VITE_API_BASE_URL ?? "http://localhost:4000/api";

class ApiError extends Error {
  constructor(
    message: string,
    public status: number,
  ) {
    super(message);
  }
}

async function request<T>(path: string, init?: RequestInit): Promise<T> {
  const res = await fetch(`${BASE_URL}${path}`, {
    headers: { "Content-Type": "application/json" },
    ...init,
  });
  if (!res.ok) {
    const body = await res.json().catch(() => ({}));
    throw new ApiError(body?.error?.message ?? `Request failed with ${res.status}`, res.status);
  }
  if (res.status === 204) return undefined as T;
  return res.json() as Promise<T>;
}

function toQueryString(params: object): string {
  const search = new URLSearchParams();
  for (const [key, value] of Object.entries(params)) {
    if (value === undefined || value === null || value === "") continue;
    search.set(key, String(value));
  }
  const qs = search.toString();
  return qs ? `?${qs}` : "";
}

export const apiClient = {
  listOrders(filters: OrderListFilters): Promise<Paginated<Order>> {
    return request(`/orders${toQueryString(filters)}`);
  },

  listWarehouseCapacity(): Promise<WarehouseCapacity[]> {
    return request("/analytics/warehouse-capacity");
  },

  getOrderVolume(days = 90): Promise<OrderVolumePoint[]> {
    return request(`/analytics/order-volume${toQueryString({ days })}`);
  },

  getOrdersAtRisk(limit = 20): Promise<OrderAtRisk[]> {
    return request(`/analytics/orders-at-risk${toQueryString({ limit })}`);
  },
};

export { ApiError };

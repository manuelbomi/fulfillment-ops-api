export type OrderStatus =
  | "pending"
  | "processing"
  | "picked"
  | "packed"
  | "shipped"
  | "delivered"
  | "cancelled";

export interface Paginated<T> {
  items: T[];
  total: number;
  page: number;
  pageSize: number;
}

export interface Order {
  id: number;
  orderNumber: string;
  warehouseId: number;
  customerName: string;
  customerEmail: string;
  status: OrderStatus;
  orderDate: string;
  promisedShipDate: string;
  shippedAt: string | null;
  slaBreached: boolean;
  createdAt: string;
  updatedAt: string;
}

export interface OrderListFilters {
  page?: number;
  pageSize?: number;
  status?: OrderStatus;
  warehouseId?: number;
  slaBreached?: boolean;
}

export interface Warehouse {
  id: number;
  code: string;
  name: string;
  city: string;
  state: string;
  country: string;
  capacityUnits: number;
}

export interface WarehouseCapacity {
  id: number;
  code: string;
  name: string;
  capacityUnits: number;
  activeOrders: number;
  utilizationPct: number;
}

export interface OrderVolumePoint {
  day: string;
  orderCount: number;
  slaBreaches: number;
}

export interface OrderAtRisk {
  id: number;
  orderNumber: string;
  warehouseId: number;
  warehouseName: string;
  status: OrderStatus;
  promisedShipDate: string;
  orderDate: string;
  hoursUntilDue: number;
  riskLevel: "breached" | "critical" | "at_risk";
  warehouseUrgencyRank: number;
}

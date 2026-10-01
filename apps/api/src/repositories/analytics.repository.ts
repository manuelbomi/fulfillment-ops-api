import { query } from "../db/pool";

export interface OrderAtRiskRow {
  id: number;
  order_number: string;
  warehouse_id: number;
  warehouse_name: string;
  status: string;
  promised_ship_date: Date;
  order_date: Date;
  hours_until_due: string;
  risk_level: "breached" | "critical" | "at_risk";
  warehouse_urgency_rank: string;
}

export interface FulfillmentRateRow {
  warehouse_name: string;
  week_start: Date;
  shipped_orders: string;
  on_time_orders: string;
  fulfillment_rate_pct: string;
}

export interface SlowMovingSkuRow {
  sku_id: number;
  sku_code: string;
  name: string;
  category: string;
  units_sold: string;
  order_count: string;
  last_ordered_at: Date | null;
  category_avg_units_sold: string;
  slow_mover_rank: string;
}

export interface WarehouseCapacityRow {
  id: number;
  code: string;
  name: string;
  capacity_units: number;
  active_orders: string;
  utilization_pct: string | null;
}

export interface OrderVolumePointRow {
  day: Date;
  order_count: string;
  sla_breaches: string;
}

export const analyticsRepository = {
  /**
   * Orders not yet shipped whose promised ship date has already passed
   * ("breached") or is within the next 72 hours ("critical"/"at_risk").
   * Uses RANK() to surface, per warehouse, which orders need attention first.
   */
  async ordersAtRisk(limit: number): Promise<OrderAtRiskRow[]> {
    const result = await query<OrderAtRiskRow>(
      `
      WITH active_orders AS (
        SELECT
          o.id,
          o.order_number,
          o.warehouse_id,
          w.name AS warehouse_name,
          o.status,
          o.promised_ship_date,
          o.order_date,
          EXTRACT(EPOCH FROM (o.promised_ship_date - now())) / 3600 AS hours_until_due
        FROM orders o
        JOIN warehouses w ON w.id = o.warehouse_id
        WHERE o.status NOT IN ('shipped', 'delivered', 'cancelled')
      )
      SELECT
        id,
        order_number,
        warehouse_id,
        warehouse_name,
        status,
        promised_ship_date,
        order_date,
        ROUND(hours_until_due::numeric, 1) AS hours_until_due,
        CASE
          WHEN hours_until_due < 0 THEN 'breached'
          WHEN hours_until_due < 24 THEN 'critical'
          ELSE 'at_risk'
        END AS risk_level,
        RANK() OVER (PARTITION BY warehouse_id ORDER BY hours_until_due ASC) AS warehouse_urgency_rank
      FROM active_orders
      WHERE hours_until_due < 72
      ORDER BY hours_until_due ASC
      LIMIT $1;
      `,
      [limit],
    );
    return result.rows;
  },

  /**
   * Weekly on-time-shipment rate per warehouse: of the orders that shipped
   * in a given week, what fraction shipped on or before their promised
   * ship date.
   */
  async fulfillmentRateByWarehouse(weeks: number): Promise<FulfillmentRateRow[]> {
    const result = await query<FulfillmentRateRow>(
      `
      WITH shipped_orders AS (
        SELECT
          o.warehouse_id,
          date_trunc('week', o.order_date) AS week_start,
          (o.shipped_at IS NOT NULL AND o.shipped_at <= o.promised_ship_date) AS on_time
        FROM orders o
        WHERE o.status IN ('shipped', 'delivered')
          AND o.order_date >= now() - ($1 || ' weeks')::interval
      )
      SELECT
        w.name AS warehouse_name,
        so.week_start,
        COUNT(*) AS shipped_orders,
        SUM(CASE WHEN so.on_time THEN 1 ELSE 0 END) AS on_time_orders,
        ROUND(100.0 * SUM(CASE WHEN so.on_time THEN 1 ELSE 0 END) / COUNT(*), 1) AS fulfillment_rate_pct
      FROM shipped_orders so
      JOIN warehouses w ON w.id = so.warehouse_id
      GROUP BY w.name, so.week_start
      ORDER BY so.week_start ASC, w.name ASC;
      `,
      [weeks],
    );
    return result.rows;
  },

  /**
   * SKUs selling below their category's average unit volume, ranked from
   * slowest. Useful for flagging overstock / dead inventory candidates.
   */
  async slowMovingSkus(limit: number): Promise<SlowMovingSkuRow[]> {
    const result = await query<SlowMovingSkuRow>(
      `
      WITH sku_sales AS (
        SELECT
          s.id AS sku_id,
          s.sku_code,
          s.name,
          s.category,
          COALESCE(SUM(li.quantity), 0) AS units_sold,
          COUNT(DISTINCT li.order_id) AS order_count,
          MAX(o.order_date) AS last_ordered_at
        FROM skus s
        LEFT JOIN order_line_items li ON li.sku_id = s.id
        LEFT JOIN orders o ON o.id = li.order_id
        GROUP BY s.id, s.sku_code, s.name, s.category
      ),
      category_stats AS (
        SELECT category, AVG(units_sold) AS avg_units_sold_in_category
        FROM sku_sales
        GROUP BY category
      )
      SELECT
        ss.sku_id,
        ss.sku_code,
        ss.name,
        ss.category,
        ss.units_sold,
        ss.order_count,
        ss.last_ordered_at,
        ROUND(cs.avg_units_sold_in_category::numeric, 1) AS category_avg_units_sold,
        RANK() OVER (ORDER BY ss.units_sold ASC) AS slow_mover_rank
      FROM sku_sales ss
      JOIN category_stats cs ON cs.category = ss.category
      WHERE ss.units_sold < cs.avg_units_sold_in_category
      ORDER BY ss.units_sold ASC
      LIMIT $1;
      `,
      [limit],
    );
    return result.rows;
  },

  /** Current active-order load per warehouse against its stated capacity. */
  async warehouseCapacity(): Promise<WarehouseCapacityRow[]> {
    const result = await query<WarehouseCapacityRow>(
      `
      SELECT
        w.id,
        w.code,
        w.name,
        w.capacity_units,
        COUNT(o.id) FILTER (WHERE o.status NOT IN ('delivered', 'cancelled')) AS active_orders,
        ROUND(
          100.0 * COUNT(o.id) FILTER (WHERE o.status NOT IN ('delivered', 'cancelled')) / w.capacity_units,
          1
        ) AS utilization_pct
      FROM warehouses w
      LEFT JOIN orders o ON o.warehouse_id = w.id
      GROUP BY w.id, w.code, w.name, w.capacity_units
      ORDER BY utilization_pct DESC NULLS LAST;
      `,
    );
    return result.rows;
  },

  /** Daily order volume and SLA breach counts, for the dashboard chart. */
  async orderVolumeTimeseries(days: number): Promise<OrderVolumePointRow[]> {
    const result = await query<OrderVolumePointRow>(
      `
      SELECT
        date_trunc('day', order_date)::date AS day,
        COUNT(*) AS order_count,
        COUNT(*) FILTER (
          WHERE (shipped_at IS NOT NULL AND shipped_at > promised_ship_date)
             OR (shipped_at IS NULL AND status NOT IN ('cancelled') AND now() > promised_ship_date)
        ) AS sla_breaches
      FROM orders
      WHERE order_date >= now() - ($1 || ' days')::interval
      GROUP BY day
      ORDER BY day ASC;
      `,
      [days],
    );
    return result.rows;
  },
};

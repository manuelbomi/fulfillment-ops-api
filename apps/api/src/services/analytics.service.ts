import { analyticsRepository } from "../repositories/analytics.repository";

export const analyticsService = {
  async ordersAtRisk(limit = 50) {
    const rows = await analyticsRepository.ordersAtRisk(limit);
    return rows.map((r) => ({
      id: r.id,
      orderNumber: r.order_number,
      warehouseId: r.warehouse_id,
      warehouseName: r.warehouse_name,
      status: r.status,
      promisedShipDate: r.promised_ship_date,
      orderDate: r.order_date,
      hoursUntilDue: Number(r.hours_until_due),
      riskLevel: r.risk_level,
      warehouseUrgencyRank: Number(r.warehouse_urgency_rank),
    }));
  },

  async fulfillmentRateByWarehouse(weeks = 12) {
    const rows = await analyticsRepository.fulfillmentRateByWarehouse(weeks);
    return rows.map((r) => ({
      warehouseName: r.warehouse_name,
      weekStart: r.week_start,
      shippedOrders: Number(r.shipped_orders),
      onTimeOrders: Number(r.on_time_orders),
      fulfillmentRatePct: Number(r.fulfillment_rate_pct),
    }));
  },

  async slowMovingSkus(limit = 20) {
    const rows = await analyticsRepository.slowMovingSkus(limit);
    return rows.map((r) => ({
      skuId: r.sku_id,
      skuCode: r.sku_code,
      name: r.name,
      category: r.category,
      unitsSold: Number(r.units_sold),
      orderCount: Number(r.order_count),
      lastOrderedAt: r.last_ordered_at,
      categoryAvgUnitsSold: Number(r.category_avg_units_sold),
      slowMoverRank: Number(r.slow_mover_rank),
    }));
  },

  async warehouseCapacity() {
    const rows = await analyticsRepository.warehouseCapacity();
    return rows.map((r) => ({
      id: r.id,
      code: r.code,
      name: r.name,
      capacityUnits: r.capacity_units,
      activeOrders: Number(r.active_orders),
      utilizationPct: r.utilization_pct === null ? 0 : Number(r.utilization_pct),
    }));
  },

  async orderVolumeTimeseries(days = 90) {
    const rows = await analyticsRepository.orderVolumeTimeseries(days);
    return rows.map((r) => ({
      day: r.day,
      orderCount: Number(r.order_count),
      slaBreaches: Number(r.sla_breaches),
    }));
  },
};

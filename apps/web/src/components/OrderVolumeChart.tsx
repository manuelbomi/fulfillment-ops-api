import {
  Bar,
  CartesianGrid,
  ComposedChart,
  Legend,
  Line,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";
import type { OrderVolumePoint } from "../types";

interface Props {
  data: OrderVolumePoint[];
  loading: boolean;
  error: string | null;
}

function formatDay(value: string): string {
  return new Date(value).toLocaleDateString(undefined, { month: "short", day: "numeric" });
}

export function OrderVolumeChart({ data, loading, error }: Props) {
  if (loading) return <p role="status">Loading chart…</p>;
  if (error) return <p role="alert">Failed to load chart data: {error}</p>;
  if (data.length === 0) return <p>No order volume in this window.</p>;

  const chartData = data.map((point) => ({ ...point, day: formatDay(point.day) }));

  return (
    <div className="viz-root" style={{ width: "100%", height: 320 }}>
      <ResponsiveContainer>
        <ComposedChart data={chartData} margin={{ top: 8, right: 16, bottom: 0, left: 0 }}>
          <CartesianGrid vertical={false} stroke="var(--gridline)" />
          <XAxis
            dataKey="day"
            tick={{ fill: "var(--muted-ink)", fontSize: 12 }}
            axisLine={{ stroke: "var(--baseline)" }}
            tickLine={false}
            minTickGap={24}
          />
          <YAxis
            tick={{ fill: "var(--muted-ink)", fontSize: 12 }}
            axisLine={false}
            tickLine={false}
            width={36}
          />
          <Tooltip
            contentStyle={{
              background: "var(--surface-1)",
              border: "1px solid var(--border-ring)",
              borderRadius: 8,
              fontSize: 13,
            }}
          />
          <Legend wrapperStyle={{ fontSize: 13, color: "var(--text-secondary)" }} />
          <Bar
            dataKey="orderCount"
            name="Total orders"
            fill="var(--series-1)"
            radius={[3, 3, 0, 0]}
            barSize={10}
          />
          <Line
            dataKey="slaBreaches"
            name="SLA breaches"
            stroke="var(--status-critical)"
            strokeWidth={2}
            dot={false}
          />
        </ComposedChart>
      </ResponsiveContainer>
    </div>
  );
}

import { useMemo } from "react";
import { format, parseISO, startOfMonth } from "date-fns";
import {
  ResponsiveContainer,
  BarChart,
  Bar,
  LineChart,
  Line,
  XAxis,
  YAxis,
  Tooltip,
  CartesianGrid,
} from "recharts";
import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
  SheetDescription,
} from "@/components/ui/sheet";
import { Badge } from "@/components/ui/badge";
import { currency, currencyPrecise, type Order } from "@/lib/orders";

export type DrillDimension =
  | "category"
  | "region"
  | "segment"
  | "channel"
  | "product"
  | "month";

interface DrillDownSheetProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  dimension: DrillDimension | null;
  value: string | null;
  orders: Order[];
}

const DIMENSION_LABEL: Record<DrillDimension, string> = {
  category: "Category",
  region: "Region",
  segment: "Segment",
  channel: "Channel",
  product: "Product",
  month: "Month",
};

function matches(o: Order, dim: DrillDimension, val: string): boolean {
  switch (dim) {
    case "category":
      return o.category === val;
    case "region":
      return o.region === val;
    case "segment":
      return o.segment === val;
    case "channel":
      return o.channel === val;
    case "product":
      return o.product === val;
    case "month":
      return format(startOfMonth(parseISO(o.date)), "yyyy-MM") === val;
  }
}

const ACCENT = "var(--color-primary)";

export function DrillDownSheet({
  open,
  onOpenChange,
  dimension,
  value,
  orders,
}: DrillDownSheetProps) {
  const slice = useMemo(() => {
    if (!dimension || !value) return [];
    return orders.filter((o) => matches(o, dimension, value));
  }, [orders, dimension, value]);

  const kpis = useMemo(() => {
    const revenue = slice.reduce((s, o) => s + o.netRevenue, 0);
    const profit = slice.reduce((s, o) => s + o.grossProfit, 0);
    const count = slice.length;
    const aov = count ? revenue / count : 0;
    const totalRev = orders.reduce((s, o) => s + o.netRevenue, 0);
    const share = totalRev ? (revenue / totalRev) * 100 : 0;
    return { revenue, profit, count, aov, share };
  }, [slice, orders]);

  const byMonth = useMemo(() => {
    const map = new Map<string, number>();
    for (const o of slice) {
      const key = format(startOfMonth(parseISO(o.date)), "yyyy-MM");
      map.set(key, (map.get(key) ?? 0) + o.netRevenue);
    }
    return Array.from(map.entries())
      .sort(([a], [b]) => a.localeCompare(b))
      .map(([k, v]) => ({
        month: format(parseISO(`${k}-01`), "MMM yy"),
        revenue: Math.round(v),
      }));
  }, [slice]);

  const secondaryDim: keyof Order =
    dimension === "product" || dimension === "category" ? "region" : "product";

  const breakdown = useMemo(() => {
    const map = new Map<string, number>();
    for (const o of slice) {
      const k = String(o[secondaryDim]);
      map.set(k, (map.get(k) ?? 0) + o.netRevenue);
    }
    return Array.from(map.entries())
      .map(([name, revenue]) => ({ name, revenue: Math.round(revenue) }))
      .sort((a, b) => b.revenue - a.revenue)
      .slice(0, 8);
  }, [slice, secondaryDim]);

  const topOrders = useMemo(
    () => [...slice].sort((a, b) => b.netRevenue - a.netRevenue).slice(0, 10),
    [slice],
  );

  const tooltipStyle = {
    backgroundColor: "var(--color-popover)",
    border: "1px solid var(--color-border)",
    borderRadius: "var(--radius-md)",
    fontSize: "0.8rem",
  };

  const displayValue =
    dimension === "month" && value
      ? format(parseISO(`${value}-01`), "MMMM yyyy")
      : value;

  return (
    <Sheet open={open} onOpenChange={onOpenChange}>
      <SheetContent side="right" className="w-full overflow-y-auto sm:max-w-xl">
        <SheetHeader>
          <div className="flex items-center gap-2">
            <Badge variant="secondary" className="font-normal">
              {dimension ? DIMENSION_LABEL[dimension] : ""}
            </Badge>
          </div>
          <SheetTitle className="font-display text-2xl">{displayValue}</SheetTitle>
          <SheetDescription>
            Drill-down for the current filters & date range.
          </SheetDescription>
        </SheetHeader>

        <div className="mt-6 flex flex-col gap-6">
          {/* KPI grid */}
          <div className="grid grid-cols-2 gap-3">
            <div className="rounded-lg border p-3">
              <p className="text-xs uppercase tracking-wide text-muted-foreground">
                Revenue
              </p>
              <p className="font-display text-xl font-semibold tabular-nums">
                {currency(kpis.revenue)}
              </p>
              <p className="mt-0.5 text-xs text-muted-foreground tabular-nums">
                {kpis.share.toFixed(1)}% of total
              </p>
            </div>
            <div className="rounded-lg border p-3">
              <p className="text-xs uppercase tracking-wide text-muted-foreground">
                Orders
              </p>
              <p className="font-display text-xl font-semibold tabular-nums">
                {kpis.count.toLocaleString()}
              </p>
            </div>
            <div className="rounded-lg border p-3">
              <p className="text-xs uppercase tracking-wide text-muted-foreground">
                Avg Order Value
              </p>
              <p className="font-display text-xl font-semibold tabular-nums">
                {currency(kpis.aov)}
              </p>
            </div>
            <div className="rounded-lg border p-3">
              <p className="text-xs uppercase tracking-wide text-muted-foreground">
                Gross Profit
              </p>
              <p className="font-display text-xl font-semibold tabular-nums">
                {currency(kpis.profit)}
              </p>
            </div>
          </div>

          {/* Trend */}
          {byMonth.length > 1 && (
            <div>
              <h4 className="mb-2 text-xs font-medium uppercase tracking-wide text-muted-foreground">
                Revenue trend
              </h4>
              <div className="h-40 rounded-lg border p-2">
                <ResponsiveContainer width="100%" height="100%">
                  <LineChart data={byMonth} margin={{ top: 8, right: 12, bottom: 4, left: 0 }}>
                    <CartesianGrid stroke="var(--color-border)" strokeDasharray="3 3" vertical={false} />
                    <XAxis dataKey="month" tick={{ fontSize: 10, fill: "var(--color-muted-foreground)" }} tickLine={false} axisLine={false} />
                    <YAxis tick={{ fontSize: 10, fill: "var(--color-muted-foreground)" }} tickLine={false} axisLine={false} tickFormatter={(v) => `$${(v / 1000).toFixed(0)}k`} />
                    <Tooltip contentStyle={tooltipStyle} formatter={(v: number) => [currency(v), "Revenue"]} />
                    <Line type="monotone" dataKey="revenue" stroke={ACCENT} strokeWidth={2} dot={{ fill: ACCENT, r: 3 }} />
                  </LineChart>
                </ResponsiveContainer>
              </div>
            </div>
          )}

          {/* Secondary breakdown */}
          {breakdown.length > 0 && (
            <div>
              <h4 className="mb-2 text-xs font-medium uppercase tracking-wide text-muted-foreground">
                Top {secondaryDim === "product" ? "products" : "regions"}
              </h4>
              <div className="rounded-lg border p-2" style={{ height: Math.max(160, breakdown.length * 28 + 20) }}>
                <ResponsiveContainer width="100%" height="100%">
                  <BarChart data={breakdown} layout="vertical" margin={{ top: 4, right: 12, bottom: 4, left: 8 }}>
                    <CartesianGrid stroke="var(--color-border)" strokeDasharray="3 3" horizontal={false} />
                    <XAxis type="number" tick={{ fontSize: 10, fill: "var(--color-muted-foreground)" }} tickLine={false} axisLine={false} tickFormatter={(v) => `$${(v / 1000).toFixed(0)}k`} />
                    <YAxis type="category" dataKey="name" width={130} tick={{ fontSize: 10, fill: "var(--color-muted-foreground)" }} tickLine={false} axisLine={false} />
                    <Tooltip contentStyle={tooltipStyle} cursor={{ fill: "var(--color-muted)" }} formatter={(v: number) => [currency(v), "Revenue"]} />
                    <Bar dataKey="revenue" fill={ACCENT} radius={[0, 4, 4, 0]} />
                  </BarChart>
                </ResponsiveContainer>
              </div>
            </div>
          )}

          {/* Top orders */}
          <div>
            <h4 className="mb-2 text-xs font-medium uppercase tracking-wide text-muted-foreground">
              Top orders
            </h4>
            {topOrders.length === 0 ? (
              <p className="text-sm text-muted-foreground">No orders in this slice.</p>
            ) : (
              <ul className="flex flex-col divide-y rounded-lg border">
                {topOrders.map((o) => (
                  <li key={o.orderId} className="flex items-center gap-3 px-3 py-2 text-sm">
                    <div className="flex-1 min-w-0">
                      <p className="truncate font-medium">{o.product}</p>
                      <p className="truncate text-xs text-muted-foreground">
                        {o.orderId} · {o.date} · {o.city}, {o.country}
                      </p>
                    </div>
                    <span className="font-medium tabular-nums">
                      {currencyPrecise(o.netRevenue)}
                    </span>
                  </li>
                ))}
              </ul>
            )}
          </div>
        </div>
      </SheetContent>
    </Sheet>
  );
}

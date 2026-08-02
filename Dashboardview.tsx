import { useMemo, useState, type SVGProps } from "react";
import { format, parseISO, subDays, differenceInDays, startOfMonth } from "date-fns";
import {
  ResponsiveContainer,
  LineChart,
  Line,
  BarChart,
  Bar,
  PieChart,
  Pie,
  Cell,
  XAxis,
  YAxis,
  Tooltip,
  CartesianGrid,
  Legend,
} from "recharts";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { DrillDownSheet, type DrillDimension } from "./DrillDownSheet";
import { Calendar } from "@/components/ui/calendar";
import { cn } from "@/lib/utils";
import { applyFilters, currency, type Order, type OrderFilters } from "@/lib/orders";

interface DashboardViewProps {
  allOrders: Order[];
  filters: OrderFilters;
  dateFrom: string;
  dateTo: string;
  onDateChange: (from: string, to: string) => void;
}

// Consistent palette: one accent + neutrals
const ACCENT = "var(--color-primary)";
const NEUTRALS = [
  "var(--color-chart-1)",
  "var(--color-chart-2)",
  "var(--color-chart-3)",
  "var(--color-chart-4)",
  "var(--color-chart-5)",
];

function inRange(date: string, from: string, to: string) {
  return date >= from && date <= to;
}

function KPICard({
  label,
  value,
  delta,
}: {
  label: string;
  value: string;
  delta: number | null;
}) {
  const deltaColor =
    delta == null
      ? "text-muted-foreground"
      : delta >= 0
        ? "text-emerald-600 dark:text-emerald-500"
        : "text-red-600 dark:text-red-500";
  const deltaText =
    delta == null
      ? "—"
      : `${delta >= 0 ? "+" : ""}${delta.toFixed(1)}% vs previous period`;
  return (
    <Card>
      <CardHeader className="pb-2">
        <CardTitle className="text-xs font-medium uppercase tracking-wide text-muted-foreground">
          {label}
        </CardTitle>
      </CardHeader>
      <CardContent>
        <p className="font-display text-3xl font-semibold tabular-nums">{value}</p>
        <p className={cn("mt-1 text-xs tabular-nums", deltaColor)}>{deltaText}</p>
      </CardContent>
    </Card>
  );
}

function DatePicker({
  value,
  onChange,
  label,
}: {
  value: string;
  onChange: (iso: string) => void;
  label: string;
}) {
  const d = parseISO(value);
  return (
    <Popover>
      <PopoverTrigger asChild>
        <Button variant="outline" size="sm" className="justify-start gap-2 font-normal">
          <CalendarIcon className="h-3.5 w-3.5" />
          <span className="text-xs text-muted-foreground">{label}:</span>
          <span className="tabular-nums">{format(d, "MMM d, yyyy")}</span>
        </Button>
      </PopoverTrigger>
      <PopoverContent className="w-auto p-0" align="start">
        <Calendar
          mode="single"
          selected={d}
          onSelect={(sel) => sel && onChange(format(sel, "yyyy-MM-dd"))}
          initialFocus
          className={cn("p-3 pointer-events-auto")}
        />
      </PopoverContent>
    </Popover>
  );
}

export function DashboardView({
  allOrders,
  filters,
  dateFrom,
  dateTo,
  onDateChange,
}: DashboardViewProps) {
  const [drill, setDrill] = useState<{ dimension: DrillDimension; value: string } | null>(null);
  const openDrill = (dimension: DrillDimension, value: string) =>
    setDrill({ dimension, value });

  const facetFiltered = useMemo(
    () => applyFilters(allOrders, filters),
    [allOrders, filters],
  );

  const current = useMemo(
    () => facetFiltered.filter((o) => inRange(o.date, dateFrom, dateTo)),
    [facetFiltered, dateFrom, dateTo],
  );

  const previous = useMemo(() => {
    const days = Math.max(1, differenceInDays(parseISO(dateTo), parseISO(dateFrom)) + 1);
    const prevTo = format(subDays(parseISO(dateFrom), 1), "yyyy-MM-dd");
    const prevFrom = format(subDays(parseISO(dateFrom), days), "yyyy-MM-dd");
    return facetFiltered.filter((o) => inRange(o.date, prevFrom, prevTo));
  }, [facetFiltered, dateFrom, dateTo]);

  const kpis = useMemo(() => {
    const sum = (list: Order[]) => list.reduce((s, o) => s + o.netRevenue, 0);
    const rev = sum(current);
    const orders = current.length;
    const aov = orders ? rev / orders : 0;
    const uniqCities = new Set(current.map((o) => `${o.country}·${o.city}`)).size;

    const prevRev = sum(previous);
    const prevOrders = previous.length;
    const prevAov = prevOrders ? prevRev / prevOrders : 0;
    const prevCities = new Set(previous.map((o) => `${o.country}·${o.city}`)).size;

    const pct = (cur: number, prev: number) =>
      prev === 0 ? (cur === 0 ? 0 : null) : ((cur - prev) / prev) * 100;

    return {
      rev,
      orders,
      aov,
      uniqCities,
      dRev: pct(rev, prevRev),
      dOrders: pct(orders, prevOrders),
      dAov: pct(aov, prevAov),
      dCities: pct(uniqCities, prevCities),
    };
  }, [current, previous]);

  const revenueByMonth = useMemo(() => {
    const map = new Map<string, number>();
    for (const o of current) {
      const key = format(startOfMonth(parseISO(o.date)), "yyyy-MM");
      map.set(key, (map.get(key) ?? 0) + o.netRevenue);
    }
    return Array.from(map.entries())
      .sort(([a], [b]) => a.localeCompare(b))
      .map(([k, v]) => ({
        monthKey: k,
        month: format(parseISO(`${k}-01`), "MMM yyyy"),
        revenue: Math.round(v),
      }));
  }, [current]);

  const revenueByCategory = useMemo(() => {
    const map = new Map<string, number>();
    for (const o of current) map.set(o.category, (map.get(o.category) ?? 0) + o.netRevenue);
    return Array.from(map.entries())
      .map(([name, revenue]) => ({ name, revenue: Math.round(revenue) }))
      .sort((a, b) => b.revenue - a.revenue);
  }, [current]);

  const channelMix = useMemo(() => {
    const map = new Map<string, number>();
    for (const o of current) map.set(o.channel, (map.get(o.channel) ?? 0) + o.netRevenue);
    return Array.from(map.entries()).map(([name, value]) => ({
      name,
      value: Math.round(value),
    }));
  }, [current]);

  const segmentMix = useMemo(() => {
    const map = new Map<string, number>();
    for (const o of current) map.set(o.segment, (map.get(o.segment) ?? 0) + o.netRevenue);
    return Array.from(map.entries()).map(([name, value]) => ({
      name,
      value: Math.round(value),
    }));
  }, [current]);

  const topProducts = useMemo(() => {
    const map = new Map<string, number>();
    for (const o of current) map.set(o.product, (map.get(o.product) ?? 0) + o.netRevenue);
    return Array.from(map.entries())
      .map(([name, revenue]) => ({ name, revenue }))
      .sort((a, b) => b.revenue - a.revenue)
      .slice(0, 5);
  }, [current]);

  const revenueByRegion = useMemo(() => {
    const map = new Map<string, number>();
    for (const o of current) map.set(o.region, (map.get(o.region) ?? 0) + o.netRevenue);
    return Array.from(map.entries())
      .map(([name, revenue]) => ({ name, revenue: Math.round(revenue) }))
      .sort((a, b) => b.revenue - a.revenue);
  }, [current]);

  const tooltipStyle = {
    backgroundColor: "var(--color-popover)",
    border: "1px solid var(--color-border)",
    borderRadius: "var(--radius-md)",
    fontSize: "0.8rem",
  };

  const presets: { label: string; days: number }[] = [
    { label: "30d", days: 30 },
    { label: "90d", days: 90 },
    { label: "1y", days: 365 },
  ];

  return (
    <div className="flex flex-col gap-5">
      {/* Date range header */}
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h1 className="text-2xl font-semibold tracking-tight">Dashboard</h1>
          <p className="mt-1 text-sm text-muted-foreground">
            {current.length} orders in period · filtered view
          </p>
        </div>
        <div className="flex flex-wrap items-center gap-2">
          <DatePicker
            value={dateFrom}
            label="From"
            onChange={(v) => onDateChange(v, dateTo)}
          />
          <DatePicker value={dateTo} label="To" onChange={(v) => onDateChange(dateFrom, v)} />
          <div className="flex gap-1">
            {presets.map((p) => (
              <Button
                key={p.label}
                variant="ghost"
                size="sm"
                onClick={() => {
                  const to = dateTo;
                  const from = format(subDays(parseISO(to), p.days - 1), "yyyy-MM-dd");
                  onDateChange(from, to);
                }}
              >
                {p.label}
              </Button>
            ))}
          </div>
        </div>
      </div>

      {/* KPI row */}
      <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-4">
        <KPICard label="Total Revenue" value={currency(kpis.rev)} delta={kpis.dRev} />
        <KPICard label="Total Orders" value={kpis.orders.toLocaleString()} delta={kpis.dOrders} />
        <KPICard label="Avg Order Value" value={currency(kpis.aov)} delta={kpis.dAov} />
        <KPICard
          label="Unique Customers"
          value={kpis.uniqCities.toLocaleString()}
          delta={kpis.dCities}
        />
      </div>

      {/* Charts row */}
      <div className="grid grid-cols-1 gap-3 lg:grid-cols-2">
        <Card>
          <CardHeader>
            <CardTitle className="text-sm font-medium">Revenue over time</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="h-64">
              <ResponsiveContainer width="100%" height="100%">
                <LineChart
                  data={revenueByMonth}
                  margin={{ top: 8, right: 12, bottom: 4, left: 0 }}
                  onClick={(e) => {
                    const p = e?.activePayload?.[0]?.payload;
                    if (p?.monthKey) openDrill("month", p.monthKey);
                  }}
                >
                  <CartesianGrid stroke="var(--color-border)" strokeDasharray="3 3" vertical={false} />
                  <XAxis dataKey="month" tick={{ fontSize: 11, fill: "var(--color-muted-foreground)" }} tickLine={false} axisLine={false} />
                  <YAxis
                    tick={{ fontSize: 11, fill: "var(--color-muted-foreground)" }}
                    tickLine={false}
                    axisLine={false}
                    tickFormatter={(v) => `$${(v / 1000).toFixed(0)}k`}
                  />
                  <Tooltip
                    contentStyle={tooltipStyle}
                    formatter={(v: number) => [currency(v), "Revenue"]}
                  />
                  <Line
                    type="monotone"
                    dataKey="revenue"
                    stroke={ACCENT}
                    strokeWidth={2}
                    dot={{ fill: ACCENT, r: 3 }}
                    activeDot={{ r: 6, style: { cursor: "pointer" } }}
                  />
                </LineChart>
              </ResponsiveContainer>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="text-sm font-medium">Revenue by category</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="h-64">
              <ResponsiveContainer width="100%" height="100%">
                <BarChart
                  data={revenueByCategory}
                  layout="vertical"
                  margin={{ top: 4, right: 16, bottom: 4, left: 8 }}
                >
                  <CartesianGrid stroke="var(--color-border)" strokeDasharray="3 3" horizontal={false} />
                  <XAxis
                    type="number"
                    tick={{ fontSize: 11, fill: "var(--color-muted-foreground)" }}
                    tickLine={false}
                    axisLine={false}
                    tickFormatter={(v) => `$${(v / 1000).toFixed(0)}k`}
                  />
                  <YAxis
                    type="category"
                    dataKey="name"
                    width={120}
                    tick={{ fontSize: 11, fill: "var(--color-muted-foreground)" }}
                    tickLine={false}
                    axisLine={false}
                  />
                  <Tooltip
                    contentStyle={tooltipStyle}
                    cursor={{ fill: "var(--color-muted)" }}
                    formatter={(v: number) => [currency(v), "Revenue"]}
                  />
                  <Bar
                    dataKey="revenue"
                    fill={ACCENT}
                    radius={[0, 4, 4, 0]}
                    onClick={(d: { name: string }) => openDrill("category", d.name)}
                    style={{ cursor: "pointer" }}
                  />
                </BarChart>
              </ResponsiveContainer>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Breakdown row */}
      <div className="grid grid-cols-1 gap-3 lg:grid-cols-3">
        <Card>
          <CardHeader>
            <CardTitle className="text-sm font-medium">Channel mix</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="h-56">
              <ResponsiveContainer width="100%" height="100%">
                <PieChart>
                  <Pie
                    data={channelMix}
                    dataKey="value"
                    nameKey="name"
                    innerRadius={40}
                    outerRadius={70}
                    paddingAngle={2}
                    onClick={(d: { name: string }) => openDrill("channel", d.name)}
                    style={{ cursor: "pointer" }}
                  >
                    {channelMix.map((_, i) => (
                      <Cell key={i} fill={NEUTRALS[i % NEUTRALS.length]} />
                    ))}
                  </Pie>
                  <Tooltip
                    contentStyle={tooltipStyle}
                    formatter={(v: number) => currency(v)}
                  />
                  <Legend wrapperStyle={{ fontSize: 11 }} />
                </PieChart>
              </ResponsiveContainer>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="text-sm font-medium">Segment mix</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="h-56">
              <ResponsiveContainer width="100%" height="100%">
                <PieChart>
                  <Pie
                    data={segmentMix}
                    dataKey="value"
                    nameKey="name"
                    innerRadius={40}
                    outerRadius={70}
                    paddingAngle={2}
                    onClick={(d: { name: string }) => openDrill("segment", d.name)}
                    style={{ cursor: "pointer" }}
                  >
                    {segmentMix.map((_, i) => (
                      <Cell key={i} fill={NEUTRALS[i % NEUTRALS.length]} />
                    ))}
                  </Pie>
                  <Tooltip
                    contentStyle={tooltipStyle}
                    formatter={(v: number) => currency(v)}
                  />
                  <Legend wrapperStyle={{ fontSize: 11 }} />
                </PieChart>
              </ResponsiveContainer>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="text-sm font-medium">Top 5 products</CardTitle>
          </CardHeader>
          <CardContent>
            <ol className="flex flex-col gap-2">
              {topProducts.length === 0 && (
                <li className="text-sm text-muted-foreground">No data in this period.</li>
              )}
              {topProducts.map((p, i) => (
                <li key={p.name}>
                  <button
                    type="button"
                    onClick={() => openDrill("product", p.name)}
                    className="flex w-full items-center gap-3 rounded-md px-1.5 py-1 text-left text-sm hover:bg-muted"
                  >
                    <span className="flex h-6 w-6 flex-shrink-0 items-center justify-center rounded-md bg-muted text-xs font-semibold tabular-nums text-muted-foreground">
                      {i + 1}
                    </span>
                    <span className="flex-1 truncate">{p.name}</span>
                    <span className="font-medium tabular-nums">{currency(p.revenue)}</span>
                  </button>
                </li>
              ))}
            </ol>
          </CardContent>
        </Card>
      </div>

      {/* Geographic */}
      <Card>
        <CardHeader>
          <CardTitle className="text-sm font-medium">Revenue by region</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="h-72">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={revenueByRegion} margin={{ top: 8, right: 16, bottom: 24, left: 8 }}>
                <CartesianGrid stroke="var(--color-border)" strokeDasharray="3 3" vertical={false} />
                <XAxis
                  dataKey="name"
                  tick={{ fontSize: 11, fill: "var(--color-muted-foreground)" }}
                  tickLine={false}
                  axisLine={false}
                />
                <YAxis
                  tick={{ fontSize: 11, fill: "var(--color-muted-foreground)" }}
                  tickLine={false}
                  axisLine={false}
                  tickFormatter={(v) => `$${(v / 1000).toFixed(0)}k`}
                />
                <Tooltip
                  contentStyle={tooltipStyle}
                  cursor={{ fill: "var(--color-muted)" }}
                  formatter={(v: number) => [currency(v), "Revenue"]}
                />
                <Bar
                  dataKey="revenue"
                  fill={ACCENT}
                  radius={[4, 4, 0, 0]}
                  onClick={(d: { name: string }) => openDrill("region", d.name)}
                  style={{ cursor: "pointer" }}
                />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </CardContent>
      </Card>

      <DrillDownSheet
        open={drill !== null}
        onOpenChange={(o) => !o && setDrill(null)}
        dimension={drill?.dimension ?? null}
        value={drill?.value ?? null}
        orders={current}
      />
    </div>
  );
}

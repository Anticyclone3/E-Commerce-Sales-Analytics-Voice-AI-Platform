import { useMemo } from "react";
import { format, subDays, parseISO } from "date-fns";
import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { zodValidator, fallback } from "@tanstack/zod-adapter";
import { z } from "zod";
import {
  Search,
  Star,
  ArrowUpDown,
  LayoutGrid,
  BarChart3,
  Download,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { SidebarProvider, SidebarTrigger } from "@/components/ui/sidebar";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { DirectorySidebar } from "@/components/directory/DirectorySidebar";
import { DashboardView } from "@/components/directory/DashboardView";
import { VoiceNarrator } from "@/components/VoiceNarrator";
import {
  currency,
  applyFilters,
  computeFacets,
  computeFacetCounts,
  computeDateRange,
  type Order,
} from "@/lib/orders";
import { fetchOrders } from "@/lib/orders.functions";

function summarizeOrders(list: Order[]): string {
  if (list.length === 0) return "No orders in the current filtered view.";
  const revenue = list.reduce((s, o) => s + o.netRevenue, 0);
  const profit = list.reduce((s, o) => s + o.grossProfit, 0);
  const units = list.reduce((s, o) => s + o.qty, 0);
  const returned = list.filter((o) => o.returned === "Yes").length;
  const rated = list.filter((o) => o.rating != null);
  const avgRating = rated.length
    ? (rated.reduce((s, o) => s + (o.rating ?? 0), 0) / rated.length).toFixed(2)
    : "n/a";
  const dates = list.map((o) => o.date).sort();

  const groupSum = (key: keyof Order) => {
    const map = new Map<string, { revenue: number; count: number }>();
    for (const o of list) {
      const k = String(o[key]);
      const cur = map.get(k) ?? { revenue: 0, count: 0 };
      cur.revenue += o.netRevenue;
      cur.count += 1;
      map.set(k, cur);
    }
    return Array.from(map.entries())
      .sort((a, b) => b[1].revenue - a[1].revenue)
      .map(([k, v]) => `${k}: $${Math.round(v.revenue).toLocaleString()} (${v.count})`);
  };

  const top = (arr: string[], n: number) => arr.slice(0, n).join("; ");

  return [
    `Rows: ${list.length}. Units: ${units}. Returned: ${returned}.`,
    `Date range: ${dates[0]} to ${dates[dates.length - 1]}.`,
    `Net revenue: $${Math.round(revenue).toLocaleString()}. Gross profit: $${Math.round(profit).toLocaleString()}. Avg rating: ${avgRating}.`,
    `Categories — ${top(groupSum("category"), 8)}.`,
    `Regions — ${top(groupSum("region"), 8)}.`,
    `Countries — ${top(groupSum("country"), 8)}.`,
    `Segments — ${top(groupSum("segment"), 6)}.`,
    `Channels — ${top(groupSum("channel"), 6)}.`,
    `Payments — ${top(groupSum("payment"), 6)}.`,
    `Top products — ${top(groupSum("product"), 8)}.`,
  ].join("\n");
}
import logoAsset from "@/assets/career-principles-logo.png.asset.json";

const searchSchema = z.object({
  view: fallback(z.enum(["directory", "dashboard"]), "directory").default("directory"),
  q: fallback(z.string(), "").default(""),
  category: fallback(z.string().array(), []).default([]),
  region: fallback(z.string().array(), []).default([]),
  segment: fallback(z.string().array(), []).default([]),
  channel: fallback(z.string().array(), []).default([]),
  payment: fallback(z.string().array(), []).default([]),
  sort: fallback(z.string(), "date-desc").default("date-desc"),
  from: fallback(z.string(), "").default(""),
  to: fallback(z.string(), "").default(""),
});

type DirectorySearch = z.infer<typeof searchSchema>;

export const Route = createFileRoute("/")({
  validateSearch: zodValidator(searchSchema),
  head: () => ({
    meta: [
      { title: "Sales Directory & Dashboard — E-commerce Orders" },
      {
        name: "description",
        content:
          "Searchable directory and analytics dashboard of e-commerce orders. Filter by category, region, segment, channel and payment.",
      },
      { property: "og:title", content: "Sales Directory & Dashboard — E-commerce Orders" },
      {
        property: "og:description",
        content: "Searchable directory and analytics dashboard of e-commerce orders. Filter by category, region, segment, channel and payment.",
      },
    ],
  }),
  component: DirectoryPage,
});

const SORT_OPTIONS = [
  { value: "date-desc", label: "Newest first" },
  { value: "date-asc", label: "Oldest first" },
  { value: "revenue-desc", label: "Revenue: high to low" },
  { value: "revenue-asc", label: "Revenue: low to high" },
  { value: "profit-desc", label: "Profit: high to low" },
  { value: "rating-desc", label: "Rating: high to low" },
] as const;

function sortOrders(list: Order[], sort: string): Order[] {
  const sorted = [...list];
  switch (sort) {
    case "date-asc":
      return sorted.sort((a, b) => a.date.localeCompare(b.date));
    case "revenue-desc":
      return sorted.sort((a, b) => b.netRevenue - a.netRevenue);
    case "revenue-asc":
      return sorted.sort((a, b) => a.netRevenue - b.netRevenue);
    case "profit-desc":
      return sorted.sort((a, b) => b.grossProfit - a.grossProfit);
    case "rating-desc":
      return sorted.sort((a, b) => (b.rating ?? 0) - (a.rating ?? 0));
    default:
      return sorted.sort((a, b) => b.date.localeCompare(a.date));
  }
}

type Facet = "category" | "region" | "segment" | "channel" | "payment";

const CSV_COLUMNS: { header: string; get: (o: Order) => string | number | null }[] = [
  { header: "Order ID", get: (o) => o.orderId },
  { header: "Date", get: (o) => o.date },
  { header: "Product", get: (o) => o.product },
  { header: "Category", get: (o) => o.category },
  { header: "Sub-category", get: (o) => o.subCategory },
  { header: "Segment", get: (o) => o.segment },
  { header: "Region", get: (o) => o.region },
  { header: "Country", get: (o) => o.country },
  { header: "City", get: (o) => o.city },
  { header: "Channel", get: (o) => o.channel },
  { header: "Payment", get: (o) => o.payment },
  { header: "Quantity", get: (o) => o.qty },
  { header: "Unit Price", get: (o) => o.unitPrice },
  { header: "Net Revenue", get: (o) => o.netRevenue },
  { header: "Gross Profit", get: (o) => o.grossProfit },
  { header: "Returned", get: (o) => o.returned },
  { header: "Rating", get: (o) => o.rating ?? "" },
];

function csvEscape(value: string | number | null): string {
  const s = value == null ? "" : String(value);
  return /[",\n\r]/.test(s) ? `"${s.replace(/"/g, '""')}"` : s;
}

function exportOrdersToCsv(list: Order[]) {
  const header = CSV_COLUMNS.map((c) => csvEscape(c.header)).join(",");
  const rows = list.map((o) => CSV_COLUMNS.map((c) => csvEscape(c.get(o))).join(","));
  const csv = [header, ...rows].join("\r\n");
  const blob = new Blob([`\uFEFF${csv}`], { type: "text/csv;charset=utf-8;" });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = `orders-${format(new Date(), "yyyy-MM-dd")}.csv`;
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  URL.revokeObjectURL(url);
}

function LiveIndicator({
  isLoading,
  isError,
  lastUpdated,
}: {
  isLoading: boolean;
  isError: boolean;
  lastUpdated: number | null;
}) {
  const dotClass = isError
    ? "bg-red-500"
    : isLoading
      ? "bg-amber-400"
      : "bg-emerald-400";
  const label = isError ? "Offline" : isLoading ? "Syncing" : "Live";
  return (
    <div className="ml-auto flex items-center gap-2 rounded-md bg-sidebar-accent/40 px-2.5 py-1 text-xs text-sidebar-foreground/85">
      <span className="relative flex h-2 w-2">
        {!isError && (
          <span
            className={`absolute inline-flex h-full w-full animate-ping rounded-full opacity-75 ${dotClass}`}
          />
        )}
        <span className={`relative inline-flex h-2 w-2 rounded-full ${dotClass}`} />
      </span>
      <span className="font-medium">{label}</span>
      <span className="text-sidebar-foreground/60">
        · Last updated:{" "}
        {lastUpdated ? format(new Date(lastUpdated), "HH:mm:ss") : "—"}
      </span>
    </div>
  );
}

function KPISkeletonRow() {
  return (
    <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-4">
      {Array.from({ length: 4 }).map((_, i) => (
        <div key={i} className="rounded-lg border bg-card p-4">
          <Skeleton className="h-3 w-24" />
          <Skeleton className="mt-3 h-8 w-32" />
          <Skeleton className="mt-2 h-3 w-28" />
        </div>
      ))}
    </div>
  );
}

function LoadingState() {
  return (
    <div className="flex flex-col gap-5">
      <div>
        <Skeleton className="h-7 w-48" />
        <Skeleton className="mt-2 h-4 w-64" />
      </div>
      <KPISkeletonRow />
      <div className="grid grid-cols-1 gap-3 lg:grid-cols-2">
        <Skeleton className="h-64 rounded-lg" />
        <Skeleton className="h-64 rounded-lg" />
      </div>
      <div className="grid grid-cols-1 gap-3 lg:grid-cols-3">
        <Skeleton className="h-56 rounded-lg" />
        <Skeleton className="h-56 rounded-lg" />
        <Skeleton className="h-56 rounded-lg" />
      </div>
    </div>
  );
}

const EMPTY_ORDERS: Order[] = [];

function DirectoryPage() {
  const { view, q, category, region, segment, channel, payment, sort, from, to } =
    Route.useSearch();
  const navigate = useNavigate({ from: "/" });

  const query = useQuery({
    queryKey: ["orders", "ecommerce_sales.xlsx"],
    queryFn: () => fetchOrders(),
    refetchInterval: 30_000,
    refetchIntervalInBackground: true,
    staleTime: 25_000,
    // keep last successful data on failure
    placeholderData: (prev) => prev,
    retry: 1,
  });

  const orders = query.data ?? EMPTY_ORDERS;
  const hasData = orders.length > 0;
  const initialLoading = query.isLoading && !hasData;

  if (query.error) {
    console.error("[orders] fetch failed:", query.error);
  }

  const facets = useMemo(() => computeFacets(orders), [orders]);
  const facetCounts = useMemo(() => computeFacetCounts(orders), [orders]);
  const dateRange = useMemo(() => computeDateRange(orders), [orders]);

  // Resolve effective date range: fall back to last 90 days of data when
  // the URL has no explicit selection.
  const effectiveTo = to || dateRange.max;
  const effectiveFrom =
    from ||
    (dateRange.min
      ? format(
          (() => {
            const candidate = subDays(parseISO(dateRange.max), 89);
            const min = parseISO(dateRange.min);
            return candidate > min ? candidate : min;
          })(),
          "yyyy-MM-dd",
        )
      : dateRange.min);

  const filters = { q, category, region, segment, channel, payment };

  const filtered = useMemo(
    () => sortOrders(applyFilters(orders, filters), sort),
    [orders, q, category, region, segment, channel, payment, sort],
  );

  const stats = useMemo(() => {
    const revenue = filtered.reduce((s, o) => s + o.netRevenue, 0);
    const profit = filtered.reduce((s, o) => s + o.grossProfit, 0);
    const rated = filtered.filter((o) => o.rating != null);
    const avgRating = rated.length
      ? rated.reduce((s, o) => s + (o.rating ?? 0), 0) / rated.length
      : null;
    return { revenue, profit, avgRating };
  }, [filtered]);

  const toggleFacet = (facet: Facet, value: string) => {
    navigate({
      search: (prev: DirectorySearch) => {
        const current = prev[facet];
        const next = current.includes(value)
          ? current.filter((v: string) => v !== value)
          : [...current, value];
        return { ...prev, [facet]: next };
      },
      replace: true,
    });
  };

  const hasFilters =
    q.length > 0 ||
    category.length > 0 ||
    region.length > 0 ||
    segment.length > 0 ||
    channel.length > 0 ||
    payment.length > 0;

  return (
    <SidebarProvider>
      <div className="flex min-h-screen w-full">
        <DirectorySidebar
          facets={facets}
          facetCounts={facetCounts}
          selected={{ category, region, segment, channel, payment }}
          onToggle={toggleFacet}
          onClear={() =>
            navigate({
              search: (prev: DirectorySearch) => ({
                ...prev,
                q: "",
                category: [],
                region: [],
                segment: [],
                channel: [],
                payment: [],
              }),
              replace: true,
            })
          }
          hasFilters={hasFilters}
        />

        <div className="flex flex-1 flex-col">
          <header className="sticky top-0 z-10 flex flex-wrap items-center gap-3 border-b border-sidebar-border bg-sidebar px-4 py-3 text-sidebar-foreground">
            <SidebarTrigger className="text-sidebar-foreground hover:bg-sidebar-accent hover:text-sidebar-accent-foreground" />
            <a href="/" className="flex items-center gap-2 rounded-md bg-white/95 px-2.5 py-1.5">
              <img
                src={logoAsset.url}
                alt="Career Principles"
                className="h-6 w-auto"
              />
            </a>
            <Tabs
              value={view}
              onValueChange={(v) =>
                navigate({
                  search: (prev: DirectorySearch) => ({
                    ...prev,
                    view: v as "directory" | "dashboard",
                  }),
                  replace: true,
                })
              }
            >
              <TabsList className="bg-sidebar-accent/60 text-sidebar-foreground">
                <TabsTrigger
                  value="directory"
                  className="gap-1.5 data-[state=active]:bg-primary data-[state=active]:text-primary-foreground"
                >
                  <LayoutGrid className="h-3.5 w-3.5" />
                  Directory
                </TabsTrigger>
                <TabsTrigger
                  value="dashboard"
                  className="gap-1.5 data-[state=active]:bg-primary data-[state=active]:text-primary-foreground"
                >
                  <BarChart3 className="h-3.5 w-3.5" />
                  Dashboard
                </TabsTrigger>
              </TabsList>
            </Tabs>
            {view === "directory" && hasData && (
              <>
                <div className="relative min-w-52 flex-1">
                  <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-sidebar-foreground/60" />
                  <Input
                    value={q}
                    onChange={(e) =>
                      navigate({
                        search: (prev: DirectorySearch) => ({ ...prev, q: e.target.value }),
                        replace: true,
                      })
                    }
                    placeholder="Search orders, products, countries…"
                    className="border-sidebar-border bg-sidebar-accent/40 pl-9 text-sidebar-foreground placeholder:text-sidebar-foreground/50 focus-visible:ring-primary"
                  />
                </div>
                <Select
                  value={sort}
                  onValueChange={(v) =>
                    navigate({
                      search: (prev: DirectorySearch) => ({ ...prev, sort: v }),
                      replace: true,
                    })
                  }
                >
                  <SelectTrigger className="w-52 border-sidebar-border bg-sidebar-accent/40 text-sidebar-foreground">
                    <ArrowUpDown className="mr-1 h-3.5 w-3.5 text-sidebar-foreground/60" />
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {SORT_OPTIONS.map((o) => (
                      <SelectItem key={o.value} value={o.value}>
                        {o.label}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
                <Button
                  type="button"
                  onClick={() => exportOrdersToCsv(filtered)}
                  disabled={filtered.length === 0}
                  className="gap-1.5 bg-primary text-primary-foreground hover:bg-primary/90"
                >
                  <Download className="h-3.5 w-3.5" />
                  Export CSV
                </Button>
              </>
            )}
            <LiveIndicator
              isLoading={query.isFetching}
              isError={!hasData && !!query.error}
              lastUpdated={query.dataUpdatedAt || null}
            />
          </header>

          <main className="flex-1 px-4 py-5 md:px-6">
            {initialLoading ? (
              <LoadingState />
            ) : !hasData && query.error ? (
              <div className="flex flex-col items-center justify-center rounded-lg border border-dashed py-20 text-center">
                <p className="font-medium">Couldn't load live data</p>
                <p className="mt-1 max-w-md text-sm text-muted-foreground">
                  We'll keep retrying in the background. Check that the
                  ecommerce_sales.xlsx workbook is accessible.
                </p>
              </div>
            ) : view === "dashboard" ? (
              <DashboardView
                allOrders={orders}
                filters={filters}
                dateFrom={effectiveFrom}
                dateTo={effectiveTo}
                onDateChange={(nf, nt) =>
                  navigate({
                    search: (prev: DirectorySearch) => ({ ...prev, from: nf, to: nt }),
                    replace: true,
                  })
                }
              />
            ) : (
              <>
                <div className="mb-5 flex flex-wrap items-end justify-between gap-3">
                  <div>
                    <h1 className="text-2xl font-semibold tracking-tight">Order directory</h1>
                    <p className="mt-1 text-sm text-muted-foreground">
                      {filtered.length} of {orders.length} orders
                      {hasFilters ? " match your filters" : ""}
                    </p>
                  </div>
                  <div className="flex gap-6 text-right">
                    <div>
                      <p className="text-xs uppercase tracking-wide text-muted-foreground">
                        Net revenue
                      </p>
                      <p className="font-display text-lg font-semibold tabular-nums">
                        {currency(stats.revenue)}
                      </p>
                    </div>
                    <div>
                      <p className="text-xs uppercase tracking-wide text-muted-foreground">
                        Gross profit
                      </p>
                      <p className="font-display text-lg font-semibold tabular-nums">
                        {currency(stats.profit)}
                      </p>
                    </div>
                    <div>
                      <p className="text-xs uppercase tracking-wide text-muted-foreground">
                        Avg rating
                      </p>
                      <p className="font-display text-lg font-semibold tabular-nums">
                        {stats.avgRating != null ? stats.avgRating.toFixed(1) : "—"}
                      </p>
                    </div>
                  </div>
                </div>

                {filtered.length === 0 ? (
                  <div className="flex flex-col items-center justify-center rounded-lg border border-dashed py-20 text-center">
                    <p className="font-medium">No orders match</p>
                    <p className="mt-1 text-sm text-muted-foreground">
                      Try adjusting your search or clearing some filters.
                    </p>
                  </div>
                ) : (
                  <div className="overflow-hidden rounded-lg border bg-card">
                    <Table>
                      <TableHeader>
                        <TableRow className="bg-muted/60 hover:bg-muted/60">
                          <TableHead>Order</TableHead>
                          <TableHead>Product</TableHead>
                          <TableHead className="hidden md:table-cell">Category</TableHead>
                          <TableHead className="hidden lg:table-cell">Location</TableHead>
                          <TableHead className="hidden lg:table-cell">Segment</TableHead>
                          <TableHead className="hidden md:table-cell">Channel</TableHead>
                          <TableHead className="text-right">Revenue</TableHead>
                          <TableHead className="text-right">Rating</TableHead>
                        </TableRow>
                      </TableHeader>
                      <TableBody>
                        {filtered.map((o) => (
                          <TableRow key={o.orderId}>
                            <TableCell>
                              <div className="font-mono text-xs">{o.orderId}</div>
                              <div className="text-xs text-muted-foreground">{o.date}</div>
                            </TableCell>
                            <TableCell>
                              <div className="max-w-44 truncate font-medium">{o.product}</div>
                              <div className="text-xs text-muted-foreground">
                                {o.subCategory} · Qty {o.qty}
                              </div>
                            </TableCell>
                            <TableCell className="hidden md:table-cell">
                              <Badge variant="secondary" className="font-normal">
                                {o.category}
                              </Badge>
                            </TableCell>
                            <TableCell className="hidden lg:table-cell">
                              <div className="text-sm">{o.country}</div>
                              <div className="text-xs text-muted-foreground">{o.city}</div>
                            </TableCell>
                            <TableCell className="hidden text-sm lg:table-cell">
                              {o.segment}
                            </TableCell>
                            <TableCell className="hidden text-sm md:table-cell">
                              {o.channel}
                            </TableCell>
                            <TableCell className="text-right">
                              <div className="font-medium tabular-nums">
                                {currency(o.netRevenue)}
                              </div>
                              {o.returned === "Yes" && (
                                <Badge variant="destructive" className="mt-0.5 font-normal">
                                  Returned
                                </Badge>
                              )}
                            </TableCell>
                            <TableCell className="text-right">
                              {o.rating != null ? (
                                <span className="inline-flex items-center gap-1 tabular-nums">
                                  <Star className="h-3.5 w-3.5 fill-chart-2 text-chart-2" />
                                  {o.rating}
                                </span>
                              ) : (
                                <span className="text-muted-foreground">—</span>
                              )}
                            </TableCell>
                          </TableRow>
                        ))}
                      </TableBody>
                    </Table>
                  </div>
                )}
              </>
            )}
          </main>
        </div>
        {hasData && (
          <VoiceNarrator
            buildContext={() => {
              const base =
                view === "dashboard"
                  ? filtered.filter(
                      (o) => o.date >= effectiveFrom && o.date <= effectiveTo,
                    )
                  : filtered;
              const filterDesc = [
                q && `search "${q}"`,
                category.length && `categories [${category.join(", ")}]`,
                region.length && `regions [${region.join(", ")}]`,
                segment.length && `segments [${segment.join(", ")}]`,
                channel.length && `channels [${channel.join(", ")}]`,
                payment.length && `payments [${payment.join(", ")}]`,
                view === "dashboard" && `date ${effectiveFrom}..${effectiveTo}`,
              ]
                .filter(Boolean)
                .join("; ") || "no filters";
              return `View: ${view}. Active filters: ${filterDesc}.\n${summarizeOrders(base)}`;
            }}
          />
        )}
      </div>
    </SidebarProvider>
  );
}

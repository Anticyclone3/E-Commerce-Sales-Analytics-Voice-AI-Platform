import { ShoppingBag, RotateCcw } from "lucide-react";
import {
  Sidebar,
  SidebarContent,
  SidebarFooter,
  SidebarGroup,
  SidebarGroupContent,
  SidebarGroupLabel,
  SidebarHeader,
} from "@/components/ui/sidebar";
import { Checkbox } from "@/components/ui/checkbox";
import { Button } from "@/components/ui/button";
import type { OrderFacets, FacetCounts } from "@/lib/orders";

interface FacetGroupProps {
  label: string;
  options: string[];
  counts: Map<string, number>;
  selected: string[];
  onToggle: (value: string) => void;
}

function FacetGroup({ label, options, counts, selected, onToggle }: FacetGroupProps) {
  return (
    <SidebarGroup>
      <SidebarGroupLabel className="text-sidebar-primary tracking-wider uppercase text-[0.65rem]">
        {label}
      </SidebarGroupLabel>
      <SidebarGroupContent>
        <div className="flex flex-col gap-0.5 px-2">
          {options.map((opt) => (
            <label
              key={opt}
              className="flex cursor-pointer items-center gap-2.5 rounded-md px-2 py-1.5 text-sm hover:bg-sidebar-accent"
            >
              <Checkbox
                checked={selected.includes(opt)}
                onCheckedChange={() => onToggle(opt)}
                className="border-sidebar-border data-[state=checked]:bg-sidebar-primary data-[state=checked]:border-sidebar-primary data-[state=checked]:text-sidebar-primary-foreground"
              />
              <span className="flex-1 truncate">{opt}</span>
              <span className="text-xs text-sidebar-foreground/50 tabular-nums">
                {counts.get(opt) ?? 0}
              </span>
            </label>
          ))}
        </div>
      </SidebarGroupContent>
    </SidebarGroup>
  );
}

interface DirectorySidebarProps {
  facets: OrderFacets;
  facetCounts: FacetCounts;
  selected: {
    category: string[];
    region: string[];
    segment: string[];
    channel: string[];
    payment: string[];
  };
  onToggle: (facet: keyof DirectorySidebarProps["selected"], value: string) => void;
  onClear: () => void;
  hasFilters: boolean;
}

export function DirectorySidebar({
  facets,
  facetCounts,
  selected,
  onToggle,
  onClear,
  hasFilters,
}: DirectorySidebarProps) {
  return (
    <Sidebar collapsible="offcanvas">
      <SidebarHeader className="border-b border-sidebar-border px-4 py-4">
        <div className="flex items-center gap-2.5">
          <div className="flex h-8 w-8 items-center justify-center rounded-md bg-sidebar-primary text-sidebar-primary-foreground">
            <ShoppingBag className="h-4 w-4" />
          </div>
          <div>
            <p className="font-display text-sm font-semibold leading-tight text-sidebar-accent-foreground">
              Career Principles
            </p>
            <p className="text-xs text-sidebar-foreground/60">Sales analytics</p>
          </div>
        </div>
      </SidebarHeader>

      <SidebarContent>
        <FacetGroup
          label="Category"
          options={facets.categories}
          counts={facetCounts.category}
          selected={selected.category}
          onToggle={(v) => onToggle("category", v)}
        />
        <FacetGroup
          label="Region"
          options={facets.regions}
          counts={facetCounts.region}
          selected={selected.region}
          onToggle={(v) => onToggle("region", v)}
        />
        <FacetGroup
          label="Customer Segment"
          options={facets.segments}
          counts={facetCounts.segment}
          selected={selected.segment}
          onToggle={(v) => onToggle("segment", v)}
        />
        <FacetGroup
          label="Sales Channel"
          options={facets.channels}
          counts={facetCounts.channel}
          selected={selected.channel}
          onToggle={(v) => onToggle("channel", v)}
        />
        <FacetGroup
          label="Payment Method"
          options={facets.payments}
          counts={facetCounts.payment}
          selected={selected.payment}
          onToggle={(v) => onToggle("payment", v)}
        />
      </SidebarContent>

      <SidebarFooter className="border-t border-sidebar-border p-3">
        <Button
          variant="ghost"
          size="sm"
          onClick={onClear}
          disabled={!hasFilters}
          className="w-full justify-center gap-2 text-sidebar-foreground hover:bg-sidebar-accent hover:text-sidebar-accent-foreground"
        >
          <RotateCcw className="h-3.5 w-3.5" />
          Clear all filters
        </Button>
      </SidebarFooter>
    </Sidebar>
  );
}
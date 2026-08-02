# Business Requirements Document (BRD)

**Project:** Career Principles — Sales Analytics Platform
**Version:** 1.0
**Date:** July 14, 2026
**Owner:** Career Principles
**Status:** Delivered

---

## 1. Executive Summary

Career Principles needed a lightweight, always-current sales analytics view over an operational Excel workbook maintained in OneDrive. Rather than migrating the source of truth into a database, the business asked for a **live-read web app** that surfaces the same data as a searchable directory and an interactive dashboard — updated automatically, branded to Career Principles, and shareable via a single URL.

This BRD captures the scope, requirements, and acceptance criteria that guided delivery.

---

## 2. Business Objectives

| # | Objective | Success Measure |
|---|---|---|
| O1 | Give operators one place to inspect every order without opening the workbook | 100% of workbook rows visible & searchable in-app |
| O2 | Give leadership a KPI-first dashboard that reflects the current state of sales | Dashboard reflects workbook edits within ≤ 30 seconds |
| O3 | Keep Excel as the source of truth (no data migration) | Zero manual sync steps; no separate database |
| O4 | Enable ad-hoc analysis and sharing | CSV export of any filtered view |
| O5 | Present the tool as a Career Principles product | Brand system applied consistently across all surfaces |

---

## 3. Scope

### 3.1 In Scope
- Live read-only integration with `ecommerce_sales.xlsx` (OneDrive) via the Microsoft Excel connector.
- Directory view: search, faceted filters, sorting, CSV export.
- Dashboard view: KPI cards, time-series and categorical charts, chart-level drill-downs.
- Shared 30-second background refresh across both views.
- Branded header with logo, "Live" status indicator, last-updated timestamp.
- Loading, error, and empty states.

### 3.2 Out of Scope
- Writing back to Excel or any data mutation.
- Authenticated multi-tenant access (deployment is workspace-scoped).
- Historical snapshots / time-travel queries.
- Native mobile applications.
- Payment, checkout, or CRM functionality.

---

## 4. Stakeholders

| Role | Responsibility |
|---|---|
| Business Sponsor | Approves scope, sign-off on acceptance |
| Ops Team (primary users) | Daily use of Directory for lookups & exports |
| Leadership (secondary users) | Dashboard for high-level performance |
| Data Steward | Maintains `ecommerce_sales.xlsx` in OneDrive |
| Engineering | Delivers, deploys, and monitors the app |

---

## 5. Functional Requirements

### 5.1 Data Ingestion
- **FR-1** The app SHALL fetch order data from the worksheet named `Data` in `ecommerce_sales.xlsx` under the connected OneDrive root.
- **FR-2** The app SHALL refresh data automatically every 30 seconds without user action.
- **FR-3** If a fetch fails, the app SHALL retain and continue displaying the last successful dataset and log the error.
- **FR-4** All connector calls SHALL run server-side; connector credentials MUST NOT be exposed to the browser.

### 5.2 Directory View
- **FR-5** Users can free-text search across Order ID, Product, Category, Sub-Category, Country, City, and Payment Method.
- **FR-6** Users can filter by Category, Region, Customer Segment, Sales Channel, and Payment Method (multi-select).
- **FR-7** Facet counts SHALL update dynamically based on current filters.
- **FR-8** Users can sort by date, revenue, and quantity (asc/desc).
- **FR-9** Users can clear all filters in one action.
- **FR-10** Users can **Export CSV** of the currently filtered & searched result set with human-readable column headers.

### 5.3 Dashboard View
- **FR-11** Display KPI cards: total revenue, total orders, total profit, average order value, return rate.
- **FR-12** Display trend and breakdown charts (by category, region, channel, over time).
- **FR-13** Clicking a chart element opens a drill-down panel listing the underlying orders.
- **FR-14** Dashboard SHALL honor the same filters and time range as the Directory when applicable.

### 5.4 Header & Status
- **FR-15** The header SHALL display the Career Principles logo (top-left) and app name.
- **FR-16** The header SHALL show a "Live" indicator with a pulsing green dot when the last fetch succeeded.
- **FR-17** The header SHALL show "Last updated: HH:mm:ss" reflecting the most recent successful fetch.
- **FR-18** The indicator SHALL visibly change state during a background refetch and if the connection is unhealthy.

### 5.5 Branding
- **FR-19** Primary color `#056CF2` applied to interactive accents (buttons, links, active filters, chart primary, Live dot).
- **FR-20** Deep navy `#073673` applied to header, headings, and secondary chart color.
- **FR-21** Brand tokens SHALL apply consistently to tooltips, popovers, dropdowns, and date pickers.

---

## 6. Non-Functional Requirements

| ID | Category | Requirement |
|---|---|---|
| NFR-1 | Performance | Initial paint under 2s on typical broadband; interactions ≤ 100ms. |
| NFR-2 | Freshness | Background refresh cadence 30s ± network latency. |
| NFR-3 | Resilience | Zero user-visible blank states on transient upstream errors. |
| NFR-4 | Security | Connector secrets are server-only; no PII stored client-side. |
| NFR-5 | Accessibility | WCAG 2.1 AA color contrast; full keyboard navigation for filters, table, and dialogs. |
| NFR-6 | Responsiveness | Works down to 743px viewport width. |
| NFR-7 | Observability | Fetch errors logged with status + upstream body for triage. |
| NFR-8 | Maintainability | TypeScript strict mode; ESLint clean; components ≤ ~200 LOC. |

---

## 7. Technical Solution (Summary)

- **Frontend:** React 19, TanStack Router (file-based), Tailwind v4, shadcn/ui, Recharts.
- **Backend:** TanStack Start server functions running on Cloudflare Workers (edge SSR).
- **Data path:** Browser → TanStack Query → `createServerFn` → Lovable Connector Gateway → Microsoft Graph (Excel) → OneDrive workbook.
- **State:** TanStack Query with `refetchInterval: 30_000`, `keepPreviousData` semantics for resilience.
- **Deployment:** Lovable-hosted preview & production URLs.

---

## 8. Assumptions

- The workbook schema (column names) remains stable.
- OneDrive availability and Microsoft Graph rate limits are sufficient for polling at 30s intervals.
- Users accessing the app have organizational authorization to see sales data.

---

## 9. Constraints

- Excel remains the system of record; no write-back.
- Runtime is a serverless Worker (no native binaries, no long-lived processes).
- Data volume per fetch must fit within a single `usedRange` response.

---

## 10. Risks & Mitigations

| Risk | Impact | Mitigation |
|---|---|---|
| Workbook schema change breaks parser | High | Server function references headers by name; add integration check |
| Graph API throttling | Medium | 30s cadence, exponential backoff on 429 (future) |
| Large workbook growth degrades UX | Medium | Add pagination / virtualization when row count grows |
| Connector token expiry | Medium | User re-links Excel connector; UI surfaces stale-data state |

---

## 11. Acceptance Criteria

1. Editing a row in `ecommerce_sales.xlsx` is reflected in both Directory and Dashboard within 30 seconds.
2. Turning off the network shows "stale" state but does not blank the UI.
3. Applying filters + search + "Export CSV" downloads exactly the visible rows with clean headers.
4. Clicking a Dashboard chart segment opens the drill-down with matching rows.
5. Brand tokens (`#056CF2`, `#073673`, logo) are visible on header, buttons, active filters, chart accents, tooltips, and date pickers.
6. Lighthouse a11y ≥ 90; TypeScript & ESLint pass with no errors.

---

## 12. Future Enhancements

- Saved views / shareable filter URLs (partial today via query params).
- Scheduled email digests of KPI snapshots.
- Role-based access with per-region visibility.
- Anomaly alerts (e.g., return-rate spikes).
- Multi-workbook support.

---

## 13. Sign-off

| Name | Role | Date | Signature |
|---|---|---|---|
|  | Business Sponsor |  |  |
|  | Engineering Lead |  |  |
|  | Data Steward |  |  |

"use client";

import * as React from "react";

import { startOfDay, subDays } from "date-fns";
import { Check, ChevronsUpDown, Download } from "lucide-react";
import type { DateRange } from "react-day-picker";
import { Area, ComposedChart, XAxis, YAxis } from "recharts";

import { useI18n } from "@/components/providers/language-provider";
import { DateRangePicker } from "@/components/date-range-picker";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import {
  type ChartConfig,
  ChartContainer,
  ChartTooltip,
  ChartTooltipContent,
} from "@/components/ui/chart";
import { Checkbox } from "@/components/ui/checkbox";
import {
  Command,
  CommandGroup,
  CommandItem,
  CommandList,
} from "@/components/ui/command";
import { Label } from "@/components/ui/label";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { cn, formatCurrency } from "@/lib/utils";
import { useAnalyticsMetrics } from "./use-analytics-metrics";

type RiskView = "risk-view" | "momentum" | "quality";
type FilterToggleKey =
  | "enterpriseOnly"
  | "stalledOnly"
  | "overdueOnly"
  | "includeRenewals";

const FILTER_OPTIONS: Array<{
  key: FilterToggleKey;
  labelEn: string;
  labelTr: string;
  summaryLabelEn: string;
  summaryLabelTr: string;
}> = [
  {
    key: "enterpriseOnly",
    labelEn: "Enterprise only",
    labelTr: "Sadece kurumsal",
    summaryLabelEn: "Enterprise",
    summaryLabelTr: "Kurumsal",
  },
  {
    key: "stalledOnly",
    labelEn: "Stalled deals (>14 days)",
    labelTr: "Duran anlaşmalar (>14 gün)",
    summaryLabelEn: "Stalled",
    summaryLabelTr: "Duran",
  },
  {
    key: "overdueOnly",
    labelEn: "Closing date exceeded",
    labelTr: "Kapanış tarihi aşıldı",
    summaryLabelEn: "Overdue",
    summaryLabelTr: "Gecikmiş",
  },
  {
    key: "includeRenewals",
    labelEn: "Include renewals",
    labelTr: "Yenilemeleri dahil et",
    summaryLabelEn: "Renewals",
    summaryLabelTr: "Yenilemeler",
  },
];

const riskViews: Array<{
  value: RiskView;
  labelEn: string;
  labelTr: string;
  descriptionEn: string;
  descriptionTr: string;
}> = [
  {
    value: "risk-view",
    labelEn: "Risk view",
    labelTr: "Risk görünümü",
    descriptionEn: "Early warnings",
    descriptionTr: "Erken uyarılar",
  },
  {
    value: "momentum",
    labelEn: "Momentum",
    labelTr: "Momentum",
    descriptionEn: "Trend direction",
    descriptionTr: "Trend yönü",
  },
  {
    value: "quality",
    labelEn: "Quality",
    labelTr: "Kalite",
    descriptionEn: "Pipeline hygiene",
    descriptionTr: "Hat sağlığı",
  },
];

export function AnalyticsOverview() {
  const { tx, language } = useI18n();
  const locale =
    language === "tr" ? "tr-TR" : language === "ru" ? "ru-RU" : "en-US";
  const [dateRange, setDateRange] = React.useState<{ from: Date; to: Date }>(
    () => {
      const to = startOfDay(new Date());
      return { from: subDays(to, 29), to };
    },
  );
  const [selectedFilters, setSelectedFilters] = React.useState<
    FilterToggleKey[]
  >(["includeRenewals"]);
  const analytics = useAnalyticsMetrics(locale, dateRange);

  const handleFilterToggle = (key: FilterToggleKey, checked: boolean) => {
    setSelectedFilters((prev) => {
      if (checked) {
        return prev.includes(key) ? prev : [...prev, key];
      }
      return prev.filter((item) => item !== key);
    });
  };

  const handleDateRangeChange = (value: DateRange | undefined) => {
    if (!value?.from || !value?.to) {
      return;
    }
    setDateRange({ from: value.from, to: value.to });
  };

  return (
    <div className="grid gap-4">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <div className="flex flex-wrap items-center gap-2">
          <RiskViewSelect tx={tx} />
          <FiltersPopover
            selectedFilters={selectedFilters}
            onToggle={handleFilterToggle}
            tx={tx}
          />
        </div>

        <div className="flex flex-wrap items-center gap-2">
          <DateRangePicker value={dateRange} onChange={handleDateRangeChange} />
          <Button variant="secondary">
            <Download />
            {tx("Export", "Dışa Aktar")}
          </Button>
        </div>
      </div>

      <SummaryRow
        revenueSeries={analytics.dailySeries}
        summary={analytics.summary}
        requestCount={analytics.requestCount}
        tx={tx}
        language={language}
      />
    </div>
  );
}

function SummaryRow({
  revenueSeries,
  summary,
  requestCount,
  tx,
  language,
}: {
  revenueSeries: Array<{ day: string; revenue: number }>;
  summary: {
    currentNetFlow: number;
    previousNetFlow: number;
    revenueDelta: number;
    revenueDeltaPercent: number;
    stalledCount: number;
    revenueAtRisk: number;
    winRateDelta: number;
    cycleDrift: number;
  };
  requestCount: number;
  tx: (en: string, tr: string, ru?: string) => string;
  language: "en" | "tr" | "ru" | "az";
}) {
  const revenueChartConfig = {
    revenue: {
      label: tx("Revenue", "Gelir"),
      color: "var(--chart-1)",
    },
  } satisfies ChartConfig;

  const safeSeries =
    revenueSeries.length > 0
      ? revenueSeries
      : [{ day: tx("No data", "Veri yok"), revenue: 0 }];
  const revenueValues = safeSeries.map((point) => point.revenue);
  const minRevenue = Math.min(...revenueValues);
  const maxRevenue = Math.max(...revenueValues);
  const midpoint = (minRevenue + maxRevenue) / 2;
  const halfRange = Math.max((maxRevenue - minRevenue) * 1.6, 4_500);
  const riskSummaryMetrics = [
    {
      key: "stalled",
      labelEn: "Stalled Requests",
      labelTr: "Duran Talepler",
      value: String(summary.stalledCount),
    },
    {
      key: "risk",
      labelEn: "Volume at Risk",
      labelTr: "Risk Altındaki Hacim",
      value: formatCurrency(summary.revenueAtRisk, { noDecimals: true }),
    },
    {
      key: "win-rate",
      labelEn: "Approval Rate Drift",
      labelTr: "Onay Oranı Sapması",
      value: `${summary.winRateDelta >= 0 ? "+" : ""}${summary.winRateDelta.toFixed(1)}pp`,
    },
    {
      key: "cycle",
      labelEn: "Cycle Drift",
      labelTr: "Döngü Sapması",
      value: `${summary.cycleDrift >= 0 ? "+" : ""}${summary.cycleDrift.toFixed(1)} days`,
    },
  ];

  return (
    <div className="grid grid-cols-1 gap-4 lg:grid-cols-3">
      <div className="space-y-2">
        <div>
          <div className="font-medium text-muted-foreground text-sm">
            {tx("Revenue", "Gelir")}
          </div>
          <div className="font-semibold text-4xl tabular-nums tracking-tight">
            {formatCurrency(summary.currentNetFlow, { noDecimals: true })}
          </div>
        </div>
        <div className="flex flex-wrap items-center gap-2">
          <Badge variant="secondary">
            {summary.revenueDeltaPercent >= 0 ? "+" : ""}
            {summary.revenueDeltaPercent.toFixed(1)}%
          </Badge>
          <Badge variant="secondary">
            {summary.revenueDelta >= 0 ? "+" : "-"}
            {formatCurrency(Math.abs(summary.revenueDelta), { noDecimals: true })}
          </Badge>
        </div>

        <div className="flex flex-wrap items-center gap-2 text-muted-foreground text-sm">
          <span>
            {tx("Previous", "Önceki")}{" "}
            {formatCurrency(summary.previousNetFlow, { noDecimals: true })}
          </span>
          <Badge variant="outline" className="font-medium text-xs">
            {tx("Requests", "Talepler")} {requestCount}
          </Badge>
        </div>
        <div>
          <ChartContainer
            config={revenueChartConfig}
            className="h-10 w-full rounded-md border"
          >
            <ComposedChart
              data={safeSeries}
              margin={{ left: 0, right: 0, top: 0, bottom: 0 }}
            >
              <XAxis dataKey="day" hide />
              <YAxis hide domain={[midpoint - halfRange, midpoint + halfRange]} />
              <ChartTooltip cursor={false} content={<ChartTooltipContent />} />
              <Area
                dataKey="revenue"
                type="natural"
                fill="var(--color-revenue)"
                fillOpacity={0.14}
                stroke="var(--color-revenue)"
              />
            </ComposedChart>
          </ChartContainer>
          <span className="text-muted-foreground text-xs">
            {tx("Selected range", "Seçili aralık")}
          </span>
        </div>
      </div>

      <Card className="py-4 shadow-xs lg:col-span-2">
        <CardHeader className="px-4">
          <CardTitle>{tx("Risk summary", "Risk özeti")}</CardTitle>
          <CardDescription>
            {tx(
              "Core risk signals vs previous period",
              "Önceki döneme göre temel risk sinyalleri",
            )}
          </CardDescription>
        </CardHeader>
        <CardContent className="grid grid-cols-1 gap-4 px-4 sm:grid-cols-2 lg:grid-cols-4 lg:gap-0 lg:divide-x lg:[&>div:first-child]:pl-0 lg:[&>div:last-child]:pr-0 lg:[&>div]:px-5">
          {riskSummaryMetrics.map((item) => (
            <div key={item.key} className="space-y-1">
              <div className="text-muted-foreground text-sm">
                {tx(item.labelEn, item.labelTr)}
              </div>
              <div className="font-semibold text-2xl tabular-nums">
                {item.key === "cycle"
                  ? language === "tr"
                    ? item.value.replace("days", "gün")
                    : language === "ru"
                      ? item.value.replace("days", "дн.")
                      : item.value
                  : item.value}
              </div>
              <div className="text-muted-foreground text-xs">
                {tx("vs previous period", "önceki döneme göre")}
              </div>
            </div>
          ))}
        </CardContent>
      </Card>
    </div>
  );
}

function RiskViewSelect({
  tx,
}: {
  tx: (en: string, tr: string, ru?: string) => string;
}) {
  const [open, setOpen] = React.useState(false);
  const [value, setValue] = React.useState<RiskView>("risk-view");

  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger asChild>
        <Button
          variant="outline"
          role="combobox"
          aria-expanded={open}
          className="w-54 justify-between"
        >
          <div className="flex items-center gap-2">
            <div
              className="size-2 rounded-full bg-primary"
              style={{
                boxShadow: "0 0 8px color-mix(in oklab, var(--primary) 50%, transparent)",
              }}
            />
            {riskViews.find((view) => view.value === value)
              ? tx(
                  riskViews.find((view) => view.value === value)?.labelEn ?? "",
                  riskViews.find((view) => view.value === value)?.labelTr ?? "",
                )
              : null}
          </div>
          <ChevronsUpDown className="opacity-50" />
        </Button>
      </PopoverTrigger>
      <PopoverContent className="w-54 p-0">
        <Command>
          <CommandList>
            <CommandGroup>
              {riskViews.map((view) => (
                <CommandItem
                  key={view.value}
                  value={view.value}
                  onSelect={(currentValue) => {
                    setValue(currentValue as RiskView);
                    setOpen(false);
                  }}
                >
                  <div className="flex flex-col">
                    <span>{tx(view.labelEn, view.labelTr)}</span>
                    <span className="text-muted-foreground text-xs">
                      {tx(view.descriptionEn, view.descriptionTr)}
                    </span>
                  </div>
                  <Check
                    className={cn(
                      "ml-auto",
                      value === view.value ? "opacity-100" : "opacity-0",
                    )}
                  />
                </CommandItem>
              ))}
            </CommandGroup>
          </CommandList>
        </Command>
      </PopoverContent>
    </Popover>
  );
}

function FiltersPopover({
  selectedFilters,
  onToggle,
  tx,
}: {
  selectedFilters: FilterToggleKey[];
  onToggle: (key: FilterToggleKey, checked: boolean) => void;
  tx: (en: string, tr: string, ru?: string) => string;
}) {
  const [open, setOpen] = React.useState(false);
  const activeCount = selectedFilters.length;

  return (
    <div className="flex items-center gap-2">
      <Popover open={open} onOpenChange={setOpen}>
        <PopoverTrigger asChild>
          <Button variant="outline" aria-expanded={open}>
            {tx("Filters", "Filtreler")}
            <Badge className="tabular-nums" variant="secondary">
              {activeCount}
            </Badge>
          </Button>
        </PopoverTrigger>
        <PopoverContent align="start" className="w-72">
          <div className="space-y-4">
            <div className="flex items-center justify-between">
              <h3 className="font-semibold text-sm">{tx("Filters", "Filtreler")}</h3>
              <Badge variant="outline" className="font-medium text-xs tabular-nums">
                {tx("Risk Ladder 30", "Risk Basamağı 30")}
              </Badge>
            </div>
            <div className="space-y-3">
              {FILTER_OPTIONS.map((item) => (
                <FilterToggle
                  key={item.key}
                  id={item.key}
                  label={tx(item.labelEn, item.labelTr)}
                  checked={selectedFilters.includes(item.key)}
                  onCheckedChange={(checked) => onToggle(item.key, checked)}
                />
              ))}
            </div>
          </div>
        </PopoverContent>
      </Popover>

      <span className="text-muted-foreground text-sm">
        {tx("Showing:", "Gösterilen:")}{" "}
        <span className="font-medium">
          {summarizeFilterState(selectedFilters, tx)}
        </span>
      </span>
    </div>
  );
}

function FilterToggle({
  id,
  label,
  checked,
  onCheckedChange,
}: {
  id: string;
  label: string;
  checked: boolean;
  onCheckedChange: (checked: boolean) => void;
}) {
  return (
    <div className="flex cursor-pointer items-center gap-2">
      <Checkbox
        id={id}
        checked={checked}
        onCheckedChange={(value) => onCheckedChange(Boolean(value))}
      />
      <Label htmlFor={id} className="cursor-pointer font-normal text-sm">
        {label}
      </Label>
    </div>
  );
}

function summarizeFilterState(
  selectedFilters: FilterToggleKey[],
  tx: (en: string, tr: string, ru?: string) => string,
) {
  if (selectedFilters.length === 0) {
    return tx("All deals", "Tüm anlaşmalar");
  }
  return FILTER_OPTIONS.filter((item) => selectedFilters.includes(item.key))
    .map((item) => tx(item.summaryLabelEn, item.summaryLabelTr))
    .join(" · ");
}

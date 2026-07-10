"use client";

import { Search, X, Filter } from "lucide-react";
import { Input } from "@/components/ui/input";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import type { ArchiveFilters, ArchiveOptions } from "@/lib/types";
import { createArchiveFilters } from "@/lib/archive";

export function FilterBar({
  filters,
  onChange,
  options,
  onClear,
  compact = false,
}: {
  filters: ArchiveFilters;
  onChange: (next: ArchiveFilters) => void;
  options: ArchiveOptions;
  onClear?: () => void;
  compact?: boolean;
}) {
  const set = <K extends keyof ArchiveFilters>(key: K, value: ArchiveFilters[K]) =>
    onChange({ ...filters, [key]: value });

  const isFiltered =
    filters.search ||
    filters.team !== "all" ||
    filters.tournament !== "all" ||
    filters.stage !== "all" ||
    filters.eventType !== "all" ||
    filters.map !== "all" ||
    filters.from ||
    filters.to ||
    filters.status !== "all";

  return (
    <div className="rounded-xl border border-border bg-card/60 p-4">
      <div className="mb-3 flex items-center gap-2">
        <Filter className="h-4 w-4 text-primary" />
        <span className="text-sm font-semibold">Фильтры</span>
        {isFiltered ? (
          <Button
            variant="ghost"
            size="sm"
            className="ml-auto h-7 gap-1 text-xs text-muted-foreground hover:text-foreground"
            onClick={() => onClear?.() ?? onChange(createArchiveFilters())}
          >
            <X className="h-3.5 w-3.5" />
            Сбросить
          </Button>
        ) : null}
      </div>

      <div className={`grid gap-3 ${compact ? "sm:grid-cols-2 lg:grid-cols-4" : "sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4"}`}>
        {/* Search */}
        <div className="sm:col-span-2 lg:col-span-1">
          <Label className="mb-1 block text-xs text-muted-foreground">Поиск</Label>
          <div className="relative">
            <Search className="pointer-events-none absolute left-2.5 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
            <Input
              value={filters.search}
              onChange={(e) => set("search", e.target.value)}
              placeholder="Команда, игрок, турнир…"
              className="h-9 pl-8"
            />
          </div>
        </div>

        {/* Team */}
        <FilterSelect
          label="Команда"
          value={filters.team}
          onChange={(v) => set("team", v)}
          options={options.teams}
        />
        {/* Tournament */}
        <FilterSelect
          label="Турнир"
          value={filters.tournament}
          onChange={(v) => set("tournament", v)}
          options={options.tournaments}
        />
        {/* Stage */}
        <FilterSelect
          label="Стадия"
          value={filters.stage}
          onChange={(v) => set("stage", v)}
          options={options.stages}
        />
        {/* Event type */}
        <FilterSelect
          label="Тип (LAN/Online)"
          value={filters.eventType}
          onChange={(v) => set("eventType", v)}
          options={["Online", "LAN"]}
        />
        {/* Map */}
        <FilterSelect
          label="Карта"
          value={filters.map}
          onChange={(v) => set("map", v)}
          options={options.maps}
        />
        {/* Status */}
        <FilterSelect
          label="Учёт в статистике"
          value={filters.status}
          onChange={(v) => set("status", v)}
          options={[
            { value: "all", label: "Все" },
            { value: "included", label: "Включены" },
            { value: "excluded", label: "Исключены" },
          ]}
        />
        {/* Date from */}
        <div>
          <Label className="mb-1 block text-xs text-muted-foreground">Дата с</Label>
          <Input
            type="date"
            value={filters.from}
            onChange={(e) => set("from", e.target.value)}
            className="h-9"
          />
        </div>
        {/* Date to */}
        <div>
          <Label className="mb-1 block text-xs text-muted-foreground">Дата по</Label>
          <Input
            type="date"
            value={filters.to}
            onChange={(e) => set("to", e.target.value)}
            className="h-9"
          />
        </div>
      </div>
    </div>
  );
}

function FilterSelect({
  label,
  value,
  onChange,
  options,
}: {
  label: string;
  value: string;
  onChange: (v: string) => void;
  options: (string | { value: string; label: string })[];
}) {
  return (
    <div>
      <Label className="mb-1 block text-xs text-muted-foreground">{label}</Label>
      <Select value={value} onValueChange={onChange}>
        <SelectTrigger className="h-9">
          <SelectValue />
        </SelectTrigger>
        <SelectContent>
          <SelectItem value="all">Все</SelectItem>
          {options.map((o) => {
            const v = typeof o === "string" ? o : o.value;
            const l = typeof o === "string" ? o : o.label;
            return (
              <SelectItem key={v} value={v}>
                {l}
              </SelectItem>
            );
          })}
        </SelectContent>
      </Select>
    </div>
  );
}

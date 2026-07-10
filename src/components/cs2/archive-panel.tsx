"use client";

import { useState, useMemo } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import {
  Trash2,
  Eye,
  Check,
  X,
  History,
  Search as SearchIcon,
  Database,
  Loader2,
  CheckCircle2,
  Circle,
  Trophy,
  Map as MapIcon,
} from "lucide-react";

import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Checkbox } from "@/components/ui/checkbox";
import { Input } from "@/components/ui/input";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { Separator } from "@/components/ui/separator";
import type { ArchiveFilters, ArchiveOptions, MatchHistoryEntry } from "@/lib/types";
import { createArchiveFilters } from "@/lib/archive";
import { FilterBar } from "./filter-bar";
import { EventTypeBadge, FormatBadge, ScorePill, StageBadge, ratingColor } from "./ui-bits";
import { cn } from "@/lib/utils";

async function fetchMatches(filters: ArchiveFilters): Promise<MatchHistoryEntry[]> {
  const params = new URLSearchParams();
  Object.entries(filters).forEach(([k, v]) => {
    if (v && v !== "all") params.set(k, v);
  });
  const res = await fetch(`/api/matches?${params}`);
  if (!res.ok) throw new Error("Не удалось загрузить матчи");
  const data = await res.json();
  return data.entries;
}

async function fetchOptions(): Promise<ArchiveOptions> {
  const res = await fetch("/api/options");
  if (!res.ok) throw new Error("Не удалось загрузить опции");
  const data = await res.json();
  return data.options;
}

export function ArchivePanel() {
  const qc = useQueryClient();
  const [filters, setFilters] = useState<ArchiveFilters>(createArchiveFilters());
  const [selected, setSelected] = useState<Set<string>>(new Set());
  const [viewing, setViewing] = useState<MatchHistoryEntry | null>(null);
  const [deleteId, setDeleteId] = useState<string | null>(null);
  const [bulkDeleteOpen, setBulkDeleteOpen] = useState(false);

  const { data: options } = useQuery({ queryKey: ["options"], queryFn: fetchOptions });
  const { data: entries, isLoading } = useQuery({
    queryKey: ["matches", filters],
    queryFn: () => fetchMatches(filters),
  });

  const toggleIncludeMut = useMutation({
    mutationFn: async ({ id, included }: { id: string; included: boolean }) => {
      const res = await fetch(`/api/matches/${id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ includedInStats: included }),
      });
      if (!res.ok) throw new Error("Не удалось обновить");
      return res.json();
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["matches"] });
      qc.invalidateQueries({ queryKey: ["stats"] });
    },
    onError: (e: Error) => toast.error(e.message),
  });

  const deleteMut = useMutation({
    mutationFn: async (id: string) => {
      const res = await fetch(`/api/matches/${id}`, { method: "DELETE" });
      if (!res.ok) throw new Error("Не удалось удалить");
      return res.json();
    },
    onSuccess: () => {
      toast.success("Матч удалён");
      qc.invalidateQueries({ queryKey: ["matches"] });
      qc.invalidateQueries({ queryKey: ["stats"] });
      qc.invalidateQueries({ queryKey: ["options"] });
    },
    onError: (e: Error) => toast.error(e.message),
  });

  const bulkDeleteMut = useMutation({
    mutationFn: async (ids: string[]) => {
      const res = await fetch(`/api/matches?ids=${ids.join(",")}`, { method: "DELETE" });
      if (!res.ok) throw new Error("Не удалось удалить");
      return res.json();
    },
    onSuccess: (data) => {
      toast.success(`Удалено матчей: ${data.deleted}`);
      setSelected(new Set());
      setBulkDeleteOpen(false);
      qc.invalidateQueries({ queryKey: ["matches"] });
      qc.invalidateQueries({ queryKey: ["stats"] });
      qc.invalidateQueries({ queryKey: ["options"] });
    },
    onError: (e: Error) => toast.error(e.message),
  });

  const allIds = useMemo(() => (entries ?? []).map((e) => e.id), [entries]);
  const allSelected = allIds.length > 0 && allIds.every((id) => selected.has(id));

  const toggleSelect = (id: string) => {
    setSelected((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  };

  const toggleSelectAll = () => {
    if (allSelected) setSelected(new Set());
    else setSelected(new Set(allIds));
  };

  return (
    <div className="space-y-4">
      <FilterBar
        filters={filters}
        onChange={setFilters}
        options={options ?? { teams: [], tournaments: [], stages: [], maps: [], eventTypes: [] }}
      />

      {/* Bulk actions bar */}
      <div className="flex flex-wrap items-center gap-2">
        <Button variant="outline" size="sm" onClick={toggleSelectAll} disabled={!allIds.length} className="gap-1.5">
          {allSelected ? <CheckCircle2 className="h-4 w-4 text-primary" /> : <Circle className="h-4 w-4" />}
          {allSelected ? "Снять выделение" : "Выбрать все"}
        </Button>
        <span className="text-sm text-muted-foreground">
          {entries?.length ?? 0} матчей{selected.size > 0 ? ` · выбрано ${selected.size}` : ""}
        </span>
        {selected.size > 0 && (
          <>
            <Separator orientation="vertical" className="h-5" />
            <Button
              variant="destructive"
              size="sm"
              className="ml-auto gap-1.5"
              onClick={() => setBulkDeleteOpen(true)}
            >
              <Trash2 className="h-4 w-4" />
              Удалить выбранные ({selected.size})
            </Button>
          </>
        )}
      </div>

      {/* Match list */}
      {isLoading ? (
        <div className="flex items-center justify-center py-20 text-muted-foreground">
          <Loader2 className="mr-2 h-5 w-5 animate-spin" /> Загрузка матчей…
        </div>
      ) : !entries || entries.length === 0 ? (
        <Card className="border-dashed">
          <CardContent className="flex flex-col items-center justify-center py-16 text-center">
            <div className="mb-3 flex h-14 w-14 items-center justify-center rounded-2xl bg-muted text-muted-foreground">
              <Database className="h-7 w-7" />
            </div>
            <h3 className="text-base font-bold">Архив пуст</h3>
            <p className="mt-1 max-w-sm text-sm text-muted-foreground">
              Сымитируйте матч на вкладке «Симуляция» и сохраните его — он появится здесь.
              {filters !== createArchiveFilters() && " Попробуйте сбросить фильтры."}
            </p>
          </CardContent>
        </Card>
      ) : (
        <div className="space-y-2">
          {entries.map((entry) => (
            <ArchiveRow
              key={entry.id}
              entry={entry}
              selected={selected.has(entry.id)}
              onSelect={() => toggleSelect(entry.id)}
              onView={() => setViewing(entry)}
              onToggleInclude={() =>
                toggleIncludeMut.mutate({
                  id: entry.id,
                  included: !entry.includedInStats,
                })
              }
              onDelete={() => setDeleteId(entry.id)}
            />
          ))}
        </div>
      )}

      {/* Detail dialog */}
      <Dialog open={!!viewing} onOpenChange={(o) => !o && setViewing(null)}>
        <DialogContent className="max-h-[88vh] max-w-3xl overflow-hidden p-0">
          <DialogHeader className="border-b border-border px-5 py-4">
            <DialogTitle className="text-base">Детали матча</DialogTitle>
          </DialogHeader>
          {viewing && <MatchDetail entry={viewing} />}
        </DialogContent>
      </Dialog>

      {/* Single delete confirm */}
      <AlertDialog open={!!deleteId} onOpenChange={(o) => !o && setDeleteId(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Удалить матч?</AlertDialogTitle>
            <AlertDialogDescription>
              Матч будет безвозвратно удалён из архива. Статистика пересчитается автоматически.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Отмена</AlertDialogCancel>
            <AlertDialogAction
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
              onClick={() => {
                if (deleteId) deleteMut.mutate(deleteId);
                setDeleteId(null);
              }}
            >
              Удалить
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      {/* Bulk delete confirm */}
      <AlertDialog open={bulkDeleteOpen} onOpenChange={setBulkDeleteOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Удалить {selected.size} матчей?</AlertDialogTitle>
            <AlertDialogDescription>
              Выбранные матчи будут безвозвратно удалены. Это действие нельзя отменить.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Отмена</AlertDialogCancel>
            <AlertDialogAction
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
              onClick={() => bulkDeleteMut.mutate([...selected])}
            >
              Удалить все ({selected.size})
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}

function ArchiveRow({
  entry,
  selected,
  onSelect,
  onView,
  onToggleInclude,
  onDelete,
}: {
  entry: MatchHistoryEntry;
  selected: boolean;
  onSelect: () => void;
  onView: () => void;
  onToggleInclude: () => void;
  onDelete: () => void;
}) {
  const aWon = entry.data?.winnerKey === "teamA";
  const teamA = entry.data?.teamA;
  const teamB = entry.data?.teamB;
  const maps = entry.data?.maps ?? [];

  return (
    <Card
      className={cn(
        "overflow-hidden transition-colors",
        selected ? "border-primary/60 bg-primary/5" : "hover:border-border/80",
        !entry.includedInStats && "opacity-60"
      )}
    >
      <CardContent className="flex items-center gap-3 p-3">
        <Checkbox checked={selected} onCheckedChange={onSelect} className="shrink-0" />

        {/* Teams + score */}
        <button onClick={onView} className="flex min-w-0 flex-1 items-center gap-3 text-left">
          <div className="flex min-w-0 items-center gap-2">
            <span className="text-xl">{teamA?.logo}</span>
            <div className="min-w-0">
              <p className="truncate text-sm font-bold">{teamA?.name}</p>
              <p className="text-[10px] text-muted-foreground">{teamA?.tag}</p>
            </div>
          </div>
          <ScorePill
            a={entry.data?.seriesScore?.teamA ?? 0}
            b={entry.data?.seriesScore?.teamB ?? 0}
            aWon={aWon}
            className="shrink-0 text-base"
          />
          <div className="flex min-w-0 items-center gap-2">
            <span className="text-xl">{teamB?.logo}</span>
            <div className="min-w-0">
              <p className="truncate text-sm font-bold">{teamB?.name}</p>
              <p className="text-[10px] text-muted-foreground">{teamB?.tag}</p>
            </div>
          </div>
        </button>

        {/* Meta */}
        <div className="hidden shrink-0 items-center gap-1.5 md:flex">
          <FormatBadge format={entry.data?.format ?? "BO3"} />
          <EventTypeBadge type={entry.eventType} />
          <StageBadge stage={entry.stage} />
        </div>

        {/* Tournament + date */}
        <div className="hidden w-44 shrink-0 lg:block">
          <p className="truncate text-xs font-medium">{entry.tournamentName}</p>
          <p className="text-[10px] text-muted-foreground">{entry.matchDate}</p>
        </div>

        {/* MVP */}
        <div className="hidden w-24 shrink-0 xl:block">
          {entry.mvp && entry.mvp !== "n/a" && (
            <div className="flex items-center gap-1 text-xs">
              <Trophy className="h-3 w-3 text-amber-400" />
              <span className="truncate font-medium">{entry.mvp}</span>
            </div>
          )}
        </div>

        {/* Actions */}
        <div className="flex shrink-0 items-center gap-1">
          <Button
            variant="ghost"
            size="icon"
            className="h-8 w-8"
            onClick={onToggleInclude}
            title={entry.includedInStats ? "Учтён в статистике" : "Исключён из статистики"}
          >
            {entry.includedInStats ? (
              <Check className="h-4 w-4 text-emerald-400" />
            ) : (
              <X className="h-4 w-4 text-muted-foreground" />
            )}
          </Button>
          <Button variant="ghost" size="icon" className="h-8 w-8" onClick={onView} title="Подробнее">
            <Eye className="h-4 w-4" />
          </Button>
          <Button
            variant="ghost"
            size="icon"
            className="h-8 w-8 text-muted-foreground hover:text-destructive"
            onClick={onDelete}
            title="Удалить"
          >
            <Trash2 className="h-4 w-4" />
          </Button>
        </div>
      </CardContent>

      {/* Mobile meta row */}
      <div className="flex flex-wrap items-center gap-1.5 border-t border-border/50 px-3 py-2 md:hidden">
        <FormatBadge format={entry.data?.format ?? "BO3"} />
        <EventTypeBadge type={entry.eventType} />
        <StageBadge stage={entry.stage} />
        <span className="ml-auto text-[10px] text-muted-foreground">{entry.matchDate}</span>
      </div>

      {/* Maps strip */}
      {maps.length > 0 && (
        <div className="flex flex-wrap items-center gap-1.5 border-t border-border/50 bg-muted/20 px-3 py-1.5">
          <MapIcon className="h-3 w-3 text-muted-foreground" />
          {maps.map((m, i) => (
            <Badge key={i} variant="outline" className="gap-1 text-[10px] font-medium">
              {m.mapName}
              <span className="font-mono text-muted-foreground">
                {m.score.teamA}:{m.score.teamB}
              </span>
            </Badge>
          ))}
        </div>
      )}
    </Card>
  );
}

function MatchDetail({ entry }: { entry: MatchHistoryEntry }) {
  const data = entry.data;
  if (!data) return null;
  const aWon = data.winnerKey === "teamA";

  return (
    <div className="max-h-[calc(88vh-4rem)] overflow-y-auto cs2-scroll">
      {/* Header */}
      <div className="grid grid-cols-[1fr_auto_1fr] items-center gap-4 bg-gradient-to-b from-card to-muted/30 p-5">
        <div className="flex items-center gap-2">
          <span className="text-2xl">{data.teamA.logo}</span>
          <div>
            <p className="font-bold">{data.teamA.name}</p>
            <p className="text-xs text-muted-foreground">{data.teamA.tag}</p>
          </div>
          {aWon && <Trophy className="ml-auto h-4 w-4 text-amber-400" />}
        </div>
        <div className="flex flex-col items-center">
          <div className="font-mono text-3xl font-black">
            <span className={aWon ? "text-emerald-400" : "text-muted-foreground"}>
              {data.seriesScore.teamA}
            </span>
            <span className="mx-1 text-muted-foreground/40">:</span>
            <span className={!aWon ? "text-emerald-400" : "text-muted-foreground"}>
              {data.seriesScore.teamB}
            </span>
          </div>
          <div className="mt-1 flex gap-1.5">
            <FormatBadge format={data.format} />
            <EventTypeBadge type={entry.eventType} />
          </div>
        </div>
        <div className="flex items-center justify-end gap-2">
          {!aWon && <Trophy className="mr-auto h-4 w-4 text-amber-400" />}
          <div className="text-right">
            <p className="font-bold">{data.teamB.name}</p>
            <p className="text-xs text-muted-foreground">{data.teamB.tag}</p>
          </div>
          <span className="text-2xl">{data.teamB.logo}</span>
        </div>
      </div>

      {/* Meta strip */}
      <div className="flex flex-wrap items-center gap-x-3 gap-y-1 border-b border-border bg-muted/20 px-5 py-2 text-xs text-muted-foreground">
        <span className="font-semibold text-foreground">{entry.tournamentName}</span>
        <span>·</span>
        <span>{entry.stage}</span>
        <span>·</span>
        <span>{entry.matchDate}</span>
        <span>·</span>
        <span>{mapsCount(data)} карт</span>
        {entry.mvp && entry.mvp !== "n/a" && (
          <>
            <span className="ml-auto">MVP:</span>
            <span className="font-bold text-amber-300">{entry.mvp}</span>
          </>
        )}
      </div>

      {/* Maps */}
      <div className="space-y-2 p-4">
        <h4 className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">Карты</h4>
        <div className="grid gap-2 sm:grid-cols-2 lg:grid-cols-3">
          {data.maps.map((m, i) => {
            const mAWon = m.winnerKey === "teamA";
            return (
              <div key={i} className="rounded-lg border border-border bg-card/60 p-3">
                <div className="mb-1.5 flex items-center justify-between">
                  <span className="text-sm font-bold">{m.mapName}</span>
                  <Badge variant="outline" className="text-[10px] capitalize text-muted-foreground">
                    {m.pickedBy === "decider" ? "decider" : `pick ${m.pickedBy === "teamA" ? data.teamA.tag : data.teamB.tag}`}
                  </Badge>
                </div>
                <div className="flex items-center justify-between font-mono text-lg font-bold">
                  <span className={mAWon ? "text-emerald-400" : "text-muted-foreground"}>
                    {m.score.teamA}
                  </span>
                  <span className="text-muted-foreground/40">:</span>
                  <span className={!mAWon ? "text-emerald-400" : "text-muted-foreground"}>
                    {m.score.teamB}
                  </span>
                </div>
                <div className="mt-1.5 flex justify-between text-[10px] text-muted-foreground">
                  <span>1-я: {m.halfBreakdown.firstHalfA}-{m.halfBreakdown.firstHalfB}</span>
                  <span>2-я: {m.halfBreakdown.secondHalfA}-{m.halfBreakdown.secondHalfB}</span>
                  {m.halfBreakdown.overtimes.length > 0 && (
                    <Badge variant="outline" className="border-amber-500/30 text-amber-300 text-[10px]">
                      OT ×{m.halfBreakdown.overtimes.length}
                    </Badge>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      </div>

      {/* Player stats */}
      <div className="border-t border-border p-4">
        <h4 className="mb-2 text-xs font-semibold uppercase tracking-wide text-muted-foreground">
          Статистика игроков
        </h4>
        <div className="overflow-x-auto cs2-scroll">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-border text-[11px] uppercase text-muted-foreground">
                <th className="px-2 py-1.5 text-left font-semibold">Игрок</th>
                <th className="px-2 py-1.5 text-center font-semibold">K</th>
                <th className="px-2 py-1.5 text-center font-semibold">D</th>
                <th className="px-2 py-1.5 text-center font-semibold">A</th>
                <th className="px-2 py-1.5 text-center font-semibold">ADR</th>
                <th className="px-2 py-1.5 text-center font-semibold">KAST</th>
                <th className="px-2 py-1.5 text-center font-semibold">Rating</th>
              </tr>
            </thead>
            <tbody>
              {data.players.map((p) => (
                <tr key={`${p.teamKey}:${p.id}`} className="border-b border-border/40 last:border-0">
                  <td className="px-2 py-1.5">
                    <span className="mr-1">{p === data.mvp && <Trophy className="inline h-3 w-3 text-amber-400" />}</span>
                    <span className="font-bold">{p.nickname}</span>
                    <span className="ml-1 text-[10px] text-muted-foreground">
                      {p.teamKey === "teamA" ? data.teamA.tag : data.teamB.tag} · {p.role}
                    </span>
                  </td>
                  <td className="px-2 py-1.5 text-center font-mono text-emerald-300">{p.kills}</td>
                  <td className="px-2 py-1.5 text-center font-mono text-red-300/80">{p.deaths}</td>
                  <td className="px-2 py-1.5 text-center font-mono text-muted-foreground">{p.assists}</td>
                  <td className="px-2 py-1.5 text-center font-mono">{p.adr}</td>
                  <td className="px-2 py-1.5 text-center font-mono">{p.kastPercent}%</td>
                  <td className={cn("px-2 py-1.5 text-center font-mono font-bold", ratingColor(p.rating))}>
                    {p.rating.toFixed(2)}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      {/* Highlights */}
      {data.highlights.length > 0 && (
        <div className="border-t border-border p-4">
          <h4 className="mb-2 text-xs font-semibold uppercase tracking-wide text-muted-foreground">
            Ключевые моменты
          </h4>
          <ul className="space-y-1">
            {data.highlights.map((h, i) => (
              <li key={i} className="text-sm text-muted-foreground">• {h}</li>
            ))}
          </ul>
        </div>
      )}
    </div>
  );
}

function mapsCount(data: MatchHistoryEntry["data"]): number {
  return data?.maps?.length ?? 0;
}

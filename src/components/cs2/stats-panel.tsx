"use client";

import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import {
  BarChart3,
  Users,
  Shield,
  Map as MapIcon,
  Trophy,
  Swords,
  Database,
  Wifi,
  HardDrive,
  Layers,
  Loader2,
  Target,
  Crosshair,
} from "lucide-react";

import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";
import type {
  ArchiveFilters,
  ArchiveOptions,
  AggregatedStats,
} from "@/lib/types";
import { createArchiveFilters } from "@/lib/archive";
import { FilterBar } from "./filter-bar";
import { ratingColor, SectionTitle } from "./ui-bits";
import { cn } from "@/lib/utils";

async function fetchStats(filters: ArchiveFilters): Promise<AggregatedStats> {
  const params = new URLSearchParams();
  Object.entries(filters).forEach(([k, v]) => {
    if (v && v !== "all") params.set(k, v);
  });
  const res = await fetch(`/api/stats?${params}`);
  if (!res.ok) throw new Error("Не удалось загрузить статистику");
  const data = await res.json();
  return data.stats;
}

async function fetchOptions(): Promise<ArchiveOptions> {
  const res = await fetch("/api/options");
  if (!res.ok) throw new Error("Не удалось загрузить опции");
  const data = await res.json();
  return data.options;
}

export function StatsPanel() {
  const [filters, setFilters] = useState<ArchiveFilters>(createArchiveFilters());
  const { data: options } = useQuery({ queryKey: ["options"], queryFn: fetchOptions });
  const { data: stats, isLoading } = useQuery({
    queryKey: ["stats", filters],
    queryFn: () => fetchStats(filters),
  });

  const o = stats?.overview;

  return (
    <div className="space-y-4">
      <FilterBar
        filters={filters}
        onChange={setFilters}
        options={options ?? { teams: [], tournaments: [], stages: [], maps: [], eventTypes: [] }}
      />

      {/* Overview cards */}
      <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-6">
        <OverviewCard
          icon={Database}
          label="Всего матчей"
          value={o?.totalMatches ?? 0}
          tone="default"
        />
        <OverviewCard
          icon={Check}
          label="В статистике"
          value={o?.includedMatches ?? 0}
          tone="emerald"
        />
        <OverviewCard
          icon={Layers}
          label="Карт сыграно"
          value={o?.totalMaps ?? 0}
          tone="amber"
        />
        <OverviewCard
          icon={Trophy}
          label="Турниров"
          value={o?.totalTournaments ?? 0}
          tone="default"
        />
        <OverviewCard
          icon={HardDrive}
          label="LAN"
          value={o?.lanMatches ?? 0}
          tone="amber"
        />
        <OverviewCard
          icon={Wifi}
          label="Online"
          value={o?.onlineMatches ?? 0}
          tone="teal"
        />
      </div>

      {isLoading ? (
        <div className="flex items-center justify-center py-20 text-muted-foreground">
          <Loader2 className="mr-2 h-5 w-5 animate-spin" /> Сбор статистики…
        </div>
      ) : !stats || o?.includedMatches === 0 ? (
        <Card className="border-dashed">
          <CardContent className="flex flex-col items-center justify-center py-16 text-center">
            <div className="mb-3 flex h-14 w-14 items-center justify-center rounded-2xl bg-muted text-muted-foreground">
              <BarChart3 className="h-7 w-7" />
            </div>
            <h3 className="text-base font-bold">Нет данных для статистики</h3>
            <p className="mt-1 max-w-sm text-sm text-muted-foreground">
              Сохраните матчи в архив (и убедитесь, что они учтены в статистике), чтобы здесь
              появились таблицы лидеров.
            </p>
          </CardContent>
        </Card>
      ) : (
        <Tabs defaultValue="players">
          <TabsList className="grid w-full grid-cols-2 sm:grid-cols-4">
            <TabsTrigger value="players" className="gap-1.5">
              <Users className="h-4 w-4" /> Игроки
            </TabsTrigger>
            <TabsTrigger value="teams" className="gap-1.5">
              <Shield className="h-4 w-4" /> Команды
            </TabsTrigger>
            <TabsTrigger value="maps" className="gap-1.5">
              <MapIcon className="h-4 w-4" /> Карты
            </TabsTrigger>
            <TabsTrigger value="tournaments" className="gap-1.5">
              <Trophy className="h-4 w-4" /> Турниры
            </TabsTrigger>
          </TabsList>

          <TabsContent value="players" className="mt-4">
            <PlayersTable stats={stats} />
          </TabsContent>
          <TabsContent value="teams" className="mt-4">
            <TeamsTable stats={stats} />
          </TabsContent>
          <TabsContent value="maps" className="mt-4">
            <MapsTable stats={stats} />
          </TabsContent>
          <TabsContent value="tournaments" className="mt-4">
            <TournamentsTable stats={stats} />
          </TabsContent>
        </Tabs>
      )}
    </div>
  );
}

function Check({ className }: { className?: string }) {
  return <span className={cn("inline-block", className)}>✓</span>;
}

function OverviewCard({
  icon: Icon,
  label,
  value,
  tone,
}: {
  icon: React.ComponentType<{ className?: string }>;
  label: string;
  value: number;
  tone: "default" | "emerald" | "amber" | "teal";
}) {
  const tones = {
    default: "text-foreground",
    emerald: "text-emerald-400",
    amber: "text-amber-400",
    teal: "text-teal-400",
  };
  return (
    <Card className="overflow-hidden">
      <CardContent className="p-3">
        <div className="flex items-center gap-2">
          <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-muted">
            <Icon className={cn("h-4 w-4", tones[tone])} />
          </div>
          <span className="text-[11px] leading-tight text-muted-foreground">{label}</span>
        </div>
        <p className={cn("mt-2 text-2xl font-black tabular-nums", tones[tone])}>{value}</p>
      </CardContent>
    </Card>
  );
}

function PlayersTable({ stats }: { stats: AggregatedStats }) {
  const rows = stats.players;
  return (
    <Card>
      <CardContent className="p-0">
        <div className="flex items-center gap-2 border-b border-border px-4 py-3">
          <SectionTitle icon={Users} title="Игроки" subtitle={`Лидерборд · ${rows.length} игроков`} />
        </div>
        <div className="max-h-[70vh] overflow-auto cs2-scroll">
          <table className="w-full text-sm">
            <thead className="sticky top-0 z-10 bg-muted/80 backdrop-blur">
              <tr className="text-[11px] uppercase tracking-wide text-muted-foreground">
                <th className="px-3 py-2 text-left font-semibold">#</th>
                <th className="px-3 py-2 text-left font-semibold">Игрок</th>
                <th className="px-2 py-2 text-center font-semibold">Серии</th>
                <th className="px-2 py-2 text-center font-semibold">K</th>
                <th className="px-2 py-2 text-center font-semibold">D</th>
                <th className="px-2 py-2 text-center font-semibold">A</th>
                <th className="px-2 py-2 text-center font-semibold">KD</th>
                <th className="px-2 py-2 text-center font-semibold">ADR</th>
                <th className="px-2 py-2 text-center font-semibold">KAST</th>
                <th className="px-2 py-2 text-center font-semibold">HS%</th>
                <th className="px-2 py-2 text-center font-semibold">Imp</th>
                <th className="px-2 py-2 text-center font-semibold">OpK</th>
                <th className="px-3 py-2 text-center font-semibold">Rating</th>
              </tr>
            </thead>
            <tbody>
              {rows.map((p, i) => (
                <tr key={p.key} className="border-b border-border/40 last:border-0 hover:bg-muted/20">
                  <td className="px-3 py-2 text-center font-mono text-xs text-muted-foreground">{i + 1}</td>
                  <td className="px-3 py-2">
                    <div className="flex items-center gap-2">
                      {i === 0 && <Trophy className="h-3.5 w-3.5 text-amber-400" />}
                      <div>
                        <span className="font-bold">{p.nickname}</span>
                        <div className="text-[10px] text-muted-foreground">
                          {p.teamLabel} · {p.role}
                        </div>
                      </div>
                    </div>
                  </td>
                  <td className="px-2 py-2 text-center font-mono text-muted-foreground">{p.seriesPlayed}</td>
                  <td className="px-2 py-2 text-center font-mono font-semibold text-emerald-300">{p.kills}</td>
                  <td className="px-2 py-2 text-center font-mono text-red-300/80">{p.deaths}</td>
                  <td className="px-2 py-2 text-center font-mono text-muted-foreground">{p.assists}</td>
                  <td className="px-2 py-2 text-center font-mono">{p.kd.toFixed(2)}</td>
                  <td className="px-2 py-2 text-center font-mono">{p.adr}</td>
                  <td className="px-2 py-2 text-center font-mono">{p.kastPercent}%</td>
                  <td className="px-2 py-2 text-center font-mono">{p.hsPercent}%</td>
                  <td className="px-2 py-2 text-center font-mono">{p.impact.toFixed(2)}</td>
                  <td className="px-2 py-2 text-center font-mono text-amber-300/80">{p.openingKills}</td>
                  <td className={cn("px-3 py-2 text-center font-mono text-base font-black", ratingColor(p.rating))}>
                    {p.rating.toFixed(2)}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </CardContent>
    </Card>
  );
}

function TeamsTable({ stats }: { stats: AggregatedStats }) {
  const rows = stats.teams;
  return (
    <Card>
      <CardContent className="p-0">
        <div className="border-b border-border px-4 py-3">
          <SectionTitle icon={Shield} title="Команды" subtitle={`Результаты серий и карт · ${rows.length} команд`} />
        </div>
        <div className="max-h-[70vh] overflow-auto cs2-scroll">
          <table className="w-full text-sm">
            <thead className="sticky top-0 z-10 bg-muted/80 backdrop-blur">
              <tr className="text-[11px] uppercase tracking-wide text-muted-foreground">
                <th className="px-3 py-2 text-left font-semibold">#</th>
                <th className="px-3 py-2 text-left font-semibold">Команда</th>
                <th className="px-2 py-2 text-center font-semibold">Серии W-L</th>
                <th className="px-2 py-2 text-center font-semibold">Win%</th>
                <th className="px-2 py-2 text-center font-semibold">Карты W-L</th>
                <th className="px-2 py-2 text-center font-semibold">Map%</th>
                <th className="px-2 py-2 text-center font-semibold">Раунды</th>
                <th className="px-2 py-2 text-center font-semibold">Diff</th>
                <th className="px-2 py-2 text-center font-semibold">CT%</th>
                <th className="px-2 py-2 text-center font-semibold">T%</th>
                <th className="px-3 py-2 text-center font-semibold">Турниров</th>
              </tr>
            </thead>
            <tbody>
              {rows.map((t, i) => (
                <tr key={t.id} className="border-b border-border/40 last:border-0 hover:bg-muted/20">
                  <td className="px-3 py-2 text-center font-mono text-xs text-muted-foreground">{i + 1}</td>
                  <td className="px-3 py-2">
                    <span className="font-bold">{t.name}</span>
                    <span className="ml-1.5 text-[10px] text-muted-foreground">{t.tag}</span>
                  </td>
                  <td className="px-2 py-2 text-center font-mono">
                    <span className="font-semibold text-emerald-300">{t.seriesWins}</span>
                    <span className="text-muted-foreground">-</span>
                    <span className="text-red-300/80">{t.seriesLosses}</span>
                  </td>
                  <td className="px-2 py-2 text-center font-mono font-semibold">{t.seriesWinRate}%</td>
                  <td className="px-2 py-2 text-center font-mono">
                    <span className="text-emerald-300">{t.mapsWon}</span>
                    <span className="text-muted-foreground">-</span>
                    <span className="text-red-300/80">{t.mapsLost}</span>
                  </td>
                  <td className="px-2 py-2 text-center font-mono">{t.mapWinRate}%</td>
                  <td className="px-2 py-2 text-center font-mono text-muted-foreground">
                    {t.roundsWon}:{t.roundsLost}
                  </td>
                  <td className={cn("px-2 py-2 text-center font-mono font-semibold", t.roundDiff >= 0 ? "text-emerald-400" : "text-red-400")}>
                    {t.roundDiff >= 0 ? "+" : ""}{t.roundDiff}
                  </td>
                  <td className="px-2 py-2 text-center font-mono text-teal-300/90">{t.ctWinRate}%</td>
                  <td className="px-2 py-2 text-center font-mono text-amber-300/90">{t.tWinRate}%</td>
                  <td className="px-3 py-2 text-center font-mono text-muted-foreground">{t.tournamentsCount}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </CardContent>
    </Card>
  );
}

function MapsTable({ stats }: { stats: AggregatedStats }) {
  const rows = stats.maps;
  return (
    <Card>
      <CardContent className="p-0">
        <div className="border-b border-border px-4 py-3">
          <SectionTitle icon={MapIcon} title="Карты" subtitle={`Метастата карт · ${rows.length} карт`} />
        </div>
        <div className="max-h-[70vh] overflow-auto cs2-scroll">
          <table className="w-full text-sm">
            <thead className="sticky top-0 z-10 bg-muted/80 backdrop-blur">
              <tr className="text-[11px] uppercase tracking-wide text-muted-foreground">
                <th className="px-3 py-2 text-left font-semibold">#</th>
                <th className="px-3 py-2 text-left font-semibold">Карта</th>
                <th className="px-2 py-2 text-center font-semibold">Сыграно</th>
                <th className="px-2 py-2 text-center font-semibold">Ср. раундов</th>
                <th className="px-2 py-2 text-center font-semibold">CT%</th>
                <th className="px-2 py-2 text-center font-semibold">T%</th>
                <th className="px-2 py-2 text-center font-semibold">Овертаймов</th>
                <th className="px-3 py-2 text-left font-semibold">Лучшая команда</th>
              </tr>
            </thead>
            <tbody>
              {rows.map((m, i) => (
                <tr key={m.mapName} className="border-b border-border/40 last:border-0 hover:bg-muted/20">
                  <td className="px-3 py-2 text-center font-mono text-xs text-muted-foreground">{i + 1}</td>
                  <td className="px-3 py-2 font-bold">{m.mapName}</td>
                  <td className="px-2 py-2 text-center font-mono font-semibold">{m.played}</td>
                  <td className="px-2 py-2 text-center font-mono">{m.averageRounds}</td>
                  <td className="px-2 py-2 text-center font-mono text-teal-300/90">{m.ctRoundWinRate}%</td>
                  <td className="px-2 py-2 text-center font-mono text-amber-300/90">{m.tRoundWinRate}%</td>
                  <td className="px-2 py-2 text-center font-mono">
                    {m.overtimeCount > 0 ? (
                      <Badge variant="outline" className="border-amber-500/30 text-amber-300">{m.overtimeCount}</Badge>
                    ) : (
                      <span className="text-muted-foreground">0</span>
                    )}
                  </td>
                  <td className="px-3 py-2">
                    <span className="font-medium">{m.topTeam}</span>
                    {m.topTeamWins > 0 && (
                      <span className="ml-1.5 text-[10px] text-muted-foreground">×{m.topTeamWins}</span>
                    )}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </CardContent>
    </Card>
  );
}

function TournamentsTable({ stats }: { stats: AggregatedStats }) {
  const rows = stats.tournaments;
  return (
    <Card>
      <CardContent className="p-0">
        <div className="border-b border-border px-4 py-3">
          <SectionTitle icon={Trophy} title="Турниры" subtitle={`Обзор турниров · ${rows.length} турниров`} />
        </div>
        <div className="max-h-[70vh] overflow-auto cs2-scroll">
          <table className="w-full text-sm">
            <thead className="sticky top-0 z-10 bg-muted/80 backdrop-blur">
              <tr className="text-[11px] uppercase tracking-wide text-muted-foreground">
                <th className="px-3 py-2 text-left font-semibold">#</th>
                <th className="px-3 py-2 text-left font-semibold">Турнир</th>
                <th className="px-2 py-2 text-center font-semibold">Матчей</th>
                <th className="px-2 py-2 text-center font-semibold">Карт</th>
                <th className="px-2 py-2 text-center font-semibold">LAN</th>
                <th className="px-2 py-2 text-center font-semibold">Online</th>
                <th className="px-2 py-2 text-center font-semibold">Участников</th>
                <th className="px-2 py-2 text-left font-semibold">Стадии</th>
                <th className="px-2 py-2 text-left font-semibold">Победитель</th>
                <th className="px-3 py-2 text-left font-semibold">Лучший MVP</th>
                <th className="px-2 py-2 text-center font-semibold">Дата</th>
              </tr>
            </thead>
            <tbody>
              {rows.map((t, i) => (
                <tr key={t.name} className="border-b border-border/40 last:border-0 hover:bg-muted/20">
                  <td className="px-3 py-2 text-center font-mono text-xs text-muted-foreground">{i + 1}</td>
                  <td className="px-3 py-2 font-bold">{t.name}</td>
                  <td className="px-2 py-2 text-center font-mono font-semibold">{t.matches}</td>
                  <td className="px-2 py-2 text-center font-mono text-muted-foreground">{t.maps}</td>
                  <td className="px-2 py-2 text-center font-mono text-amber-300/90">{t.lanMatches}</td>
                  <td className="px-2 py-2 text-center font-mono text-teal-300/90">{t.onlineMatches}</td>
                  <td className="px-2 py-2 text-center font-mono text-muted-foreground">{t.participantsCount}</td>
                  <td className="px-2 py-2 text-[10px] text-muted-foreground">{t.stagesLabel}</td>
                  <td className="px-2 py-2">
                    <span className="font-medium text-emerald-300">{t.topTeam}</span>
                    {t.topTeamWins > 0 && (
                      <span className="ml-1 text-[10px] text-muted-foreground">×{t.topTeamWins}</span>
                    )}
                  </td>
                  <td className="px-3 py-2">
                    {t.topMvp !== "-" ? (
                      <span className="font-medium text-amber-300">{t.topMvp}</span>
                    ) : (
                      <span className="text-muted-foreground">-</span>
                    )}
                  </td>
                  <td className="px-2 py-2 text-center font-mono text-xs text-muted-foreground">{t.latestDate}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </CardContent>
    </Card>
  );
}

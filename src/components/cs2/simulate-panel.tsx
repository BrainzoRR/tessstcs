"use client";

import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import {
  Play,
  Save,
  Trophy,
  Crosshair,
  Flame,
  Swords,
  Sparkles,
  Loader2,
  Users,
  Calendar,
} from "lucide-react";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";
import {
  MATCH_FORMATS,
  TOURNAMENT_STAGES,
  type MatchFormat,
  type MatchResults,
  type SimulateRequest,
} from "@/lib/types";
import { EventTypeBadge, FormatBadge, ratingColor, SectionTitle } from "./ui-bits";
import { cn } from "@/lib/utils";

interface TeamLite {
  id: string;
  name: string;
  tag: string;
  logo: string;
  region: string;
  strength: number;
  players: { id: string; nickname: string; role: string; isCaptain: boolean; composite: number }[];
}

async function fetchTeams(): Promise<TeamLite[]> {
  const res = await fetch("/api/teams");
  if (!res.ok) throw new Error("Не удалось загрузить команды");
  const data = await res.json();
  return data.teams;
}

async function simulateMatch(req: SimulateRequest & { save?: boolean }): Promise<{
  results: MatchResults;
  saved: boolean;
  id?: string;
}> {
  const res = await fetch("/api/simulate", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(req),
  });
  if (!res.ok) {
    const e = await res.json().catch(() => ({}));
    throw new Error(e.error ?? "Ошибка симуляции");
  }
  return res.json();
}

async function saveMatch(results: MatchResults) {
  const res = await fetch("/api/matches", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ results }),
  });
  if (!res.ok) {
    const e = await res.json().catch(() => ({}));
    throw new Error(e.error ?? "Не удалось сохранить");
  }
  return res.json();
}

export function SimulatePanel() {
  const qc = useQueryClient();
  const { data: teams, isLoading: teamsLoading } = useQuery({
    queryKey: ["teams"],
    queryFn: fetchTeams,
  });

  const [teamAId, setTeamAId] = useState("");
  const [teamBId, setTeamBId] = useState("");
  const [format, setFormat] = useState<MatchFormat>("BO3");
  const [tournamentName, setTournamentName] = useState("BLAST Premier");
  const [stage, setStage] = useState<string>("Group Stage");
  const [eventType, setEventType] = useState<"Online" | "LAN">("LAN");
  const [matchDate, setMatchDate] = useState(new Date().toISOString().slice(0, 10));
  const [results, setResults] = useState<MatchResults | null>(null);

  const simMut = useMutation({
    mutationFn: simulateMatch,
    onSuccess: (data) => {
      setResults(data.results);
      if (data.saved) {
        toast.success("Матч сохранён в архив");
        qc.invalidateQueries({ queryKey: ["matches"] });
        qc.invalidateQueries({ queryKey: ["stats"] });
        qc.invalidateQueries({ queryKey: ["options"] });
      } else {
        toast.success("Симуляция завершена");
      }
    },
    onError: (e: Error) => toast.error(e.message),
  });

  const saveMut = useMutation({
    mutationFn: saveMatch,
    onSuccess: () => {
      toast.success("Матч сохранён в архив");
      qc.invalidateQueries({ queryKey: ["matches"] });
      qc.invalidateQueries({ queryKey: ["stats"] });
      qc.invalidateQueries({ queryKey: ["options"] });
    },
    onError: (e: Error) => toast.error(e.message),
  });

  const canSim = teamAId && teamBId && teamAId !== teamBId && !simMut.isPending;

  const handleSimulate = (save: boolean) => {
    if (!canSim) return;
    simMut.mutate({
      teamAId,
      teamBId,
      format,
      tournamentName,
      stage,
      eventType,
      matchDate,
      save,
    });
  };

  const teamA = teams?.find((t) => t.id === teamAId);
  const teamB = teams?.find((t) => t.id === teamBId);

  return (
    <div className="grid gap-4 lg:grid-cols-[380px_1fr]">
      {/* Setup column */}
      <Card className="h-fit">
        <CardHeader>
          <SectionTitle
            icon={Swords}
            title="Настройка матча"
            subtitle="Выберите команды и условия"
          />
        </CardHeader>
        <CardContent className="space-y-4">
          {/* Team A */}
          <div>
            <Label className="mb-1.5 block text-xs font-medium text-muted-foreground">
              Команда A
            </Label>
            <Select value={teamAId} onValueChange={setTeamAId}>
              <SelectTrigger>
                <SelectValue placeholder="Выберите команду" />
              </SelectTrigger>
              <SelectContent>
                {(teams ?? []).map((t) => (
                  <SelectItem key={t.id} value={t.id} disabled={t.id === teamBId}>
                    <span className="mr-1.5">{t.logo}</span>
                    {t.name} <span className="text-muted-foreground">({t.tag})</span>
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
            {teamA && (
              <TeamMiniCard team={teamA} />
            )}
          </div>

          <div className="flex items-center justify-center">
            <span className="rounded-full border border-border bg-muted px-3 py-1 text-xs font-bold text-muted-foreground">
              VS
            </span>
          </div>

          {/* Team B */}
          <div>
            <Label className="mb-1.5 block text-xs font-medium text-muted-foreground">
              Команда B
            </Label>
            <Select value={teamBId} onValueChange={setTeamBId}>
              <SelectTrigger>
                <SelectValue placeholder="Выберите команду" />
              </SelectTrigger>
              <SelectContent>
                {(teams ?? []).map((t) => (
                  <SelectItem key={t.id} value={t.id} disabled={t.id === teamAId}>
                    <span className="mr-1.5">{t.logo}</span>
                    {t.name} <span className="text-muted-foreground">({t.tag})</span>
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
            {teamB && <TeamMiniCard team={teamB} />}
          </div>

          <Separator />

          {/* Format */}
          <div>
            <Label className="mb-1.5 block text-xs font-medium text-muted-foreground">
              Формат серии
            </Label>
            <div className="grid grid-cols-3 gap-2">
              {MATCH_FORMATS.map((f) => (
                <button
                  key={f}
                  onClick={() => setFormat(f)}
                  className={cn(
                    "rounded-lg border px-3 py-2 text-sm font-bold transition-colors",
                    format === f
                      ? "border-primary bg-primary/15 text-primary"
                      : "border-border bg-muted/40 text-muted-foreground hover:border-primary/40 hover:text-foreground"
                  )}
                >
                  {f}
                </button>
              ))}
            </div>
          </div>

          {/* Tournament meta */}
          <div>
            <Label className="mb-1.5 block text-xs font-medium text-muted-foreground">
              Турнир
            </Label>
            <Input
              value={tournamentName}
              onChange={(e) => setTournamentName(e.target.value)}
              placeholder="Название турнира"
            />
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <Label className="mb-1.5 block text-xs font-medium text-muted-foreground">
                Стадия
              </Label>
              <Select value={stage} onValueChange={setStage}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {TOURNAMENT_STAGES.map((s) => (
                    <SelectItem key={s} value={s}>
                      {s}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div>
              <Label className="mb-1.5 block text-xs font-medium text-muted-foreground">
                Тип
              </Label>
              <div className="grid grid-cols-2 gap-2">
                {(["Online", "LAN"] as const).map((t) => (
                  <button
                    key={t}
                    onClick={() => setEventType(t)}
                    className={cn(
                      "rounded-lg border px-2 py-2 text-xs font-bold transition-colors",
                      eventType === t
                        ? t === "LAN"
                          ? "border-amber-500/50 bg-amber-500/15 text-amber-300"
                          : "border-teal-500/50 bg-teal-500/15 text-teal-300"
                        : "border-border bg-muted/40 text-muted-foreground hover:text-foreground"
                    )}
                  >
                    {t}
                  </button>
                ))}
              </div>
            </div>
          </div>

          <div>
            <Label className="mb-1.5 block text-xs font-medium text-muted-foreground">
              <Calendar className="mr-1 inline h-3 w-3" />
              Дата матча
            </Label>
            <Input
              type="date"
              value={matchDate}
              onChange={(e) => setMatchDate(e.target.value)}
            />
          </div>

          <div className="flex flex-col gap-2 pt-1">
            <Button
              size="lg"
              className="w-full gap-2"
              disabled={!canSim}
              onClick={() => handleSimulate(false)}
            >
              {simMut.isPending ? (
                <Loader2 className="h-4 w-4 animate-spin" />
              ) : (
                <Play className="h-4 w-4" />
              )}
              Симулировать
            </Button>
            <Button
              size="lg"
              variant="secondary"
              className="w-full gap-2"
              disabled={!canSim}
              onClick={() => handleSimulate(true)}
            >
              {simMut.isPending ? (
                <Loader2 className="h-4 w-4 animate-spin" />
              ) : (
                <Save className="h-4 w-4" />
              )}
              Симулировать и сохранить
            </Button>
          </div>

          {teamsLoading && (
            <p className="text-center text-xs text-muted-foreground">Загрузка команд…</p>
          )}
        </CardContent>
      </Card>

      {/* Results column */}
      <div className="space-y-4">
        {!results ? (
          <Card className="flex min-h-[400px] flex-col items-center justify-center border-dashed">
            <CardContent className="py-16 text-center">
              <div className="mx-auto mb-4 flex h-16 w-16 items-center justify-center rounded-2xl bg-primary/10 text-primary">
                <Crosshair className="h-8 w-8" />
              </div>
              <h3 className="text-lg font-bold">Результаты появятся здесь</h3>
              <p className="mt-1 max-w-sm text-sm text-muted-foreground">
                Настройте команды и условия, затем нажмите «Симулировать». После — сохраните матч
                в архив для хранения статистики.
              </p>
            </CardContent>
          </Card>
        ) : (
          <ResultsDisplay
            results={results}
            onSave={() => saveMut.mutate(results)}
            saving={saveMut.isPending}
            saved={saveMut.isSuccess}
          />
        )}
      </div>
    </div>
  );
}

function TeamMiniCard({ team }: { team: TeamLite }) {
  return (
    <div className="mt-2 rounded-lg border border-border bg-muted/30 p-2.5">
      <div className="flex items-center gap-2">
        <span className="text-xl">{team.logo}</span>
        <div className="min-w-0 flex-1">
          <p className="truncate text-sm font-bold">{team.name}</p>
          <p className="text-xs text-muted-foreground">
            {team.tag} · {team.region} · сила {team.strength}
          </p>
        </div>
      </div>
      <div className="mt-2 flex flex-wrap gap-1">
        {team.players.map((p) => (
          <Badge
            key={p.id}
            variant="outline"
            className="gap-1 border-border/60 bg-background/40 text-[10px] font-medium"
          >
            {p.isCaptain && <span className="text-amber-400">★</span>}
            {p.nickname}
            <span className="text-muted-foreground">{p.role.slice(0, 3)}</span>
          </Badge>
        ))}
      </div>
    </div>
  );
}

function ResultsDisplay({
  results,
  onSave,
  saving,
  saved,
}: {
  results: MatchResults;
  onSave: () => void;
  saving: boolean;
  saved: boolean;
}) {
  const teamA = results.teamA;
  const teamB = results.teamB;
  const aWon = results.winnerKey === "teamA";

  return (
    <>
      {/* Scoreboard header */}
      <Card className="overflow-hidden">
        <CardContent className="p-0">
          <div className="grid grid-cols-[1fr_auto_1fr] items-center gap-4 bg-gradient-to-b from-card to-muted/30 p-5">
            {/* Team A */}
            <div className={cn("flex items-center gap-3", aWon ? "" : "opacity-70")}>
              <span className="text-3xl">{teamA.logo}</span>
              <div className="min-w-0">
                <p className="truncate text-lg font-extrabold">{teamA.name}</p>
                <p className="text-xs text-muted-foreground">{teamA.tag}</p>
              </div>
              {aWon && <Trophy className="ml-auto h-5 w-5 shrink-0 text-amber-400" />}
            </div>
            {/* Score */}
            <div className="flex flex-col items-center">
              <div className="flex items-center gap-2 font-mono text-4xl font-black">
                <span className={aWon ? "text-emerald-400" : "text-muted-foreground"}>
                  {results.seriesScore.teamA}
                </span>
                <span className="text-muted-foreground/40">:</span>
                <span className={!aWon ? "text-emerald-400" : "text-muted-foreground"}>
                  {results.seriesScore.teamB}
                </span>
              </div>
              <div className="mt-1 flex items-center gap-1.5">
                <FormatBadge format={results.format} />
                <EventTypeBadge type={results.tournament.eventType} />
              </div>
            </div>
            {/* Team B */}
            <div className={cn("flex items-center justify-end gap-3", !aWon ? "" : "opacity-70")}>
              {!aWon && <Trophy className="mr-auto h-5 w-5 shrink-0 text-amber-400" />}
              <div className="min-w-0 text-right">
                <p className="truncate text-lg font-extrabold">{teamB.name}</p>
                <p className="text-xs text-muted-foreground">{teamB.tag}</p>
              </div>
              <span className="text-3xl">{teamB.logo}</span>
            </div>
          </div>

          {/* Tournament strip */}
          <div className="flex flex-wrap items-center gap-x-3 gap-y-1 border-t border-border bg-muted/20 px-5 py-2.5 text-xs text-muted-foreground">
            <span className="font-semibold text-foreground">{results.tournament.name}</span>
            <span>·</span>
            <span>{results.tournament.stage}</span>
            <span>·</span>
            <span>{results.tournament.matchDate}</span>
            {results.mvp && (
              <>
                <span className="ml-auto">MVP:</span>
                <span className="font-bold text-amber-300">{results.mvp.nickname}</span>
                <span className={cn("font-mono", ratingColor(results.mvp.rating))}>
                  {results.mvp.rating}
                </span>
              </>
            )}
          </div>
        </CardContent>
      </Card>

      {/* Map scores */}
      <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
        {results.maps.map((map, i) => {
          const mapAWon = map.winnerKey === "teamA";
          return (
            <Card key={i} className="overflow-hidden">
              <CardContent className="p-4">
                <div className="mb-2 flex items-center justify-between">
                  <span className="text-sm font-bold">{map.mapName}</span>
                  <Badge variant="outline" className="text-[10px] capitalize text-muted-foreground">
                    {map.pickedBy === "decider" ? "decider" : `pick ${map.pickedBy === "teamA" ? teamA.tag : teamB.tag}`}
                  </Badge>
                </div>
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-1.5">
                    <span>{teamA.logo}</span>
                    <span className="text-xs font-semibold text-muted-foreground">{teamA.tag}</span>
                  </div>
                  <span
                    className={cn(
                      "font-mono text-2xl font-black",
                      mapAWon ? "text-emerald-400" : "text-muted-foreground"
                    )}
                  >
                    {map.score.teamA}
                  </span>
                  <span className="font-mono text-xs text-muted-foreground/40">:</span>
                  <span
                    className={cn(
                      "font-mono text-2xl font-black",
                      !mapAWon ? "text-emerald-400" : "text-muted-foreground"
                    )}
                  >
                    {map.score.teamB}
                  </span>
                  <div className="flex items-center gap-1.5">
                    <span className="text-xs font-semibold text-muted-foreground">{teamB.tag}</span>
                    <span>{teamB.logo}</span>
                  </div>
                </div>
                <div className="mt-2 flex items-center justify-between text-[10px] text-muted-foreground">
                  <span>
                    1-я полов: {map.halfBreakdown.firstHalfA}-{map.halfBreakdown.firstHalfB}
                  </span>
                  {map.halfBreakdown.overtimes.length > 0 && (
                    <Badge variant="outline" className="border-amber-500/30 text-amber-300 text-[10px]">
                      OT ×{map.halfBreakdown.overtimes.length}
                    </Badge>
                  )}
                </div>
              </CardContent>
            </Card>
          );
        })}
      </div>

      {/* Highlights */}
      {results.highlights.length > 0 && (
        <Card>
          <CardHeader className="pb-3">
            <SectionTitle icon={Sparkles} title="Ключевые моменты" />
          </CardHeader>
          <CardContent className="space-y-1.5">
            {results.highlights.map((h, i) => (
              <div key={i} className="flex items-start gap-2 text-sm">
                <Flame className="mt-0.5 h-4 w-4 shrink-0 text-amber-400" />
                <span className="text-muted-foreground">{h}</span>
              </div>
            ))}
          </CardContent>
        </Card>
      )}

      {/* Player scoreboard */}
      <Card>
        <CardHeader className="pb-3">
          <SectionTitle
            icon={Users}
            title="Статистика игроков"
            subtitle="Суммарно за серию"
            right={
              <Button size="sm" variant={saved ? "secondary" : "default"} onClick={onSave} disabled={saving} className="gap-1.5">
                {saving ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <Save className="h-3.5 w-3.5" />}
                {saved ? "Сохранено" : "В архив"}
              </Button>
            }
          />
        </CardHeader>
        <CardContent className="p-0">
          <div className="overflow-x-auto cs2-scroll">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-border bg-muted/30 text-[11px] uppercase tracking-wide text-muted-foreground">
                  <th className="px-3 py-2 text-left font-semibold">Игрок</th>
                  <th className="px-2 py-2 text-center font-semibold">K</th>
                  <th className="px-2 py-2 text-center font-semibold">D</th>
                  <th className="px-2 py-2 text-center font-semibold">A</th>
                  <th className="px-2 py-2 text-center font-semibold">KD</th>
                  <th className="px-2 py-2 text-center font-semibold">ADR</th>
                  <th className="px-2 py-2 text-center font-semibold">KAST</th>
                  <th className="px-2 py-2 text-center font-semibold">HS%</th>
                  <th className="px-2 py-2 text-center font-semibold">Imp</th>
                  <th className="px-3 py-2 text-center font-semibold">Rating</th>
                </tr>
              </thead>
              <tbody>
                {results.players.map((p) => {
                  const isA = p.teamKey === "teamA";
                  const team = isA ? teamA : teamB;
                  return (
                    <tr
                      key={`${p.teamKey}:${p.id}`}
                      className="border-b border-border/50 last:border-0 hover:bg-muted/20"
                    >
                      <td className="px-3 py-2">
                        <div className="flex items-center gap-2">
                          {p === results.mvp && <Trophy className="h-3.5 w-3.5 text-amber-400" />}
                          <span className="text-base">{team.logo}</span>
                          <div>
                            <span className="font-bold">{p.nickname}</span>
                            <span className="ml-1.5 text-[10px] text-muted-foreground">{p.role}</span>
                          </div>
                        </div>
                      </td>
                      <td className="px-2 py-2 text-center font-mono font-semibold text-emerald-300">{p.kills}</td>
                      <td className="px-2 py-2 text-center font-mono text-red-300/80">{p.deaths}</td>
                      <td className="px-2 py-2 text-center font-mono text-muted-foreground">{p.assists}</td>
                      <td className="px-2 py-2 text-center font-mono">{p.kd.toFixed(2)}</td>
                      <td className="px-2 py-2 text-center font-mono">{p.adr}</td>
                      <td className="px-2 py-2 text-center font-mono">{p.kastPercent}%</td>
                      <td className="px-2 py-2 text-center font-mono">{p.hsPercent}%</td>
                      <td className="px-2 py-2 text-center font-mono">{p.impact.toFixed(2)}</td>
                      <td className="px-3 py-2 text-center">
                        <span className={cn("font-mono text-base font-black", ratingColor(p.rating))}>
                          {p.rating.toFixed(2)}
                        </span>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </CardContent>
      </Card>
    </>
  );
}

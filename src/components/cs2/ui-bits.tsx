"use client";

import { cn } from "@/lib/utils";
import { Badge } from "@/components/ui/badge";

/** HLTV-style rating color. */
export function ratingColor(r: number): string {
  if (r >= 1.3) return "text-emerald-400";
  if (r >= 1.1) return "text-lime-400";
  if (r >= 0.95) return "text-amber-300";
  if (r >= 0.8) return "text-orange-400";
  return "text-red-400";
}

export function ratingBg(r: number): string {
  if (r >= 1.3) return "bg-emerald-500/15 text-emerald-300 border-emerald-500/30";
  if (r >= 1.1) return "bg-lime-500/15 text-lime-300 border-lime-500/30";
  if (r >= 0.95) return "bg-amber-500/15 text-amber-300 border-amber-500/30";
  if (r >= 0.8) return "bg-orange-500/15 text-orange-300 border-orange-500/30";
  return "bg-red-500/15 text-red-300 border-red-500/30";
}

export function EventTypeBadge({ type }: { type: string }) {
  const isLan = type === "LAN";
  return (
    <Badge
      variant="outline"
      className={cn(
        "gap-1 font-semibold uppercase tracking-wide",
        isLan
          ? "border-amber-500/40 bg-amber-500/10 text-amber-300"
          : "border-teal-500/30 bg-teal-500/5 text-teal-300/90"
      )}
    >
      <span className={cn("h-1.5 w-1.5 rounded-full", isLan ? "bg-amber-400" : "bg-teal-400")} />
      {isLan ? "LAN" : "Online"}
    </Badge>
  );
}

export function StageBadge({ stage }: { stage: string }) {
  const isPlayoff = /final|quarter|semi|play-?off/i.test(stage);
  return (
    <Badge
      variant="outline"
      className={cn(
        "font-medium",
        isPlayoff
          ? "border-rose-500/30 bg-rose-500/10 text-rose-300"
          : "border-zinc-500/30 bg-zinc-500/10 text-zinc-300"
      )}
    >
      {stage}
    </Badge>
  );
}

export function FormatBadge({ format }: { format: string }) {
  return (
    <Badge variant="outline" className="border-primary/40 bg-primary/10 text-primary font-mono">
      {format}
    </Badge>
  );
}

export function ScorePill({
  a,
  b,
  aWon,
  className,
}: {
  a: number;
  b: number;
  aWon: boolean;
  className?: string;
}) {
  return (
    <span className={cn("inline-flex items-center gap-1.5 font-mono text-sm font-bold", className)}>
      <span className={cn(aWon ? "text-emerald-400" : "text-muted-foreground")}>{a}</span>
      <span className="text-muted-foreground/50">:</span>
      <span className={cn(!aWon ? "text-emerald-400" : "text-muted-foreground")}>{b}</span>
    </span>
  );
}

export function SectionTitle({
  icon: Icon,
  title,
  subtitle,
  right,
}: {
  icon: React.ComponentType<{ className?: string }>;
  title: string;
  subtitle?: string;
  right?: React.ReactNode;
}) {
  return (
    <div className="flex items-start justify-between gap-3">
      <div className="flex items-center gap-2.5">
        <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-primary/10 text-primary">
          <Icon className="h-5 w-5" />
        </div>
        <div>
          <h2 className="text-base font-bold leading-tight">{title}</h2>
          {subtitle && <p className="text-xs text-muted-foreground">{subtitle}</p>}
        </div>
      </div>
      {right}
    </div>
  );
}

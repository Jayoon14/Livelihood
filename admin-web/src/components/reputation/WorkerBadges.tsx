import {
  Award,
  BadgeCheck,
  Crown,
  ShieldCheck,
  Sparkles,
  Star,
} from "lucide-react";

import { getWorkerReputation } from "../../services/reputationService";
import type {
  WorkerBadge,
  WorkerReputationMetrics,
} from "../../types/reputation";

interface Props {
  metrics: WorkerReputationMetrics;
  compact?: boolean;
  showScore?: boolean;
  maxBadges?: number;
  className?: string;
}

const toneClasses: Record<WorkerBadge["tone"], string> = {
  violet:
    "border-violet-200 bg-violet-50 text-violet-700 dark:border-violet-500/30 dark:bg-violet-500/10 dark:text-violet-300",
  amber:
    "border-amber-200 bg-amber-50 text-amber-700 dark:border-amber-500/30 dark:bg-amber-500/10 dark:text-amber-300",
  emerald:
    "border-emerald-200 bg-emerald-50 text-emerald-700 dark:border-emerald-500/30 dark:bg-emerald-500/10 dark:text-emerald-300",
  blue:
    "border-blue-200 bg-blue-50 text-blue-700 dark:border-blue-500/30 dark:bg-blue-500/10 dark:text-blue-300",
  cyan:
    "border-cyan-200 bg-cyan-50 text-cyan-700 dark:border-cyan-500/30 dark:bg-cyan-500/10 dark:text-cyan-300",
};

function BadgeIcon({
  badge,
  size,
}: {
  badge: WorkerBadge;
  size: number;
}) {
  switch (badge.icon) {
    case "crown":
      return <Crown size={size} />;
    case "star":
      return <Star size={size} fill="currentColor" />;
    case "shield":
      return <ShieldCheck size={size} />;
    case "award":
      return <Award size={size} />;
    case "sparkles":
      return <Sparkles size={size} />;
    default:
      return <BadgeCheck size={size} />;
  }
}

export default function WorkerBadges({
  metrics,
  compact = false,
  showScore = false,
  maxBadges = 3,
  className = "",
}: Props) {
  const reputation = getWorkerReputation(metrics);
  const badges = reputation.badges.slice(0, Math.max(0, maxBadges));

  if (!badges.length && !showScore) {
    return null;
  }

  return (
    <div className={`flex flex-wrap items-center gap-2 ${className}`}>
      {badges.map((item) => (
        <span
          key={item.id}
          title={item.description}
          className={`inline-flex items-center gap-1.5 rounded-full border font-bold ${toneClasses[item.tone]} ${
            compact ? "px-2.5 py-1 text-[11px]" : "px-3 py-1.5 text-xs"
          }`}
        >
          <BadgeIcon badge={item} size={compact ? 13 : 15} />
          {item.label}
        </span>
      ))}

      {showScore && (
        <span
          title="Reputation score based on verified ratings, completed jobs, and available performance data."
          className={`inline-flex items-center gap-1.5 rounded-full border border-slate-200 bg-slate-50 font-bold text-slate-700 dark:border-slate-700 dark:bg-slate-800 dark:text-slate-200 ${
            compact ? "px-2.5 py-1 text-[11px]" : "px-3 py-1.5 text-xs"
          }`}
        >
          <ShieldCheck size={compact ? 13 : 15} />
          {reputation.level} · {reputation.score}
        </span>
      )}
    </div>
  );
}

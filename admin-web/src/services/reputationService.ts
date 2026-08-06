import type {
  WorkerBadge,
  WorkerReputation,
  WorkerReputationMetrics,
} from "../types/reputation";

function clamp(value: number, minimum = 0, maximum = 100): number {
  return Math.min(maximum, Math.max(minimum, value));
}

function finite(value: unknown): number {
  const result = Number(value);
  return Number.isFinite(result) ? result : 0;
}

export function calculatePublicReputationScore(
  metrics: WorkerReputationMetrics,
): number {
  const rating = clamp(finite(metrics.averageRating), 0, 5);
  const completed = Math.max(0, finite(metrics.completedJobs));
  const reviews = Math.max(0, finite(metrics.reviewCount));

  return Number(
    clamp(
      (rating / 5) * 65 +
        Math.min(completed / 50, 1) * 25 +
        Math.min(reviews / 20, 1) * 10,
    ).toFixed(1),
  );
}

export function getWorkerReputation(
  metrics: WorkerReputationMetrics,
): WorkerReputation {
  const averageRating = finite(metrics.averageRating);
  const completedJobs = Math.max(0, Math.floor(finite(metrics.completedJobs)));
  const reviewCount = Math.max(0, Math.floor(finite(metrics.reviewCount)));
  const complaintRate =
    metrics.complaintRate === undefined
      ? undefined
      : Math.max(0, finite(metrics.complaintRate));
  const cancellationRate =
    metrics.cancellationRate === undefined
      ? undefined
      : Math.max(0, finite(metrics.cancellationRate));

  const score =
    metrics.performanceScore !== undefined
      ? Number(clamp(finite(metrics.performanceScore)).toFixed(1))
      : calculatePublicReputationScore(metrics);

  const badges: WorkerBadge[] = [];

  if (
    completedJobs >= 50 &&
    averageRating >= 4.8 &&
    score >= 85 &&
    (complaintRate === undefined || complaintRate <= 3)
  ) {
    badges.push({
      id: "elite",
      label: "Elite Worker",
      description:
        "At least 50 completed jobs, a 4.8+ rating, and an excellent performance score.",
      icon: "crown",
      tone: "violet",
    });
  }

  if (completedJobs >= 10 && reviewCount >= 5 && averageRating >= 4.7) {
    badges.push({
      id: "top_rated",
      label: "Top Rated",
      description:
        "Consistently receives excellent verified customer ratings.",
      icon: "star",
      tone: "amber",
    });
  }

  if (
    completedJobs >= 15 &&
    averageRating >= 4.5 &&
    score >= 75 &&
    (complaintRate === undefined || complaintRate <= 5) &&
    (cancellationRate === undefined || cancellationRate <= 10)
  ) {
    badges.push({
      id: "trusted",
      label: "Trusted",
      description:
        "Strong service history with reliable completion and customer feedback.",
      icon: "shield",
      tone: "emerald",
    });
  }

  if (completedJobs >= 25) {
    badges.push({
      id: "experienced",
      label: "Experienced",
      description: "Has successfully completed at least 25 jobs.",
      icon: "award",
      tone: "blue",
    });
  }

  if (completedJobs >= 3 && completedJobs < 15 && averageRating >= 4.5) {
    badges.push({
      id: "rising_star",
      label: "Rising Star",
      description:
        "A newer worker building a strong record of positive service.",
      icon: "sparkles",
      tone: "cyan",
    });
  }

  if (
    completedJobs >= 10 &&
    complaintRate !== undefined &&
    complaintRate <= 2
  ) {
    badges.push({
      id: "low_complaint",
      label: "Low Complaint Rate",
      description: "Maintains a complaint rate of 2% or lower.",
      icon: "badge",
      tone: "emerald",
    });
  }

  let level: WorkerReputation["level"] = "New";

  if (badges.some((item) => item.id === "elite")) {
    level = "Elite";
  } else if (badges.some((item) => item.id === "top_rated")) {
    level = "Top Rated";
  } else if (badges.some((item) => item.id === "trusted")) {
    level = "Trusted";
  } else if (
    badges.some((item) => item.id === "rising_star") ||
    completedJobs >= 3
  ) {
    level = "Rising";
  }

  return {
    level,
    score,
    badges,
    summary:
      completedJobs === 0
        ? "New worker building a service record."
        : `${completedJobs} completed ${
            completedJobs === 1 ? "job" : "jobs"
          } with a ${averageRating.toFixed(1)} average rating.`,
  };
}

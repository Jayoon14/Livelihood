export type WorkerBadgeId =
  | "elite"
  | "top_rated"
  | "trusted"
  | "experienced"
  | "rising_star"
  | "low_complaint";

export interface WorkerBadge {
  id: WorkerBadgeId;
  label: string;
  description: string;
  icon: "crown" | "star" | "shield" | "award" | "sparkles" | "badge";
  tone: "violet" | "amber" | "emerald" | "blue" | "cyan";
}

export interface WorkerReputationMetrics {
  averageRating: number;
  completedJobs: number;
  reviewCount?: number;
  performanceScore?: number;
  complaintRate?: number;
  cancellationRate?: number;
}

export interface WorkerReputation {
  level: "New" | "Rising" | "Trusted" | "Top Rated" | "Elite";
  score: number;
  badges: WorkerBadge[];
  summary: string;
}

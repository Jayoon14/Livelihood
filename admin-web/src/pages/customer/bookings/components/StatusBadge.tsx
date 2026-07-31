type Props = { status: string; className?: string };

const STATUS_STYLES: Record<string, string> = {
  Pending: "bg-amber-100 text-amber-800 ring-amber-200",
  Approved: "bg-blue-100 text-blue-800 ring-blue-200",
  "On Going": "bg-violet-100 text-violet-800 ring-violet-200",
  "Waiting Customer Confirmation": "bg-orange-100 text-orange-800 ring-orange-200",
  Completed: "bg-emerald-100 text-emerald-800 ring-emerald-200",
  Cancelled: "bg-rose-100 text-rose-800 ring-rose-200",
};

export default function StatusBadge({ status, className = "" }: Props) {
  const style = STATUS_STYLES[status] ?? "bg-slate-100 text-slate-700 ring-slate-200";
  return (
    <span className={`inline-flex items-center rounded-full px-3 py-1.5 text-xs font-bold ring-1 ring-inset ${style} ${className}`}>
      {status}
    </span>
  );
}

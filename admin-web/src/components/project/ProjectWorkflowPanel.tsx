import { useCallback, useEffect, useState } from "react";
import { Clock3, WalletCards, PlusCircle, Play, Square } from "lucide-react";
import { toast } from "sonner";
import {
  getPaymentByBooking,
  getPaymentTransactionSummary,
} from "../../services/paymentService";
import {
  createProjectRequest,
  decideProjectRequest,
  endProjectWork,
  getProjectWorkflow,
  startProjectWork,
  type ProjectRequest,
  type ProjectSession,
} from "../../services/projectWorkflowService";

type Props = {
  bookingId: number;
  role: "worker" | "customer";
  pricingType?: string | null;
  price?: number | string | null;
  onPayAdvance?: (amount: number) => void;
};
const money = (n: number) =>
  new Intl.NumberFormat("en-PH", { style: "currency", currency: "PHP" }).format(
    n,
  );
export default function ProjectWorkflowPanel({
  bookingId,
  role,
  pricingType,
  price,
  onPayAdvance,
}: Props) {
  const [sessions, setSessions] = useState<ProjectSession[]>([]),
    [requests, setRequests] = useState<ProjectRequest[]>([]),
    [paid, setPaid] = useState(0),
    [busy, setBusy] = useState(false),
    [kind, setKind] = useState<ProjectRequest["request_type"] | null>(null),
    [reason, setReason] = useState(""),
    [amount, setAmount] = useState(""),
    [days, setDays] = useState(""),
    [date, setDate] = useState("");
  const load = useCallback(async () => {
    try {
      const d = await getProjectWorkflow(bookingId);
      setSessions(d.sessions);
      setRequests(d.requests);
      const payment = await getPaymentByBooking(bookingId).catch(() => null);
      if (payment) {
        const summary = await getPaymentTransactionSummary(Number(payment.id));
        setPaid(summary.approvedAmount);
      } else setPaid(0);
    } catch (e) {
      toast.error(
        e instanceof Error ? e.message : "Unable to load project progress.",
      );
    }
  }, [bookingId]);
  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect
    void load();
  }, [load]);
  const open = sessions.find((x) => !x.ended_at);
  const worked = sessions.filter((x) => x.ended_at).length;
  const approvedAdvanceRequests = requests
    .filter((x) => x.request_type === "cash_advance" && x.status === "Approved")
    .reduce((s, x) => s + Number(x.amount || 0), 0);
  const remaining = Math.max(Number(price || 0) - paid, 0);
  const submit = async () => {
    if (!kind) return;
    setBusy(true);
    try {
      await createProjectRequest(bookingId, {
        request_type: kind,
        reason,
        amount: Number(amount) || undefined,
        additional_days: Number(days) || undefined,
        proposed_date: date || undefined,
      });
      toast.success("Request sent to customer.");
      setKind(null);
      setReason("");
      setAmount("");
      setDays("");
      setDate("");
      await load();
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Unable to send request.");
    } finally {
      setBusy(false);
    }
  };
  const act = async (fn: () => Promise<void>, msg: string) => {
    setBusy(true);
    try {
      await fn();
      toast.success(msg);
      await load();
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Action failed.");
    } finally {
      setBusy(false);
    }
  };
  return (
    <section className="mt-5 rounded-2xl border border-blue-200 bg-blue-50/60 p-4 dark:border-blue-900 dark:bg-blue-950/20">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <div>
          <h4 className="font-black text-slate-900 dark:text-white">
            Project Work
          </h4>
          <p className="text-sm text-slate-600 dark:text-slate-300">
            {worked} completed work day{worked === 1 ? "" : "s"}
            {open ? " · Working now" : ""}
          </p>
        </div>
        {pricingType === "fixed" && (
          <div className="text-right text-sm">
            <p>
              Fixed price: <b>{money(Number(price || 0))}</b>
            </p>
            <p>
              Paid so far: <b>{money(paid)}</b>
            </p>
            <p>
              Remaining: <b>{money(remaining)}</b>
            </p>
            {approvedAdvanceRequests > 0 && (
              <p className="text-xs text-slate-500">
                Approved advance request(s): {money(approvedAdvanceRequests)}
              </p>
            )}
          </div>
        )}
      </div>
      {role === "worker" && (
        <div className="mt-4 flex flex-wrap gap-2">
          {!open ? (
            <button
              disabled={busy}
              onClick={() =>
                void act(
                  () => startProjectWork(bookingId),
                  "Work session started.",
                )
              }
              className="rounded-xl bg-emerald-600 px-4 py-2 font-bold text-white"
            >
              <Play className="mr-2 inline h-4 w-4" />
              Start Work
            </button>
          ) : (
            <button
              disabled={busy}
              onClick={() => {
                const n = prompt("What did you accomplish today?") || "";
                if (n.trim())
                  void act(
                    () => endProjectWork(bookingId, n),
                    "Work day ended.",
                  );
              }}
              className="rounded-xl bg-slate-800 px-4 py-2 font-bold text-white"
            >
              <Square className="mr-2 inline h-4 w-4" />
              End Work
            </button>
          )}
          <button
            onClick={() => setKind("reschedule")}
            className="rounded-xl border bg-white px-3 py-2 font-bold dark:bg-slate-900"
          >
            Reschedule
          </button>
          <button
            onClick={() => setKind("extension")}
            className="rounded-xl border bg-white px-3 py-2 font-bold dark:bg-slate-900"
          >
            Request Extension
          </button>
          <button
            onClick={() => setKind("additional_work")}
            className="rounded-xl border bg-white px-3 py-2 font-bold dark:bg-slate-900"
          >
            Additional Work
          </button>
          {pricingType === "fixed" && (
            <button
              onClick={() => setKind("cash_advance")}
              className="rounded-xl border bg-white px-3 py-2 font-bold dark:bg-slate-900"
            >
              <WalletCards className="mr-1 inline h-4 w-4" />
              Request Cash Advance
            </button>
          )}
        </div>
      )}
      {kind && role === "worker" && (
        <div className="mt-3 grid gap-2 rounded-xl border bg-white p-3 dark:bg-slate-900">
          <b className="capitalize">{kind.replaceAll("_", " ")}</b>
          {(kind === "cash_advance" || kind === "additional_work") && (
            <input
              type="number"
              min="1"
              placeholder={
                kind === "cash_advance" ? "Advance amount" : "Additional cost"
              }
              value={amount}
              onChange={(e) => setAmount(e.target.value)}
              className="rounded-lg border p-2 dark:bg-slate-800"
            />
          )}
          {kind === "extension" && (
            <input
              type="number"
              min="1"
              placeholder="Additional days"
              value={days}
              onChange={(e) => setDays(e.target.value)}
              className="rounded-lg border p-2 dark:bg-slate-800"
            />
          )}
          {kind === "reschedule" && (
            <input
              type="date"
              value={date}
              onChange={(e) => setDate(e.target.value)}
              className="rounded-lg border p-2 dark:bg-slate-800"
            />
          )}
          <textarea
            placeholder="Reason / details"
            value={reason}
            onChange={(e) => setReason(e.target.value)}
            className="rounded-lg border p-2 dark:bg-slate-800"
          />
          <div className="flex gap-2">
            <button
              disabled={busy}
              onClick={() => void submit()}
              className="rounded-lg bg-blue-600 px-3 py-2 font-bold text-white"
            >
              Send Request
            </button>
            <button
              onClick={() => setKind(null)}
              className="rounded-lg border px-3 py-2"
            >
              Cancel
            </button>
          </div>
        </div>
      )}
      <div className="mt-4 space-y-2">
        {sessions.slice(0, 5).map((s) => (
          <div
            key={s.id}
            className="rounded-xl bg-white p-3 text-sm dark:bg-slate-900"
          >
            <Clock3 className="mr-2 inline h-4 w-4" />
            <b>{s.work_date}</b> ·{" "}
            {new Date(s.started_at).toLocaleTimeString([], {
              hour: "numeric",
              minute: "2-digit",
            })}{" "}
            –{" "}
            {s.ended_at
              ? new Date(s.ended_at).toLocaleTimeString([], {
                  hour: "numeric",
                  minute: "2-digit",
                })
              : "Working"}
            {s.progress_note && (
              <p className="mt-1 text-slate-600 dark:text-slate-300">
                {s.progress_note}
              </p>
            )}
          </div>
        ))}
        {requests.slice(0, 6).map((r) => (
          <div
            key={`r${r.id}`}
            className="rounded-xl border bg-white p-3 text-sm dark:bg-slate-900"
          >
            <div className="flex flex-wrap items-center justify-between gap-2">
              <span>
                <PlusCircle className="mr-2 inline h-4 w-4" />
                <b className="capitalize">
                  {r.request_type.replaceAll("_", " ")}
                </b>{" "}
                · {r.status}
                {r.amount ? ` · ${money(Number(r.amount))}` : ""}
                {r.additional_days ? ` · +${r.additional_days} day(s)` : ""}
                {r.proposed_date ? ` · ${r.proposed_date}` : ""}
              </span>
              {role === "customer" && r.status === "Pending" && (
                <span className="flex gap-2">
                  <button
                    disabled={busy}
                    onClick={() =>
                      void act(
                        () => decideProjectRequest(r.id, "Approved"),
                        "Request approved.",
                      )
                    }
                    className="rounded-lg bg-emerald-600 px-3 py-1.5 font-bold text-white"
                  >
                    Approve
                  </button>
                  <button
                    disabled={busy}
                    onClick={() =>
                      void act(
                        () => decideProjectRequest(r.id, "Declined"),
                        "Request declined.",
                      )
                    }
                    className="rounded-lg bg-red-600 px-3 py-1.5 font-bold text-white"
                  >
                    Decline
                  </button>
                </span>
              )}
              {role === "customer" &&
                r.request_type === "cash_advance" &&
                r.status === "Approved" &&
                r.amount &&
                onPayAdvance && (
                  <button
                    onClick={() => onPayAdvance(Number(r.amount))}
                    className="rounded-lg bg-blue-600 px-3 py-1.5 font-bold text-white"
                  >
                    Pay Advance
                  </button>
                )}
            </div>
            <p className="mt-1 text-slate-600 dark:text-slate-300">
              {r.reason}
            </p>
          </div>
        ))}
      </div>
    </section>
  );
}

import { runAuditedProcess, auditUiError, auditCaughtError } from "../../lib/processAudit";
import { useCallback, useEffect, useState } from "react";
import { CircleCheck, Gavel, Loader2, RefreshCw, Send, ShieldAlert } from "lucide-react";
import { toast } from "sonner";
import { getMyAppealableActions, getMyAppeals, submitAppeal } from "../../services/trustEnforcementService";
import type { EnforcementAction, EnforcementAppeal } from "../../types/enforcement";
interface Props {
    layout: React.ComponentType<{
        children: React.ReactNode;
    }>;
    role: "customer" | "worker";
}
const fmt = (v: string | null) => v ? new Date(v).toLocaleString("en-PH") : "No expiry";
export default function MyAppealsPage({ layout: Layout, role }: Props) {
    const [actions, setActions] = useState<EnforcementAction[]>([]);
    const [appeals, setAppeals] = useState<EnforcementAppeal[]>([]);
    const [loading, setLoading] = useState(true);
    const [selected, setSelected] = useState("");
    const [reason, setReason] = useState("");
    const [outcome, setOutcome] = useState("");
    const load = useCallback(async () => { try {
        setLoading(true);
        const [a, b] = await Promise.all([getMyAppealableActions(), getMyAppeals()]);
        setActions(a);
        setAppeals(b);
    }
    catch (e) {
        auditCaughtError({ module: "Appeals", process: "background operation", action: "EXECUTE" }, e);
        auditUiError({ module: "Appeals", process: "validation", action: "EXECUTE" }, toast.error, e instanceof Error ? e.message : "Unable to load appeals.");
    }
    finally {
        setLoading(false);
    } }, []);
    useEffect(() => {
        const timer = window.setTimeout(() => { void load(); }, 0);
        return () => window.clearTimeout(timer);
    }, [load]);
    async function send() {
        return await runAuditedProcess({ module: "Appeals", process: "send", action: "CREATE", parameters: {} }, async (__activityProcessScope) => { if (!selected || reason.trim().length < 20) {
            __activityProcessScope.failAndNotify(toast.error, "Select a penalty and enter at least 20 characters.");
            {
                __activityProcessScope.skipped();
                return;
            }
        } try {
            await submitAppeal({ enforcementId: selected, reason, requestedOutcome: outcome });
            toast.success("Appeal submitted.");
            setSelected("");
            setReason("");
            setOutcome("");
            await load();
        }
        catch (e) {
            __activityProcessScope.caught(e);
            __activityProcessScope.failAndNotify(toast.error, e instanceof Error ? e.message : "Unable to submit appeal.");
        } });
    }
    return <Layout><div className="mx-auto max-w-6xl space-y-6 p-4 sm:p-8"><header className="flex flex-wrap items-center justify-between gap-4"><div><p className="font-bold uppercase tracking-wider text-blue-600">Trust & Safety</p><h1 className="text-3xl font-black">My Appeals</h1><p className="mt-2 text-slate-500">Appeal only an eligible warning or suspension after an admin decision on your {role} account.</p></div><button onClick={() => void load()} className="flex items-center gap-2 rounded-xl border bg-white px-4 py-3 font-bold"><RefreshCw size={18}/>Refresh</button></header><div className="grid gap-3 sm:grid-cols-3"><div className="rounded-2xl border bg-white p-4"><ShieldAlert className="text-amber-600" size={20}/><p className="mt-2 font-black">1. Eligible decision</p><p className="mt-1 text-xs text-slate-500">Only warnings or suspensions eligible for review appear below.</p></div><div className="rounded-2xl border bg-white p-4"><Send className="text-blue-600" size={20}/><p className="mt-2 font-black">2. Send appeal</p><p className="mt-1 text-xs text-slate-500">Explain why the decision should change and your requested outcome.</p></div><div className="rounded-2xl border bg-white p-4"><CircleCheck className="text-emerald-600" size={20}/><p className="mt-2 font-black">3. Admin decision</p><p className="mt-1 text-xs text-slate-500">Track the appeal and read the final admin response here.</p></div></div>{loading ? <div className="flex min-h-64 items-center justify-center"><Loader2 className="animate-spin"/></div> : <><section className="rounded-3xl border bg-white p-6 shadow-sm"><h2 className="flex items-center gap-2 text-xl font-black"><Gavel className="text-blue-600"/>Submit an Appeal</h2>{actions.length === 0 ? <p className="mt-4 rounded-2xl bg-slate-50 p-5 text-slate-500">No active penalty is currently eligible for appeal.</p> : <div className="mt-5 grid gap-4"><select value={selected} onChange={e => setSelected(e.target.value)} className="rounded-xl border px-4 py-3"><option value="">Select warning or suspension</option>{actions.map(a => <option key={a.id} value={a.id}>{a.action_type} · {a.points} point(s) · {new Date(a.created_at).toLocaleDateString("en-PH")}</option>)}</select><textarea value={reason} onChange={e => setReason(e.target.value)} rows={5} className="rounded-xl border p-4" placeholder="Explain why the decision should be reviewed..."/><input value={outcome} onChange={e => setOutcome(e.target.value)} className="rounded-xl border px-4 py-3" placeholder="Requested outcome, e.g. lift suspension"/><button onClick={() => void send()} className="inline-flex items-center justify-center gap-2 rounded-xl bg-blue-600 px-5 py-3 font-bold text-white"><Send size={18}/>Submit Appeal</button></div>}</section><section className="rounded-3xl border bg-white p-6 shadow-sm"><h2 className="flex items-center gap-2 text-xl font-black"><ShieldAlert className="text-amber-600"/>Appeal History</h2><div className="mt-5 space-y-4">{appeals.length === 0 ? <p className="text-slate-500">No appeals submitted.</p> : appeals.map(a => <article key={a.id} className="rounded-2xl border p-5"><div className="flex flex-wrap justify-between gap-3"><div><p className="font-black capitalize">{a.enforcement?.action_type ?? "Enforcement"} Appeal</p><p className="mt-1 text-sm text-slate-500">Submitted {fmt(a.created_at)}</p></div><span className="h-fit rounded-full bg-blue-50 px-3 py-1 text-xs font-bold capitalize text-blue-700">{a.status.replaceAll("_", " ")}</span></div><p className="mt-4 text-sm leading-6 text-slate-700">{a.reason}</p>{a.admin_response && <div className="mt-4 rounded-xl bg-emerald-50 p-4 text-sm text-emerald-800"><b>Admin response:</b> {a.admin_response}</div>}</article>)}</div></section></>}</div></Layout>;
}

import { auditUiError, auditCaughtError } from "../../../lib/processAudit";
import { useCallback, useEffect, useMemo, useState } from "react";
import { AlertTriangle, Gavel, Loader2, RefreshCw, ShieldAlert } from "lucide-react";
import { toast } from "sonner";
import AdminLayout from "../../../layouts/AdminLayout";
import { getAdminAppeals, getAdminRiskProfiles, reviewAppeal } from "../../../services/trustEnforcementService";
import type { AccountRiskSummary, AppealStatus, EnforcementAppeal } from "../../../types/enforcement";
interface RiskProfile {
    id: string;
    first_name: string | null;
    last_name: string | null;
    email: string | null;
    role: string;
    status: string | null;
    risk: AccountRiskSummary | null;
}
export default function RiskManagement() {
    const [profiles, setProfiles] = useState<RiskProfile[]>([]);
    const [appeals, setAppeals] = useState<EnforcementAppeal[]>([]);
    const [loading, setLoading] = useState(true);
    const [search, setSearch] = useState("");
    const [profilePage, setProfilePage] = useState(1);
    const [profilePageInput, setProfilePageInput] = useState("1");
    const [appealPage, setAppealPage] = useState(1);
    const [appealPageInput, setAppealPageInput] = useState("1");
    const PROFILE_PAGE_SIZE = 10;
    const APPEAL_PAGE_SIZE = 5;
    const ADMIN_REVIEW_THRESHOLD = 10;
    const load = useCallback(async () => { try {
        setLoading(true);
        const [p, a] = await Promise.all([getAdminRiskProfiles(), getAdminAppeals()]);
        setProfiles(p);
        setAppeals(a);
    }
    catch (e) {
        auditCaughtError({ module: "Account Enforcement", process: "background operation", action: "EXECUTE" }, e);
        auditUiError({ module: "Account Enforcement", process: "validation", action: "EXECUTE" }, toast.error, e instanceof Error ? e.message : "Unable to load risk management.");
    }
    finally {
        setLoading(false);
    } }, []);
    useEffect(() => {
        const timer = window.setTimeout(() => { void load(); }, 0);
        return () => window.clearTimeout(timer);
    }, [load]);
    const filtered = useMemo(() => profiles.filter(p => `${p.first_name ?? ""} ${p.last_name ?? ""} ${p.email ?? ""}`.toLowerCase().includes(search.toLowerCase())).sort((a, b) => (b.risk?.warning_points ?? 0) - (a.risk?.warning_points ?? 0)), [profiles, search]);
    const profileTotalPages = Math.max(1, Math.ceil(filtered.length / PROFILE_PAGE_SIZE));
    const appealTotalPages = Math.max(1, Math.ceil(appeals.length / APPEAL_PAGE_SIZE));
    const paginatedProfiles = useMemo(() => filtered.slice((profilePage - 1) * PROFILE_PAGE_SIZE, profilePage * PROFILE_PAGE_SIZE), [filtered, profilePage]);
    const paginatedAppeals = useMemo(() => appeals.slice((appealPage - 1) * APPEAL_PAGE_SIZE, appealPage * APPEAL_PAGE_SIZE), [appeals, appealPage]);
    useEffect(() => {
        // eslint-disable-next-line react-hooks/set-state-in-effect
        setProfilePage(1); setProfilePageInput("1");
    }, [search]);
    useEffect(() => {
        const next = Math.min(profilePage, profileTotalPages);
        // eslint-disable-next-line react-hooks/set-state-in-effect
        if (next !== profilePage) setProfilePage(next);
        setProfilePageInput(String(next));
    }, [profilePage, profileTotalPages]);
    useEffect(() => {
        const next = Math.min(appealPage, appealTotalPages);
        // eslint-disable-next-line react-hooks/set-state-in-effect
        if (next !== appealPage) setAppealPage(next);
        setAppealPageInput(String(next));
    }, [appealPage, appealTotalPages]);
    function applyProfilePage() {
        const parsed = Number.parseInt(profilePageInput, 10);
        const next = Number.isFinite(parsed) ? Math.min(Math.max(parsed, 1), profileTotalPages) : profilePage;
        setProfilePage(next); setProfilePageInput(String(next));
    }
    function applyAppealPage() {
        const parsed = Number.parseInt(appealPageInput, 10);
        const next = Number.isFinite(parsed) ? Math.min(Math.max(parsed, 1), appealTotalPages) : appealPage;
        setAppealPage(next); setAppealPageInput(String(next));
    }
    async function decide(a: EnforcementAppeal, status: AppealStatus) { const response = window.prompt("Enter the appeal decision and explanation:"); if (!response)
        return; try {
        await reviewAppeal(a, status, response);
        toast.success("Appeal updated.");
        await load();
    }
    catch (e) {
        auditCaughtError({ module: "Account Enforcement", process: "decide", action: "EXECUTE" }, e);
        auditUiError({ module: "Account Enforcement", process: "decide", action: "EXECUTE" }, toast.error, e instanceof Error ? e.message : "Unable to review appeal.");
    } }
    return <AdminLayout><div className="space-y-6"><header className="rounded-3xl bg-gradient-to-r from-slate-950 to-indigo-900 p-4 sm:p-6 lg:p-7 text-white"><p className="font-bold uppercase tracking-wider text-blue-300">Trust & Safety</p><h1 className="mt-2 text-3xl font-black">Risk & Appeals Management</h1><p className="mt-2 text-slate-300">Track warning points, suspensions, repeat violations, and account appeals.</p></header>{loading ? <div className="flex min-h-64 items-center justify-center"><Loader2 className="animate-spin"/></div> : <><section className="rounded-3xl border bg-white p-6 shadow-sm"><div className="flex flex-wrap items-center justify-between gap-3"><h2 className="flex items-center gap-2 text-xl font-black"><ShieldAlert className="text-rose-600"/>Account Risk Profiles</h2><div className="flex w-full flex-col gap-2 sm:w-auto sm:flex-row"><input value={search} onChange={e => setSearch(e.target.value)} className="min-w-0 flex-1 rounded-xl border px-4 py-2 sm:w-64" placeholder="Search user..."/><button onClick={() => void load()} className="rounded-xl border p-3"><RefreshCw size={18}/></button></div></div><div className="mt-4 flex flex-wrap items-center justify-between gap-3 rounded-2xl border bg-slate-50 px-4 py-3"><p className="text-sm font-semibold text-slate-600">Showing {filtered.length === 0 ? 0 : (profilePage - 1) * PROFILE_PAGE_SIZE + 1}-{Math.min(profilePage * PROFILE_PAGE_SIZE, filtered.length)} of {filtered.length} risk profile(s)</p><div className="flex items-center gap-2"><button type="button" disabled={profilePage <= 1} onClick={() => setProfilePage(p => Math.max(1, p - 1))} className="rounded-lg border bg-white px-3 py-2 text-sm font-bold disabled:cursor-not-allowed disabled:opacity-40">Previous</button><span className="flex items-center gap-2 text-sm font-semibold text-slate-600">Page <input aria-label="Risk profiles page number" inputMode="numeric" value={profilePageInput} onChange={e => setProfilePageInput(e.target.value.replace(/\D/g, ""))} onBlur={applyProfilePage} onKeyDown={e => { if (e.key === "Enter") { e.currentTarget.blur(); applyProfilePage(); } if (e.key === "Escape") setProfilePageInput(String(profilePage)); }} className="w-14 rounded-lg border bg-white px-2 py-2 text-center font-black text-slate-900"/> of {profileTotalPages}</span><button type="button" disabled={profilePage >= profileTotalPages} onClick={() => setProfilePage(p => Math.min(profileTotalPages, p + 1))} className="rounded-lg border bg-white px-3 py-2 text-sm font-bold disabled:cursor-not-allowed disabled:opacity-40">Next</button></div></div><div className="mt-5 overflow-x-auto"><table className="w-full min-w-[760px] text-left text-sm"><thead className="border-b text-xs uppercase text-slate-500"><tr><th className="p-3">User</th><th>Role</th><th>Points</th><th>Warnings</th><th>Suspensions</th><th>Valid Cases</th><th>Risk</th></tr></thead><tbody>{paginatedProfiles.map(p => <tr key={p.id} className="border-b"><td className="p-3"><b>{[p.first_name, p.last_name].filter(Boolean).join(" ") || p.email}</b><p className="text-xs text-slate-500">{p.email}</p></td><td className="capitalize">{p.role}</td><td className="font-black">{p.risk?.warning_points ?? 0}{(p.risk?.warning_points ?? 0) >= ADMIN_REVIEW_THRESHOLD && <span className="ml-2 inline-flex rounded-full bg-rose-100 px-2 py-1 text-[10px] font-black uppercase tracking-wide text-rose-700">Admin Review</span>}</td><td>{p.risk?.warning_count ?? 0}</td><td>{p.risk?.suspension_count ?? 0}</td><td>{p.risk?.valid_case_count ?? 0}</td><td><span className={`rounded-full px-3 py-1 font-bold capitalize ${(p.risk?.warning_points ?? 0) >= ADMIN_REVIEW_THRESHOLD ? "bg-rose-100 text-rose-700" : "bg-amber-50 text-amber-700"}`}>{(p.risk?.warning_points ?? 0) >= ADMIN_REVIEW_THRESHOLD ? "high · admin review" : (p.risk?.risk_level ?? "low")}</span></td></tr>)}</tbody></table></div></section><section className="rounded-3xl border bg-white p-6 shadow-sm"><h2 className="flex items-center gap-2 text-xl font-black"><Gavel className="text-blue-600"/>Appeals Queue</h2><div className="mt-4 flex flex-wrap items-center justify-between gap-3 rounded-2xl border bg-slate-50 px-4 py-3"><p className="text-sm font-semibold text-slate-600">Showing {appeals.length === 0 ? 0 : (appealPage - 1) * APPEAL_PAGE_SIZE + 1}-{Math.min(appealPage * APPEAL_PAGE_SIZE, appeals.length)} of {appeals.length} appeal(s)</p><div className="flex items-center gap-2"><button type="button" disabled={appealPage <= 1} onClick={() => setAppealPage(p => Math.max(1, p - 1))} className="rounded-lg border bg-white px-3 py-2 text-sm font-bold disabled:cursor-not-allowed disabled:opacity-40">Previous</button><span className="flex items-center gap-2 text-sm font-semibold text-slate-600">Page <input aria-label="Appeals page number" inputMode="numeric" value={appealPageInput} onChange={e => setAppealPageInput(e.target.value.replace(/\D/g, ""))} onBlur={applyAppealPage} onKeyDown={e => { if (e.key === "Enter") { e.currentTarget.blur(); applyAppealPage(); } if (e.key === "Escape") setAppealPageInput(String(appealPage)); }} className="w-14 rounded-lg border bg-white px-2 py-2 text-center font-black text-slate-900"/> of {appealTotalPages}</span><button type="button" disabled={appealPage >= appealTotalPages} onClick={() => setAppealPage(p => Math.min(appealTotalPages, p + 1))} className="rounded-lg border bg-white px-3 py-2 text-sm font-bold disabled:cursor-not-allowed disabled:opacity-40">Next</button></div></div><div className="mt-5 space-y-4">{appeals.length === 0 ? <p className="text-slate-500">No appeals submitted.</p> : paginatedAppeals.map(a => <article key={a.id} className="rounded-2xl border p-5"><div className="flex flex-wrap justify-between gap-3"><div><p className="font-black">{[a.appellant?.first_name, a.appellant?.last_name].filter(Boolean).join(" ") || a.appellant?.email || "User"}</p><p className="text-sm text-slate-500 capitalize">{a.enforcement?.action_type} · {a.enforcement?.points ?? 0} point(s)</p></div><span className="rounded-full bg-blue-50 px-3 py-1 text-xs font-bold capitalize text-blue-700">{a.status.replaceAll("_", " ")}</span></div><p className="mt-4 text-sm leading-6">{a.reason}</p>{a.status === "submitted" || a.status === "under_review" ? <div className="mt-4 flex flex-wrap gap-2"><button onClick={() => void decide(a, "approved")} className="rounded-xl bg-emerald-600 px-4 py-2 font-bold text-white">Approve & Reverse</button><button onClick={() => void decide(a, "partially_approved")} className="rounded-xl bg-amber-500 px-4 py-2 font-bold text-white">Partially Approve</button><button onClick={() => void decide(a, "rejected")} className="rounded-xl bg-rose-600 px-4 py-2 font-bold text-white">Reject</button></div> : a.admin_response && <p className="mt-4 rounded-xl bg-slate-50 p-4 text-sm"><b>Decision:</b> {a.admin_response}</p>}</article>)}</div></section><div className="rounded-2xl border border-amber-200 bg-amber-50 p-5 text-sm text-amber-900"><AlertTriangle className="mr-2 inline" size={18}/><b>Risk guidance:</b> Warning points are indicators only. At <b>10 points</b>, the account is marked <b>High Risk · Admin Review</b>. The system does <b>not</b> automatically ban or suspend the account; the administrator reviews the violation history and decides the appropriate action.</div></>}</div></AdminLayout>;
}

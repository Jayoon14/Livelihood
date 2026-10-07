import { useCallback, useEffect, useState } from "react";
import { ArrowRight, BriefcaseBusiness, CalendarDays, Check, CircleCheckBig, Clock3, FolderKanban, MapPin, Plus, Users, WalletCards, X } from "lucide-react";
import { toast } from "sonner";
import CustomerLayout from "../../../layouts/CustomerLayout";
import {
  acceptApplicant, createProject, decideProjectCompletion, getAttendance,
  getMyCustomerProjects, getProjectApplications, getProjectPayments, getTeam,
  markProjectPaymentPaid, reassignProjectLeader, rejectApplicant, startProject, updateProjectWorkerSlots,
  type Attendance, type ProjectApplication, type ProjectPayment, type ProjectPost, type TeamMember,
} from "../../../services/projectMarketplaceService";

const PROJECT_DRAFT_KEY = "serbisyoGo.customer.projectDraft.v1";
const PROJECT_MODAL_OPEN_KEY = "serbisyoGo.customer.projectPostModalOpen.v1";
const EMPTY_FORM = {
  title: "", description: "", category: "", location: "", start_date: "",
  expected_start_time: "08:00", estimated_days: "5", workers_needed: "2",
  pricing_type: "daily" as "daily" | "hourly" | "fixed", rate: "",
};

const money = (n: number) => new Intl.NumberFormat("en-PH", { style: "currency", currency: "PHP" }).format(n);

export default function Projects() {
  const [projects, setProjects] = useState<ProjectPost[]>([]);
  const [selected, setSelected] = useState<ProjectPost | null>(null);
  const [apps, setApps] = useState<ProjectApplication[]>([]);
  const [team, setTeam] = useState<TeamMember[]>([]);
  const [attendance, setAttendance] = useState<Attendance[]>([]);
  const [payments, setPayments] = useState<ProjectPayment[]>([]);
  const [showForm, setShowForm] = useState(() => {
    try { return sessionStorage.getItem(PROJECT_MODAL_OPEN_KEY) === "true"; }
    catch { return false; }
  });
  const [busy, setBusy] = useState(false);
  const [form, setForm] = useState(() => {
    try {
      const saved = localStorage.getItem(PROJECT_DRAFT_KEY);
      return saved ? { ...EMPTY_FORM, ...JSON.parse(saved) } : { ...EMPTY_FORM };
    } catch { return { ...EMPTY_FORM }; }
  });

  const loadDetails = useCallback(async (project: ProjectPost) => {
    const [a, t, l, pay] = await Promise.all([
      getProjectApplications(project.id), getTeam(project.id), getAttendance(project.id), getProjectPayments(project.id),
    ]);
    setApps(a); setTeam(t); setAttendance(l); setPayments(pay);
  }, []);

  const refresh = useCallback(async () => {
    const p = await getMyCustomerProjects();
    setProjects(p);
    if (selected) {
      const fresh = p.find((x) => x.id === selected.id) ?? null;
      setSelected(fresh);
      if (fresh) await loadDetails(fresh);
    }
  }, [selected, loadDetails]);

  useEffect(() => { void getMyCustomerProjects().then(setProjects).catch(() => toast.error("Unable to load projects.")); }, []);

  useEffect(() => {
    try { localStorage.setItem(PROJECT_DRAFT_KEY, JSON.stringify(form)); } catch { /* storage may be unavailable */ }
  }, [form]);

  useEffect(() => {
    try { sessionStorage.setItem(PROJECT_MODAL_OPEN_KEY, String(showForm)); } catch { /* storage may be unavailable */ }
  }, [showForm]);

  function closePostModal() {
    setShowForm(false);
    try { sessionStorage.removeItem(PROJECT_MODAL_OPEN_KEY); } catch { /* storage may be unavailable */ }
  }

  async function open(project: ProjectPost) {
    setSelected(project);
    try { await loadDetails(project); }
    catch (e) { toast.error(e instanceof Error ? e.message : "Unable to load project details."); }
  }

  async function run(fn: () => Promise<void>, msg: string) {
    setBusy(true);
    try { await fn(); toast.success(msg); await refresh(); }
    catch (e) { toast.error(e instanceof Error ? e.message : "Action failed."); }
    finally { setBusy(false); }
  }

  async function post() {
    if (!form.title.trim() || !form.description.trim() || !form.category.trim() || !form.location.trim() || !form.start_date || !Number(form.rate)) {
      toast.error("Complete all required project fields."); return;
    }
    await run(async () => {
      await createProject({ ...form, title: form.title.trim(), description: form.description.trim(), category: form.category.trim(), location: form.location.trim(), estimated_days: Number(form.estimated_days), workers_needed: Number(form.workers_needed), rate: Number(form.rate) });
      closePostModal();
      setForm({ ...EMPTY_FORM });
      try { localStorage.removeItem(PROJECT_DRAFT_KEY); } catch { /* storage may be unavailable */ }
    }, "Project posted.");
  }

  const openProjects = projects.filter((project) => project.status !== "Completed" && project.status !== "Cancelled").length;
  const completedProjects = projects.filter((project) => project.status === "Completed").length;

  return <CustomerLayout><div className="space-y-6 pb-8">
    <section className="overflow-hidden rounded-3xl border border-slate-200 bg-gradient-to-br from-white via-blue-50/70 to-emerald-50/70 p-5 shadow-sm dark:border-slate-800 dark:from-slate-900 dark:via-slate-900 dark:to-emerald-950/20 md:p-7">
      <div className="flex flex-col gap-5 lg:flex-row lg:items-center lg:justify-between">
        <div className="max-w-2xl">
          <div className="mb-3 inline-flex items-center gap-2 rounded-full border border-blue-100 bg-white/80 px-3 py-1 text-xs font-black uppercase tracking-[0.16em] text-blue-700 shadow-sm dark:border-blue-900 dark:bg-slate-900 dark:text-blue-300"><FolderKanban className="h-3.5 w-3.5"/>Project Center</div>
          <h1 className="text-3xl font-black tracking-tight text-slate-950 dark:text-white md:text-4xl">Manage your projects in one place</h1>
          <p className="mt-2 max-w-xl text-sm leading-6 text-slate-600 dark:text-slate-400">Post multi-worker jobs, build the right team, monitor daily work, and keep project payments organized.</p>
        </div>
        <button onClick={() => setShowForm(true)} className="inline-flex items-center justify-center gap-2 rounded-2xl bg-blue-600 px-5 py-3 font-black text-white shadow-lg shadow-blue-600/20 transition hover:-translate-y-0.5 hover:bg-blue-700"><Plus className="h-5 w-5"/>Post a Project</button>
      </div>
      <div className="mt-6 grid gap-3 sm:grid-cols-3">
        <div className="rounded-2xl border border-white/80 bg-white/80 p-4 shadow-sm backdrop-blur dark:border-slate-800 dark:bg-slate-900/80"><div className="flex items-center justify-between"><span className="text-sm font-bold text-slate-500">Total Projects</span><BriefcaseBusiness className="h-5 w-5 text-blue-600"/></div><p className="mt-2 text-2xl font-black text-slate-950 dark:text-white">{projects.length}</p></div>
        <div className="rounded-2xl border border-white/80 bg-white/80 p-4 shadow-sm backdrop-blur dark:border-slate-800 dark:bg-slate-900/80"><div className="flex items-center justify-between"><span className="text-sm font-bold text-slate-500">Active / Open</span><Clock3 className="h-5 w-5 text-amber-600"/></div><p className="mt-2 text-2xl font-black text-slate-950 dark:text-white">{openProjects}</p></div>
        <div className="rounded-2xl border border-white/80 bg-white/80 p-4 shadow-sm backdrop-blur dark:border-slate-800 dark:bg-slate-900/80"><div className="flex items-center justify-between"><span className="text-sm font-bold text-slate-500">Completed</span><CircleCheckBig className="h-5 w-5 text-emerald-600"/></div><p className="mt-2 text-2xl font-black text-slate-950 dark:text-white">{completedProjects}</p></div>
      </div>
    </section>

    <div className="flex items-end justify-between gap-3">
      <div><h2 className="text-xl font-black text-slate-950 dark:text-white">Your Projects</h2><p className="mt-1 text-sm text-slate-500">Open a workspace to manage team, attendance, and payments.</p></div>
      {projects.length > 0 && <span className="hidden rounded-full bg-slate-100 px-3 py-1 text-xs font-bold text-slate-600 dark:bg-slate-800 dark:text-slate-300 sm:inline">{projects.length} project{projects.length === 1 ? "" : "s"}</span>}
    </div>

    {projects.length === 0 ? <div className="rounded-3xl border border-dashed border-slate-300 bg-white p-12 text-center shadow-sm dark:border-slate-700 dark:bg-slate-900"><div className="mx-auto flex h-14 w-14 items-center justify-center rounded-2xl bg-blue-50 text-blue-600 dark:bg-blue-950/40"><BriefcaseBusiness className="h-7 w-7"/></div><h3 className="mt-4 text-lg font-black">No projects yet</h3><p className="mx-auto mt-2 max-w-md text-sm text-slate-500">Create your first multi-worker project and start receiving applications from qualified workers.</p><button onClick={() => setShowForm(true)} className="mt-5 rounded-xl bg-blue-600 px-4 py-2.5 font-bold text-white hover:bg-blue-700"><Plus className="mr-1 inline h-4 w-4"/>Post your first project</button></div> :
      <div className="grid gap-5 md:grid-cols-2 2xl:grid-cols-3">{projects.map((p) => {
        const statusClass = p.status === "Completed" ? "bg-emerald-50 text-emerald-700 ring-emerald-200 dark:bg-emerald-950/40 dark:text-emerald-300" : p.status === "In Progress" ? "bg-blue-50 text-blue-700 ring-blue-200 dark:bg-blue-950/40 dark:text-blue-300" : p.status === "Completion Review" ? "bg-violet-50 text-violet-700 ring-violet-200 dark:bg-violet-950/40 dark:text-violet-300" : "bg-amber-50 text-amber-700 ring-amber-200 dark:bg-amber-950/40 dark:text-amber-300";
        return <article key={p.id} className="group overflow-hidden rounded-3xl border border-slate-200 bg-white shadow-sm transition duration-200 hover:-translate-y-1 hover:shadow-xl dark:border-slate-800 dark:bg-slate-900">
          <div className="h-1.5 bg-gradient-to-r from-blue-600 via-cyan-500 to-emerald-500"/>
          <div className="p-5">
            <div className="flex items-start justify-between gap-4"><div className="min-w-0"><p className="mb-1 text-xs font-black uppercase tracking-[0.14em] text-blue-600">{p.category}</p><h3 className="truncate text-lg font-black text-slate-950 dark:text-white">{p.title}</h3><p className="mt-1 flex items-center gap-1.5 text-sm text-slate-500"><MapPin className="h-4 w-4 shrink-0"/><span className="truncate">{p.location}</span></p></div><span className={`shrink-0 rounded-full px-2.5 py-1 text-xs font-black ring-1 ring-inset ${statusClass}`}>{p.status}</span></div>
            <div className="mt-5 grid grid-cols-3 gap-2">
              <div className="rounded-2xl bg-slate-50 p-3 dark:bg-slate-800/70"><Users className="mb-2 h-4 w-4 text-blue-600"/><p className="text-[11px] font-bold uppercase tracking-wide text-slate-400">Workers</p><p className="mt-0.5 font-black">{p.workers_needed}</p></div>
              <div className="rounded-2xl bg-slate-50 p-3 dark:bg-slate-800/70"><CalendarDays className="mb-2 h-4 w-4 text-emerald-600"/><p className="text-[11px] font-bold uppercase tracking-wide text-slate-400">Estimate</p><p className="mt-0.5 font-black">{p.estimated_days}d</p></div>
              <div className="rounded-2xl bg-slate-50 p-3 dark:bg-slate-800/70"><Clock3 className="mb-2 h-4 w-4 text-violet-600"/><p className="text-[11px] font-bold uppercase tracking-wide text-slate-400">Starts</p><p className="mt-0.5 truncate text-xs font-black">{p.start_date}</p></div>
            </div>
            <div className="mt-5 flex items-end justify-between gap-3 border-t border-slate-100 pt-4 dark:border-slate-800"><div><p className="flex items-center gap-1 text-xs font-bold uppercase tracking-wide text-slate-400"><WalletCards className="h-3.5 w-3.5"/>Project rate</p><p className="mt-1 text-xl font-black text-slate-950 dark:text-white">{money(Number(p.rate))} <span className="text-xs font-bold text-slate-500">{p.pricing_type === "daily" ? "/ day" : p.pricing_type === "hourly" ? "/ hour" : "fixed"}</span></p></div></div>
            <button onClick={() => void open(p)} className="mt-5 flex w-full items-center justify-between rounded-2xl bg-slate-950 px-4 py-3 font-black text-white transition group-hover:bg-blue-600 dark:bg-white dark:text-slate-950 dark:group-hover:bg-blue-500 dark:group-hover:text-white"><span>Manage Project</span><ArrowRight className="h-4 w-4 transition group-hover:translate-x-1"/></button>
          </div>
        </article>;
      })}</div>}

    {showForm && <div className="fixed inset-0 z-[100] flex items-center justify-center bg-slate-950/60 p-4 backdrop-blur-sm">
      <div className="max-h-[92vh] w-full max-w-2xl overflow-y-auto rounded-3xl bg-white p-5 shadow-2xl dark:bg-slate-900">
        <div className="mb-4 flex items-center justify-between"><div><h2 className="text-xl font-black">Post a Project</h2><p className="text-sm text-slate-500">Create a multi-worker project here.</p></div><button onClick={closePostModal} className="rounded-xl border p-2" aria-label="Close Post Project modal"><X className="h-5 w-5"/></button></div>
        <div className="grid gap-4 md:grid-cols-2">
          <label className="space-y-1.5"><span className="text-sm font-bold">Project Title <span className="text-red-500">*</span></span><input placeholder="e.g. Ceiling Installation – 2 Bedrooms" value={form.title} onChange={(e) => setForm({...form,title:e.target.value})} className="w-full rounded-xl border p-3 dark:bg-slate-800"/></label>
          <label className="space-y-1.5"><span className="text-sm font-bold">Category / Skill Needed <span className="text-red-500">*</span></span><input placeholder="e.g. Carpenter, Electrician" value={form.category} onChange={(e) => setForm({...form,category:e.target.value})} className="w-full rounded-xl border p-3 dark:bg-slate-800"/></label>
          <label className="space-y-1.5"><span className="text-sm font-bold">Project Location <span className="text-red-500">*</span></span><input placeholder="e.g. San Pedro, Laguna" value={form.location} onChange={(e) => setForm({...form,location:e.target.value})} className="w-full rounded-xl border p-3 dark:bg-slate-800"/></label>
          <label className="space-y-1.5"><span className="text-sm font-bold">Expected Start Date <span className="text-red-500">*</span></span><input type="date" value={form.start_date} onChange={(e) => setForm({...form,start_date:e.target.value})} className="w-full rounded-xl border p-3 dark:bg-slate-800"/></label>
          <label className="space-y-1.5"><span className="text-sm font-bold">Expected Start Time</span><input type="time" value={form.expected_start_time} onChange={(e) => setForm({...form,expected_start_time:e.target.value})} className="w-full rounded-xl border p-3 dark:bg-slate-800"/><span className="block text-xs text-slate-500">Used as the team's expected reporting time and for Late attendance.</span></label>
          <label className="space-y-1.5"><span className="text-sm font-bold">Estimated Duration (Days) <span className="text-red-500">*</span></span><input type="number" min="1" placeholder="e.g. 5" value={form.estimated_days} onChange={(e) => setForm({...form,estimated_days:e.target.value})} className="w-full rounded-xl border p-3 dark:bg-slate-800"/><span className="block text-xs text-slate-500">Estimate only; the project may finish earlier or be extended.</span></label>
          <label className="space-y-1.5"><span className="text-sm font-bold">Workers Needed <span className="text-red-500">*</span></span><input type="number" min="1" placeholder="e.g. 2" value={form.workers_needed} onChange={(e) => setForm({...form,workers_needed:e.target.value})} className="w-full rounded-xl border p-3 dark:bg-slate-800"/><span className="block text-xs text-slate-500">Total number of workers you want for this project.</span></label>
          <label className="space-y-1.5"><span className="text-sm font-bold">Pricing Type <span className="text-red-500">*</span></span><select value={form.pricing_type} onChange={(e) => setForm({...form,pricing_type:e.target.value as typeof form.pricing_type})} className="w-full rounded-xl border p-3 dark:bg-slate-800"><option value="daily">Daily Rate</option><option value="hourly">Hourly Rate</option><option value="fixed">Fixed Price</option></select><span className="block text-xs text-slate-500">Choose how workers will be paid for the project.</span></label>
          <label className="space-y-1.5"><span className="text-sm font-bold">{form.pricing_type === "fixed" ? "Project Price" : form.pricing_type === "hourly" ? "Rate per Worker / Hour" : "Rate per Worker / Day"} <span className="text-red-500">*</span></span><input type="number" min="1" placeholder={form.pricing_type === "fixed" ? "e.g. 15000" : form.pricing_type === "hourly" ? "e.g. 150" : "e.g. 1000"} value={form.rate} onChange={(e) => setForm({...form,rate:e.target.value})} className="w-full rounded-xl border p-3 dark:bg-slate-800"/></label>
          <label className="space-y-1.5 md:col-span-2"><span className="text-sm font-bold">Project Description <span className="text-red-500">*</span></span><textarea placeholder="Describe the work, scope, materials, requirements, and other important details workers should know before applying." value={form.description} onChange={(e) => setForm({...form,description:e.target.value})} className="min-h-28 w-full rounded-xl border p-3 dark:bg-slate-800"/><span className="block text-xs text-slate-500">Be specific so workers can decide if they are qualified before applying.</span></label>
          <p className="text-xs text-slate-500 md:col-span-2"><span className="font-bold text-red-500">*</span> Required fields</p>
          <button disabled={busy} onClick={() => void post()} className="rounded-xl bg-emerald-600 px-4 py-3 font-bold text-white md:col-span-2">Publish Project</button>
        </div>
      </div>
    </div>}

    {selected && <div className="fixed inset-0 z-[90] flex items-center justify-center bg-slate-950/60 p-3 backdrop-blur-sm" onMouseDown={(e) => { if (e.target === e.currentTarget) setSelected(null); }}>
      <div className="max-h-[94vh] w-full max-w-6xl overflow-y-auto rounded-3xl bg-slate-50 shadow-2xl dark:bg-slate-950">
        <div className="sticky top-0 z-10 flex items-start justify-between border-b bg-white/95 p-5 backdrop-blur dark:bg-slate-900/95"><div><h2 className="text-xl font-black">{selected.title}</h2><p className="text-sm text-slate-500">Project Workspace · {selected.location}</p></div><button onClick={() => setSelected(null)} className="rounded-xl border p-2"><X className="h-5 w-5"/></button></div>
        <div className="space-y-4 p-4 md:p-5">
          <section className="rounded-2xl border bg-white p-5 dark:bg-slate-900"><div className="flex flex-wrap justify-between gap-3"><div><p className="text-sm text-slate-500">Starts {selected.start_date} · expected {selected.expected_start_time || "—"}</p><p className="mt-3 max-w-3xl">{selected.description}</p></div><div className="text-right"><b>{team.length}/{selected.workers_needed} Team</b><p className="text-xs text-slate-500">Estimate: {selected.estimated_days} days (not a deadline)</p></div></div>
            <div className="mt-4 flex flex-wrap items-center gap-2"><label className="text-sm font-bold">Workers needed</label><input type="number" min={team.length || 1} defaultValue={selected.workers_needed} key={`${selected.id}-${selected.workers_needed}`} onBlur={(e) => { const n=Number(e.target.value); if(Number.isFinite(n)&&n!==selected.workers_needed) void run(()=>updateProjectWorkerSlots(selected.id,n),"Team capacity updated."); }} className="w-20 rounded-lg border px-2 py-1.5 dark:bg-slate-800"/><span className="text-xs text-slate-500">Increase to reopen worker slots.</span></div>
            {selected.status === "Open" && team.some((t) => t.role === "Leader") && <button disabled={busy} onClick={() => void run(()=>startProject(selected.id),"Project started.")} className="mt-4 rounded-xl bg-emerald-600 px-4 py-2 font-bold text-white">Finalize Team & Start Project</button>}
            {selected.status === "Completion Review" && <div className="mt-4 flex flex-wrap gap-2"><button onClick={() => void run(()=>decideProjectCompletion(selected.id,true),"Project completed.")} className="rounded-xl bg-emerald-600 px-4 py-2 font-bold text-white"><Check className="mr-1 inline h-4 w-4"/>Confirm Completed</button><button onClick={() => void run(()=>decideProjectCompletion(selected.id,false),"Project returned for more work.")} className="rounded-xl border px-4 py-2 font-bold">Needs More Work</button></div>}
          </section>

          <div className="grid gap-4 xl:grid-cols-2"><section className="rounded-2xl border bg-white p-4 dark:bg-slate-900"><div className="flex items-center justify-between gap-3"><h3 className="font-black"><Users className="mr-2 inline h-4 w-4"/>Team Members</h3><span className="rounded-full bg-slate-100 px-2.5 py-1 text-xs font-bold dark:bg-slate-800">{team.length}/{selected.workers_needed} Workers</span></div><p className="mt-1 text-xs text-slate-500">You can view every active member and reassign the Team Leader at any time.</p>{team.map((t)=><div key={t.id} className="mt-2 flex flex-wrap items-center justify-between gap-3 rounded-xl bg-slate-50 p-3 dark:bg-slate-800"><div><p className="font-bold">{t.worker_name}</p><p className="text-xs text-slate-500">{t.role === "Leader" ? <span className="font-bold text-blue-600">Team Leader</span> : "Team Member"} · Agreed rate {money(Number(t.agreed_rate))}</p></div><div className="flex items-center gap-2">{t.role === "Leader" ? <span className="rounded-lg bg-blue-100 px-3 py-1.5 text-xs font-black text-blue-700 dark:bg-blue-950/50 dark:text-blue-300">Current Leader</span> : <button disabled={busy} onClick={()=>{ if(window.confirm(`Make ${t.worker_name || "this member"} the new Team Leader? The current leader will remain in the team as a member.`)) void run(()=>reassignProjectLeader(selected.id,t.worker_id),`${t.worker_name || "Worker"} is now the Team Leader.`); }} className="rounded-lg border border-blue-200 bg-white px-3 py-1.5 text-xs font-bold text-blue-700 hover:bg-blue-50 disabled:opacity-50 dark:bg-slate-900">Make Team Leader</button>}</div></div>)}{team.length===0&&<p className="mt-3 text-sm text-slate-500">Accept applicants and select one Team Leader.</p>}</section>
            <section className="rounded-2xl border bg-white p-4 dark:bg-slate-900"><h3 className="font-black">Applicants</h3>{apps.filter((a)=>a.status==="Pending").map((a)=><div key={a.id} className="mt-2 rounded-xl bg-slate-50 p-3 dark:bg-slate-800"><b>{a.worker_name}</b><p className="text-sm">{a.message || "No message"}</p><p className="text-sm">Proposed: {a.proposed_rate ? money(Number(a.proposed_rate)) : "Use posted rate"}</p><div className="mt-2 flex flex-wrap gap-2"><button disabled={busy} onClick={()=>void run(()=>acceptApplicant(a,!team.some((t)=>t.role==="Leader"),Number(a.proposed_rate||selected.rate)),"Applicant accepted.")} className="rounded-lg bg-blue-600 px-3 py-1.5 text-sm font-bold text-white">Accept {team.some((t)=>t.role==="Leader") ? "as Member" : "as Team Leader"}</button>{!team.some((t)=>t.role==="Leader")&&<button disabled={busy} onClick={()=>void run(()=>acceptApplicant(a,false,Number(a.proposed_rate||selected.rate)),"Applicant accepted as member.")} className="rounded-lg border px-3 py-1.5 text-sm font-bold">Accept as Member</button>}<button disabled={busy} onClick={()=>void run(()=>rejectApplicant(a),"Application rejected.")} className="rounded-lg border px-3 py-1.5 text-sm font-bold">Reject</button></div></div>)}{!apps.some((a)=>a.status==="Pending")&&<p className="mt-3 text-sm text-slate-500">No pending applications.</p>}</section></div>

          <section className="rounded-2xl border bg-white p-4 dark:bg-slate-900"><h3 className="font-black"><Clock3 className="mr-2 inline h-4 w-4"/>Attendance & Logbook</h3><div className="mt-3 overflow-x-auto"><table className="w-full min-w-[760px] text-sm"><thead><tr className="text-left text-slate-500"><th className="p-2">Date</th><th>Worker</th><th>Status</th><th>Time In</th><th>Time Out</th><th>Hours</th><th>Accomplishment</th></tr></thead><tbody>{attendance.map((a)=><tr key={a.id} className="border-t"><td className="p-2">{a.work_date}</td><td>{a.worker_name}</td><td className={a.attendance_status === "Late" ? "font-bold text-amber-600" : "font-bold"}>{a.attendance_status}</td><td>{a.time_in ? new Date(a.time_in).toLocaleTimeString([], {hour:"2-digit",minute:"2-digit"}) : "—"}</td><td>{a.time_out ? new Date(a.time_out).toLocaleTimeString([], {hour:"2-digit",minute:"2-digit"}) : "—"}</td><td>{a.minutes_worked ? (a.minutes_worked/60).toFixed(2) : "—"}</td><td>{a.accomplishment || "—"}</td></tr>)}</tbody></table>{attendance.length===0&&<p className="py-4 text-center text-slate-500">Attendance appears here after workers time in.</p>}</div></section>

          <section className="rounded-2xl border bg-white p-4 dark:bg-slate-900"><h3 className="font-black">Worker Payments</h3>{payments.map((p)=><div key={p.id} className="mt-2 flex flex-wrap items-center justify-between gap-2 rounded-xl bg-slate-50 p-3 dark:bg-slate-800"><span><b>{p.worker_name}</b> · {p.payment_kind} · {money(Number(p.amount))}</span><div><b>{p.status}</b>{p.status === "Due" && <button disabled={busy} onClick={()=>void run(()=>markProjectPaymentPaid(p.id),"Payment marked as paid; waiting for worker confirmation.")} className="ml-3 rounded-lg bg-blue-600 px-3 py-1.5 text-sm font-bold text-white">Mark Paid</button>}</div></div>)}{payments.length===0&&<p className="mt-3 text-sm text-slate-500">Daily/hourly dues are generated after End Work for Today.</p>}</section>
        </div>
      </div>
    </div>}
  </div></CustomerLayout>;
}

import { supabase } from "../lib/supabase";

export type ProjectPricing = "daily" | "hourly" | "fixed";
export type ProjectPost = {
  id: number; customer_id: string; title: string; description: string; category: string; location: string;
  start_date: string; expected_start_time: string | null; estimated_days: number; workers_needed: number;
  pricing_type: ProjectPricing; rate: number; status: string; created_at: string; completed_at: string | null; source_booking_id?: number | null;
};
export type ProjectApplication = { id:number; project_id:number; worker_id:string; message:string; proposed_rate:number|null; status:string; created_at:string; worker_name?:string };
export type TeamMember = { id:number; project_id:number; worker_id:string; role:"Leader"|"Member"; agreed_rate:number; status:string; worker_name?:string };
export type Attendance = { id:number; project_id:number; worker_id:string; work_date:string; expected_time:string|null; time_in:string|null; time_out:string|null; minutes_worked:number; attendance_status:string; accomplishment:string|null; proof_url:string|null; worker_name?:string };
export type ProjectPayment = { id:number; project_id:number; worker_id:string; attendance_id:number|null; payment_kind:string; amount:number; status:string; worker_name?:string };
export type ProjectTask = { id:number; project_id:number; assigned_worker_id:string; created_by:string; title:string; instructions:string; target_date:string|null; priority:"Low"|"Normal"|"High"; status:"Not Started"|"In Progress"|"Done"; completion_note:string|null; created_at:string; completed_at:string|null; worker_name?:string };

type ProfileRow = { id:string; first_name?:string|null; middle_name?:string|null; last_name?:string|null; suffix?:string|null; email?:string|null };
export async function getCurrentProjectUserId(){ const {data:{user},error}=await supabase.auth.getUser(); if(error||!user) throw new Error("You must be signed in."); return user.id; }
async function uid(){ const {data:{user},error}=await supabase.auth.getUser(); if(error||!user) throw new Error("You must be signed in."); return user.id; }
function profileName(p:ProfileRow){
  return [p.first_name,p.middle_name,p.last_name,p.suffix].map(v=>v?.trim()).filter(Boolean).join(" ") || p.email?.trim() || "Worker";
}
async function names(ids:string[]){
  const unique=[...new Set(ids.filter(Boolean))]; if(!unique.length) return new Map<string,string>();
  const {data,error}=await supabase.from("profiles").select("id,first_name,middle_name,last_name,suffix,email").in("id",unique);
  if(error){ console.error("Unable to load project member names:", error); return new Map<string,string>(); }
  return new Map(((data||[]) as ProfileRow[]).map(p=>[p.id,profileName(p)]));
}
async function history(projectId:number,event:string,description:string){ const actor=await uid(); await supabase.from("project_history").insert({project_id:projectId,actor_id:actor,event_type:event,description}); }

export async function ensureBookingProject(bookingId:number){
  const {data,error}=await supabase.rpc("ensure_booking_project",{p_booking_id:bookingId});
  if(error) throw error;
  const projectId=Number(data);
  const {data:project,error:q}=await supabase.from("projects").select("*").eq("id",projectId).single();
  if(q||!project) throw q||new Error("Unable to load linked project.");
  return project as ProjectPost;
}
export async function updateProjectWorkerSlots(projectId:number,workersNeeded:number){
  const count=Math.max(1,Math.floor(workersNeeded));
  const {count:active,error:c}=await supabase.from("project_team_members").select("id",{count:"exact",head:true}).eq("project_id",projectId).eq("status","Active");
  if(c) throw c;
  if(count<(active||0)) throw new Error(`Workers needed cannot be below the ${active||0} active team member(s).`);
  const {error}=await supabase.from("projects").update({workers_needed:count}).eq("id",projectId);
  if(error) throw error;
  await history(projectId,"TEAM_SLOTS_UPDATED",`Customer set the project team capacity to ${count} worker(s).`);
}
export async function createProject(input:Omit<ProjectPost,"id"|"customer_id"|"status"|"created_at"|"completed_at">){
  const customer_id=await uid(); const {data,error}=await supabase.from("projects").insert({...input,customer_id,status:"Open"}).select("*").single(); if(error) throw error; await history(Number(data.id),"PROJECT_POSTED","Customer posted the project."); return data as ProjectPost;
}
export async function getMyCustomerProjects(){ const id=await uid(); const {data,error}=await supabase.from("projects").select("*").eq("customer_id",id).order("created_at",{ascending:false}); if(error) throw error; return (data||[]) as ProjectPost[]; }
export async function getAvailableProjects(){ const id=await uid(); const {data,error}=await supabase.from("projects").select("*").eq("status","Open").order("created_at",{ascending:false}); if(error) throw error; const {data:apps}=await supabase.from("project_applications").select("project_id").eq("worker_id",id); const applied=new Set((apps||[]).map(a=>Number(a.project_id))); return ((data||[]) as ProjectPost[]).filter(p=>!applied.has(p.id)); }
export async function getMyWorkerProjects(){ const id=await uid(); const {data:team,error}=await supabase.from("project_team_members").select("project_id").eq("worker_id",id).eq("status","Active"); if(error) throw error; const ids=(team||[]).map(t=>Number(t.project_id)); if(!ids.length) return []; const {data,error:q}=await supabase.from("projects").select("*").in("id",ids).order("created_at",{ascending:false}); if(q) throw q; return (data||[]) as ProjectPost[]; }
export async function applyToProject(projectId:number,message:string,proposedRate?:number){ const worker_id=await uid(); const {error}=await supabase.from("project_applications").insert({project_id:projectId,worker_id,message:message.trim(),proposed_rate:proposedRate||null,status:"Pending"}); if(error) throw error; await history(projectId,"WORKER_APPLIED","A worker applied to join the project."); }
export async function getProjectApplications(projectId:number){ const {data,error}=await supabase.from("project_applications").select("*").eq("project_id",projectId).order("created_at",{ascending:false}); if(error) throw error; const rows=(data||[]) as ProjectApplication[]; const map=await names(rows.map(r=>r.worker_id)); return rows.map(r=>({...r,worker_name:map.get(r.worker_id)||"Worker"})); }
export async function acceptApplicant(app:ProjectApplication,asLeader:boolean,rate:number){
  const {data:p,error:pe}=await supabase.from("projects").select("workers_needed").eq("id",app.project_id).single(); if(pe) throw pe;
  const {count}=await supabase.from("project_team_members").select("id",{count:"exact",head:true}).eq("project_id",app.project_id).eq("status","Active"); if((count||0)>=Number(p.workers_needed)) throw new Error("Project team is already full.");
  if(asLeader){ const {data:leader}=await supabase.from("project_team_members").select("id").eq("project_id",app.project_id).eq("role","Leader").eq("status","Active").maybeSingle(); if(leader) throw new Error("A Team Leader has already been selected."); }
  const {error}=await supabase.from("project_team_members").insert({project_id:app.project_id,worker_id:app.worker_id,role:asLeader?"Leader":"Member",agreed_rate:rate,status:"Active"}); if(error) throw error;
  const {error:u}=await supabase.from("project_applications").update({status:"Accepted"}).eq("id",app.id); if(u) throw u; await history(app.project_id,"WORKER_ACCEPTED",`${app.worker_name||"Worker"} joined as ${asLeader?"Team Leader":"Team Member"}.`);
}
export async function rejectApplicant(app:ProjectApplication){ const {error}=await supabase.from("project_applications").update({status:"Rejected"}).eq("id",app.id); if(error) throw error; await history(app.project_id,"APPLICATION_REJECTED",`${app.worker_name||"Worker"}'s application was rejected.`); }
export async function getTeam(projectId:number){ const {data,error}=await supabase.from("project_team_members").select("*").eq("project_id",projectId).eq("status","Active").order("role"); if(error) throw error; const rows=(data||[]) as TeamMember[]; const map=await names(rows.map(r=>r.worker_id)); return rows.map(r=>({...r,worker_name:map.get(r.worker_id)||"Worker"})); }
export async function reassignProjectLeader(projectId:number,newLeaderWorkerId:string){
  const {error}=await supabase.rpc("reassign_project_team_leader",{p_project_id:projectId,p_new_leader_worker_id:newLeaderWorkerId});
  if(error) throw error;
}
export async function startProject(projectId:number){ const team=await getTeam(projectId); if(!team.some(t=>t.role==="Leader")) throw new Error("Select a Team Leader first."); const {error}=await supabase.from("projects").update({status:"In Progress"}).eq("id",projectId); if(error) throw error; await history(projectId,"PROJECT_STARTED","Customer finalized the team and started the project."); }
export async function timeIn(project:ProjectPost){ const worker_id=await uid(); const now=new Date(); const expected=project.expected_start_time; let status="Present"; if(expected){ const [h,m]=expected.split(":").map(Number); const expectedDate=new Date(now); expectedDate.setHours(h,m,0,0); if(now.getTime()>expectedDate.getTime()+5*60_000) status="Late"; }
  const {error}=await supabase.from("project_attendance").insert({project_id:project.id,worker_id,work_date:now.toISOString().slice(0,10),expected_time:expected,time_in:now.toISOString(),attendance_status:status}); if(error) throw error; await history(project.id,"TIME_IN",`Worker timed in (${status}).`); }
export async function timeOut(project:ProjectPost,accomplishment:string){ const worker_id=await uid(); const today=new Date().toISOString().slice(0,10); const {data:a,error:q}=await supabase.from("project_attendance").select("*").eq("project_id",project.id).eq("worker_id",worker_id).eq("work_date",today).maybeSingle(); if(q) throw q; if(!a?.time_in||a.time_out) throw new Error("No open attendance for today."); const out=new Date(); const minutes=Math.max(1,Math.round((out.getTime()-new Date(a.time_in).getTime())/60000)); const {error}=await supabase.from("project_attendance").update({time_out:out.toISOString(),minutes_worked:minutes,accomplishment:accomplishment.trim()||"Work day completed."}).eq("id",a.id); if(error) throw error;
  const {data:member}=await supabase.from("project_team_members").select("agreed_rate").eq("project_id",project.id).eq("worker_id",worker_id).eq("status","Active").single(); const rate=Number(member?.agreed_rate||project.rate); if(project.pricing_type!=="fixed"){ const amount=project.pricing_type==="daily"?rate:(minutes/60)*rate; const {error:pay}=await supabase.from("project_worker_payments").insert({project_id:project.id,worker_id,attendance_id:a.id,payment_kind:project.pricing_type,amount:Number(amount.toFixed(2)),status:"Due"}); if(pay) throw pay; }
  await history(project.id,"END_WORK_TODAY","Worker ended today's work and saved an accomplishment log."); }
export async function getAttendance(projectId:number){ const {data,error}=await supabase.from("project_attendance").select("*").eq("project_id",projectId).order("work_date",{ascending:false}); if(error) throw error; const rows=(data||[]) as Attendance[]; const map=await names(rows.map(r=>r.worker_id)); return rows.map(r=>({...r,worker_name:map.get(r.worker_id)||"Worker"})); }
export async function getProjectPayments(projectId:number){ const {data,error}=await supabase.from("project_worker_payments").select("*").eq("project_id",projectId).order("created_at",{ascending:false}); if(error) throw error; const rows=(data||[]) as ProjectPayment[]; const map=await names(rows.map(r=>r.worker_id)); return rows.map(r=>({...r,worker_name:map.get(r.worker_id)||"Worker"})); }
export async function markProjectPaymentPaid(paymentId:number){ const {error}=await supabase.rpc("mark_project_payment_customer_paid",{p_payment_id:paymentId}); if(error) throw error; }
export async function confirmProjectPayment(paymentId:number){ const {error}=await supabase.rpc("confirm_project_payment_received",{p_payment_id:paymentId}); if(error) throw error; }

export async function getProjectTasks(projectId:number){
  const {data,error}=await supabase.from("project_tasks").select("*").eq("project_id",projectId).order("created_at",{ascending:false});
  if(error) throw error;
  const rows=(data||[]) as ProjectTask[]; const map=await names(rows.map(r=>r.assigned_worker_id));
  return rows.map(r=>({...r,worker_name:map.get(r.assigned_worker_id)||"Worker"}));
}
export async function createProjectTask(projectId:number,assignedWorkerId:string,title:string,instructions:string,targetDate:string|null,priority:ProjectTask["priority"]){
  const leaderId=await uid();
  const {data:leader,error:l}=await supabase.from("project_team_members").select("id").eq("project_id",projectId).eq("worker_id",leaderId).eq("role","Leader").eq("status","Active").maybeSingle();
  if(l) throw l; if(!leader) throw new Error("Only the Team Leader can assign tasks.");
  const {data:member,error:m}=await supabase.from("project_team_members").select("id").eq("project_id",projectId).eq("worker_id",assignedWorkerId).eq("status","Active").maybeSingle();
  if(m) throw m; if(!member) throw new Error("Select an active project team member.");
  const {error}=await supabase.from("project_tasks").insert({project_id:projectId,assigned_worker_id:assignedWorkerId,created_by:leaderId,title:title.trim(),instructions:instructions.trim(),target_date:targetDate||null,priority,status:"Not Started"});
  if(error) throw error; await history(projectId,"TASK_ASSIGNED",`Team Leader assigned task: ${title.trim()}.`);
}
export async function updateProjectTaskStatus(task:ProjectTask,status:ProjectTask["status"],completionNote=""){
  const userId=await uid();
  const {data:leader}=await supabase.from("project_team_members").select("id").eq("project_id",task.project_id).eq("worker_id",userId).eq("role","Leader").eq("status","Active").maybeSingle();
  if(task.assigned_worker_id!==userId&&!leader) throw new Error("Only the assigned worker or Team Leader can update this task.");
  const patch={status,completion_note:completionNote.trim()||null,completed_at:status==="Done"?new Date().toISOString():null};
  const {error}=await supabase.from("project_tasks").update(patch).eq("id",task.id); if(error) throw error;
  await history(task.project_id,"TASK_STATUS_UPDATED",`Task “${task.title}” changed to ${status}.`);
}
export async function requestProjectCompletion(projectId:number){ const {error}=await supabase.rpc("request_project_completion",{p_project_id:projectId}); if(error) throw error; await history(projectId,"COMPLETION_REQUESTED","Team Leader submitted the project for customer completion review."); }
export async function decideProjectCompletion(projectId:number,complete:boolean){ const {error}=await supabase.from("projects").update(complete?{status:"Completed",completed_at:new Date().toISOString()}:{status:"In Progress",completed_at:null}).eq("id",projectId); if(error) throw error; await history(projectId,complete?"PROJECT_COMPLETED":"NEEDS_MORE_WORK",complete?"Customer confirmed the project as completed.":"Customer requested more work."); }

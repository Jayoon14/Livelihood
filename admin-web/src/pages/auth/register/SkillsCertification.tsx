// Professional Skills & Certifications
import {
  Award,
  BadgeCheck,
  CheckCircle2,
  Hammer,
  Sparkles,
} from "lucide-react";
import { useRegisterStore } from "../../../store/registerStore";

const skills = [
  "Electrician","Plumber","Carpenter","Painter","Mason","Welder",
  "Mechanic","Driver","Cook","Gardener","Tailor","Housekeeper",
  "Aircon Technician","Computer Technician","Caregiver",
];

export default function SkillsCertification() {
  const { data, updateData, errors, clearError } = useRegisterStore();

  function toggleSkill(skill:string){
    if(data.skills.includes(skill)){
      updateData({skills:data.skills.filter(s=>s!==skill)});
    }else{
      updateData({skills:[...data.skills,skill]});
    }
    clearError("skills");
  }

  return (
    <div className="relative overflow-hidden rounded-[28px] border border-slate-200 bg-white shadow-[0_18px_55px_rgba(15,23,42,.06)] dark:border-slate-700 dark:bg-slate-900">

      <div
        className="absolute inset-0 opacity-[.035]"
        style={{
          backgroundImage:"linear-gradient(#2937f0 1px,transparent 1px),linear-gradient(90deg,#2937f0 1px,transparent 1px)",
          backgroundSize:"36px 36px"
        }}
      />

      <div className="relative border-b border-slate-200 bg-[linear-gradient(135deg,#f8faff,#eef3ff)] px-6 py-6 dark:border-slate-700">
        <div className="inline-flex items-center gap-2 rounded-full border border-indigo-100 bg-white px-3 py-1 text-[11px] font-black uppercase tracking-widest text-indigo-600">
          <Sparkles className="h-4 w-4"/>
          Step 4 • Skills
        </div>

        <h2
          className="mt-3 text-3xl font-black text-slate-900 dark:text-white"
          style={{fontFamily:"'Sora',sans-serif"}}
        >
          Skills & Certifications
        </h2>

        <p className="mt-2 max-w-2xl text-sm leading-6 text-slate-500 dark:text-slate-400">
          Select every service you can professionally perform. These skills
          help customers find the right worker.
        </p>

        <div className="mt-4 inline-flex items-center gap-2 rounded-full bg-indigo-50 px-3 py-1.5 text-xs font-bold text-indigo-700">
          <Award className="h-4 w-4"/>
          {data.skills.length} skill{data.skills.length!==1?"s":""} selected
        </div>
      </div>

      <div className="relative p-6">

        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {skills.map(skill=>{
            const selected=data.skills.includes(skill);

            return(
              <button
                key={skill}
                type="button"
                onClick={()=>toggleSkill(skill)}
                className={`
                  group rounded-2xl border p-5 text-left transition-all duration-200
                  ${selected
                    ?"border-indigo-500 bg-gradient-to-br from-[#2937F0] via-[#5B3DF1] to-[#3292EC] text-white shadow-lg shadow-indigo-500/25 scale-[1.02]"
                    :"border-slate-200 bg-white hover:border-indigo-300 hover:-translate-y-1 hover:shadow-lg dark:border-slate-700 dark:bg-slate-800"}
                `}
              >
                <div className="flex items-center justify-between">
                  <div className={`flex h-11 w-11 items-center justify-center rounded-xl ${
                    selected?"bg-white/20":"bg-indigo-50 text-indigo-600"
                  }`}>
                    <Hammer className="h-5 w-5"/>
                  </div>

                  {selected && <CheckCircle2 className="h-5 w-5"/>}
                </div>

                <h3 className="mt-5 font-black">{skill}</h3>

                <p className={`mt-2 text-xs leading-5 ${
                  selected?"text-white/85":"text-slate-500"
                }`}>
                  Available for professional service requests.
                </p>
              </button>
            )
          })}
        </div>

        {errors.skills && (
          <p className="mt-4 text-sm font-semibold text-rose-500">
            {errors.skills}
          </p>
        )}

        <div className="mt-8 rounded-3xl border border-indigo-100 bg-[linear-gradient(135deg,#eef2ff,#f8faff)] p-6 dark:border-indigo-500/20">
          <div className="flex items-center gap-3">
            <BadgeCheck className="h-6 w-6 text-indigo-600"/>
            <h3
              className="text-xl font-black text-slate-900 dark:text-white"
              style={{fontFamily:"'Sora',sans-serif"}}
            >
              Selected Skills
            </h3>
          </div>

          {data.skills.length===0 ?(
            <div className="mt-6 rounded-2xl border border-dashed border-slate-300 bg-white p-8 text-center">
              <Hammer className="mx-auto h-10 w-10 text-slate-300"/>
              <p className="mt-3 font-bold text-slate-500">
                No skills selected yet
              </p>
              <p className="mt-1 text-sm text-slate-400">
                Choose one or more skills above.
              </p>
            </div>
          ):(
            <div className="mt-6 flex flex-wrap gap-3">
              {data.skills.map(skill=>(
                <span
                  key={skill}
                  className="inline-flex items-center gap-2 rounded-full bg-indigo-100 px-4 py-2 text-sm font-bold text-indigo-700"
                >
                  <CheckCircle2 className="h-4 w-4"/>
                  {skill}
                </span>
              ))}
            </div>
          )}
        </div>

      </div>
    </div>
  );
}
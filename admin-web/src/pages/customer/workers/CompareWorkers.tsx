import { auditCaughtError } from "../../../lib/processAudit";
import { useCallback, useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { ArrowLeftRight, BadgeCheck, BriefcaseBusiness, Check, ChevronRight, CircleDollarSign, Scale, Sparkles, Star, Trophy, UserRound, } from "lucide-react";
import CustomerLayout from "../../../layouts/CustomerLayout";
import { getFeaturedWorkers, getCompleteWorkerProfile, type CompleteWorkerProfile, type WorkerWithServices, } from "../../../services/workerService";
import { getWorkerAverageRating } from "../../../services/reviewService";
function winner(left: number, right: number) {
    if (left > right)
        return "left";
    if (right > left)
        return "right";
    return "tie";
}
function getWorkerName(worker: CompleteWorkerProfile | null): string {
    if (!worker)
        return "Select a worker";
    return ([worker.profile?.first_name, worker.profile?.middle_name, worker.profile?.last_name]
        .filter(Boolean)
        .join(" ") || "Worker");
}
function getWorkerImage(worker: CompleteWorkerProfile | null): string {
    return (worker?.profile?.profile_picture ||
        worker?.profile?.profile_image ||
        worker?.profile?.avatar_url ||
        "https://placehold.co/160x160?text=Worker");
}
function formatPrice(value: number | string | null | undefined): string {
    const amount = Number(value);
    if (!Number.isFinite(amount)) {
        return "Not set";
    }
    return new Intl.NumberFormat("en-PH", {
        style: "currency",
        currency: "PHP",
        maximumFractionDigits: 0,
    }).format(amount);
}
interface WorkerPanelProps {
    label: string;
    workerId: string;
    worker: CompleteWorkerProfile | null;
    rating: number;
    workers: WorkerWithServices[];
    otherWorkerId: string;
    ratingWinner: "left" | "right" | "tie";
    experienceWinner: "left" | "right" | "tie";
    priceWinner: string;
    side: "left" | "right";
    onWorkerChange: (workerId: string) => void;
    onBook: () => void;
    onViewProfile: () => void;
}
function WorkerPanel({ label, workerId, worker, rating, workers, otherWorkerId, ratingWinner, experienceWinner, priceWinner, side, onWorkerChange, onBook, onViewProfile, }: WorkerPanelProps) {
    const isRatingWinner = ratingWinner === side;
    const isExperienceWinner = experienceWinner === side;
    const isPriceWinner = priceWinner === side;
    const hasAnyWin = isRatingWinner || isExperienceWinner || isPriceWinner;
    const experienceCount = worker?.workExperience?.length ?? 0;
    const primaryService = worker?.services?.[0];
    const profileStatus = String(worker?.profile?.status ?? "").toLowerCase();
    const verified = profileStatus === "approved";
    return (<article className={`min-w-0 overflow-hidden rounded-[1.5rem] border bg-white shadow-sm transition duration-200 dark:bg-slate-900 sm:rounded-[1.75rem] ${hasAnyWin
            ? "border-emerald-300 ring-1 ring-emerald-100 dark:border-emerald-700 dark:ring-emerald-900/40"
            : "border-slate-200 dark:border-slate-700"}`}>
      <div className="bg-linear-to-br from-slate-950 via-blue-950 to-indigo-900 p-4 text-white sm:p-5 lg:p-6">
        <div className="flex items-center justify-between gap-3">
          <div>
            <p className="text-[10px] font-black uppercase tracking-[0.18em] text-blue-200 sm:text-xs">
              {label}
            </p>
            <h2 className="mt-1 text-lg font-black sm:text-xl">Choose Worker</h2>
          </div>

          {hasAnyWin && worker && (<span className="inline-flex items-center gap-1 rounded-full bg-emerald-400/15 px-2.5 py-1 text-[10px] font-black text-emerald-200 ring-1 ring-emerald-300/30 sm:text-xs">
              <Trophy size={13}/>
              Top match
            </span>)}
        </div>

        <select value={workerId} onChange={(event) => onWorkerChange(event.target.value)} className="mt-4 min-h-11 w-full rounded-xl border border-white/15 bg-white px-3 text-sm font-semibold text-slate-900 outline-none transition focus:border-blue-300 focus:ring-4 focus:ring-blue-400/15">
          <option value="">Select Worker</option>
          {workers.map((candidate) => (<option key={candidate.id} value={candidate.id} disabled={String(candidate.id) === otherWorkerId}>
              {candidate.first_name} {candidate.last_name}
            </option>))}
        </select>
      </div>

      {!worker ? (<div className="flex min-h-72 flex-col items-center justify-center px-5 py-10 text-center sm:min-h-80">
          <div className="flex h-16 w-16 items-center justify-center rounded-2xl bg-blue-50 text-blue-600 dark:bg-blue-500/10 dark:text-blue-300">
            <UserRound size={30}/>
          </div>
          <h3 className="mt-4 font-black text-slate-900 dark:text-white">
            No worker selected
          </h3>
          <p className="mt-2 max-w-xs text-sm leading-6 text-slate-500 dark:text-slate-400">
            Choose a worker above to compare their service, rating, experience, and price.
          </p>
        </div>) : (<div className="p-4 sm:p-5 lg:p-6">
          <div className="flex min-w-0 items-center gap-3 sm:gap-4">
            <img src={getWorkerImage(worker)} alt={getWorkerName(worker)} className="h-16 w-16 shrink-0 rounded-2xl border-2 border-white object-cover shadow-md ring-1 ring-slate-200 dark:border-slate-800 dark:ring-slate-700 sm:h-20 sm:w-20"/>

            <div className="min-w-0 flex-1">
              <div className="flex flex-wrap items-center gap-2">
                <h3 className="truncate text-lg font-black text-slate-900 dark:text-white sm:text-xl">
                  {getWorkerName(worker)}
                </h3>

                {verified && (<span className="inline-flex items-center gap-1 rounded-full bg-emerald-50 px-2 py-1 text-[10px] font-bold text-emerald-700 dark:bg-emerald-500/10 dark:text-emerald-300">
                    <BadgeCheck size={13}/>
                    Verified
                  </span>)}
              </div>

              <p className="mt-1 truncate text-xs font-semibold text-slate-500 dark:text-slate-400 sm:text-sm">
                {primaryService?.category ||
                primaryService?.service_name ||
                "Professional service"}
              </p>

              <button type="button" onClick={onViewProfile} className="mt-2 inline-flex items-center gap-1 text-xs font-black text-blue-600 hover:underline dark:text-blue-400">
                View profile
                <ChevronRight size={14}/>
              </button>
            </div>
          </div>

          <div className="mt-5 grid grid-cols-3 gap-2 sm:gap-3">
            <div className={`rounded-xl border p-2.5 sm:p-3 ${isRatingWinner
                ? "border-emerald-300 bg-emerald-50 dark:border-emerald-700 dark:bg-emerald-500/10"
                : "border-slate-200 bg-slate-50 dark:border-slate-700 dark:bg-slate-800/70"}`}>
              <div className="flex items-center gap-1 text-[9px] font-bold uppercase tracking-wide text-slate-500 dark:text-slate-400 sm:text-[10px]">
                <Star size={12} className="fill-amber-400 text-amber-400"/>
                Rating
              </div>
              <p className="mt-1 text-base font-black text-slate-900 dark:text-white sm:text-lg">
                {rating.toFixed(1)}
              </p>
              {isRatingWinner && (<p className="mt-1 truncate text-[9px] font-black text-emerald-700 dark:text-emerald-300">
                  Best
                </p>)}
            </div>

            <div className={`rounded-xl border p-2.5 sm:p-3 ${isExperienceWinner
                ? "border-emerald-300 bg-emerald-50 dark:border-emerald-700 dark:bg-emerald-500/10"
                : "border-slate-200 bg-slate-50 dark:border-slate-700 dark:bg-slate-800/70"}`}>
              <div className="flex items-center gap-1 text-[9px] font-bold uppercase tracking-wide text-slate-500 dark:text-slate-400 sm:text-[10px]">
                <BriefcaseBusiness size={12}/>
                Experience
              </div>
              <p className="mt-1 text-base font-black text-slate-900 dark:text-white sm:text-lg">
                {experienceCount}
              </p>
              <p className="text-[9px] font-semibold text-slate-400">
                records
              </p>
            </div>

            <div className={`rounded-xl border p-2.5 sm:p-3 ${isPriceWinner
                ? "border-emerald-300 bg-emerald-50 dark:border-emerald-700 dark:bg-emerald-500/10"
                : "border-slate-200 bg-slate-50 dark:border-slate-700 dark:bg-slate-800/70"}`}>
              <div className="flex items-center gap-1 text-[9px] font-bold uppercase tracking-wide text-slate-500 dark:text-slate-400 sm:text-[10px]">
                <CircleDollarSign size={12}/>
                Price
              </div>
              <p className="mt-1 truncate text-sm font-black text-slate-900 dark:text-white sm:text-base">
                {formatPrice(primaryService?.price)}
              </p>
              {isPriceWinner && (<p className="mt-1 truncate text-[9px] font-black text-emerald-700 dark:text-emerald-300">
                  Lower
                </p>)}
            </div>
          </div>

          {(isRatingWinner || isExperienceWinner || isPriceWinner) && (<div className="mt-4 flex flex-wrap gap-2">
              {isRatingWinner && (<span className="inline-flex items-center gap-1 rounded-full bg-emerald-50 px-2.5 py-1.5 text-[10px] font-bold text-emerald-700 dark:bg-emerald-500/10 dark:text-emerald-300 sm:text-xs">
                  <Check size={13}/>
                  Highest rated
                </span>)}
              {isExperienceWinner && (<span className="inline-flex items-center gap-1 rounded-full bg-emerald-50 px-2.5 py-1.5 text-[10px] font-bold text-emerald-700 dark:bg-emerald-500/10 dark:text-emerald-300 sm:text-xs">
                  <Check size={13}/>
                  More experience
                </span>)}
              {isPriceWinner && (<span className="inline-flex items-center gap-1 rounded-full bg-emerald-50 px-2.5 py-1.5 text-[10px] font-bold text-emerald-700 dark:bg-emerald-500/10 dark:text-emerald-300 sm:text-xs">
                  <Check size={13}/>
                  Better price
                </span>)}
            </div>)}

          <div className="mt-5 border-t border-slate-200 pt-4 dark:border-slate-700">
            <div className="flex items-center justify-between gap-3">
              <h4 className="text-xs font-black uppercase tracking-[0.12em] text-slate-500 dark:text-slate-400">
                Services
              </h4>
              <span className="text-xs font-bold text-slate-400">
                {worker.services.length} listed
              </span>
            </div>

            {worker.services.length > 0 ? (<div className="mt-3 flex flex-wrap gap-2">
                {worker.services.slice(0, 5).map((service) => (<span key={service.id} className="rounded-lg border border-slate-200 bg-slate-50 px-2.5 py-1.5 text-[11px] font-semibold text-slate-700 dark:border-slate-700 dark:bg-slate-800 dark:text-slate-300 sm:text-xs">
                    {service.service_name || "Service"}
                  </span>))}
                {worker.services.length > 5 && (<span className="rounded-lg bg-slate-100 px-2.5 py-1.5 text-[11px] font-bold text-slate-500 dark:bg-slate-800 dark:text-slate-400 sm:text-xs">
                    +{worker.services.length - 5} more
                  </span>)}
              </div>) : (<p className="mt-3 text-sm text-slate-500 dark:text-slate-400">
                No approved services listed.
              </p>)}
          </div>

          <button type="button" onClick={onBook} className="mt-5 inline-flex min-h-11 w-full items-center justify-center gap-2 rounded-xl bg-linear-to-r from-blue-700 via-blue-600 to-indigo-600 px-4 text-sm font-black text-white shadow-lg shadow-blue-500/20 transition hover:-translate-y-0.5 hover:shadow-xl">
            Book This Worker
            <ChevronRight size={17}/>
          </button>
        </div>)}
    </article>);
}
export default function CompareWorkers() {
    const navigate = useNavigate();
    const [workers, setWorkers] = useState<WorkerWithServices[]>([]);
    const [leftId, setLeftId] = useState("");
    const [rightId, setRightId] = useState("");
    const [leftWorker, setLeftWorker] = useState<CompleteWorkerProfile | null>(null);
    const [rightWorker, setRightWorker] = useState<CompleteWorkerProfile | null>(null);
    const [leftRating, setLeftRating] = useState(0);
    const [rightRating, setRightRating] = useState(0);
    const ratingWinner = winner(leftRating, rightRating);
    const experienceWinner = winner(leftWorker?.workExperience?.length ?? 0, rightWorker?.workExperience?.length ?? 0);
    const leftPrice = Number(leftWorker?.services?.[0]?.price ?? 999999);
    const rightPrice = Number(rightWorker?.services?.[0]?.price ?? 999999);
    let priceWinner = "tie";
    if (leftPrice < rightPrice) {
        priceWinner = "left";
    }
    if (rightPrice < leftPrice) {
        priceWinner = "right";
    }
    let leftScore = 0;
    let rightScore = 0;
    if (ratingWinner === "left")
        leftScore++;
    if (ratingWinner === "right")
        rightScore++;
    if (experienceWinner === "left")
        leftScore++;
    if (experienceWinner === "right")
        rightScore++;
    if (priceWinner === "left")
        leftScore++;
    if (priceWinner === "right")
        rightScore++;
    const loadWorkers = useCallback(async () => {
        try {
            const data = await getFeaturedWorkers(100);
            setWorkers(data);
        }
        catch (error) {
            auditCaughtError({ module: "Workers", process: "background operation", action: "EXECUTE" }, error);
            console.error(error);
        }
    }, []);
    useEffect(() => {
        const timer = window.setTimeout(() => {
            void loadWorkers();
        }, 0);
        return () => window.clearTimeout(timer);
    }, [loadWorkers]);
    useEffect(() => {
        async function loadComparison() {
            try {
                if (leftId) {
                    const profile = await getCompleteWorkerProfile(leftId);
                    setLeftWorker(profile);
                    const rating = await getWorkerAverageRating(leftId);
                    setLeftRating(rating);
                }
                else {
                    setLeftWorker(null);
                    setLeftRating(0);
                }
                if (rightId) {
                    const profile = await getCompleteWorkerProfile(rightId);
                    setRightWorker(profile);
                    const rating = await getWorkerAverageRating(rightId);
                    setRightRating(rating);
                }
                else {
                    setRightWorker(null);
                    setRightRating(0);
                }
            }
            catch (error) {
                auditCaughtError({ module: "Workers", process: "loadComparison", action: "READ" }, error);
                console.error(error);
            }
        }
        void loadComparison();
    }, [leftId, rightId]);
    const bothSelected = Boolean(leftWorker && rightWorker);
    const recommendation = leftScore > rightScore
        ? {
            name: getWorkerName(leftWorker),
            reason: `${leftScore} of 3 comparison advantages`,
        }
        : rightScore > leftScore
            ? {
                name: getWorkerName(rightWorker),
                reason: `${rightScore} of 3 comparison advantages`,
            }
            : null;
    return (<CustomerLayout>
      <div className="space-y-5 pb-8 sm:space-y-6">
        <section className="relative overflow-hidden rounded-[1.5rem] bg-linear-to-br from-slate-950 via-blue-950 to-indigo-900 p-5 text-white shadow-xl sm:rounded-[2rem] sm:p-7 lg:p-8">
          <div className="pointer-events-none absolute -right-12 -top-16 h-52 w-52 rounded-full bg-blue-500/20 blur-3xl"/>
          <div className="pointer-events-none absolute -bottom-20 left-1/3 h-48 w-48 rounded-full bg-indigo-500/20 blur-3xl"/>

          <div className="relative flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
            <div>
              <div className="flex items-center gap-2 text-blue-200">
                <Scale size={16}/>
                <span className="text-[10px] font-black uppercase tracking-[0.18em] sm:text-xs">
                  Worker Comparison
                </span>
              </div>
              <h1 className="mt-2 text-2xl font-black sm:text-3xl lg:text-4xl">
                Compare Workers
              </h1>
              <p className="mt-2 max-w-2xl text-xs leading-5 text-slate-300 sm:text-sm sm:leading-6">
                Compare ratings, experience, service price, and available services before choosing who to book.
              </p>
            </div>

            <button type="button" onClick={() => navigate("/customer/workers")} className="inline-flex min-h-10 w-fit items-center gap-2 rounded-xl bg-white/10 px-4 text-xs font-bold text-white ring-1 ring-white/15 transition hover:bg-white/15 sm:text-sm">
              <ArrowLeftRight size={16}/>
              Change workers
            </button>
          </div>
        </section>

        {bothSelected && (<section className={`rounded-2xl border p-4 shadow-sm sm:p-5 ${recommendation
                ? "border-emerald-200 bg-emerald-50 dark:border-emerald-800 dark:bg-emerald-500/10"
                : "border-blue-200 bg-blue-50 dark:border-blue-800 dark:bg-blue-500/10"}`}>
            <div className="flex items-start gap-3">
              <div className={`flex h-11 w-11 shrink-0 items-center justify-center rounded-xl ${recommendation
                ? "bg-emerald-600 text-white"
                : "bg-blue-600 text-white"}`}>
                {recommendation ? <Trophy size={21}/> : <Sparkles size={21}/>}
              </div>
              <div className="min-w-0">
                <p className="text-xs font-black uppercase tracking-[0.12em] text-slate-500 dark:text-slate-400">
                  Comparison result
                </p>
                <h2 className="mt-1 text-base font-black text-slate-900 dark:text-white sm:text-lg">
                  {recommendation
                ? `${recommendation.name} stands out`
                : "Both workers are equally recommended"}
                </h2>
                <p className="mt-1 text-xs text-slate-600 dark:text-slate-400 sm:text-sm">
                  {recommendation
                ? `${recommendation.reason}. Review the details below before booking.`
                : "The comparison is tied across rating, experience, and price."}
                </p>
              </div>
            </div>
          </section>)}

        <div className="relative grid min-w-0 grid-cols-1 gap-4 lg:grid-cols-2 lg:gap-5 xl:gap-6">
          <div className="pointer-events-none absolute left-1/2 top-8 z-10 hidden h-10 w-10 -translate-x-1/2 items-center justify-center rounded-full border border-slate-200 bg-white text-slate-500 shadow-md dark:border-slate-700 dark:bg-slate-900 dark:text-slate-300 lg:flex">
            <ArrowLeftRight size={18}/>
          </div>

          <WorkerPanel label="Worker A" workerId={leftId} worker={leftWorker} rating={leftRating} workers={workers} otherWorkerId={rightId} ratingWinner={ratingWinner} experienceWinner={experienceWinner} priceWinner={priceWinner} side="left" onWorkerChange={setLeftId} onBook={() => navigate(`/customer/book/${leftId}`)} onViewProfile={() => navigate(`/customer/workers/${leftId}`)}/>

          <WorkerPanel label="Worker B" workerId={rightId} worker={rightWorker} rating={rightRating} workers={workers} otherWorkerId={leftId} ratingWinner={ratingWinner} experienceWinner={experienceWinner} priceWinner={priceWinner} side="right" onWorkerChange={setRightId} onBook={() => navigate(`/customer/book/${rightId}`)} onViewProfile={() => navigate(`/customer/workers/${rightId}`)}/>
        </div>
      </div>
    </CustomerLayout>);
}

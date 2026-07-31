export default function BookingsSkeleton() {
  return <div className="space-y-5 p-6" aria-label="Loading bookings">
    {[1,2,3].map((item) => <div key={item} className="animate-pulse rounded-2xl border border-slate-200 p-6">
      <div className="flex gap-4"><div className="h-16 w-16 rounded-full bg-slate-200"/><div className="flex-1 space-y-3"><div className="h-5 w-48 rounded bg-slate-200"/><div className="h-4 w-32 rounded bg-slate-200"/></div><div className="h-8 w-24 rounded-full bg-slate-200"/></div>
      <div className="mt-6 grid grid-cols-2 gap-4"><div className="h-20 rounded-xl bg-slate-100"/><div className="h-20 rounded-xl bg-slate-100"/></div>
      <div className="mt-6 h-11 w-48 rounded-xl bg-slate-200"/>
    </div>)}
  </div>;
}

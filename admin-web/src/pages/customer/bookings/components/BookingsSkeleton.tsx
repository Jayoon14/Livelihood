export default function BookingsSkeleton() {
  return (
    <div className="space-y-3 p-3 sm:space-y-4 sm:p-5" aria-label="Loading bookings">
      {[1, 2, 3].map((item) => (
        <div
          key={item}
          className="animate-pulse rounded-2xl border border-slate-200 p-4 sm:p-5"
        >
          <div className="flex items-center gap-3 sm:gap-4">
            <div className="h-12 w-12 shrink-0 rounded-full bg-slate-200 sm:h-14 sm:w-14" />
            <div className="min-w-0 flex-1 space-y-2">
              <div className="h-4 w-36 max-w-[70%] rounded bg-slate-200 sm:h-5 sm:w-48" />
              <div className="h-3 w-24 rounded bg-slate-200 sm:h-4 sm:w-32" />
            </div>
            <div className="space-y-2 text-right">
              <div className="ml-auto h-6 w-16 rounded-full bg-slate-200 sm:w-20" />
              <div className="ml-auto h-5 w-14 rounded bg-slate-200 sm:h-6 sm:w-20" />
            </div>
            <div className="h-9 w-9 shrink-0 rounded-full bg-slate-200" />
          </div>
        </div>
      ))}
    </div>
  );
}

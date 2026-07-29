export default function PageLoader() {
  return (
    <div
      role="status"
      aria-live="polite"
      aria-label="Loading"
      className="fixed inset-0 z-[9999] flex min-h-screen items-center justify-center overflow-hidden bg-slate-950/45 backdrop-blur-[2px]"
    >
      <div className="pointer-events-none absolute h-[430px] w-[430px] rounded-full bg-blue-500/20 blur-[110px]" />

      <div className="relative flex flex-col items-center">
        <div className="radar-loader relative flex h-64 w-64 items-center justify-center">
          <div className="absolute inset-4 rounded-full border border-blue-500/20" />
          <div className="absolute inset-10 rounded-full border border-blue-500/20" />
          <div className="absolute inset-16 rounded-full border border-blue-500/25" />

          <div className="absolute left-1/2 top-4 h-[calc(100%-2rem)] w-px -translate-x-1/2 bg-blue-500/15" />
          <div className="absolute left-4 top-1/2 h-px w-[calc(100%-2rem)] -translate-y-1/2 bg-blue-500/15" />

          <span className="radar-pulse radar-pulse-one" />
          <span className="radar-pulse radar-pulse-two" />
          <span className="radar-pulse radar-pulse-three" />

          <div className="radar-sweep absolute inset-4 rounded-full" />

          <div className="relative z-20 flex h-32 w-32 items-center justify-center rounded-full border-4 border-white bg-white p-1 shadow-[0_20px_55px_rgba(41,55,240,0.35)]">
            <img
              src="/peso-logo.jpg"
              alt="PESO Cabuyao"
              className="h-full w-full rounded-full object-cover"
            />
          </div>

          <div className="radar-center-glow pointer-events-none absolute z-10 h-36 w-36 rounded-full border border-blue-400/40" />
        </div>

        <h2 className="-mt-1 text-lg font-extrabold text-white drop-shadow-md sm:text-xl">
          Preparing your workspace
        </h2>

        <p className="mt-2 text-sm font-medium text-white/80 drop-shadow-sm">
          Please wait while we load your page
        </p>

        <div className="mt-5 flex gap-1.5">
          <span className="loading-dot" />
          <span className="loading-dot loading-dot-two" />
          <span className="loading-dot loading-dot-three" />
        </div>
      </div>
    </div>
  );
}

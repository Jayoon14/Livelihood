interface MessageBannerProps {
  message: string;
}

export default function MessageBanner({
  message,
}: MessageBannerProps) {
  if (!message) return null;

  return (
    <div className="absolute bottom-20 left-3 right-3 z-30 max-w-md rounded-2xl border border-amber-200 bg-amber-50 p-4 text-sm text-amber-900 shadow-xl sm:left-5 sm:right-auto">
      {message}
    </div>
  );
}
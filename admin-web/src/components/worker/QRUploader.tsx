import {
  Eye,
  ImagePlus,
  LoaderCircle,
  RotateCw,
  Trash2,
  X,
  ZoomIn,
  ZoomOut,
} from "lucide-react";
import {
  useEffect,
  useRef,
  useState,
} from "react";
import { toast } from "sonner";

import { confirmAction } from "../ui/confirmAction";
import { supabase } from "../../lib/supabase";

interface QRUploaderProps {
  label: string;
  folder: string;
  value?: string;
  onUploaded: (url: string) => void;
  onRemove?: () => void;
}

const BUCKET = "payment-qr";
const MAX_FILE_SIZE = 5 * 1024 * 1024;
const ALLOWED_TYPES = new Set([
  "image/png",
  "image/jpeg",
  "image/webp",
]);

function getErrorMessage(error: unknown): string {
  if (error instanceof Error && error.message.trim()) {
    return error.message;
  }

  return "Unable to process the QR image.";
}

function sanitizeFolder(value: string): string {
  const folder = value
    .trim()
    .toLowerCase()
    .replace(/[^a-z0-9_-]/g, "-");

  return folder || "other";
}

function getStoragePathFromPublicUrl(url: string): string | null {
  try {
    const parsed = new URL(url);
    const marker = `/storage/v1/object/public/${BUCKET}/`;
    const index = parsed.pathname.indexOf(marker);

    if (index < 0) {
      return null;
    }

    return decodeURIComponent(
      parsed.pathname.slice(index + marker.length),
    );
  } catch {
    return null;
  }
}

export default function QRUploader({
  label,
  folder,
  value = "",
  onUploaded,
  onRemove,
}: QRUploaderProps) {
  const inputRef = useRef<HTMLInputElement>(null);

  const [uploading, setUploading] =
    useState(false);
  const [removing, setRemoving] =
    useState(false);
  const [viewerOpen, setViewerOpen] =
    useState(false);
  const [zoom, setZoom] = useState(1);
  const [rotation, setRotation] =
    useState(0);

  useEffect(() => {
    if (!viewerOpen) {
      return;
    }

    const previousOverflow =
      document.body.style.overflow;

    function handleKeyDown(event: KeyboardEvent) {
      if (event.key === "Escape") {
        closeViewer();
      }
    }

    document.body.style.overflow = "hidden";
    window.addEventListener("keydown", handleKeyDown);

    return () => {
      document.body.style.overflow =
        previousOverflow;
      window.removeEventListener(
        "keydown",
        handleKeyDown,
      );
    };
  }, [viewerOpen]);

  async function upload(file: File): Promise<void> {
    if (!ALLOWED_TYPES.has(file.type)) {
      toast.warning(
        "Please upload a PNG, JPG, JPEG, or WEBP image.",
      );
      return;
    }

    if (file.size <= 0) {
      toast.warning("The selected image is empty.");
      return;
    }

    if (file.size > MAX_FILE_SIZE) {
      toast.warning(
        "The QR image must not exceed 5 MB.",
      );
      return;
    }

    try {
      setUploading(true);

      const {
        data: { user },
        error: userError,
      } = await supabase.auth.getUser();

      if (userError) {
        throw userError;
      }

      if (!user) {
        throw new Error(
          "Your session has expired. Please sign in again.",
        );
      }

      const extension =
        file.type === "image/png"
          ? "png"
          : file.type === "image/webp"
            ? "webp"
            : "jpg";

      const path = [
        user.id,
        sanitizeFolder(folder),
        `${crypto.randomUUID()}.${extension}`,
      ].join("/");

      const { error: uploadError } =
        await supabase.storage
          .from(BUCKET)
          .upload(path, file, {
            upsert: false,
            contentType: file.type,
            cacheControl: "3600",
          });

      if (uploadError) {
        throw uploadError;
      }

      const { data } = supabase.storage
        .from(BUCKET)
        .getPublicUrl(path);

      if (!data.publicUrl) {
        await supabase.storage
          .from(BUCKET)
          .remove([path]);

        throw new Error(
          "Unable to generate the QR image URL.",
        );
      }

      const previousPath =
        getStoragePathFromPublicUrl(value);

      onUploaded(data.publicUrl);

      if (previousPath) {
        void supabase.storage
          .from(BUCKET)
          .remove([previousPath]);
      }

      toast.success("QR image uploaded.");
    } catch (error) {
      toast.error(getErrorMessage(error));
    } finally {
      setUploading(false);

      if (inputRef.current) {
        inputRef.current.value = "";
      }
    }
  }

  async function removeImage(): Promise<void> {
    if (removing) {
      return;
    }

    const confirmed = await confirmAction(
      "Remove the uploaded QR code?",
    );

    if (!confirmed) {
      return;
    }

    try {
      setRemoving(true);

      const path =
        getStoragePathFromPublicUrl(value);

      if (path) {
        const { error } = await supabase.storage
          .from(BUCKET)
          .remove([path]);

        if (error) {
          throw error;
        }
      }

      onRemove?.();
      toast.success("QR image removed.");
    } catch (error) {
      toast.error(getErrorMessage(error));
    } finally {
      setRemoving(false);
    }
  }

  function openViewer(): void {
    setZoom(1);
    setRotation(0);
    setViewerOpen(true);
  }

  function closeViewer(): void {
    setViewerOpen(false);
    setZoom(1);
    setRotation(0);
  }

  return (
    <>
      <div className="space-y-3">
        <label className="block text-sm font-bold text-slate-700 dark:text-slate-200">
          {label}
        </label>

        <input
          ref={inputRef}
          type="file"
          accept="image/png,image/jpeg,image/webp"
          hidden
          onChange={(event) => {
            const file =
              event.target.files?.[0];

            if (file) {
              void upload(file);
            }
          }}
        />

        {value ? (
          <div className="overflow-hidden rounded-2xl border border-slate-200 bg-white dark:border-slate-700 dark:bg-slate-900">
            <div className="flex flex-col gap-4 p-4 sm:flex-row sm:items-center sm:justify-between sm:p-5">
              <div className="flex min-w-0 items-center gap-4">
                <button
                  type="button"
                  onClick={openViewer}
                  className="flex h-20 w-20 shrink-0 items-center justify-center overflow-hidden rounded-xl border border-slate-200 bg-slate-50 transition hover:border-blue-300 dark:border-slate-700 dark:bg-slate-800"
                  aria-label={`View ${label}`}
                >
                  <img
                    src={value}
                    alt={`${label} preview`}
                    className="h-full w-full object-contain p-1"
                  />
                </button>

                <div className="min-w-0">
                  <p className="text-xs font-semibold uppercase tracking-wider text-slate-400">
                    Uploaded QR Code
                  </p>

                  <p className="mt-1 truncate text-sm font-bold text-slate-900 dark:text-white">
                    QR image is ready
                  </p>

                  <p className="mt-1 text-xs text-slate-500 dark:text-slate-400">
                    Verify that the account details
                    shown in the image are correct.
                  </p>
                </div>
              </div>

              <div className="grid grid-cols-1 gap-2 sm:flex">
                <button
                  type="button"
                  onClick={openViewer}
                  className="inline-flex items-center justify-center gap-2 rounded-xl border border-blue-200 bg-blue-50 px-4 py-2.5 text-sm font-bold text-blue-700 transition hover:bg-blue-100 dark:border-blue-900/50 dark:bg-blue-950/30 dark:text-blue-300"
                >
                  <Eye className="h-4 w-4" />
                  View
                </button>

                <button
                  type="button"
                  disabled={uploading || removing}
                  onClick={() =>
                    inputRef.current?.click()
                  }
                  className="inline-flex items-center justify-center gap-2 rounded-xl bg-blue-600 px-4 py-2.5 text-sm font-bold text-white transition hover:bg-blue-700 disabled:opacity-50"
                >
                  {uploading ? (
                    <LoaderCircle className="h-4 w-4 animate-spin" />
                  ) : (
                    <ImagePlus className="h-4 w-4" />
                  )}
                  Replace
                </button>

                <button
                  type="button"
                  disabled={uploading || removing}
                  onClick={() =>
                    void removeImage()
                  }
                  className="inline-flex items-center justify-center gap-2 rounded-xl bg-red-600 px-4 py-2.5 text-sm font-bold text-white transition hover:bg-red-700 disabled:opacity-50"
                >
                  {removing ? (
                    <LoaderCircle className="h-4 w-4 animate-spin" />
                  ) : (
                    <Trash2 className="h-4 w-4" />
                  )}
                  Remove
                </button>
              </div>
            </div>
          </div>
        ) : (
          <div className="rounded-2xl border-2 border-dashed border-slate-300 bg-slate-50 px-5 py-8 text-center transition hover:border-blue-300 dark:border-slate-700 dark:bg-slate-800/50">
            <div className="mx-auto flex h-14 w-14 items-center justify-center rounded-2xl bg-blue-100 text-blue-600 dark:bg-blue-500/15 dark:text-blue-300">
              <ImagePlus className="h-6 w-6" />
            </div>

            <p className="mt-4 font-bold text-slate-900 dark:text-white">
              Upload your QR code
            </p>

            <p className="mt-1 text-sm text-slate-500 dark:text-slate-400">
              PNG, JPG, JPEG, or WEBP up to 5 MB.
            </p>

            <button
              type="button"
              disabled={uploading}
              onClick={() =>
                inputRef.current?.click()
              }
              className="mt-5 inline-flex items-center justify-center gap-2 rounded-xl bg-blue-600 px-5 py-2.5 text-sm font-bold text-white transition hover:bg-blue-700 disabled:opacity-50"
            >
              {uploading ? (
                <LoaderCircle className="h-4 w-4 animate-spin" />
              ) : (
                <ImagePlus className="h-4 w-4" />
              )}

              {uploading
                ? "Uploading..."
                : "Upload QR Code"}
            </button>
          </div>
        )}
      </div>

      {viewerOpen && value && (
        <div
          className="fixed inset-0 z-[100] flex items-center justify-center bg-slate-950/80 p-3 backdrop-blur-sm sm:p-6"
          role="dialog"
          aria-modal="true"
          aria-label={`${label} viewer`}
          onMouseDown={(event) => {
            if (
              event.target ===
              event.currentTarget
            ) {
              closeViewer();
            }
          }}
        >
          <div className="flex max-h-[95vh] w-full max-w-5xl flex-col overflow-hidden rounded-2xl border border-slate-700 bg-white shadow-2xl dark:bg-slate-900">
            <header className="flex items-center justify-between border-b border-slate-200 px-5 py-4 dark:border-slate-700">
              <div>
                <p className="text-xs font-semibold uppercase tracking-wider text-slate-400">
                  QR Code
                </p>

                <h2 className="mt-0.5 text-lg font-bold text-slate-900 dark:text-white">
                  {label}
                </h2>
              </div>

              <button
                type="button"
                onClick={closeViewer}
                className="flex h-10 w-10 items-center justify-center rounded-xl text-slate-500 transition hover:bg-red-50 hover:text-red-600 dark:hover:bg-red-950/30"
                aria-label="Close QR viewer"
              >
                <X className="h-5 w-5" />
              </button>
            </header>

            <div className="min-h-0 flex-1 overflow-auto bg-slate-100 p-4 sm:p-6 dark:bg-slate-950">
              <div className="flex min-h-[420px] items-center justify-center overflow-hidden rounded-xl border border-slate-200 bg-white dark:border-slate-700 dark:bg-slate-900">
                <img
                  src={value}
                  alt={`${label} full view`}
                  draggable={false}
                  className="max-h-[65vh] max-w-full object-contain transition-transform duration-200"
                  style={{
                    transform: `scale(${zoom}) rotate(${rotation}deg)`,
                  }}
                />
              </div>
            </div>

            <footer className="flex flex-wrap items-center justify-center gap-3 border-t border-slate-200 bg-white px-5 py-4 dark:border-slate-700 dark:bg-slate-900">
              <ViewerButton
                onClick={() =>
                  setZoom((current) =>
                    Math.min(3, current + 0.25),
                  )
                }
                disabled={zoom >= 3}
              >
                <ZoomIn className="h-4 w-4" />
                Zoom +
              </ViewerButton>

              <ViewerButton
                onClick={() =>
                  setZoom((current) =>
                    Math.max(0.5, current - 0.25),
                  )
                }
                disabled={zoom <= 0.5}
              >
                <ZoomOut className="h-4 w-4" />
                Zoom -
              </ViewerButton>

              <ViewerButton
                onClick={() =>
                  setRotation(
                    (current) =>
                      (current + 90) % 360,
                  )
                }
              >
                <RotateCw className="h-4 w-4" />
                Rotate
              </ViewerButton>

              <span className="rounded-xl bg-slate-100 px-3 py-2 text-xs font-bold text-slate-600 dark:bg-slate-800 dark:text-slate-300">
                {Math.round(zoom * 100)}%
              </span>
            </footer>
          </div>
        </div>
      )}
    </>
  );
}

function ViewerButton({
  onClick,
  disabled = false,
  children,
}: {
  onClick: () => void;
  disabled?: boolean;
  children: React.ReactNode;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      disabled={disabled}
      className="inline-flex items-center justify-center gap-2 rounded-xl bg-blue-600 px-4 py-2.5 text-sm font-bold text-white transition hover:bg-blue-700 disabled:cursor-not-allowed disabled:opacity-50"
    >
      {children}
    </button>
  );
}

import { useEffect, useRef, useState } from "react";

import {
  Eye,
  ImagePlus,
  LoaderCircle,
  RotateCw,
  X,
  ZoomIn,
  ZoomOut,
} from "lucide-react";

import { supabase } from "../../lib/supabase";

interface QRUploaderProps {
  label: string;
  folder: string;
  value?: string;
  onUploaded: (url: string) => void;
  onRemove?: () => void;
}

export default function QRUploader({
  label,
  folder,
  value,
  onUploaded,
  onRemove,
}: QRUploaderProps) {
  const inputRef = useRef<HTMLInputElement>(null);

  const [uploading, setUploading] = useState(false);
  const [viewerOpen, setViewerOpen] = useState(false);

  const [zoom, setZoom] = useState(1);
  const [rotation, setRotation] = useState(0);

  useEffect(() => {
    if (!viewerOpen) {
      return;
    }

    function handleEscape(event: KeyboardEvent) {
      if (event.key === "Escape") {
        closeViewer();
      }
    }

    document.addEventListener("keydown", handleEscape);
    document.body.style.overflow = "hidden";

    return () => {
      document.removeEventListener("keydown", handleEscape);
      document.body.style.overflow = "";
    };
  }, [viewerOpen]);

  async function upload(file: File) {
    const allowedTypes = [
      "image/png",
      "image/jpeg",
      "image/jpg",
      "image/webp",
    ];

    if (!allowedTypes.includes(file.type)) {
      alert("Please upload a PNG, JPG, JPEG, or WEBP image.");
      return;
    }

    const maximumFileSize = 5 * 1024 * 1024;

    if (file.size > maximumFileSize) {
      alert("The QR image must not exceed 5 MB.");
      return;
    }

    try {
      setUploading(true);

      const extension =
        file.name.split(".").pop()?.toLowerCase() || "png";

      const safeFolder = folder
        .trim()
        .toLowerCase()
        .replace(/[^a-z0-9-_]/g, "-");

      const fileName = `${safeFolder}/${crypto.randomUUID()}.${extension}`;

      const { error: uploadError } = await supabase.storage
        .from("payment-qr")
        .upload(fileName, file, {
          upsert: false,
          contentType: file.type,
          cacheControl: "3600",
        });

      if (uploadError) {
        throw uploadError;
      }

      const { data } = supabase.storage
        .from("payment-qr")
        .getPublicUrl(fileName);

      if (!data.publicUrl) {
        throw new Error("Unable to generate the QR image URL.");
      }

      onUploaded(data.publicUrl);
    } catch (error) {
      console.error("QR upload error:", error);

      alert(
        error instanceof Error
          ? error.message
          : "Unable to upload QR image.",
      );
    } finally {
      setUploading(false);

      if (inputRef.current) {
        inputRef.current.value = "";
      }
    }
  }

  function openViewer() {
    setZoom(1);
    setRotation(0);
    setViewerOpen(true);
  }

  function closeViewer() {
    setViewerOpen(false);
    setZoom(1);
    setRotation(0);
  }

  function zoomIn() {
    setZoom((currentZoom) =>
      Math.min(Number((currentZoom + 0.25).toFixed(2)), 3),
    );
  }

  function zoomOut() {
    setZoom((currentZoom) =>
      Math.max(Number((currentZoom - 0.25).toFixed(2)), 0.5),
    );
  }

  function rotateImage() {
    setRotation((currentRotation) => currentRotation + 90);
  }

  return (
    <>
      <div className="space-y-3">
        <label className="block text-sm font-bold text-slate-700">
          {label}
        </label>

        <input
          ref={inputRef}
          type="file"
          accept="image/png,image/jpeg,image/jpg,image/webp"
          hidden
          onChange={(event) => {
            const file = event.target.files?.[0];

            if (!file) {
              return;
            }

            void upload(file);
          }}
        />

        {value ? (
          <div className="overflow-hidden rounded-2xl border border-gray-200 bg-white">
            <div className="flex flex-col gap-4 px-5 py-4 sm:flex-row sm:items-center sm:justify-between">
              <div className="flex min-w-0 items-center gap-4">
                <button
                  type="button"
                  onClick={openViewer}
                  className="flex h-20 w-20 shrink-0 items-center justify-center overflow-hidden rounded-xl border border-gray-200 bg-gray-50 transition hover:border-blue-300"
                  aria-label="View QR code"
                >
                  <img
                    src={value}
                    alt={`${label} preview`}
                    className="h-full w-full object-contain p-1"
                  />
                </button>

                <div className="min-w-0">
                  <p className="text-xs font-semibold uppercase tracking-wider text-gray-400">
                    Uploaded QR Code
                  </p>

                  <p className="mt-1 truncate text-sm font-bold text-gray-900">
                    QR image is ready
                  </p>

                  <p className="mt-1 text-xs text-gray-500">
                    Click View QR to inspect the uploaded image.
                  </p>
                </div>
              </div>

              <div className="flex shrink-0 flex-col gap-2 sm:flex-row">
                <button
                  type="button"
                  onClick={openViewer}
                  className="inline-flex items-center justify-center gap-2 rounded-xl border border-blue-200 bg-blue-50 px-4 py-2.5 text-sm font-bold text-blue-700 transition hover:bg-blue-100"
                >
                  <Eye size={17} />
                  View QR
                </button>

                <button
                  type="button"
                  disabled={uploading}
                  onClick={() => inputRef.current?.click()}
                  className="inline-flex items-center justify-center gap-2 rounded-xl bg-blue-600 px-4 py-2.5 text-sm font-bold text-white transition hover:bg-blue-700 disabled:cursor-not-allowed disabled:bg-gray-300"
                >
                  {uploading ? (
                    <>
                      <LoaderCircle
                        size={17}
                        className="animate-spin"
                      />
                      Uploading...
                    </>
                  ) : (
                    <>
                      <ImagePlus size={17} />
                      Replace QR Code
                      
                    </>
                    
                  )}
                </button>
                <button
                  type="button"
                  onClick={() => {
                    if (
                      confirm(
                        "Remove the uploaded QR Code?"
                      )
                    ) {
                      onRemove?.();
                    }
                  }}
                  className="inline-flex items-center justify-center gap-2 rounded-xl bg-red-600 px-4 py-2.5 text-sm font-bold text-white transition hover:bg-red-700"
                >
                  <X size={17} />
                  Remove QR
                </button>
              </div>
            </div>
          </div>
          
        ) : (
          <div className="rounded-2xl border-2 border-dashed border-gray-300 bg-gray-50 px-6 py-8 text-center transition hover:border-blue-300 hover:bg-blue-50/40">
            <div className="mx-auto flex h-14 w-14 items-center justify-center rounded-2xl bg-blue-100 text-blue-600">
              <ImagePlus size={26} />
            </div>

            <p className="mt-4 font-bold text-gray-900">
              Upload your QR code
            </p>

            <p className="mt-1 text-sm text-gray-500">
              PNG, JPG, JPEG, or WEBP up to 5 MB.
            </p>

            <button
              type="button"
              disabled={uploading}
              onClick={() => inputRef.current?.click()}
              className="mt-5 inline-flex items-center justify-center gap-2 rounded-xl bg-blue-600 px-5 py-2.5 text-sm font-bold text-white transition hover:bg-blue-700 disabled:cursor-not-allowed disabled:bg-gray-300"
            >
              {uploading ? (
                <>
                  <LoaderCircle
                    size={17}
                    className="animate-spin"
                  />
                  Uploading...
                </>
              ) : (
                <>
                  <ImagePlus size={17} />
                  Upload QR Code
                </>
              )}
            </button>
          </div>
        )}
      </div>

      {viewerOpen && value && (
        <div
          className="fixed inset-0 z-[100] flex items-center justify-center bg-black/70 p-3 backdrop-blur-sm sm:p-6"
          role="dialog"
          aria-modal="true"
          aria-label={`${label} viewer`}
          onMouseDown={(event) => {
            if (event.target === event.currentTarget) {
              closeViewer();
            }
          }}
        >
          <div className="flex max-h-[95vh] w-full max-w-5xl flex-col overflow-hidden rounded-2xl bg-white shadow-2xl">
            {/* MODAL HEADER */}

            <div className="flex items-center justify-between border-b border-gray-200 px-5 py-4">
              <div>
                <p className="text-xs font-semibold uppercase tracking-wider text-gray-400">
                  QR Code
                </p>

                <h2 className="mt-0.5 text-lg font-bold text-gray-900">
                  {label}
                </h2>
              </div>

              <button
                type="button"
                onClick={closeViewer}
                className="flex h-10 w-10 items-center justify-center rounded-xl text-gray-500 transition hover:bg-red-50 hover:text-red-600"
                aria-label="Close QR viewer"
              >
                <X size={22} />
              </button>
            </div>

            {/* IMAGE AREA */}

            <div className="min-h-0 flex-1 overflow-auto bg-gray-100 p-4 sm:p-6">
              <div className="flex min-h-[420px] items-center justify-center overflow-hidden rounded-xl border border-gray-200 bg-white">
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

            {/* VIEWER CONTROLS */}

            <div className="flex flex-wrap items-center justify-center gap-3 border-t border-gray-200 bg-white px-5 py-4">
              <button
                type="button"
                onClick={zoomIn}
                disabled={zoom >= 3}
                className="inline-flex items-center justify-center gap-2 rounded-xl bg-blue-600 px-4 py-2.5 text-sm font-bold text-white transition hover:bg-blue-700 disabled:cursor-not-allowed disabled:bg-gray-300"
              >
                <ZoomIn size={17} />
                Zoom +
              </button>

              <button
                type="button"
                onClick={zoomOut}
                disabled={zoom <= 0.5}
                className="inline-flex items-center justify-center gap-2 rounded-xl bg-blue-600 px-4 py-2.5 text-sm font-bold text-white transition hover:bg-blue-700 disabled:cursor-not-allowed disabled:bg-gray-300"
              >
                <ZoomOut size={17} />
                Zoom -
              </button>

              <button
                type="button"
                onClick={rotateImage}
                className="inline-flex items-center justify-center gap-2 rounded-xl bg-violet-600 px-4 py-2.5 text-sm font-bold text-white transition hover:bg-violet-700"
              >
                <RotateCw size={17} />
                Rotate
              </button>

              <span className="rounded-xl bg-gray-100 px-3 py-2 text-xs font-bold text-gray-600">
                {Math.round(zoom * 100)}%
              </span>
            </div>
          </div>
        </div>
      )}
    </>
  );
}
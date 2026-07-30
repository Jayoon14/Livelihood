import {
  ArrowLeft,
  CheckCircle2,
  Clock3,
  FileText,
  ImagePlus,
  Loader2,
  Trash2,
  UploadCloud,
  X,
} from "lucide-react";
import {
  useEffect,
  useMemo,
  useState,
  type ChangeEvent,
} from "react";
import { useNavigate, useParams } from "react-router-dom";
import { toast } from "sonner";

import WorkerLayout from "../../../layouts/WorkerLayout";
import { supabase } from "../../../lib/supabase";
import { completeBooking } from "../../../services/workerBookingService";

const MAX_IMAGES = 3;
const MAX_IMAGE_SIZE = 5 * 1024 * 1024;

const ALLOWED_IMAGE_TYPES = [
  "image/jpeg",
  "image/png",
  "image/webp",
];

interface SelectedImage {
  file: File;
  previewUrl: string;
}

interface CompletionBooking {
  id: number;
  worker_id: string;
  customer_id: string;
  status: string;
  trip_status: string | null;
  worker_deleted?: boolean | null;
  is_deleted?: boolean | null;
  service?: {
    id?: number | null;
    service_name?: string | null;
    category?: string | null;
  } | null;
  customer?: {
    id?: string | null;
    first_name?: string | null;
    middle_name?: string | null;
    last_name?: string | null;
    email?: string | null;
  } | null;
}

interface ExistingCompletionProof {
  id: number;
  summary: string | null;
  notes: string | null;
  hours_worked: number | string | null;
}

interface ExistingCompletionImage {
  id: number;
  image_url: string;
}

function getErrorMessage(error: unknown): string {
  if (error instanceof Error && error.message.trim()) {
    return error.message;
  }

  if (
    typeof error === "object" &&
    error !== null &&
    "message" in error &&
    typeof (error as { message?: unknown }).message === "string"
  ) {
    const message = (error as { message: string }).message.trim();

    if (message) {
      return message;
    }
  }

  return "Unable to submit completion proof.";
}

function getCustomerName(
  customer: CompletionBooking["customer"],
): string {
  if (!customer) {
    return "Customer";
  }

  const name = [
    customer.first_name,
    customer.middle_name,
    customer.last_name,
  ]
    .filter(
      (part): part is string =>
        typeof part === "string" && part.trim().length > 0,
    )
    .map((part) => part.trim())
    .join(" ");

  return name || customer.email || "Customer";
}

function getServiceName(
  service: CompletionBooking["service"],
): string {
  return (
    service?.service_name?.trim() ||
    service?.category?.trim() ||
    "Service"
  );
}

function sanitizeFileExtension(file: File): string {
  const extension = file.name
    .split(".")
    .pop()
    ?.toLowerCase()
    .replace(/[^a-z0-9]/g, "");

  if (extension) {
    return extension;
  }

  if (file.type === "image/png") {
    return "png";
  }

  if (file.type === "image/webp") {
    return "webp";
  }

  return "jpg";
}

function getStoragePathFromPublicUrl(imageUrl: string): string | null {
  try {
    const url = new URL(imageUrl);
    const marker = "/storage/v1/object/public/completion-proofs/";
    const markerIndex = url.pathname.indexOf(marker);

    if (markerIndex === -1) {
      return null;
    }

    const encodedPath = url.pathname.slice(markerIndex + marker.length);

    return decodeURIComponent(encodedPath);
  } catch {
    return null;
  }
}

export default function CompleteJob() {
  const { bookingId } = useParams();
  const navigate = useNavigate();

  const parsedBookingId = useMemo(() => {
    const value = Number(bookingId);

    return Number.isInteger(value) && value > 0 ? value : null;
  }, [bookingId]);

  const [booking, setBooking] =
    useState<CompletionBooking | null>(null);

  const [existingProofId, setExistingProofId] =
    useState<number | null>(null);

  const [summary, setSummary] = useState("");
  const [notes, setNotes] = useState("");
  const [hoursWorked, setHoursWorked] = useState("");
  const [selectedImages, setSelectedImages] = useState<
    SelectedImage[]
  >([]);

  const [loadingBooking, setLoadingBooking] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [pageError, setPageError] = useState<string | null>(null);

  useEffect(() => {
    let mounted = true;

    async function loadBooking(): Promise<void> {
      if (!parsedBookingId) {
        setPageError("Invalid booking ID.");
        setLoadingBooking(false);
        return;
      }

      try {
        setPageError(null);
        setLoadingBooking(true);

        const {
          data: { user },
          error: authError,
        } = await supabase.auth.getUser();

        if (authError) {
          throw new Error(
            `Unable to verify your session: ${authError.message}`,
          );
        }

        if (!user) {
          throw new Error(
            "Your session has expired. Please sign in again.",
          );
        }

        const { data, error } = await supabase
          .from("bookings")
          .select(
            `
              id,
              worker_id,
              customer_id,
              status,
              trip_status,
              worker_deleted,
              is_deleted,
              service:services!service_id(
                id,
                service_name,
                category
              ),
              customer:profiles!customer_id(
                id,
                first_name,
                middle_name,
                last_name,
                email
              )
            `,
          )
          .eq("id", parsedBookingId)
          .eq("worker_id", user.id)
          .eq("worker_deleted", false)
          .eq("is_deleted", false)
          .maybeSingle();

        if (error) {
          throw new Error(
            `Unable to load booking: ${error.message}`,
          );
        }

        if (!data) {
          throw new Error(
            "The booking was not found or is not assigned to your account.",
          );
        }

        const normalizedBooking =
          data as unknown as CompletionBooking;

        if (
          normalizedBooking.status !== "On Going" ||
          normalizedBooking.trip_status !== "On Trip"
        ) {
          throw new Error(
            "Completion proof can only be submitted for an ongoing service.",
          );
        }

        const {
          data: existingProof,
          error: existingProofError,
        } = await supabase
          .from("booking_completion_proofs")
          .select(
            `
              id,
              summary,
              notes,
              hours_worked
            `,
          )
          .eq("booking_id", parsedBookingId)
          .eq("worker_id", user.id)
          .maybeSingle();

        if (existingProofError) {
          throw new Error(
            `Unable to load an existing completion proof: ${existingProofError.message}`,
          );
        }

        if (mounted) {
          const normalizedProof =
            existingProof as ExistingCompletionProof | null;

          setBooking(normalizedBooking);
          setExistingProofId(
            normalizedProof ? Number(normalizedProof.id) : null,
          );

          if (normalizedProof) {
            setSummary(normalizedProof.summary ?? "");
            setNotes(normalizedProof.notes ?? "");
            setHoursWorked(
              normalizedProof.hours_worked === null ||
                normalizedProof.hours_worked === undefined
                ? ""
                : String(normalizedProof.hours_worked),
            );
          }
        }
      } catch (error) {
        if (mounted) {
          setPageError(getErrorMessage(error));
        }
      } finally {
        if (mounted) {
          setLoadingBooking(false);
        }
      }
    }

    void loadBooking();

    return () => {
      mounted = false;
    };
  }, [parsedBookingId]);

  useEffect(() => {
    return () => {
      selectedImages.forEach(({ previewUrl }) => {
        URL.revokeObjectURL(previewUrl);
      });
    };
  }, [selectedImages]);

  function handleImages(
    event: ChangeEvent<HTMLInputElement>,
  ): void {
    const inputFiles = Array.from(event.target.files ?? []);

    if (inputFiles.length === 0) {
      return;
    }

    const remainingSlots = MAX_IMAGES - selectedImages.length;

    if (remainingSlots <= 0) {
      toast.warning(
        `You can upload a maximum of ${MAX_IMAGES} images.`,
      );

      event.target.value = "";
      return;
    }

    const filesToAdd = inputFiles.slice(0, remainingSlots);

    const invalidType = filesToAdd.find(
      (file) => !ALLOWED_IMAGE_TYPES.includes(file.type),
    );

    if (invalidType) {
      toast.error(
        "Only JPG, PNG, and WebP image files are allowed.",
      );

      event.target.value = "";
      return;
    }

    const oversizedFile = filesToAdd.find(
      (file) => file.size > MAX_IMAGE_SIZE,
    );

    if (oversizedFile) {
      toast.error(
        "Each image must not be larger than 5 MB.",
      );

      event.target.value = "";
      return;
    }

    const newImages = filesToAdd.map((file) => ({
      file,
      previewUrl: URL.createObjectURL(file),
    }));

    setSelectedImages((current) => [
      ...current,
      ...newImages,
    ]);

    if (inputFiles.length > remainingSlots) {
      toast.warning(
        `Only ${remainingSlots} more image${
          remainingSlots === 1 ? "" : "s"
        } can be added.`,
      );
    }

    event.target.value = "";
  }

  function removeImage(index: number): void {
    setSelectedImages((current) => {
      const selected = current[index];

      if (selected) {
        URL.revokeObjectURL(selected.previewUrl);
      }

      return current.filter(
        (_, imageIndex) => imageIndex !== index,
      );
    });
  }

  async function cleanupNewSubmission(
    proofId: number | null,
    uploadedPaths: string[],
    uploadedImageUrls: string[],
    deleteProof: boolean,
  ): Promise<void> {
    try {
      if (proofId !== null && uploadedImageUrls.length > 0) {
        const { error: imageDeleteError } = await supabase
          .from("booking_completion_images")
          .delete()
          .eq("proof_id", proofId)
          .in("image_url", uploadedImageUrls);

        if (imageDeleteError) {
          console.error(
            "Unable to remove newly created completion image records:",
            imageDeleteError,
          );
        }
      }

      if (deleteProof && proofId !== null) {
        const { error: proofDeleteError } = await supabase
          .from("booking_completion_proofs")
          .delete()
          .eq("id", proofId);

        if (proofDeleteError) {
          console.error(
            "Unable to remove the incomplete completion proof:",
            proofDeleteError,
          );
        }
      }

      if (uploadedPaths.length > 0) {
        const { error: storageDeleteError } =
          await supabase.storage
            .from("completion-proofs")
            .remove(uploadedPaths);

        if (storageDeleteError) {
          console.error(
            "Unable to remove newly uploaded completion images:",
            storageDeleteError,
          );
        }
      }
    } catch (cleanupError) {
      console.error(
        "Completion proof cleanup failed:",
        cleanupError,
      );
    }
  }

  async function submitProof(): Promise<void> {
    if (submitting) {
      return;
    }

    if (!parsedBookingId) {
      toast.error("Invalid booking ID.");
      return;
    }

    const normalizedSummary = summary.trim();
    const normalizedNotes = notes.trim();
    const parsedHours = Number(hoursWorked);

    if (!normalizedSummary) {
      toast.warning("Please enter a work summary.");
      return;
    }

    if (normalizedSummary.length < 10) {
      toast.warning(
        "Work summary must contain at least 10 characters.",
      );
      return;
    }

    if (normalizedSummary.length > 1000) {
      toast.warning(
        "Work summary must not exceed 1,000 characters.",
      );
      return;
    }

    if (normalizedNotes.length > 1000) {
      toast.warning(
        "Additional notes must not exceed 1,000 characters.",
      );
      return;
    }

    if (
      !Number.isFinite(parsedHours) ||
      parsedHours <= 0 ||
      parsedHours > 24
    ) {
      toast.warning(
        "Please enter valid hours worked between 0 and 24.",
      );
      return;
    }

    if (selectedImages.length === 0) {
      toast.warning(
        "Please upload at least one proof image.",
      );
      return;
    }

    let activeProofId: number | null = null;
    let createdNewProof = false;
    let proofWasUpdated = false;

    const uploadedPaths: string[] = [];
    const uploadedImageUrls: string[] = [];

    let previousProof: ExistingCompletionProof | null = null;
    let previousImages: ExistingCompletionImage[] = [];

    try {
      setSubmitting(true);
      setPageError(null);

      const {
        data: { user },
        error: authError,
      } = await supabase.auth.getUser();

      if (authError) {
        throw new Error(
          `Unable to verify your session: ${authError.message}`,
        );
      }

      if (!user) {
        throw new Error(
          "Your session has expired. Please sign in again.",
        );
      }

      const {
        data: currentBooking,
        error: bookingError,
      } = await supabase
        .from("bookings")
        .select(
          `
            id,
            worker_id,
            customer_id,
            status,
            trip_status
          `,
        )
        .eq("id", parsedBookingId)
        .eq("worker_id", user.id)
        .eq("worker_deleted", false)
        .eq("is_deleted", false)
        .maybeSingle();

      if (bookingError) {
        throw new Error(
          `Unable to verify booking: ${bookingError.message}`,
        );
      }

      if (!currentBooking) {
        throw new Error(
          "The booking was not found or is not assigned to your account.",
        );
      }

      if (
        currentBooking.status !== "On Going" ||
        currentBooking.trip_status !== "On Trip"
      ) {
        throw new Error(
          "This booking can no longer be completed because its status has changed.",
        );
      }

      const {
        data: existingProof,
        error: existingProofError,
      } = await supabase
        .from("booking_completion_proofs")
        .select(
          `
            id,
            summary,
            notes,
            hours_worked
          `,
        )
        .eq("booking_id", parsedBookingId)
        .eq("worker_id", user.id)
        .maybeSingle();

      if (existingProofError) {
        throw new Error(
          `Unable to check the existing completion proof: ${existingProofError.message}`,
        );
      }

      previousProof =
        existingProof as ExistingCompletionProof | null;

      if (previousProof) {
        activeProofId = Number(previousProof.id);

        if (!Number.isInteger(activeProofId)) {
          throw new Error(
            "The existing completion proof has an invalid ID.",
          );
        }

        const {
          data: oldImages,
          error: oldImagesError,
        } = await supabase
          .from("booking_completion_images")
          .select("id, image_url")
          .eq("proof_id", activeProofId);

        if (oldImagesError) {
          throw new Error(
            `Unable to load existing proof images: ${oldImagesError.message}`,
          );
        }

        previousImages =
          (oldImages ?? []) as ExistingCompletionImage[];
      }

      /*
       * Upload the replacement images first. Existing proof data
       * remains untouched until every new file is safely uploaded.
       */
      for (const selectedImage of selectedImages) {
        const extension = sanitizeFileExtension(
          selectedImage.file,
        );

        const storagePath = [
          user.id,
          String(parsedBookingId),
          `${crypto.randomUUID()}.${extension}`,
        ].join("/");

        const { error: uploadError } =
          await supabase.storage
            .from("completion-proofs")
            .upload(storagePath, selectedImage.file, {
              cacheControl: "3600",
              contentType: selectedImage.file.type,
              upsert: false,
            });

        if (uploadError) {
          throw new Error(
            `Unable to upload proof image: ${uploadError.message}`,
          );
        }

        uploadedPaths.push(storagePath);

        const {
          data: { publicUrl },
        } = supabase.storage
          .from("completion-proofs")
          .getPublicUrl(storagePath);

        if (!publicUrl) {
          throw new Error(
            "Unable to generate the image URL.",
          );
        }

        uploadedImageUrls.push(publicUrl);
      }

      if (previousProof && activeProofId !== null) {
        const {
          data: updatedProof,
          error: proofUpdateError,
        } = await supabase
          .from("booking_completion_proofs")
          .update({
            summary: normalizedSummary,
            notes: normalizedNotes || null,
            hours_worked: parsedHours,
          })
          .eq("id", activeProofId)
          .eq("booking_id", parsedBookingId)
          .eq("worker_id", user.id)
          .select("id")
          .maybeSingle();

        if (proofUpdateError) {
          throw new Error(
            `Unable to update completion proof: ${proofUpdateError.message}`,
          );
        }

        if (!updatedProof) {
          throw new Error(
            "The existing completion proof could not be updated.",
          );
        }

        proofWasUpdated = true;
      } else {
        const {
          data: createdProof,
          error: proofInsertError,
        } = await supabase
          .from("booking_completion_proofs")
          .insert({
            booking_id: parsedBookingId,
            worker_id: user.id,
            summary: normalizedSummary,
            notes: normalizedNotes || null,
            hours_worked: parsedHours,
          })
          .select("id")
          .single();

        if (proofInsertError) {
          throw new Error(
            `Unable to save completion proof: ${proofInsertError.message}`,
          );
        }

        activeProofId = Number(createdProof.id);
        createdNewProof = true;

        if (!Number.isInteger(activeProofId)) {
          throw new Error(
            "The completion proof record could not be created.",
          );
        }
      }

      const imageRecords = uploadedImageUrls.map(
        (imageUrl) => ({
          proof_id: activeProofId,
          image_url: imageUrl,
        }),
      );

      const { error: imageInsertError } = await supabase
        .from("booking_completion_images")
        .insert(imageRecords);

      if (imageInsertError) {
        throw new Error(
          `Unable to save proof image records: ${imageInsertError.message}`,
        );
      }

      /*
       * Reuse the centralized booking transition so ownership,
       * completion fields, and customer notification stay consistent.
       */
      await completeBooking(parsedBookingId, user.id);

      /*
       * The replacement is now complete. Remove the previous image
       * rows and storage files without risking the new submission.
       */
      if (
        previousProof &&
        activeProofId !== null &&
        previousImages.length > 0
      ) {
        const previousImageIds = previousImages.map(
          (image) => image.id,
        );

        const { error: oldRowsDeleteError } =
          await supabase
            .from("booking_completion_images")
            .delete()
            .eq("proof_id", activeProofId)
            .in("id", previousImageIds);

        if (oldRowsDeleteError) {
          console.error(
            "Proof was resubmitted, but old image records could not be removed:",
            oldRowsDeleteError,
          );
        } else {
          const previousStoragePaths = previousImages
            .map((image) =>
              getStoragePathFromPublicUrl(image.image_url),
            )
            .filter(
              (path): path is string =>
                typeof path === "string" &&
                path.length > 0,
            );

          if (previousStoragePaths.length > 0) {
            const { error: oldStorageDeleteError } =
              await supabase.storage
                .from("completion-proofs")
                .remove(previousStoragePaths);

            if (oldStorageDeleteError) {
              console.error(
                "Old proof image files could not be removed:",
                oldStorageDeleteError,
              );
            }
          }
        }
      }

      toast.success(
        previousProof
          ? "Completion proof resubmitted successfully."
          : "Completion proof submitted successfully.",
      );

      navigate("/worker/bookings", {
        replace: true,
      });
    } catch (error) {
      await cleanupNewSubmission(
        activeProofId,
        uploadedPaths,
        uploadedImageUrls,
        createdNewProof,
      );

      /*
       * Restore the original proof details when a revision update
       * fails after the existing row has already been changed.
       */
      if (
        proofWasUpdated &&
        previousProof &&
        activeProofId !== null
      ) {
        const { error: restoreError } = await supabase
          .from("booking_completion_proofs")
          .update({
            summary: previousProof.summary,
            notes: previousProof.notes,
            hours_worked: previousProof.hours_worked,
          })
          .eq("id", activeProofId);

        if (restoreError) {
          console.error(
            "Unable to restore the previous completion proof:",
            restoreError,
          );
        }
      }

      const message = getErrorMessage(error);

      console.error(
        "Submit completion proof error:",
        error,
      );

      setPageError(message);
      toast.error(message);
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <WorkerLayout>
      <main className="min-h-screen bg-slate-50 p-3 sm:p-5 lg:p-8 dark:bg-slate-950">
        <div className="mx-auto max-w-5xl space-y-5">
          <button
            type="button"
            onClick={() => navigate("/worker/bookings")}
            disabled={submitting}
            className="inline-flex items-center gap-2 rounded-xl border border-slate-200 bg-white px-4 py-2.5 text-sm font-semibold text-slate-700 shadow-sm transition hover:bg-slate-50 disabled:cursor-not-allowed disabled:opacity-60 dark:border-slate-700 dark:bg-slate-900 dark:text-slate-200 dark:hover:bg-slate-800"
          >
            <ArrowLeft className="h-4 w-4" />
            Back to Bookings
          </button>

          {pageError && (
            <div
              role="alert"
              className="flex items-start justify-between gap-4 rounded-2xl border border-red-200 bg-red-50 p-4 text-red-800 dark:border-red-900/40 dark:bg-red-950/30 dark:text-red-200"
            >
              <div>
                <p className="font-bold">
                  Unable to continue
                </p>

                <p className="mt-1 text-sm">
                  {pageError}
                </p>
              </div>

              <button
                type="button"
                onClick={() => setPageError(null)}
                aria-label="Dismiss error"
                className="rounded-lg p-1 transition hover:bg-red-100 dark:hover:bg-red-900/30"
              >
                <X className="h-5 w-5" />
              </button>
            </div>
          )}

          {loadingBooking ? (
            <section className="flex min-h-105 flex-col items-center justify-center rounded-3xl border border-slate-200 bg-white p-8 text-center shadow-sm dark:border-slate-700 dark:bg-slate-900">
              <Loader2 className="h-12 w-12 animate-spin text-blue-600" />

              <h1 className="mt-5 text-xl font-bold text-slate-900 dark:text-white">
                Loading booking
              </h1>

              <p className="mt-2 text-sm text-slate-500 dark:text-slate-400">
                Please wait while we verify the service.
              </p>
            </section>
          ) : !booking ? (
            <section className="rounded-3xl border border-slate-200 bg-white p-8 text-center shadow-sm dark:border-slate-700 dark:bg-slate-900">
              <div className="mx-auto flex h-20 w-20 items-center justify-center rounded-full bg-red-50 text-red-600 dark:bg-red-500/10 dark:text-red-300">
                <FileText className="h-10 w-10" />
              </div>

              <h1 className="mt-5 text-2xl font-bold text-slate-900 dark:text-white">
                Booking unavailable
              </h1>

              <p className="mx-auto mt-2 max-w-lg text-slate-500 dark:text-slate-400">
                This booking cannot currently accept completion
                proof.
              </p>

              <button
                type="button"
                onClick={() =>
                  navigate("/worker/bookings")
                }
                className="mt-6 rounded-xl bg-blue-600 px-5 py-3 font-semibold text-white transition hover:bg-blue-700"
              >
                Return to Bookings
              </button>
            </section>
          ) : (
            <>
              <section className="relative overflow-hidden rounded-3xl bg-linear-to-r from-blue-700 via-blue-600 to-cyan-500 p-5 text-white shadow-xl sm:p-8">
                <div className="pointer-events-none absolute -right-16 -top-20 h-52 w-52 rounded-full bg-white/10" />

                <div className="relative">
                  <p className="text-sm font-semibold uppercase tracking-[0.25em] text-blue-100">
                    Booking #{booking.id}
                  </p>

                  <h1 className="mt-3 text-3xl font-extrabold sm:text-4xl">
                    {existingProofId
                      ? "Resubmit Completion Proof"
                      : "Complete Job"}
                  </h1>

                  <p className="mt-3 max-w-2xl text-sm leading-6 text-blue-100 sm:text-base">
                    {existingProofId
                      ? "Upload updated proof after completing the requested revisions."
                      : "Upload clear proof of the completed work before marking this booking as completed."}
                  </p>

                  <div className="mt-6 grid gap-3 sm:grid-cols-2">
                    <div className="rounded-2xl bg-white/15 p-4 backdrop-blur-sm">
                      <p className="text-xs text-blue-100">
                        Customer
                      </p>

                      <p className="mt-1 font-bold">
                        {getCustomerName(
                          booking.customer,
                        )}
                      </p>
                    </div>

                    <div className="rounded-2xl bg-white/15 p-4 backdrop-blur-sm">
                      <p className="text-xs text-blue-100">
                        Service
                      </p>

                      <p className="mt-1 font-bold">
                        {getServiceName(
                          booking.service,
                        )}
                      </p>
                    </div>
                  </div>
                </div>
              </section>

              <section className="rounded-3xl border border-slate-200 bg-white p-4 shadow-sm sm:p-7 dark:border-slate-700 dark:bg-slate-900">
                <div className="flex items-start gap-3">
                  <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-2xl bg-blue-100 text-blue-700 dark:bg-blue-500/15 dark:text-blue-300">
                    <ImagePlus className="h-6 w-6" />
                  </div>

                  <div>
                    <h2 className="text-xl font-bold text-slate-900 dark:text-white">
                      Completion Images
                    </h2>

                    <p className="mt-1 text-sm text-slate-500 dark:text-slate-400">
                      Upload one to three clear images of the
                      completed work.
                    </p>
                  </div>
                </div>

                <div className="mt-6 grid grid-cols-1 gap-3 sm:grid-cols-3">
                  {Array.from({
                    length: MAX_IMAGES,
                  }).map((_, index) => {
                    const selectedImage =
                      selectedImages[index];

                    return (
                      <div
                        key={index}
                        className="relative flex h-48 items-center justify-center overflow-hidden rounded-2xl border border-dashed border-slate-300 bg-slate-50 dark:border-slate-700 dark:bg-slate-800"
                      >
                        {selectedImage ? (
                          <>
                            <img
                              src={
                                selectedImage.previewUrl
                              }
                              alt={`Completion proof ${
                                index + 1
                              }`}
                              className="h-full w-full object-cover"
                            />

                            <button
                              type="button"
                              onClick={() =>
                                removeImage(index)
                              }
                              disabled={submitting}
                              aria-label={`Remove image ${
                                index + 1
                              }`}
                              className="absolute right-2 top-2 flex h-9 w-9 items-center justify-center rounded-full bg-red-600 text-white shadow-lg transition hover:bg-red-700 disabled:opacity-60"
                            >
                              <Trash2 className="h-4 w-4" />
                            </button>
                          </>
                        ) : (
                          <div className="text-center text-slate-400">
                            <ImagePlus className="mx-auto h-8 w-8" />

                            <p className="mt-2 text-sm">
                              Image {index + 1}
                            </p>
                          </div>
                        )}
                      </div>
                    );
                  })}
                </div>

                <label
                  className={`mt-5 flex cursor-pointer items-center justify-center gap-3 rounded-2xl border-2 border-dashed px-5 py-5 text-center transition ${
                    selectedImages.length >= MAX_IMAGES ||
                    submitting
                      ? "cursor-not-allowed border-slate-200 bg-slate-100 text-slate-400 dark:border-slate-700 dark:bg-slate-800"
                      : "border-blue-300 bg-blue-50 text-blue-700 hover:border-blue-500 hover:bg-blue-100 dark:border-blue-700 dark:bg-blue-500/10 dark:text-blue-300"
                  }`}
                >
                  <UploadCloud className="h-6 w-6" />

                  <span className="font-semibold">
                    {selectedImages.length >= MAX_IMAGES
                      ? "Maximum images uploaded"
                      : "Choose proof images"}
                  </span>

                  <input
                    type="file"
                    multiple
                    accept="image/jpeg,image/png,image/webp"
                    onChange={handleImages}
                    disabled={
                      selectedImages.length >=
                        MAX_IMAGES || submitting
                    }
                    className="sr-only"
                  />
                </label>

                <div className="mt-3 flex flex-col justify-between gap-1 text-xs text-slate-500 sm:flex-row dark:text-slate-400">
                  <span>
                    JPG, PNG, or WebP. Maximum 5 MB each.
                  </span>

                  <span>
                    {selectedImages.length}/{MAX_IMAGES}{" "}
                    uploaded
                  </span>
                </div>
              </section>

              <section className="rounded-3xl border border-slate-200 bg-white p-4 shadow-sm sm:p-7 dark:border-slate-700 dark:bg-slate-900">
                <div className="flex items-start gap-3">
                  <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-2xl bg-emerald-100 text-emerald-700 dark:bg-emerald-500/15 dark:text-emerald-300">
                    <FileText className="h-6 w-6" />
                  </div>

                  <div>
                    <h2 className="text-xl font-bold text-slate-900 dark:text-white">
                      Work Information
                    </h2>

                    <p className="mt-1 text-sm text-slate-500 dark:text-slate-400">
                      Describe the service that you completed.
                    </p>
                  </div>
                </div>

                <div className="mt-6 space-y-5">
                  <div>
                    <div className="mb-2 flex items-center justify-between gap-3">
                      <label
                        htmlFor="work-summary"
                        className="font-semibold text-slate-800 dark:text-slate-200"
                      >
                        Work Summary
                      </label>

                      <span className="text-xs text-slate-400">
                        {summary.length}/1000
                      </span>
                    </div>

                    <textarea
                      id="work-summary"
                      rows={5}
                      maxLength={1000}
                      value={summary}
                      disabled={submitting}
                      onChange={(event) =>
                        setSummary(event.target.value)
                      }
                      placeholder="Describe the work completed, repairs performed, materials used, and final result..."
                      className="w-full resize-y rounded-2xl border border-slate-200 bg-slate-50 p-4 text-slate-900 outline-none transition placeholder:text-slate-400 focus:border-blue-500 focus:bg-white focus:ring-2 focus:ring-blue-500/20 disabled:cursor-not-allowed disabled:opacity-60 dark:border-slate-700 dark:bg-slate-800 dark:text-white dark:focus:bg-slate-900"
                    />
                  </div>

                  <div>
                    <div className="mb-2 flex items-center justify-between gap-3">
                      <label
                        htmlFor="additional-notes"
                        className="font-semibold text-slate-800 dark:text-slate-200"
                      >
                        Additional Notes
                      </label>

                      <span className="text-xs text-slate-400">
                        Optional · {notes.length}/1000
                      </span>
                    </div>

                    <textarea
                      id="additional-notes"
                      rows={3}
                      maxLength={1000}
                      value={notes}
                      disabled={submitting}
                      onChange={(event) =>
                        setNotes(event.target.value)
                      }
                      placeholder="Add recommendations, reminders, or other relevant details..."
                      className="w-full resize-y rounded-2xl border border-slate-200 bg-slate-50 p-4 text-slate-900 outline-none transition placeholder:text-slate-400 focus:border-blue-500 focus:bg-white focus:ring-2 focus:ring-blue-500/20 disabled:cursor-not-allowed disabled:opacity-60 dark:border-slate-700 dark:bg-slate-800 dark:text-white dark:focus:bg-slate-900"
                    />
                  </div>

                  <div>
                    <label
                      htmlFor="hours-worked"
                      className="mb-2 block font-semibold text-slate-800 dark:text-slate-200"
                    >
                      Hours Worked
                    </label>

                    <div className="relative max-w-xs">
                      <Clock3 className="absolute left-4 top-1/2 h-5 w-5 -translate-y-1/2 text-slate-400" />

                      <input
                        id="hours-worked"
                        type="number"
                        min="0.25"
                        max="24"
                        step="0.25"
                        inputMode="decimal"
                        value={hoursWorked}
                        disabled={submitting}
                        onChange={(event) =>
                          setHoursWorked(
                            event.target.value,
                          )
                        }
                        placeholder="Example: 3.5"
                        className="w-full rounded-2xl border border-slate-200 bg-slate-50 py-3.5 pl-12 pr-4 text-slate-900 outline-none transition placeholder:text-slate-400 focus:border-blue-500 focus:bg-white focus:ring-2 focus:ring-blue-500/20 disabled:cursor-not-allowed disabled:opacity-60 dark:border-slate-700 dark:bg-slate-800 dark:text-white dark:focus:bg-slate-900"
                      />
                    </div>
                  </div>
                </div>
              </section>

              <section className="rounded-3xl border border-emerald-200 bg-emerald-50 p-5 dark:border-emerald-900/40 dark:bg-emerald-950/20">
                <div className="flex items-start gap-3">
                  <CheckCircle2 className="mt-0.5 h-6 w-6 shrink-0 text-emerald-600 dark:text-emerald-300" />

                  <div>
                    <h2 className="font-bold text-emerald-900 dark:text-emerald-200">
                      Before submitting
                    </h2>

                    <p className="mt-1 text-sm leading-6 text-emerald-800 dark:text-emerald-300">
                      Make sure the images clearly show the
                      completed service. After submission, the
                      booking will be marked as completed and the
                      customer will be notified.
                    </p>
                  </div>
                </div>
              </section>

              <div className="grid gap-3 sm:grid-cols-2">
                <button
                  type="button"
                  onClick={() =>
                    navigate("/worker/bookings")
                  }
                  disabled={submitting}
                  className="rounded-2xl border border-slate-300 bg-white px-5 py-4 font-semibold text-slate-700 transition hover:bg-slate-50 disabled:cursor-not-allowed disabled:opacity-60 dark:border-slate-700 dark:bg-slate-900 dark:text-slate-200 dark:hover:bg-slate-800"
                >
                  Cancel
                </button>

                <button
                  type="button"
                  onClick={() => void submitProof()}
                  disabled={submitting}
                  className="inline-flex items-center justify-center gap-3 rounded-2xl bg-emerald-600 px-5 py-4 font-semibold text-white shadow-lg transition hover:bg-emerald-700 disabled:cursor-not-allowed disabled:bg-slate-400"
                >
                  {submitting ? (
                    <>
                      <Loader2 className="h-5 w-5 animate-spin" />
                      {existingProofId
                        ? "Resubmitting Proof..."
                        : "Submitting Proof..."}
                    </>
                  ) : (
                    <>
                      <UploadCloud className="h-5 w-5" />
                      {existingProofId
                        ? "Resubmit Completion Proof"
                        : "Submit Completion Proof"}
                    </>
                  )}
                </button>
              </div>
            </>
          )}
        </div>
      </main>
    </WorkerLayout>
  );
}
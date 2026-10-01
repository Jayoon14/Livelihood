import {
  AlertCircle,
  BriefcaseBusiness,
  FileText,
  Upload,
  Camera,
  ChevronLeft,
  ChevronRight,
  ChevronDown,
  Eye,
  Plus,
  Minus,
  CheckCircle2,
  GraduationCap,
  LockKeyhole,
  MapPin,
  Pencil,
  RefreshCw,
  Save,
  Trash2,
  UserRound,
  Wrench,
  X,
} from "lucide-react";
import {
  type ChangeEvent,
  useCallback,
  useEffect,
  useMemo,
  useRef,
  useState,
} from "react";
import { useNavigate } from "react-router-dom";
import { createPortal } from "react-dom";

import WorkerLayout from "../../../layouts/WorkerLayout";
import LocationPicker from "../../../components/maps/LocationPicker";
import {
  getCurrentProfile,
  removeAvatar,
  updateProfile,
  uploadAvatar,
  type WorkerProfile,
} from "../../../services/profileService";
import {
  getCompleteWorkerProfile,
  updateWorkerDocument,
  updateWorkerProfessionalProfile,
  type CompleteWorkerProfile,
  type WorkerDocumentKey,
  type WorkerProfessionalProfileUpdate,
} from "../../../services/workerService";

interface ProfileForm {
  first_name: string;
  middle_name: string;
  last_name: string;
  suffix: string;
  phone: string;
  address: string;
}

interface FieldErrors {
  first_name?: string;
  middle_name?: string;
  last_name?: string;
  suffix?: string;
  phone?: string;
  address?: string;
}

type ProfileMessage = {
  type: "success" | "error";
  text: string;
} | null;

interface WorkExperienceDraft {
  company: string;
  position: string;
  employment_status: string;
  start_date: string;
  end_date: string;
  description: string;
}

interface ProfessionalDraft {
  highest_attainment: string;
  elementary: string;
  secondary: string;
  senior_high: string;
  college: string;
  course: string;
  year_graduated: string;
  tesda: string;
  prc: string;
  trainings: string;
  skills: string;
  workExperience: WorkExperienceDraft[];
}

const EMPTY_PROFESSIONAL_DRAFT: ProfessionalDraft = {
  highest_attainment: "",
  elementary: "",
  secondary: "",
  senior_high: "",
  college: "",
  course: "",
  year_graduated: "",
  tesda: "",
  prc: "",
  trainings: "",
  skills: "",
  workExperience: [],
};

const MAX_AVATAR_SIZE_BYTES = 5 * 1024 * 1024;
const MAX_ADDRESS_LENGTH = 300;

const ALLOWED_AVATAR_TYPES = new Set(["image/jpeg", "image/png", "image/webp"]);

const WORKER_SKILL_OPTIONS = [
  "Electrician",
  "Plumber",
  "Carpenter",
  "Painter",
  "Mason",
  "Welder",
  "Mechanic",
  "Driver",
  "Cook",
  "Gardener",
  "Tailor",
  "Housekeeper",
  "Aircon Technician",
  "Computer Technician",
  "Caregiver",
];

const EDUCATION_OPTIONS = [
  { value: "Elementary", label: "Elementary" },
  { value: "Junior High", label: "Junior High School" },
  { value: "Senior High", label: "Senior High School" },
  { value: "College", label: "College" },
  { value: "Master", label: "Master's Degree" },
  { value: "Doctorate", label: "Doctorate Degree" },
  { value: "Other", label: "Other" },
];

const ELEMENTARY_SCHOOLS = [
  "Baclaran Elementary School", "Banay-Banay Elementary School", "Banlic Elementary School",
  "Bigaa Elementary School", "Butong Elementary School", "Cabuyao Central School",
  "Casile Elementary School", "Diezmo Elementary School", "Guinting Elementary School",
  "Gulod Elementary School", "Mamatid Elementary School", "Marinig South Elementary School",
  "Niugan Elementary School", "North Marinig Elementary School", "Pittland Elementary School",
  "Pulo Elementary School", "Sala Elementary School", "San Isidro Elementary School",
  "Southville I Elementary School", "Arise & Shine Academy", "Angelic Learning Center",
  "Augustinian School of Cabuyao", "Divine Mercy School of Cabuyao",
  "Institute for Foundational Learning, Inc.", "Jesus Covenanted Christian Academy",
  "St. John Bosco Academy of Cabuyao", "Holy Redeemer School of Cabuyao",
  "Infant Jesus Montessori Center", "Jeremiah Montessori School",
  "Lakeside Integrated School of Cabuyao", "Agape Young Achievers School",
  "Christ the King School of Cabuyao",
];

const JUNIOR_HIGH_SCHOOLS = [
  "Bigaa Integrated National High School", "Cabuyao Integrated National High School",
  "Casile Integrated National High School", "Gulod National High School",
  "Mamatid National High School", "Marinig National High School", "Pulo National High School",
  "Pulo National High School - Diezmo Extension", "Southville I Integrated National High School",
  "Pittland Integrated School", "Arise & Shine Academy", "Augustinian School of Cabuyao",
  "Christ the King School of Cabuyao", "Colegio de Santo Niño de Cabuyao",
  "Holy Redeemer School of Cabuyao", "Liceo de Cabuyao", "Liceo de Mamatid",
  "Maranatha Christian Academy", "Our Lady of Assumption College", "Regina Angelorum School",
  "Sacred Heart of Jesus and Mary School", "St. Isidore Academy of Cabuyao",
  "St. Matthew Montessori and Science High School", "St. Vincent College of Cabuyao",
];

const SENIOR_HIGH_SCHOOLS = [
  "Mamatid Senior High School", "Pulo Senior High School", "Bigaa Integrated National High School",
  "Cabuyao Integrated National High School", "Casile Integrated National High School",
  "Gulod National High School", "Marinig National High School",
  "Southville I Integrated National High School", "Pittland Integrated School",
  "Malayan Colleges Laguna", "Agustinian School of Cabuyao", "Angels in Heaven School, Inc.",
  "Christ the King School of Cabuyao", "Colegio de Santo Niño de Cabuyao",
  "Hosanna Technological School of Arts and Sciences", "Infant Jesus Montessori Center",
  "Lady of Rose Academy", "Liceo de Cabuyao", "Liceo de Mamatid",
  "Maranatha Christian Academy of Cabuyao",
];

const HIGHER_EDUCATION_SCHOOLS = [
  "Pamantasan ng Cabuyao", "University of Cabuyao", "Malayan Colleges Laguna",
  "Mapúa Malayan Colleges Laguna", "Colegio de Santo Niño de Cabuyao",
  "St. Vincent College of Cabuyao", "Our Lady of Assumption College - Cabuyao Campus",
  "Southeast Asia Institute of Science, Arts and Technology - Cabuyao",
  "Asian Institute of Technology, Sciences and the Arts",
  "St. Ignatius Technical Institute of Business and Arts - Cabuyao",
  "CITI Global College", "Cabuyao Institute of Technology", "Westbridge Institute of Technology",
];

const EMPLOYMENT_STATUS_OPTIONS = [
  "Full Time",
  "Part Time",
  "Contract",
  "Self Employed",
];

const EMPTY_FORM: ProfileForm = {
  first_name: "",
  middle_name: "",
  last_name: "",
  suffix: "",
  phone: "",
  address: "",
};

function profileToForm(profile: WorkerProfile): ProfileForm {
  return {
    first_name: profile.first_name ?? "",
    middle_name: profile.middle_name ?? "",
    last_name: profile.last_name ?? "",
    suffix: profile.suffix ?? "",
    phone: profile.phone ?? "",
    address: profile.address ?? "",
  };
}

function normalizeForm(form: ProfileForm): ProfileForm {
  return {
    first_name: form.first_name.trim(),
    middle_name: form.middle_name.trim(),
    last_name: form.last_name.trim(),
    suffix: form.suffix.trim(),
    phone: form.phone.trim(),
    address: form.address.trim(),
  };
}

function formsEqual(first: ProfileForm, second: ProfileForm): boolean {
  const normalizedFirst = normalizeForm(first);
  const normalizedSecond = normalizeForm(second);

  return (
    normalizedFirst.first_name === normalizedSecond.first_name &&
    normalizedFirst.middle_name === normalizedSecond.middle_name &&
    normalizedFirst.last_name === normalizedSecond.last_name &&
    normalizedFirst.suffix === normalizedSecond.suffix &&
    normalizedFirst.phone === normalizedSecond.phone &&
    normalizedFirst.address === normalizedSecond.address
  );
}

function validateProfile(form: ProfileForm): FieldErrors {
  const errors: FieldErrors = {};

  const firstName = form.first_name.trim();
  const middleName = form.middle_name.trim();
  const lastName = form.last_name.trim();
  const suffix = form.suffix.trim();
  const phone = form.phone.trim();
  const address = form.address.trim();

  if (!firstName) {
    errors.first_name = "First name is required.";
  } else if (firstName.length > 80) {
    errors.first_name = "First name must contain 80 characters or fewer.";
  }

  if (middleName.length > 80) {
    errors.middle_name = "Middle name must contain 80 characters or fewer.";
  }

  if (!lastName) {
    errors.last_name = "Last name is required.";
  } else if (lastName.length > 80) {
    errors.last_name = "Last name must contain 80 characters or fewer.";
  }

  if (suffix.length > 20) {
    errors.suffix = "Suffix must contain 20 characters or fewer.";
  }

  if (phone) {
    const compact = phone.replace(/[\s()-]/g, "");

    if (!/^\+?\d{7,15}$/.test(compact)) {
      errors.phone = "Enter a valid phone number containing 7 to 15 digits.";
    }
  }

  if (address.length > MAX_ADDRESS_LENGTH) {
    errors.address = `Address must contain ${MAX_ADDRESS_LENGTH} characters or fewer.`;
  }

  return errors;
}

function getErrorMessage(error: unknown, fallback: string): string {
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

  return fallback;
}

export default function Profile() {
  const navigate = useNavigate();
  const fileInputRef = useRef<HTMLInputElement | null>(null);

  const [profile, setProfile] = useState<WorkerProfile | null>(null);
  const [workerDetails, setWorkerDetails] =
    useState<CompleteWorkerProfile | null>(null);
  const [form, setForm] = useState<ProfileForm>(EMPTY_FORM);
  const [savedForm, setSavedForm] = useState<ProfileForm>(EMPTY_FORM);

  const [editing, setEditing] = useState(false);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [removingAvatar, setRemovingAvatar] = useState(false);
  const [uploadingDocument, setUploadingDocument] = useState<WorkerDocumentKey | null>(null);
  const [currentPage, setCurrentPage] = useState(1);
  const [professionalEditorOpen, setProfessionalEditorOpen] = useState(false);
  const [professionalDraft, setProfessionalDraft] = useState<ProfessionalDraft>(EMPTY_PROFESSIONAL_DRAFT);
  const [savingProfessional, setSavingProfessional] = useState(false);
  const [viewDocument, setViewDocument] = useState<{ label: string; url: string } | null>(null);
  const [locationModalOpen, setLocationModalOpen] = useState(false);
  const [savingLocation, setSavingLocation] = useState(false);

  const [fieldErrors, setFieldErrors] = useState<FieldErrors>({});
  const [message, setMessage] = useState<ProfileMessage>(null);

  const busy = saving || uploading || removingAvatar || savingProfessional;

  const handleLocationSelect = useCallback(
    async (latitude: number, longitude: number, address: string): Promise<void> => {
      if (!profile || savingLocation) return;

      try {
        setSavingLocation(true);
        setMessage(null);
        const updated = await updateProfile(profile.id, {
          address: address.trim() || profile.address,
          latitude,
          longitude,
        });
        const nextForm = profileToForm(updated);
        setProfile(updated);
        setForm(nextForm);
        setSavedForm(nextForm);
        setLocationModalOpen(false);
        setMessage({ type: "success", text: "My Location updated successfully." });
      } catch (error) {
        setMessage({ type: "error", text: getErrorMessage(error, "Unable to save your location.") });
      } finally {
        setSavingLocation(false);
      }
    },
    [profile, savingLocation],
  );


  const hasUnsavedChanges = useMemo(
    () => editing && !formsEqual(form, savedForm),
    [editing, form, savedForm],
  );

  const fullName = useMemo(() => {
    return [form.first_name, form.middle_name, form.last_name, form.suffix]
      .map((value) => value.trim())
      .filter(Boolean)
      .join(" ");
  }, [form.first_name, form.last_name, form.middle_name, form.suffix]);

  const initials = useMemo(() => {
    const first = form.first_name.trim().charAt(0);
    const last = form.last_name.trim().charAt(0);

    return `${first}${last}`.toUpperCase() || "W";
  }, [form.first_name, form.last_name]);

  const loadProfile = useCallback(async (): Promise<void> => {
    try {
      setLoading(true);
      setMessage(null);

      const data = await getCurrentProfile();
      const details = await getCompleteWorkerProfile(data.id);
      const nextForm = profileToForm(data);

      setProfile(data);
      setWorkerDetails(details);
      setForm(nextForm);
      setSavedForm(nextForm);
      setEditing(false);
      setFieldErrors({});
    } catch (error) {
      setProfile(null);
      setWorkerDetails(null);
      setMessage({
        type: "error",
        text: getErrorMessage(error, "Unable to load your profile."),
      });
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    const timer = window.setTimeout(() => {
      void loadProfile();
    }, 0);

    return () => window.clearTimeout(timer);
  }, [loadProfile]);

  useEffect(() => {
    const handleBeforeUnload = (event: BeforeUnloadEvent) => {
      if (!hasUnsavedChanges) {
        return;
      }

      event.preventDefault();
      event.returnValue = "";
    };

    window.addEventListener("beforeunload", handleBeforeUnload);

    return () => {
      window.removeEventListener("beforeunload", handleBeforeUnload);
    };
  }, [hasUnsavedChanges]);

  useEffect(() => {
    if (!message || message.type !== "success") {
      return;
    }

    const timer = window.setTimeout(() => {
      setMessage(null);
    }, 4_000);

    return () => window.clearTimeout(timer);
  }, [message]);

  const updateFormField = useCallback(
    (field: keyof ProfileForm, value: string) => {
      setForm((current) => ({
        ...current,
        [field]: value,
      }));

      setFieldErrors((current) => ({
        ...current,
        [field]: undefined,
      }));

      setMessage(null);
    },
    [],
  );

  const cancelEditing = useCallback(async (): Promise<void> => {
    if (!profile || busy) {
      return;
    }

    if (hasUnsavedChanges) {
      const confirmed = window.confirm("Discard your unsaved profile changes?");

      if (!confirmed) {
        return;
      }
    }

    setForm(savedForm);
    setFieldErrors({});
    setMessage(null);
    setEditing(false);
  }, [busy, hasUnsavedChanges, profile, savedForm]);

  const handleEditToggle = useCallback(async (): Promise<void> => {
    if (busy || !profile) {
      return;
    }

    if (editing) {
      await cancelEditing();
      return;
    }

    setMessage(null);
    setFieldErrors({});
    setEditing(true);
  }, [busy, cancelEditing, editing, profile]);

  const handleSave = useCallback(async (): Promise<void> => {
    if (!profile || saving || !hasUnsavedChanges) {
      return;
    }

    const errors = validateProfile(form);

    if (Object.keys(errors).length > 0) {
      setFieldErrors(errors);
      setMessage({
        type: "error",
        text: "Please correct the highlighted fields.",
      });
      return;
    }

    try {
      setSaving(true);
      setMessage(null);

      const normalized = normalizeForm(form);

      const updated = await updateProfile(profile.id, normalized);

      const nextForm = profileToForm(updated);

      setProfile(updated);
      setForm(nextForm);
      setSavedForm(nextForm);
      setFieldErrors({});
      setEditing(false);
      setMessage({
        type: "success",
        text: "Profile updated successfully.",
      });
    } catch (error) {
      setMessage({
        type: "error",
        text: getErrorMessage(error, "Unable to update your profile."),
      });
    } finally {
      setSaving(false);
    }
  }, [form, hasUnsavedChanges, profile, saving]);

  const buildProfessionalDraft = useCallback((details: CompleteWorkerProfile | null): ProfessionalDraft => {
    const education = (details?.education ?? {}) as Record<string, unknown>;
    const workExperience = (details?.workExperience ?? []).map((job) => ({
      company: getDisplayText(job.company ?? job.company_name),
      position: getDisplayText(job.position),
      employment_status: getDisplayText(job.employment_status),
      start_date: getDisplayText(job.start_date ?? job.start_year),
      end_date: getDisplayText(job.end_date ?? job.end_year),
      description: getDisplayText(job.description),
    }));

    return {
      highest_attainment: getDisplayText(education.highest_attainment),
      elementary: getDisplayText(education.elementary),
      secondary: getDisplayText(education.secondary),
      senior_high: getDisplayText(education.senior_high),
      college: getDisplayText(education.college),
      course: getDisplayText(education.course),
      year_graduated: getDisplayText(education.year_graduated),
      tesda: getDisplayText(education.tesda),
      prc: getDisplayText(education.prc),
      trainings: getDisplayText(education.trainings),
      skills: (details?.skills ?? []).map((skill) => skill.skill).filter(Boolean).join(", "),
      workExperience,
    };
  }, []);

  const openProfessionalEditor = useCallback(() => {
    setProfessionalDraft(buildProfessionalDraft(workerDetails));
    setProfessionalEditorOpen(true);
  }, [buildProfessionalDraft, workerDetails]);

  const handleProfessionalSave = useCallback(async () => {
    if (!profile) return;

    const payload: WorkerProfessionalProfileUpdate = {
      education: {
        highest_attainment: professionalDraft.highest_attainment,
        elementary: professionalDraft.elementary,
        secondary: professionalDraft.secondary,
        senior_high: professionalDraft.senior_high,
        college: professionalDraft.college,
        course: professionalDraft.course,
        year_graduated: professionalDraft.year_graduated,
        tesda: professionalDraft.tesda,
        prc: professionalDraft.prc,
        trainings: professionalDraft.trainings,
      },
      skills: professionalDraft.skills.split(",").map((skill) => skill.trim()).filter(Boolean),
      workExperience: professionalDraft.workExperience,
    };

    try {
      setSavingProfessional(true);
      setMessage(null);
      await updateWorkerProfessionalProfile(profile.id, payload);
      const refreshed = await getCompleteWorkerProfile(profile.id);
      setWorkerDetails(refreshed);
      setProfessionalEditorOpen(false);
      setMessage({ type: "success", text: "Profile information updated successfully." });
    } catch (error) {
      setMessage({ type: "error", text: getErrorMessage(error, "Unable to update your profile information.") });
    } finally {
      setSavingProfessional(false);
    }
  }, [profile, professionalDraft]);

  const updateWorkExperienceDraft = useCallback((index: number, field: keyof WorkExperienceDraft, value: string) => {
    setProfessionalDraft((current) => ({
      ...current,
      workExperience: current.workExperience.map((job, jobIndex) => jobIndex === index ? { ...job, [field]: value } : job),
    }));
  }, []);

  const addWorkExperienceDraft = useCallback(() => {
    setProfessionalDraft((current) => ({
      ...current,
      workExperience: [...current.workExperience, { company: "", position: "", employment_status: "", start_date: "", end_date: "", description: "" }],
    }));
  }, []);

  const removeWorkExperienceDraft = useCallback((index: number) => {
    setProfessionalDraft((current) => ({
      ...current,
      workExperience: current.workExperience.filter((_, jobIndex) => jobIndex !== index),
    }));
  }, []);

  const handleUpload = useCallback(
    async (event: ChangeEvent<HTMLInputElement>): Promise<void> => {
      const file = event.target.files?.[0];

      event.target.value = "";

      if (!file || !profile || busy) {
        return;
      }

      setMessage(null);

      if (!ALLOWED_AVATAR_TYPES.has(file.type)) {
        setMessage({
          type: "error",
          text: "Please upload a JPG, PNG, or WEBP image.",
        });
        return;
      }

      if (file.size <= 0 || file.size > MAX_AVATAR_SIZE_BYTES) {
        setMessage({
          type: "error",
          text: "Profile image must be a non-empty file no larger than 5 MB.",
        });
        return;
      }

      try {
        setUploading(true);

        const url = await uploadAvatar(profile.id, file);

        const updatedProfile = {
          ...profile,
          profile_picture: url,
        };

        setProfile(updatedProfile);
        setMessage({
          type: "success",
          text: "Profile picture updated successfully.",
        });
      } catch (error) {
        setMessage({
          type: "error",
          text: getErrorMessage(
            error,
            "Unable to upload your profile picture.",
          ),
        });
      } finally {
        setUploading(false);
      }
    },
    [busy, profile],
  );

  const handleDocumentUpload = useCallback(
    async (documentKey: WorkerDocumentKey, event: ChangeEvent<HTMLInputElement>): Promise<void> => {
      const file = event.target.files?.[0];
      event.target.value = "";

      if (!file || !profile || busy || uploadingDocument) return;

      try {
        setUploadingDocument(documentKey);
        setMessage(null);
        const url = await updateWorkerDocument(profile.id, documentKey, file);

        setWorkerDetails((current) => {
          if (!current) return current;
          return {
            ...current,
            documents: {
              ...(current.documents ?? { profile_id: profile.id }),
              profile_id: profile.id,
              [documentKey]: url,
            },
          };
        });

        setMessage({
          type: "success",
          text: `${documentLabel(documentKey)} updated successfully.`,
        });
      } catch (error) {
        setMessage({
          type: "error",
          text: getErrorMessage(error, "Unable to update the document."),
        });
      } finally {
        setUploadingDocument(null);
      }
    },
    [busy, profile, uploadingDocument],
  );

  const handleRemoveAvatar = useCallback(async (): Promise<void> => {
    if (!profile?.profile_picture || busy) {
      return;
    }

    const confirmed = window.confirm("Remove your current profile picture?");

    if (!confirmed) {
      return;
    }

    try {
      setRemovingAvatar(true);
      setMessage(null);

      await removeAvatar(profile.id, profile.profile_picture);

      setProfile({
        ...profile,
        profile_picture: null,
      });

      setMessage({
        type: "success",
        text: "Profile picture removed successfully.",
      });
    } catch (error) {
      setMessage({
        type: "error",
        text: getErrorMessage(error, "Unable to remove your profile picture."),
      });
    } finally {
      setRemovingAvatar(false);
    }
  }, [busy, profile]);

  if (loading) {
    return (
      <WorkerLayout>
        <main className="relative min-h-screen overflow-hidden bg-slate-50 p-3 sm:p-5 lg:p-8 dark:bg-slate-950">
          <div
            aria-hidden="true"
            className="pointer-events-none fixed inset-0 opacity-[0.035] dark:opacity-[0.018]"
            style={{
              backgroundImage:
                "linear-gradient(#2563eb 1px,transparent 1px),linear-gradient(90deg,#2563eb 1px,transparent 1px)",
              backgroundSize: "42px 42px",
            }}
          />
          <div className="relative mx-auto max-w-5xl">
          <section className="animate-pulse overflow-hidden rounded-[1.75rem] border border-slate-200 bg-white shadow-sm dark:border-slate-700 dark:bg-slate-900">
            <div className="h-48 bg-slate-200 dark:bg-slate-800 sm:h-56" />

            <div className="p-5 sm:p-8">
              <div className="flex flex-col gap-5 sm:flex-row sm:items-center">
                <div className="h-28 w-28 rounded-3xl bg-slate-200 dark:bg-slate-700 sm:h-32 sm:w-32" />

                <div className="space-y-3">
                  <div className="h-7 w-56 rounded bg-slate-200 dark:bg-slate-700" />
                  <div className="h-4 w-44 rounded bg-slate-200 dark:bg-slate-700" />
                </div>
              </div>

              <div className="mt-8 grid gap-4 md:grid-cols-2">
                {Array.from({
                  length: 6,
                }).map((_, index) => (
                  <div
                    key={index}
                    className="h-14 rounded-xl bg-slate-200 dark:bg-slate-700"
                  />
                ))}
              </div>

              <div className="mt-4 h-28 rounded-xl bg-slate-200 dark:bg-slate-700" />
            </div>
          </section>
          </div>
        </main>
      </WorkerLayout>
    );
  }

  if (!profile) {
    return (
      <WorkerLayout>
        <main className="relative min-h-screen overflow-hidden bg-slate-50 p-4 sm:p-6 lg:p-8 dark:bg-slate-950">
          <div
            aria-hidden="true"
            className="pointer-events-none fixed inset-0 opacity-[0.035] dark:opacity-[0.018]"
            style={{
              backgroundImage:
                "linear-gradient(#2563eb 1px,transparent 1px),linear-gradient(90deg,#2563eb 1px,transparent 1px)",
              backgroundSize: "42px 42px",
            }}
          />
          <div className="relative mx-auto max-w-3xl">
          <section className="rounded-[1.75rem] border border-red-200 bg-white p-6 text-center shadow-sm dark:border-red-900/50 dark:bg-slate-900 sm:p-8">
            <AlertCircle className="mx-auto h-10 w-10 text-red-500" />

            <h1 className="mt-4 text-2xl font-black text-slate-900 dark:text-white">
              Unable to load profile
            </h1>

            <p className="mt-3 text-sm text-red-700 dark:text-red-300">
              {message?.text || "Your profile could not be loaded."}
            </p>

            <button
              type="button"
              onClick={() => void loadProfile()}
              className="mt-6 inline-flex min-h-11 items-center gap-2 rounded-xl bg-blue-600 px-5 py-3 font-bold text-white transition hover:-translate-y-0.5 hover:bg-blue-700"
            >
              <RefreshCw className="h-4 w-4" />
              Try Again
            </button>
          </section>
          </div>
        </main>
      </WorkerLayout>
    );
  }

  return (
    <WorkerLayout>
      <main className="relative min-h-screen overflow-hidden bg-slate-50 p-3 pb-28 sm:p-5 sm:pb-10 lg:p-8 dark:bg-slate-950">
        <div
          aria-hidden="true"
          className="pointer-events-none fixed inset-0 opacity-[0.035] dark:opacity-[0.018]"
          style={{
            backgroundImage:
              "linear-gradient(#2563eb 1px,transparent 1px),linear-gradient(90deg,#2563eb 1px,transparent 1px)",
            backgroundSize: "42px 42px",
          }}
        />
        <div className="relative mx-auto max-w-6xl">
        <section className="overflow-hidden rounded-[1.75rem] border border-slate-200 bg-white shadow-sm dark:border-slate-700 dark:bg-slate-900">
          <header className="relative overflow-hidden bg-linear-to-br from-blue-800 via-blue-700 to-cyan-500 px-5 py-7 text-white sm:px-8 sm:py-10 lg:px-10">
            <div
              aria-hidden="true"
              className="pointer-events-none absolute inset-0 opacity-[0.09]"
              style={{
                backgroundImage:
                  "linear-gradient(#fff 1px,transparent 1px),linear-gradient(90deg,#fff 1px,transparent 1px)",
                backgroundSize: "38px 38px",
              }}
            />
            <div className="pointer-events-none absolute -right-16 -top-20 h-64 w-64 rounded-full bg-white/10 blur-2xl" />
            <div className="pointer-events-none absolute -bottom-24 left-1/3 h-56 w-56 rounded-full bg-white/10 blur-2xl" />

            <div className="relative z-10">
              <p className="inline-flex rounded-full border border-white/15 bg-white/10 px-3 py-1.5 text-[11px] font-black uppercase tracking-[0.14em] text-blue-100 backdrop-blur">
                Worker Account
              </p>

              <h1 className="mt-4 text-3xl font-black tracking-tight sm:text-4xl lg:text-5xl">
                My Profile
              </h1>

              <p className="mt-3 max-w-2xl text-sm leading-6 text-blue-100 sm:text-base sm:leading-7">
                Keep your personal and contact information accurate so customers
                can identify and reach you.
              </p>
            </div>
          </header>

          <div className="p-4 sm:p-7 lg:p-8">
            {message && (
              <div
                role={message.type === "error" ? "alert" : "status"}
                className={`mb-6 flex items-start justify-between gap-3 rounded-2xl border px-4 py-3.5 text-sm font-semibold shadow-sm ${
                  message.type === "success"
                    ? "border-emerald-200 bg-emerald-50 text-emerald-800 dark:border-emerald-900/50 dark:bg-emerald-950/30 dark:text-emerald-200"
                    : "border-red-200 bg-red-50 text-red-800 dark:border-red-900/50 dark:bg-red-950/30 dark:text-red-200"
                }`}
              >
                <div className="flex min-w-0 items-start gap-2">
                  {message.type === "success" ? (
                    <CheckCircle2 className="mt-0.5 h-4 w-4 shrink-0" />
                  ) : (
                    <AlertCircle className="mt-0.5 h-4 w-4 shrink-0" />
                  )}

                  <span className="min-w-0 leading-6">{message.text}</span>
                </div>

                <button
                  type="button"
                  onClick={() => setMessage(null)}
                  className="shrink-0 rounded-lg p-1.5 transition hover:bg-black/5 dark:hover:bg-white/10"
                  aria-label="Dismiss message"
                >
                  <X className="h-4 w-4" />
                </button>
              </div>
            )}

            <section className="flex flex-col gap-6 rounded-[1.5rem] border border-slate-200 bg-slate-50/70 p-4 dark:border-slate-700 dark:bg-slate-800/40 sm:flex-row sm:items-center sm:justify-between sm:p-5">
              <div className="flex min-w-0 flex-col items-center gap-4 sm:flex-row">
                <div className="relative z-10">
                  {profile.profile_picture ? (
                    <img
                      src={profile.profile_picture}
                      alt={`${fullName || "Worker"} profile`}
                      className="h-28 w-28 rounded-3xl border-4 border-white object-cover shadow-xl ring-2 ring-blue-100 sm:h-32 sm:w-32 dark:border-slate-900 dark:ring-blue-500/30"
                    />
                  ) : (
                    <div className="flex h-28 w-28 items-center justify-center rounded-3xl border-4 border-white bg-blue-100 text-3xl font-black text-blue-700 shadow-xl ring-2 ring-blue-100 sm:h-32 sm:w-32 sm:text-4xl dark:border-slate-900 dark:bg-blue-500/15 dark:text-blue-300 dark:ring-blue-500/30">
                      {initials}
                    </div>
                  )}

                  {busy && (
                    <div className="absolute inset-0 flex items-center justify-center rounded-3xl bg-slate-900/65 px-2 text-center text-xs font-bold text-white backdrop-blur-sm">
                      {uploading
                        ? "Uploading..."
                        : removingAvatar
                          ? "Removing..."
                          : "Saving..."}
                    </div>
                  )}
                </div>

                <div className="text-center sm:text-left">
                  <h2 className="text-xl font-black text-slate-900 sm:text-2xl dark:text-white">
                    {fullName || "Worker Profile"}
                  </h2>

                  <p className="mt-1 break-all text-sm text-slate-500 dark:text-slate-400">
                    {profile.email || "No email available"}
                  </p>

                  <input
                    ref={fileInputRef}
                    type="file"
                    accept="image/jpeg,image/png,image/webp"
                    onChange={(event) => void handleUpload(event)}
                    disabled={busy}
                    className="sr-only"
                  />

                  <div className="mt-4 flex flex-wrap justify-center gap-2 sm:justify-start">
                    <button
                      type="button"
                      onClick={() => fileInputRef.current?.click()}
                      disabled={busy}
                      className="inline-flex min-h-10 items-center gap-2 rounded-xl border border-blue-200 bg-blue-50 px-4 py-2 text-sm font-bold text-blue-700 transition hover:-translate-y-0.5 hover:bg-blue-100 disabled:cursor-not-allowed disabled:translate-y-0 disabled:opacity-60 dark:border-blue-900/50 dark:bg-blue-950/30 dark:text-blue-300 dark:hover:bg-blue-950/50"
                    >
                      <Camera className="h-4 w-4" />
                      {uploading ? "Uploading..." : "Change Photo"}
                    </button>

                    {profile.profile_picture && (
                      <button
                        type="button"
                        onClick={() => void handleRemoveAvatar()}
                        disabled={busy}
                        className="inline-flex min-h-10 items-center gap-2 rounded-xl border border-red-200 bg-red-50 px-4 py-2 text-sm font-bold text-red-700 transition hover:-translate-y-0.5 hover:bg-red-100 disabled:cursor-not-allowed disabled:translate-y-0 disabled:opacity-60 dark:border-red-900/50 dark:bg-red-950/30 dark:text-red-300 dark:hover:bg-red-950/50"
                      >
                        <Trash2 className="h-4 w-4" />
                        Remove
                      </button>
                    )}
                  </div>

                  <p className="mt-2 text-xs text-slate-500 dark:text-slate-400">
                    JPG, PNG, or WEBP. Maximum: 5 MB.
                  </p>
                </div>
              </div>

              <button
                type="button"
                onClick={() => void handleEditToggle()}
                disabled={busy}
                className="inline-flex min-h-11 w-full items-center justify-center gap-2 rounded-xl bg-blue-600 px-5 py-3 font-bold text-white transition hover:-translate-y-0.5 hover:bg-blue-700 disabled:cursor-not-allowed disabled:translate-y-0 disabled:opacity-60 sm:w-auto"
              >
                {editing ? (
                  <>
                    <X className="h-4 w-4" />
                    Cancel Editing
                  </>
                ) : (
                  <>
                    <Pencil className="h-4 w-4" />
                    Edit Profile
                  </>
                )}
              </button>
            </section>

            <div className="mt-7">
              {currentPage === 1 && (
                <section className="rounded-[1.5rem] border border-slate-200 bg-white p-4 dark:border-slate-700 dark:bg-slate-900 sm:p-6">
                  <SectionHeader icon={<UserRound className="h-5 w-5" />} title="Personal Information" description="Your basic identity and contact details." />
                  <div className="grid gap-4 md:grid-cols-2 sm:gap-5">
                    <ProfileField label="First Name" required value={form.first_name} disabled={!editing || saving} error={fieldErrors.first_name} placeholder="First Name" onChange={(value) => updateFormField("first_name", value)} />
                    <ProfileField label="Middle Name" value={form.middle_name} disabled={!editing || saving} error={fieldErrors.middle_name} placeholder="Middle Name" onChange={(value) => updateFormField("middle_name", value)} />
                    <ProfileField label="Last Name" required value={form.last_name} disabled={!editing || saving} error={fieldErrors.last_name} placeholder="Last Name" onChange={(value) => updateFormField("last_name", value)} />
                    <ProfileField label="Suffix" value={form.suffix} disabled={!editing || saving} error={fieldErrors.suffix} placeholder="Jr., Sr., III" onChange={(value) => updateFormField("suffix", value)} />
                    <ProfileField label="Email Address" type="email" value={profile.email ?? ""} disabled placeholder="Email Address" helper="Email changes are managed through account security." />
                    <ProfileField label="Phone Number" type="tel" value={form.phone} disabled={!editing || saving} error={fieldErrors.phone} placeholder="+63 912 345 6789" onChange={(value) => updateFormField("phone", value)} />
                  </div>
                  <label className="mt-5 block">
                    <span className="mb-2 block text-sm font-semibold text-slate-700 dark:text-slate-200">Address</span>
                    <textarea disabled={!editing || saving} value={form.address} maxLength={MAX_ADDRESS_LENGTH} onChange={(event) => updateFormField("address", event.target.value)} className="min-h-28 w-full resize-y rounded-2xl border border-slate-200 bg-slate-50 px-4 py-3 text-slate-900 outline-none focus:border-blue-500 focus:ring-4 focus:ring-blue-500/10 disabled:cursor-not-allowed disabled:bg-slate-100 dark:border-slate-700 dark:bg-slate-800 dark:text-white" rows={4} placeholder="Complete Address" aria-invalid={Boolean(fieldErrors.address)} />
                    <div className="mt-2 flex justify-between text-xs text-slate-500"><span>{fieldErrors.address ?? ""}</span><span>{form.address.length}/{MAX_ADDRESS_LENGTH}</span></div>
                  </label>

                  <div className="mt-5 rounded-2xl border border-blue-200 bg-blue-50/70 p-4 dark:border-blue-900/50 dark:bg-blue-950/20">
                    <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
                      <div className="flex min-w-0 items-start gap-3">
                        <div className="mt-0.5 rounded-xl bg-blue-600 p-2 text-white shadow-sm"><MapPin className="h-4 w-4" /></div>
                        <div className="min-w-0">
                          <p className="text-sm font-black text-slate-900 dark:text-white">My Location</p>
                          <p className="mt-1 text-xs leading-5 text-slate-600 dark:text-slate-300">
                            {profile.latitude !== null && profile.longitude !== null ? form.address || "Saved location" : "No saved location yet. Set your location from the map."}
                          </p>
                        </div>
                      </div>
                      <button
                        type="button"
                        onPointerDown={(event) => {
                          event.preventDefault();
                          event.stopPropagation();
                        }}
                        onClick={(event) => {
                          event.preventDefault();
                          event.stopPropagation();
                          setLocationModalOpen(true);
                        }}
                        disabled={busy || savingLocation}
                        className="inline-flex min-h-10 shrink-0 items-center justify-center gap-2 rounded-xl bg-white px-4 py-2 text-sm font-black text-blue-700 shadow-sm ring-1 ring-blue-200 transition hover:bg-blue-100 disabled:cursor-not-allowed disabled:opacity-50 dark:bg-slate-900 dark:text-blue-300 dark:ring-blue-900/50 dark:hover:bg-slate-800"
                      >
                        <MapPin className="h-4 w-4" />
                        {profile.latitude !== null && profile.longitude !== null ? "Change Location" : "Set My Location"}
                        <ChevronDown className="h-4 w-4" />
                      </button>
                    </div>
                    {profile.latitude !== null && profile.longitude !== null && (
                      <p className="mt-3 text-[11px] font-semibold text-slate-500 dark:text-slate-400">{profile.latitude.toFixed(6)}, {profile.longitude.toFixed(6)}</p>
                    )}
                  </div>
                </section>
              )}

              {currentPage === 2 && (
                <section className="rounded-[1.5rem] border border-slate-200 bg-white p-4 dark:border-slate-700 dark:bg-slate-900 sm:p-6">
                  <div className="mb-5 flex items-start justify-between gap-4">
                    <SectionHeader icon={<Wrench className="h-5 w-5" />} title="Professional Information" description="Skills, education, training, and work experience. Services are managed separately." />
                    <button type="button" onClick={openProfessionalEditor} className="inline-flex min-h-10 shrink-0 items-center gap-2 rounded-xl bg-blue-600 px-4 py-2 text-sm font-bold text-white hover:bg-blue-700"><Pencil className="h-4 w-4" /> Edit</button>
                  </div>
                  <WorkerProfessionalDetails details={workerDetails} />
                </section>
              )}

              {currentPage === 3 && (
                <WorkerDocumentsSection details={workerDetails} uploadingDocument={uploadingDocument} disabled={busy || uploadingDocument !== null} onUpload={handleDocumentUpload} onView={(label, url) => setViewDocument({ label, url })} />
              )}

              <div className="mt-6 flex items-center justify-between gap-3 rounded-2xl border border-slate-200 bg-white p-3 shadow-sm dark:border-slate-700 dark:bg-slate-900">
                <button type="button" onClick={() => setCurrentPage((page) => Math.max(1, page - 1))} disabled={currentPage === 1} className="inline-flex min-h-10 items-center gap-1 rounded-xl border border-slate-300 px-3 text-sm font-bold text-slate-700 disabled:opacity-40 dark:border-slate-600 dark:text-slate-200"><ChevronLeft className="h-4 w-4" /> Previous</button>
                <div className="flex items-center gap-2">
                  {[1,2,3].map((page) => <button key={page} type="button" onClick={() => setCurrentPage(page)} className={`h-9 min-w-9 rounded-xl px-3 text-sm font-black ${currentPage === page ? "bg-blue-600 text-white" : "border border-slate-200 text-slate-600 dark:border-slate-700 dark:text-slate-300"}`}>{page}</button>)}
                </div>
                <button type="button" onClick={() => setCurrentPage((page) => Math.min(3, page + 1))} disabled={currentPage === 3} className="inline-flex min-h-10 items-center gap-1 rounded-xl border border-slate-300 px-3 text-sm font-bold text-slate-700 disabled:opacity-40 dark:border-slate-600 dark:text-slate-200">Next <ChevronRight className="h-4 w-4" /></button>
              </div>
            </div>

            <section className="mt-6 rounded-[1.5rem] border border-slate-200 bg-slate-50 p-4 dark:border-slate-700 dark:bg-slate-800/40 sm:p-5">
              <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
                <div className="flex items-start gap-3"><div className="rounded-xl bg-violet-100 p-2 text-violet-700"><LockKeyhole className="h-5 w-5" /></div><div><h3 className="font-black text-slate-900 dark:text-white">Account Security</h3><p className="mt-1 text-sm text-slate-500 dark:text-slate-400">Update your password from the worker settings page.</p></div></div>
                <button type="button" onClick={() => navigate("/worker/settings")} className="min-h-11 rounded-xl border border-slate-300 bg-white px-4 py-2.5 text-sm font-bold text-slate-700 dark:border-slate-600 dark:bg-slate-900 dark:text-slate-200">Open Settings</button>
              </div>
            </section>

            {editing && (
              <div className="mt-8 hidden flex-col-reverse gap-3 border-t border-slate-200 pt-6 sm:flex sm:flex-row sm:justify-end dark:border-slate-700">
                <button
                  type="button"
                  onClick={() => void cancelEditing()}
                  disabled={saving}
                  className="min-h-11 rounded-xl border border-slate-300 bg-white px-5 py-3 font-bold text-slate-700 transition hover:-translate-y-0.5 hover:bg-slate-50 disabled:cursor-not-allowed disabled:translate-y-0 disabled:opacity-60 dark:border-slate-600 dark:bg-slate-900 dark:text-slate-200 dark:hover:bg-slate-800"
                >
                  Cancel
                </button>

                <button
                  type="button"
                  onClick={() => void handleSave()}
                  disabled={
                    saving || uploading || removingAvatar || !hasUnsavedChanges
                  }
                  className="inline-flex min-h-11 items-center justify-center gap-2 rounded-xl bg-emerald-600 px-5 py-3 font-bold text-white transition hover:-translate-y-0.5 hover:bg-emerald-700 disabled:cursor-not-allowed disabled:translate-y-0 disabled:opacity-50"
                >
                  <Save className="h-4 w-4" />
                  {saving ? "Saving Changes..." : "Save Changes"}
                </button>
              </div>
            )}
          </div>
        </section>

        {editing && (
          <div className="fixed inset-x-0 bottom-0 z-40 border-t border-slate-200 bg-white/95 p-3 shadow-[0_-12px_35px_rgba(15,23,42,0.12)] backdrop-blur-xl sm:hidden dark:border-slate-700 dark:bg-slate-900/95">
            <div className="grid grid-cols-2 gap-3">
              <button
                type="button"
                onClick={() => void cancelEditing()}
                disabled={saving}
                className="min-h-12 rounded-xl border border-slate-300 bg-white px-4 py-3 text-sm font-bold text-slate-700 dark:border-slate-600 dark:bg-slate-900 dark:text-slate-200"
              >
                Cancel
              </button>

              <button
                type="button"
                onClick={() => void handleSave()}
                disabled={
                  saving || uploading || removingAvatar || !hasUnsavedChanges
                }
                className="inline-flex min-h-12 items-center justify-center gap-2 rounded-xl bg-emerald-600 px-4 py-3 text-sm font-bold text-white disabled:opacity-50"
              >
                <Save className="h-4 w-4" />
                {saving ? "Saving..." : "Save"}
              </button>
            </div>
          </div>
        )}
        {professionalEditorOpen && (
          <ProfessionalEditorModal
            draft={professionalDraft}
            saving={savingProfessional}
            onClose={() => setProfessionalEditorOpen(false)}
            onSave={() => void handleProfessionalSave()}
            onChange={setProfessionalDraft}
            onUpdateWorkExperience={updateWorkExperienceDraft}
            onAddWorkExperience={addWorkExperienceDraft}
            onRemoveWorkExperience={removeWorkExperienceDraft}
          />
        )}

        {viewDocument && (
          <DocumentViewerModal document={viewDocument} onClose={() => setViewDocument(null)} />
        )}

        {locationModalOpen && (
          <MyLocationModal
            profile={profile}
            saving={savingLocation}
            onClose={() => setLocationModalOpen(false)}
            onSave={handleLocationSelect}
          />
        )}

        </div>
      </main>
    </WorkerLayout>
  );
}

const WORKER_DOCUMENT_OPTIONS: Array<{ key: WorkerDocumentKey; label: string }> = [
  { key: "valid_id", label: "Valid ID" },
  { key: "resume", label: "Resume" },
  { key: "tesda_certificate", label: "TESDA Certificate" },
  { key: "barangay_clearance", label: "Barangay Clearance" },
  { key: "police_clearance", label: "Police Clearance" },
  { key: "nbi_clearance", label: "NBI Clearance" },
];

function documentLabel(key: WorkerDocumentKey): string {
  return WORKER_DOCUMENT_OPTIONS.find((item) => item.key === key)?.label ?? "Document";
}

function SectionHeader({ icon, title, description }: { icon: React.ReactNode; title: string; description: string }) {
  return <div className="mb-5 flex items-center gap-3"><div className="rounded-xl bg-blue-100 p-2 text-blue-700 dark:bg-blue-500/15 dark:text-blue-300">{icon}</div><div><h3 className="font-black text-slate-900 dark:text-white">{title}</h3><p className="text-sm text-slate-500 dark:text-slate-400">{description}</p></div></div>;
}

function ProfessionalEditorModal({
  draft, saving, onClose, onSave, onChange, onUpdateWorkExperience, onAddWorkExperience, onRemoveWorkExperience,
}: {
  draft: ProfessionalDraft; saving: boolean; onClose: () => void; onSave: () => void; onChange: React.Dispatch<React.SetStateAction<ProfessionalDraft>>; onUpdateWorkExperience: (index: number, field: keyof WorkExperienceDraft, value: string) => void; onAddWorkExperience: () => void; onRemoveWorkExperience: (index: number) => void;
}) {
  const field = (key: keyof Omit<ProfessionalDraft, "skills" | "workExperience" | "highest_attainment">, label: string) => <label className="block"><span className="mb-1.5 block text-xs font-black uppercase tracking-wide text-slate-500">{label}</span><input value={draft[key]} onChange={(e) => onChange((current) => ({ ...current, [key]: e.target.value }))} className="w-full rounded-xl border border-slate-200 bg-white px-3 py-2.5 text-sm outline-none focus:border-blue-500 dark:border-slate-700 dark:bg-slate-900 dark:text-white" /></label>;

  const selectedSkills = draft.skills.split(",").map((skill) => skill.trim()).filter(Boolean);
  const toggleSkill = (skill: string) => {
    onChange((current) => {
      const currentSkills = current.skills.split(",").map((item) => item.trim()).filter(Boolean);
      const nextSkills = currentSkills.includes(skill)
        ? currentSkills.filter((item) => item !== skill)
        : [...currentSkills, skill];
      return { ...current, skills: nextSkills.join(", ") };
    });
  };

  return <div className="fixed inset-0 z-[100] flex items-center justify-center bg-slate-950/60 p-3 backdrop-blur-sm" role="dialog" aria-modal="true">
    <div className="flex max-h-[92vh] w-full max-w-4xl flex-col overflow-hidden rounded-3xl bg-white shadow-2xl dark:bg-slate-950">
      <div className="flex items-center justify-between border-b border-slate-200 px-5 py-4 dark:border-slate-800"><div><h2 className="text-lg font-black text-slate-900 dark:text-white">Edit Professional Information</h2><p className="text-xs text-slate-500">Services are not editable here.</p></div><button type="button" onClick={onClose} disabled={saving} className="rounded-xl p-2 hover:bg-slate-100 dark:hover:bg-slate-800"><X className="h-5 w-5" /></button></div>
      <div className="overflow-y-auto p-5">
        <div className="grid gap-4 sm:grid-cols-2">
          <label className="block sm:col-span-2">
            <span className="mb-1.5 block text-xs font-black uppercase tracking-wide text-slate-500">Highest Educational Attainment</span>
            <div className="relative">
              <select value={draft.highest_attainment} onChange={(e) => onChange((current) => ({ ...current, highest_attainment: e.target.value }))} className="w-full appearance-none rounded-xl border border-slate-200 bg-white px-3 py-2.5 pr-10 text-sm outline-none focus:border-blue-500 focus:ring-4 focus:ring-blue-500/10 dark:border-slate-700 dark:bg-slate-900 dark:text-white">
                <option value="">Select highest educational attainment</option>
                {EDUCATION_OPTIONS.map((option) => <option key={option.value} value={option.value}>{option.label}</option>)}
              </select>
              <ChevronDown className="pointer-events-none absolute right-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
            </div>
            <p className="mt-1.5 text-xs text-slate-400">Select your highest level first. The related school fields will appear below, just like during registration.</p>
          </label>

          {draft.highest_attainment === "Other" && field("elementary", "Please specify education level")}

          {["Elementary", "Junior High", "Senior High", "College", "Master", "Doctorate"].includes(draft.highest_attainment) && (
            <label className="block">
              <span className="mb-1.5 block text-xs font-black uppercase tracking-wide text-slate-500">Elementary School</span>
              <div className="relative">
                <select value={draft.elementary} onChange={(e) => onChange((current) => ({ ...current, elementary: e.target.value }))} className="w-full appearance-none rounded-xl border border-slate-200 bg-white px-3 py-2.5 pr-10 text-sm dark:border-slate-700 dark:bg-slate-900 dark:text-white">
                  <option value="">Select or enter elementary school</option>
                  {ELEMENTARY_SCHOOLS.map((school) => <option key={school} value={school}>{school}</option>)}
                </select>
                <ChevronDown className="pointer-events-none absolute right-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
              </div>
            </label>
          )}

          {["Junior High", "Senior High", "College", "Master", "Doctorate"].includes(draft.highest_attainment) && (
            <label className="block">
              <span className="mb-1.5 block text-xs font-black uppercase tracking-wide text-slate-500">Junior High School</span>
              <div className="relative">
                <select value={draft.secondary} onChange={(e) => onChange((current) => ({ ...current, secondary: e.target.value }))} className="w-full appearance-none rounded-xl border border-slate-200 bg-white px-3 py-2.5 pr-10 text-sm dark:border-slate-700 dark:bg-slate-900 dark:text-white">
                  <option value="">Select or enter junior high school</option>
                  {JUNIOR_HIGH_SCHOOLS.map((school) => <option key={school} value={school}>{school}</option>)}
                </select>
                <ChevronDown className="pointer-events-none absolute right-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
              </div>
            </label>
          )}

          {["Senior High", "College", "Master", "Doctorate"].includes(draft.highest_attainment) && (
            <label className="block">
              <span className="mb-1.5 block text-xs font-black uppercase tracking-wide text-slate-500">Senior High School</span>
              <div className="relative">
                <select value={draft.senior_high} onChange={(e) => onChange((current) => ({ ...current, senior_high: e.target.value }))} className="w-full appearance-none rounded-xl border border-slate-200 bg-white px-3 py-2.5 pr-10 text-sm dark:border-slate-700 dark:bg-slate-900 dark:text-white">
                  <option value="">Select or enter senior high school</option>
                  {SENIOR_HIGH_SCHOOLS.map((school) => <option key={school} value={school}>{school}</option>)}
                </select>
                <ChevronDown className="pointer-events-none absolute right-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
              </div>
            </label>
          )}

          {["College", "Master", "Doctorate"].includes(draft.highest_attainment) && (
            <>
              <label className="block">
                <span className="mb-1.5 block text-xs font-black uppercase tracking-wide text-slate-500">{draft.highest_attainment === "College" ? "College / University" : "University"}</span>
                <div className="relative">
                  <select value={draft.college} onChange={(e) => onChange((current) => ({ ...current, college: e.target.value }))} className="w-full appearance-none rounded-xl border border-slate-200 bg-white px-3 py-2.5 pr-10 text-sm dark:border-slate-700 dark:bg-slate-900 dark:text-white">
                    <option value="">Select or enter college / university</option>
                    {HIGHER_EDUCATION_SCHOOLS.map((school) => <option key={school} value={school}>{school}</option>)}
                  </select>
                  <ChevronDown className="pointer-events-none absolute right-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
                </div>
              </label>
              {field("course", draft.highest_attainment === "Master" ? "Master's Degree" : draft.highest_attainment === "Doctorate" ? "Doctorate Degree" : "Course / Degree")}
              {field("year_graduated", "Year Graduated")}
            </>
          )}

          {field("tesda", "TESDA / Certification")}
          {field("prc", "PRC License")}
          <label className="block sm:col-span-2"><span className="mb-1.5 block text-xs font-black uppercase tracking-wide text-slate-500">Trainings / Seminars</span><textarea value={draft.trainings} onChange={(e) => onChange((current) => ({ ...current, trainings: e.target.value }))} rows={3} className="w-full rounded-xl border border-slate-200 bg-white px-3 py-2.5 text-sm outline-none focus:border-blue-500 dark:border-slate-700 dark:bg-slate-900 dark:text-white" /></label>

          <div className="sm:col-span-2">
            <span className="mb-1.5 block text-xs font-black uppercase tracking-wide text-slate-500">Professional Skills</span>
            <details className="group relative">
              <summary className="flex cursor-pointer list-none items-center justify-between rounded-xl border border-slate-200 bg-white px-3 py-2.5 text-sm dark:border-slate-700 dark:bg-slate-900 dark:text-white">
                <span className="truncate">{selectedSkills.length ? `${selectedSkills.length} skill${selectedSkills.length > 1 ? "s" : ""} selected` : "Select skills"}</span>
                <ChevronDown className="h-4 w-4 shrink-0 text-slate-400 transition group-open:rotate-180" />
              </summary>
              <div className="absolute left-0 right-0 z-20 mt-2 max-h-64 overflow-y-auto rounded-2xl border border-slate-200 bg-white p-2 shadow-xl dark:border-slate-700 dark:bg-slate-900">
                {WORKER_SKILL_OPTIONS.map((skill) => {
                  const checked = selectedSkills.includes(skill);
                  return <label key={skill} className="flex cursor-pointer items-center gap-3 rounded-xl px-3 py-2.5 hover:bg-slate-50 dark:hover:bg-slate-800"><input type="checkbox" checked={checked} onChange={() => toggleSkill(skill)} className="h-4 w-4 rounded border-slate-300 text-blue-600 focus:ring-blue-500" /><span className="text-sm font-semibold text-slate-700 dark:text-slate-200">{skill}</span></label>;
                })}
                <label className="flex cursor-pointer items-center gap-3 rounded-xl px-3 py-2.5 hover:bg-slate-50 dark:hover:bg-slate-800"><input type="checkbox" checked={selectedSkills.some((skill) => !WORKER_SKILL_OPTIONS.includes(skill))} onChange={(event) => {
                  const customSkills = selectedSkills.filter((skill) => !WORKER_SKILL_OPTIONS.includes(skill));
                  if (event.target.checked) {
                    if (!customSkills.length) onChange((current) => ({ ...current, skills: [...current.skills.split(",").map((item) => item.trim()).filter(Boolean), "Others"].join(", ") }));
                  } else {
                    onChange((current) => ({ ...current, skills: current.skills.split(",").map((item) => item.trim()).filter((item) => item !== "Others" && !customSkills.includes(item)).join(", ") }));
                  }
                }} className="h-4 w-4 rounded border-slate-300 text-blue-600 focus:ring-blue-500" /><span className="text-sm font-semibold text-slate-700 dark:text-slate-200">Others</span></label>
                {selectedSkills.includes("Others") || selectedSkills.some((skill) => !WORKER_SKILL_OPTIONS.includes(skill) && skill !== "Others") ? (
                  <input
                    value={selectedSkills.find((skill) => !WORKER_SKILL_OPTIONS.includes(skill) && skill !== "Others") ?? ""}
                    onChange={(event) => onChange((current) => {
                      const custom = event.target.value.trim();
                      const baseSkills = current.skills.split(",").map((item) => item.trim()).filter((item) => WORKER_SKILL_OPTIONS.includes(item));
                      return { ...current, skills: [...baseSkills, ...(custom ? [custom] : ["Others"])].join(", ") };
                    })}
                    placeholder="Specify other skill"
                    className="mx-3 mb-2 w-[calc(100%-1.5rem)] rounded-xl border border-slate-200 bg-white px-3 py-2.5 text-sm outline-none focus:border-blue-500 dark:border-slate-700 dark:bg-slate-950 dark:text-white"
                  />
                ) : null}
                <p className="px-3 pb-2 pt-1 text-xs text-slate-500">The choices match the worker registration skills. Select Others if you need to specify another skill.</p>
              </div>
            </details>
            <p className="mt-1 text-xs text-slate-500">Select one or more skills.</p>
          </div>
        </div>
        <div className="mt-6"><div className="mb-3 flex items-center justify-between"><div><h3 className="font-black text-slate-900 dark:text-white">Work Experience</h3><p className="text-xs text-slate-500">Add or update your previous work.</p></div><button type="button" onClick={onAddWorkExperience} className="inline-flex items-center gap-1 rounded-xl bg-blue-600 px-3 py-2 text-xs font-bold text-white"><Plus className="h-3.5 w-3.5" /> Add</button></div>
          <div className="space-y-4">{draft.workExperience.map((job, index) => <div key={index} className="rounded-2xl border border-slate-200 p-4 dark:border-slate-700"><div className="mb-3 flex justify-end"><button type="button" onClick={() => onRemoveWorkExperience(index)} className="inline-flex items-center gap-1 rounded-lg px-2 py-1 text-xs font-bold text-red-600 hover:bg-red-50"><Minus className="h-3.5 w-3.5" /> Remove</button></div><div className="grid gap-3 sm:grid-cols-2">
            <label><span className="mb-1 block text-xs font-bold text-slate-500">Company</span><input value={job.company} onChange={(e) => onUpdateWorkExperience(index,"company",e.target.value)} className="w-full rounded-xl border border-slate-200 px-3 py-2.5 text-sm dark:border-slate-700 dark:bg-slate-900 dark:text-white" /></label>
            <label><span className="mb-1 block text-xs font-bold text-slate-500">Position</span><input value={job.position} onChange={(e) => onUpdateWorkExperience(index,"position",e.target.value)} placeholder="Enter your job title" className="w-full rounded-xl border border-slate-200 px-3 py-2.5 text-sm dark:border-slate-700 dark:bg-slate-900 dark:text-white" /></label>
            <label><span className="mb-1 block text-xs font-bold text-slate-500">Employment Status</span><div className="relative"><select value={job.employment_status} onChange={(e) => onUpdateWorkExperience(index,"employment_status",e.target.value)} className="w-full appearance-none rounded-xl border border-slate-200 bg-white px-3 py-2.5 pr-10 text-sm dark:border-slate-700 dark:bg-slate-900 dark:text-white"><option value="">Select employment status</option>{EMPLOYMENT_STATUS_OPTIONS.map((option) => <option key={option} value={option}>{option}</option>)}</select><ChevronDown className="pointer-events-none absolute right-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" /></div></label>
            <label><span className="mb-1 block text-xs font-bold text-slate-500">Start Date</span><input type="date" value={job.start_date} onChange={(e) => onUpdateWorkExperience(index,"start_date",e.target.value)} className="w-full rounded-xl border border-slate-200 px-3 py-2.5 text-sm dark:border-slate-700 dark:bg-slate-900 dark:text-white" /></label>
            <label><span className="mb-1 block text-xs font-bold text-slate-500">End Date</span><input type="date" value={job.end_date} onChange={(e) => onUpdateWorkExperience(index,"end_date",e.target.value)} className="w-full rounded-xl border border-slate-200 px-3 py-2.5 text-sm dark:border-slate-700 dark:bg-slate-900 dark:text-white" /></label>
            <label className="sm:col-span-2"><span className="mb-1 block text-xs font-bold text-slate-500">Description</span><textarea value={job.description} onChange={(e) => onUpdateWorkExperience(index,"description",e.target.value)} rows={3} className="w-full rounded-xl border border-slate-200 px-3 py-2.5 text-sm dark:border-slate-700 dark:bg-slate-900 dark:text-white" /></label>
          </div></div>)}</div>
        </div>
      </div>
      <div className="flex justify-end gap-2 border-t border-slate-200 p-4 dark:border-slate-800"><button type="button" onClick={onClose} disabled={saving} className="rounded-xl border border-slate-300 px-4 py-2.5 text-sm font-bold text-slate-700 dark:border-slate-700 dark:text-slate-200">Cancel</button><button type="button" onClick={onSave} disabled={saving} className="inline-flex items-center gap-2 rounded-xl bg-emerald-600 px-5 py-2.5 text-sm font-bold text-white disabled:opacity-50"><Save className="h-4 w-4" />{saving ? 'Saving...' : 'Save Changes'}</button></div>
    </div>
  </div>;
}

function MyLocationModal({
  profile,
  saving,
  onClose,
  onSave,
}: {
  profile: WorkerProfile;
  saving: boolean;
  onClose: () => void;
  onSave: (latitude: number, longitude: number, address: string) => Promise<void>;
}) {
  const [pendingLocation, setPendingLocation] = useState<{
    latitude: number;
    longitude: number;
    address: string;
  } | null>(
    profile.latitude !== null && profile.longitude !== null
      ? {
          latitude: profile.latitude,
          longitude: profile.longitude,
          address: profile.address ?? "",
        }
      : null,
  );

  const handlePickerSelect = useCallback(
    (latitude: number, longitude: number, address: string) => {
      setPendingLocation({ latitude, longitude, address });
    },
    [],
  );

  const handleSave = useCallback(async () => {
    if (!pendingLocation || saving) return;
    await onSave(
      pendingLocation.latitude,
      pendingLocation.longitude,
      pendingLocation.address,
    );
  }, [onSave, pendingLocation, saving]);

  return createPortal(
    <div
      className="fixed inset-0 z-[120] flex items-center justify-center bg-slate-950/70 p-2 backdrop-blur-sm sm:p-4"
      role="dialog"
      aria-modal="true"
      aria-label="My Location"
      onMouseDown={(event) => {
        if (event.target === event.currentTarget && !saving) onClose();
      }}
      onClick={(event) => event.stopPropagation()}
    >
      <div className="relative flex h-[94vh] w-full max-w-6xl flex-col overflow-hidden rounded-3xl bg-white shadow-2xl dark:bg-slate-950">
        <div className="flex shrink-0 items-center justify-between gap-3 border-b border-slate-200 px-4 py-3 dark:border-slate-800 sm:px-5">
          <div className="flex min-w-0 items-center gap-3">
            <div className="rounded-xl bg-blue-600 p-2 text-white">
              <MapPin className="h-5 w-5" />
            </div>
            <div className="min-w-0">
              <h2 className="truncate text-base font-black text-slate-900 dark:text-white sm:text-lg">
                My Location
              </h2>
              <p className="truncate text-xs text-slate-500 dark:text-slate-400">
                Search a place or choose a location on the map, then save it.
              </p>
            </div>
          </div>
          <button
            type="button"
            onClick={onClose}
            disabled={saving}
            className="shrink-0 rounded-xl p-2 text-slate-500 hover:bg-slate-100 disabled:opacity-50 dark:hover:bg-slate-800"
            aria-label="Close location modal"
          >
            <X className="h-5 w-5" />
          </button>
        </div>

        <div className="min-h-0 flex-1 overflow-hidden">
          <LocationPicker
            autoLocateOnMount={false}
            initialLocation={
              profile.latitude !== null && profile.longitude !== null
                ? {
                    latitude: profile.latitude,
                    longitude: profile.longitude,
                    address: profile.address ?? "",
                  }
                : undefined
            }
            onLocationSelect={handlePickerSelect}
          />
        </div>

        <div className="shrink-0 border-t border-slate-200 bg-white/95 p-3 backdrop-blur dark:border-slate-800 dark:bg-slate-950/95 sm:p-4">
          <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
            <div className="min-w-0">
              <p className="text-xs font-black uppercase tracking-wide text-slate-500 dark:text-slate-400">
                Selected Location
              </p>
              <p className="mt-1 truncate text-sm font-bold text-slate-800 dark:text-slate-100">
                {pendingLocation?.address || "Choose a location on the map."}
              </p>
              {pendingLocation && (
                <p className="mt-0.5 text-[11px] text-slate-500 dark:text-slate-400">
                  {pendingLocation.latitude.toFixed(6)}, {pendingLocation.longitude.toFixed(6)}
                </p>
              )}
            </div>

            <div className="flex shrink-0 gap-2">
              <button
                type="button"
                onClick={onClose}
                disabled={saving}
                className="min-h-11 rounded-xl border border-slate-300 bg-white px-4 py-2.5 text-sm font-bold text-slate-700 hover:bg-slate-50 disabled:opacity-50 dark:border-slate-700 dark:bg-slate-900 dark:text-slate-200"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={() => void handleSave()}
                disabled={!pendingLocation || saving}
                className="inline-flex min-h-11 items-center justify-center gap-2 rounded-xl bg-blue-600 px-5 py-2.5 text-sm font-black text-white hover:bg-blue-700 disabled:cursor-not-allowed disabled:opacity-50"
              >
                <MapPin className="h-4 w-4" />
                {saving ? "Saving..." : "Save Location"}
              </button>
            </div>
          </div>
        </div>

        {saving && (
          <div className="absolute inset-0 z-[130] flex items-center justify-center bg-slate-950/20 backdrop-blur-[1px]">
            <div className="rounded-2xl bg-white px-5 py-4 text-sm font-black text-slate-900 shadow-xl dark:bg-slate-900 dark:text-white">
              Saving location...
            </div>
          </div>
        )}
      </div>
    </div>,
    document.body,
  );
}

function DocumentViewerModal({ document, onClose }: { document: { label: string; url: string }; onClose: () => void }) {
  const isImage = /\.(jpe?g|png|webp)(\?|$)/i.test(document.url);
  return <div className="fixed inset-0 z-[110] flex items-center justify-center bg-slate-950/70 p-3 backdrop-blur-sm" role="dialog" aria-modal="true"><div className="flex h-[92vh] w-full max-w-5xl flex-col overflow-hidden rounded-3xl bg-white shadow-2xl dark:bg-slate-950"><div className="flex items-center justify-between border-b border-slate-200 px-4 py-3 dark:border-slate-800"><h2 className="font-black text-slate-900 dark:text-white">{document.label}</h2><button type="button" onClick={onClose} className="rounded-xl p-2 hover:bg-slate-100 dark:hover:bg-slate-800"><X className="h-5 w-5" /></button></div><div className="min-h-0 flex-1 bg-slate-100 p-3 dark:bg-slate-900">{isImage ? <div className="flex h-full items-center justify-center"><img src={document.url} alt={document.label} className="max-h-full max-w-full rounded-xl object-contain shadow-lg" /></div> : <iframe src={document.url} title={document.label} className="h-full w-full rounded-xl border-0 bg-white" />}</div></div></div>;
}

function WorkerDocumentsSection({
  details,
  uploadingDocument,
  disabled,
  onUpload,
  onView,
}: {
  details: CompleteWorkerProfile | null;
  uploadingDocument: WorkerDocumentKey | null;
  disabled: boolean;
  onUpload: (key: WorkerDocumentKey, event: ChangeEvent<HTMLInputElement>) => Promise<void>;
  onView: (label: string, url: string) => void;
}) {
  const documents = details?.documents as Record<string, unknown> | null;

  return (
    <section className="mt-7 rounded-[1.5rem] border border-slate-200 bg-white p-4 dark:border-slate-700 dark:bg-slate-900 sm:p-6">
      <div className="mb-5 flex items-start justify-between gap-4">
        <div className="flex items-center gap-3">
          <div className="rounded-xl bg-violet-100 p-2 text-violet-700 dark:bg-violet-500/15 dark:text-violet-300">
            <FileText className="h-5 w-5" />
          </div>
          <div>
            <h3 className="font-black text-slate-900 dark:text-white">Documents</h3>
            <p className="text-sm text-slate-500 dark:text-slate-400">
              Keep your verification and supporting documents updated.
            </p>
          </div>
        </div>
      </div>

      <div className="grid gap-3 md:grid-cols-2">
        {WORKER_DOCUMENT_OPTIONS.map((item) => {
          const url = getDisplayText(documents?.[item.key]);
          const isUploading = uploadingDocument === item.key;
          const inputId = `worker-document-${item.key}`;

          return (
            <div
              key={item.key}
              className="flex flex-col gap-3 rounded-2xl border border-slate-200 bg-slate-50 p-4 dark:border-slate-700 dark:bg-slate-800/50 sm:flex-row sm:items-center sm:justify-between"
            >
              <div className="min-w-0">
                <p className="font-bold text-slate-900 dark:text-white">{item.label}</p>
                <p className="mt-1 text-xs font-semibold text-slate-500 dark:text-slate-400">
                  {url ? "Uploaded" : "Not uploaded"}
                </p>
              </div>

              <div className="flex shrink-0 items-center gap-2">
                {url && (
                  <button
                    type="button"
                    onClick={() => onView(item.label, url)}
                    className="inline-flex min-h-10 items-center gap-1 rounded-xl border border-slate-300 bg-white px-3 py-2 text-xs font-bold text-slate-700 hover:bg-slate-100 dark:border-slate-600 dark:bg-slate-900 dark:text-slate-200"
                  >
                    <Eye className="h-3.5 w-3.5" /> View
                  </button>
                )}
                <input
                  id={inputId}
                  type="file"
                  accept=".jpg,.jpeg,.png,.webp,.pdf,application/pdf,image/jpeg,image/png,image/webp"
                  className="hidden"
                  disabled={disabled}
                  onChange={(event) => void onUpload(item.key, event)}
                />
                <label
                  htmlFor={inputId}
                  className={`inline-flex min-h-10 cursor-pointer items-center gap-2 rounded-xl bg-blue-600 px-3 py-2 text-xs font-bold text-white hover:bg-blue-700 ${disabled ? "pointer-events-none opacity-50" : ""}`}
                >
                  <Upload className="h-3.5 w-3.5" />
                  {isUploading ? "Uploading..." : url ? "Replace" : "Upload"}
                </label>
              </div>
            </div>
          );
        })}
      </div>

      <p className="mt-4 text-xs text-slate-500 dark:text-slate-400">
        Accepted files: JPG, PNG, WEBP, or PDF. Maximum file size: 50 MB.
      </p>
    </section>
  );
}

function getDisplayText(value: unknown): string {
  if (value === null || value === undefined) return "Not provided";
  const text = String(value).trim();
  return text || "Not provided";
}

function EmptyProfileMessage({ text }: { text: string }) {
  return (
    <div className="rounded-2xl border border-dashed border-slate-300 bg-slate-50 px-4 py-4 text-sm font-semibold text-slate-500 dark:border-slate-700 dark:bg-slate-800/40 dark:text-slate-400">
      {text}
    </div>
  );
}

function WorkerProfessionalDetails({
  details,
}: {
  details: CompleteWorkerProfile | null;
}) {
  const education = (details?.education ?? {}) as Record<string, unknown>;
  const educationRows = [
    ["Highest Educational Attainment", education.highest_attainment],
    ["Elementary School", education.elementary],
    ["Junior High School", education.secondary],
    ["Senior High School", education.senior_high],
    ["College / University", education.college],
    ["Course / Degree", education.course],
    ["Year Graduated", education.year_graduated],
    ["TESDA / Certification", education.tesda],
    ["PRC License", education.prc],
    ["Trainings / Seminars", education.trainings],
  ] as const;

  const getSkillName = (skill: CompleteWorkerProfile["skills"][number]) => {
    const record = skill as unknown as Record<string, unknown>;
    return getDisplayText(record.skill ?? record.skill_name);
  };

  return (
    <>
      <section className="rounded-[1.5rem] border border-slate-200 bg-white p-4 dark:border-slate-700 dark:bg-slate-900 sm:p-6">
        <SectionHeader
          icon={<Wrench className="h-5 w-5" />}
          title="Skills & Services"
          description="Your registered skills and services that customers can view."
        />

        <div className="mb-6">
          <p className="mb-2 text-xs font-black uppercase tracking-wide text-slate-500 dark:text-slate-400">
            Skills
          </p>
          {details?.skills.length ? (
            <div className="flex flex-wrap gap-2">
              {details.skills.map((skill) => {
                const name = getSkillName(skill);
                return (
                  <span
                    key={skill.id}
                    className="rounded-full border border-blue-100 bg-blue-50 px-3 py-2 text-sm font-bold text-blue-700 dark:border-blue-900/50 dark:bg-blue-950/30 dark:text-blue-300"
                  >
                    {name || "Skill"}
                  </span>
                );
              })}
            </div>
          ) : (
            <EmptyProfileMessage text="No skills have been added yet." />
          )}
        </div>

        <div>
          <p className="mb-2 text-xs font-black uppercase tracking-wide text-slate-500 dark:text-slate-400">
            Services Offered
          </p>
          {details?.services.length ? (
            <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
              {details.services.map((service) => (
                <div
                  key={service.id}
                  className="rounded-2xl border border-slate-200 bg-slate-50 p-4 dark:border-slate-700 dark:bg-slate-800/50"
                >
                  <p className="font-bold text-slate-900 dark:text-white">
                    {service.service_name || "Service"}
                  </p>
                  {service.category && (
                    <p className="mt-1 text-xs font-semibold text-blue-600 dark:text-blue-300">
                      {service.category}
                    </p>
                  )}
                </div>
              ))}
            </div>
          ) : (
            <EmptyProfileMessage text="No services found." />
          )}
        </div>
      </section>

      <div className="mt-6 grid items-start gap-6 lg:grid-cols-2">
        <section className="rounded-[1.5rem] border border-slate-200 bg-white p-4 dark:border-slate-700 dark:bg-slate-900 sm:p-6">
          <SectionHeader
            icon={<GraduationCap className="h-5 w-5" />}
            title="Education & Training"
            description="The same education fields used during worker registration."
          />

          <div className="space-y-3">
            {educationRows.map(([label, rawValue]) => (
              <ProfileInfoRow
                key={label}
                label={label}
                value={getDisplayText(rawValue)}
                multiline={label === "Trainings / Seminars"}
              />
            ))}
          </div>
        </section>

        <section className="rounded-[1.5rem] border border-slate-200 bg-white p-4 dark:border-slate-700 dark:bg-slate-900 sm:p-6">
          <SectionHeader
            icon={<BriefcaseBusiness className="h-5 w-5" />}
            title="Work Experience"
            description="Your previous work experience registered in SerbisyoGo."
          />

          {details?.workExperience.length ? (
            <div className="space-y-3">
              {details.workExperience.map((job) => {
                const record = job as CompleteWorkerProfile["workExperience"][number] & Record<string, unknown>;
                const company = getDisplayText(record.company ?? record.company_name);
                const position = getDisplayText(record.position);
                const employmentStatus = getDisplayText(record.employment_status);
                const start = getDisplayText(record.start_date ?? record.start_year);
                const end = getDisplayText(record.end_date ?? record.end_year);
                const description = getDisplayText(record.description ?? record.work_description);

                return (
                  <article
                    key={job.id}
                    className="rounded-2xl border border-slate-200 bg-slate-50 p-4 dark:border-slate-700 dark:bg-slate-800/50"
                  >
                    <h4 className="font-black text-slate-900 dark:text-white">
                      {position || "Position not provided"}
                    </h4>
                    <p className="mt-1 text-sm font-bold text-emerald-700 dark:text-emerald-300">
                      {company || "Company not provided"}
                    </p>
                    {employmentStatus && (
                      <p className="mt-2 text-xs font-semibold text-slate-600 dark:text-slate-300">
                        Employment Status: {employmentStatus}
                      </p>
                    )}
                    {(start || end) && (
                      <p className="mt-1 text-xs font-semibold text-slate-500 dark:text-slate-400">
                        {start || "Start not provided"} – {end || "Present"}
                      </p>
                    )}
                    {description && (
                      <p className="mt-3 text-sm leading-6 text-slate-600 dark:text-slate-300">
                        {description}
                      </p>
                    )}
                  </article>
                );
              })}
            </div>
          ) : (
            <EmptyProfileMessage text="No work experience has been added yet." />
          )}
        </section>
      </div>
    </>
  );
}

function ProfileInfoRow({
  label,
  value,
  multiline = false,
}: {
  label: string;
  value: string;
  multiline?: boolean;
}) {
  return (
    <div className="rounded-xl border border-slate-200 bg-slate-50 px-4 py-3 dark:border-slate-700 dark:bg-slate-800/50">
      <p className="text-[11px] font-black uppercase tracking-wide text-slate-500 dark:text-slate-400">
        {label}
      </p>
      <p className={`mt-1 text-sm font-semibold text-slate-800 dark:text-slate-200 ${multiline ? "whitespace-pre-line leading-6" : ""}`}>
        {value || "Not provided"}
      </p>
    </div>
  );
}

function ProfileField({
  label,
  required = false,
  type = "text",
  value,
  disabled,
  error,
  helper,
  placeholder,
  onChange,
}: {
  label: string;
  required?: boolean;
  type?: "text" | "email" | "tel";
  value: string;
  disabled: boolean;
  error?: string;
  helper?: string;
  placeholder?: string;
  onChange?: (value: string) => void;
}) {
  return (
    <label className="block">
      <span className="mb-2 block text-sm font-semibold text-slate-700 dark:text-slate-200">
        {label}
        {required && <span className="ml-1 text-red-500">*</span>}
      </span>

      <input
        type={type}
        disabled={disabled}
        value={value}
        onChange={(event) => onChange?.(event.target.value)}
        className={`w-full rounded-2xl border bg-slate-50 px-4 py-3 text-slate-900 outline-none transition placeholder:text-slate-400 focus:bg-white disabled:cursor-not-allowed disabled:bg-slate-100 disabled:text-slate-600 dark:bg-slate-800 dark:text-white dark:focus:bg-slate-900 dark:disabled:bg-slate-800 dark:disabled:text-slate-400 ${
          error
            ? "border-red-400 focus:border-red-500 focus:ring-4 focus:ring-red-100 dark:focus:ring-red-950"
            : "border-slate-200 focus:border-blue-500 focus:ring-4 focus:ring-blue-500/10 dark:border-slate-700 dark:focus:ring-blue-500/10"
        }`}
        placeholder={placeholder}
        aria-invalid={Boolean(error)}
      />

      {error ? (
        <p className="mt-2 text-sm text-red-600 dark:text-red-400">{error}</p>
      ) : helper ? (
        <p className="mt-2 text-xs text-slate-500 dark:text-slate-400">
          {helper}
        </p>
      ) : null}
    </label>
  );
}
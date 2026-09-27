import { create } from "zustand";
import { createJSONStorage, persist } from "zustand/middleware";

export interface RegisterData {
  profilePicture: File | null;

  firstName: string;
  middleName: string;
  lastName: string;
  suffix: string;

  birthDate: string;
  gender: string;
  civilStatus: string;
  religion: string;

  phone: string;
  email: string;

  password: string;
  confirmPassword: string;

  houseNo: string;
  street: string;
  barangay: string;
  municipality: string;
  province: string;

  highestEducation: string;
  otherEducation: string;

  elementary: string;
  secondary: string;
  seniorHigh: string;
  college: string;
  course: string;
  yearGraduated: string;

  juniorHighDiploma?: File | null;
  seniorHighDiploma?: File | null;
  collegeDiploma?: File | null;
  mastersDiploma?: File | null;
  doctorateDiploma?: File | null;

  tesda: string;
  prc: string;
  trainings: string;

  company: string;
  position: string;
  employmentStatus: string;
  startDate: string;
  endDate: string;
  description: string;

  noWorkExperience: boolean;

  skills: string[];

  validId?: File | null;
  resume?: File | null;
  tesdaCertificate?: File | null;
  barangayClearance?: File | null;
  policeClearance?: File | null;
  nbiClearance?: File | null;
}

interface RegisterStore {
  step: number;
  data: RegisterData;
  completedSteps: number[];
  errors: Record<string, string>;
  editingFromReview: boolean;

  setEditingFromReview: (value: boolean) => void;
  nextStep: () => void;
  prevStep: () => void;
  goToStep: (step: number) => void;
  completeStep: (step: number) => void;
  updateData: (values: Partial<RegisterData>) => void;
  setErrors: (errors: Record<string, string>) => void;
  setError: (field: string, message: string) => void;
  clearError: (field: string) => void;
  reset: () => void;
}

type PersistedRegisterState = {
  step: number;
  data: Partial<RegisterData>;
  completedSteps: number[];
  editingFromReview: boolean;
};

const MAX_STEP = 6;

/*
 * ============================================================
 * DOCUMENT VALIDATION
 * ============================================================
 *
 * Accepted:
 * JPG
 * PNG
 * WEBP
 * PDF
 *
 * Maximum:
 * 50MB per file
 */

const ALLOWED_DOCUMENT_TYPES = [
  "image/jpeg",
  "image/png",
  "image/webp",
  "application/pdf",
] as const;

const MAX_DOCUMENT_SIZE = 50 * 1024 * 1024;

type DocumentField =
  | "validId"
  | "resume"
  | "tesdaCertificate"
  | "barangayClearance"
  | "policeClearance"
  | "nbiClearance"
  | "juniorHighDiploma"
  | "seniorHighDiploma"
  | "collegeDiploma"
  | "mastersDiploma"
  | "doctorateDiploma";

const DOCUMENT_LABELS: Record<DocumentField, string> = {
  validId: "Valid ID",
  resume: "Resume",
  tesdaCertificate: "TESDA Certificate",
  barangayClearance: "Barangay Clearance",
  policeClearance: "Police Clearance",
  nbiClearance: "NBI Clearance",
  juniorHighDiploma: "Junior High Diploma",
  seniorHighDiploma: "Senior High Diploma",
  collegeDiploma: "College Diploma",
  mastersDiploma: "Master's Diploma",
  doctorateDiploma: "Doctorate Diploma",
};

function validateDocumentFile(
  field: DocumentField,
  file: File | null | undefined,
): string | null {
  if (!file) {
    return null;
  }

  if (!ALLOWED_DOCUMENT_TYPES.includes(file.type as never)) {
    return `${DOCUMENT_LABELS[field]} must be a JPG, PNG, WEBP, or PDF file.`;
  }

  if (file.size > MAX_DOCUMENT_SIZE) {
    return `${DOCUMENT_LABELS[field]} must not exceed 50MB.`;
  }

  return null;
}

function validateDocuments(
  values: Partial<RegisterData>,
): Record<string, string> {
  const documentFields: DocumentField[] = [
    "validId",
    "resume",
    "tesdaCertificate",
    "barangayClearance",
    "policeClearance",
    "nbiClearance",
    "juniorHighDiploma",
    "seniorHighDiploma",
    "collegeDiploma",
    "mastersDiploma",
    "doctorateDiploma",
  ];

  const documentErrors: Record<string, string> = {};

  for (const field of documentFields) {
    const error = validateDocumentFile(field, values[field]);

    if (error) {
      documentErrors[field] = error;
    }
  }

  return documentErrors;
}

/*
 * ============================================================
 * INITIAL DATA
 * ============================================================
 */

const initialData: RegisterData = {
  profilePicture: null,

  firstName: "",
  middleName: "",
  lastName: "",
  suffix: "",

  birthDate: "",
  gender: "",
  civilStatus: "",
  religion: "",

  phone: "",
  email: "",

  password: "",
  confirmPassword: "",

  houseNo: "",
  street: "",
  barangay: "",
  municipality: "",
  province: "Laguna",

  highestEducation: "",
  otherEducation: "",

  elementary: "",
  secondary: "",
  seniorHigh: "",
  college: "",
  course: "",
  yearGraduated: "",

  juniorHighDiploma: null,
  seniorHighDiploma: null,
  collegeDiploma: null,
  mastersDiploma: null,
  doctorateDiploma: null,

  tesda: "",
  prc: "",
  trainings: "",

  company: "",
  position: "",
  employmentStatus: "",
  startDate: "",
  endDate: "",
  description: "",

  noWorkExperience: false,

  skills: [],

  validId: null,
  resume: null,
  tesdaCertificate: null,
  barangayClearance: null,
  policeClearance: null,
  nbiClearance: null,
};

/*
 * ============================================================
 * PERSISTABLE DATA
 * ============================================================
 *
 * IMPORTANT:
 *
 * Password and confirmPassword are intentionally NOT stored
 * in sessionStorage.
 *
 * File objects are also NOT stored in sessionStorage.
 *
 * This prevents sensitive credentials and File objects from
 * being persisted.
 */

function getPersistableData(data: RegisterData): Partial<RegisterData> {
  return {
    firstName: data.firstName,
    middleName: data.middleName,
    lastName: data.lastName,
    suffix: data.suffix,

    birthDate: data.birthDate,
    gender: data.gender,
    civilStatus: data.civilStatus,
    religion: data.religion,

    phone: data.phone,
    email: data.email,

    /*
     * Password intentionally excluded.
     *
     * confirmPassword intentionally excluded.
     */

    houseNo: data.houseNo,
    street: data.street,
    barangay: data.barangay,
    municipality: data.municipality,
    province: data.province,

    highestEducation: data.highestEducation,
    otherEducation: data.otherEducation,

    elementary: data.elementary,
    secondary: data.secondary,
    seniorHigh: data.seniorHigh,
    college: data.college,
    course: data.course,
    yearGraduated: data.yearGraduated,

    tesda: data.tesda,
    prc: data.prc,
    trainings: data.trainings,

    company: data.company,
    position: data.position,
    employmentStatus: data.employmentStatus,
    startDate: data.startDate,
    endDate: data.endDate,
    description: data.description,

    noWorkExperience: data.noWorkExperience,
    skills: data.skills,
  };
}

/*
 * ============================================================
 * STORE
 * ============================================================
 */

export const useRegisterStore = create<RegisterStore>()(
  persist(
    (set) => ({
      step: 1,

      data: {
        ...initialData,
      },

      completedSteps: [],

      errors: {},

      editingFromReview: false,

      /*
       * ======================================================
       * REVIEW / EDITING
       * ======================================================
       */

      setEditingFromReview: (value) =>
        set({
          editingFromReview: value,
        }),

      /*
       * ======================================================
       * STEP NAVIGATION
       * ======================================================
       */

      nextStep: () =>
        set((state) => ({
          step: Math.min(MAX_STEP, state.step + 1),
        })),

      prevStep: () =>
        set((state) => ({
          step: Math.max(1, state.step - 1),
        })),

      goToStep: (step) =>
        set({
          step: Math.min(MAX_STEP, Math.max(1, step)),
        }),

      completeStep: (step) =>
        set((state) => ({
          completedSteps: state.completedSteps.includes(step)
            ? state.completedSteps
            : [...state.completedSteps, step].sort((a, b) => a - b),
        })),

      /*
       * ======================================================
       * UPDATE DATA
       * ======================================================
       *
       * IMPORTANT:
       *
       * Always merge new values with the existing state.
       *
       * This prevents editing Education, Documents, Skills,
       * Work Experience, etc. from replacing the other
       * registration information.
       */

      updateData: (values) =>
        set((state) => {
          const updatedData: RegisterData = {
            ...state.data,
            ...values,
          };

          /*
           * Validate document files whenever document data
           * is updated.
           */
          const documentErrors = validateDocuments(values);

          /*
           * Preserve existing errors.
           */
          const newErrors = {
            ...state.errors,
          };

          const documentFields: DocumentField[] = [
            "validId",
            "resume",
            "tesdaCertificate",
            "barangayClearance",
            "policeClearance",
            "nbiClearance",
            "juniorHighDiploma",
            "seniorHighDiploma",
            "collegeDiploma",
            "mastersDiploma",
            "doctorateDiploma",
          ];

          /*
           * Only update errors for document fields that
           * were actually included in this update.
           */
          for (const field of documentFields) {
            if (field in values) {
              if (documentErrors[field]) {
                newErrors[field] = documentErrors[field];
              } else {
                delete newErrors[field];
              }
            }
          }

          return {
            data: updatedData,
            errors: newErrors,
          };
        }),

      /*
       * ======================================================
       * ERRORS
       * ======================================================
       */

      setErrors: (errors) =>
        set({
          errors,
        }),

      setError: (field, message) =>
        set((state) => ({
          errors: {
            ...state.errors,
            [field]: message,
          },
        })),

      clearError: (field) =>
        set((state) => {
          const newErrors = {
            ...state.errors,
          };

          delete newErrors[field];

          return {
            errors: newErrors,
          };
        }),

      /*
       * ======================================================
       * RESET
       * ======================================================
       */

      reset: () =>
        set({
          step: 1,

          editingFromReview: false,

          completedSteps: [],

          errors: {},

          data: {
            ...initialData,
          },
        }),
    }),

    /*
     * ========================================================
     * PERSIST
     * ========================================================
     */

    {
      name: "livelihoodgo-worker-registration-draft",

      storage: createJSONStorage(() => sessionStorage),

      version: 1,

      /*
       * Only safe registration draft information is persisted.
       *
       * Passwords are NOT persisted.
       * File objects are NOT persisted.
       */
      partialize: (state): PersistedRegisterState => ({
        step: state.step,

        data: getPersistableData(state.data),

        completedSteps: state.completedSteps,

        editingFromReview: state.editingFromReview,
      }),

      /*
       * ======================================================
       * REHYDRATION
       * ======================================================
       *
       * IMPORTANT FIX:
       *
       * Do NOT explicitly set:
       *
       * password: ""
       * confirmPassword: ""
       *
       * here.
       *
       * Doing that would overwrite the current in-memory
       * password whenever Zustand rehydrates.
       *
       * Because password and confirmPassword are not part of
       * persisted.data, they will still be empty after an
       * actual browser refresh, which is intentional.
       */

      merge: (persistedState, currentState) => {
        const persisted = persistedState as PersistedRegisterState | undefined;

        if (!persisted) {
          return currentState;
        }

        return {
          ...currentState,

          step: Math.min(
            MAX_STEP,
            Math.max(1, persisted.step ?? currentState.step),
          ),

          completedSteps: Array.isArray(persisted.completedSteps)
            ? persisted.completedSteps
            : currentState.completedSteps,

          editingFromReview:
            persisted.editingFromReview ?? currentState.editingFromReview,

          /*
           * Merge persisted information into the CURRENT
           * in-memory data.
           *
           * This is important because password and
           * confirmPassword are intentionally not persisted.
           */
          data: {
            ...currentState.data,

            ...initialData,

            ...persisted.data,

            /*
             * Keep sensitive credentials from the current
             * in-memory state.
             *
             * They are never loaded from sessionStorage.
             */
            password: currentState.data.password,
            confirmPassword: currentState.data.confirmPassword,

            /*
             * File objects cannot be restored from
             * sessionStorage.
             */
            profilePicture: currentState.data.profilePicture,

            juniorHighDiploma: currentState.data.juniorHighDiploma,
            seniorHighDiploma: currentState.data.seniorHighDiploma,
            collegeDiploma: currentState.data.collegeDiploma,
            mastersDiploma: currentState.data.mastersDiploma,
            doctorateDiploma: currentState.data.doctorateDiploma,

            validId: currentState.data.validId,
            resume: currentState.data.resume,
            tesdaCertificate: currentState.data.tesdaCertificate,
            barangayClearance: currentState.data.barangayClearance,
            policeClearance: currentState.data.policeClearance,
            nbiClearance: currentState.data.nbiClearance,
          },

          /*
           * Validation errors should not be persisted.
           */
          errors: {},
        };
      },
    },
  ),
);

import { create } from "zustand";

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

  setEditingFromReview: (
    value: boolean
  ) => void;


  nextStep: () => void;

  prevStep: () => void;

  goToStep: (
    step: number
  ) => void;


  completeStep: (
    step: number
  ) => void;


  updateData: (
    values: Partial<RegisterData>
  ) => void;


  setErrors: (
    errors: Record<string, string>
  ) => void;


  clearError: (
    field: string
  ) => void;


  reset: () => void;

}



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
export const useRegisterStore = create<RegisterStore>((set) => ({

  step: 1,

  data: initialData,

  completedSteps: [],

  errors: {},


  editingFromReview: false,


  setEditingFromReview: (
    value
  ) =>
    set({
      editingFromReview: value,
    }),



  nextStep: () =>
    set((state) => ({
      step: state.step + 1,
    })),



  prevStep: () =>
    set((state) => ({
      step: state.step - 1,
    })),



  goToStep: (
    step
  ) =>
    set({
      step,
    }),



  completeStep: (
    step
  ) =>
    set((state) => ({
      completedSteps:
        state.completedSteps.includes(step)
          ? state.completedSteps
          : [
              ...state.completedSteps,
              step,
            ],
    })),



  updateData: (
    values
  ) =>
    set((state) => ({
      data: {
        ...state.data,
        ...values,
      },
    })),



  setErrors: (
    errors
  ) =>
    set({
      errors,
    }),



  clearError: (
    field
  ) =>
    set((state) => {

      const newErrors = {
        ...state.errors,
      };


      delete newErrors[field];


      return {
        errors: newErrors,
      };

    }),



  reset: () =>
    set({

      step: 1,

      editingFromReview: false,

      completedSteps: [],

      errors: {},

      data: initialData,

    }),

}));
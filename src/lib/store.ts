import { create } from "zustand";

interface FormField {
  id: string;
  type: string;
  label: string;
  options?: string[];
}

interface SharedResponse {
  [fieldId: string]: string | number | boolean | string[];
}

interface FormState {
  formId: string | null;
  fields: FormField[];
  sharedResponse: SharedResponse;
  lockedFields: { [fieldId: string]: string | null }; // fieldId -> userId who locked it
  setForm: (formId: string, fields: FormField[], initialResponse: SharedResponse) => void;
  updateField: (fieldId: string, value: string | number | boolean | string[]) => void;
  lockField: (fieldId: string, userId: string) => void;
  unlockField: (fieldId: string) => void;
}

export const useFormStore = create<FormState>((set) => ({
  formId: null,
  fields: [],
  sharedResponse: {},
  lockedFields: {},
  setForm: (formId, fields, initialResponse) =>
    set({ formId, fields, sharedResponse: initialResponse }),
  updateField: (fieldId, value) =>
    set((state) => ({
      sharedResponse: {
        ...state.sharedResponse,
        [fieldId]: value,
      },
    })),
  lockField: (fieldId, userId) =>
    set((state) => ({
      lockedFields: {
        ...state.lockedFields,
        [fieldId]: userId,
      },
    })),
  unlockField: (fieldId) =>
    set((state) => {
      const newLockedFields = { ...state.lockedFields };
      delete newLockedFields[fieldId];
      return { lockedFields: newLockedFields };
    }),
}));
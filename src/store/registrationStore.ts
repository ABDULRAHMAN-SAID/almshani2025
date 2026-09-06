import { create } from "zustand";
import { persist } from "zustand/middleware";
import { persistStorage } from "./persistStorage";

interface RegistrationState {
  /** معرّفات الأنشطة التي سجّل فيها المستخدم. */
  registeredIds: string[];
  register: (activityId: string) => void;
  cancel: (activityId: string) => void;
  isRegistered: (activityId: string) => boolean;
}

export const useRegistrationStore = create<RegistrationState>()(
  persist(
    (set, get) => ({
      registeredIds: [],
      register: (activityId) =>
        set((state) =>
          state.registeredIds.includes(activityId)
            ? state
            : { registeredIds: [...state.registeredIds, activityId] }
        ),
      cancel: (activityId) =>
        set((state) => ({ registeredIds: state.registeredIds.filter((id) => id !== activityId) })),
      isRegistered: (activityId) => get().registeredIds.includes(activityId),
    }),
    {
      name: "anshatati-registrations",
      storage: persistStorage,
    }
  )
);

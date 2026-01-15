// frontend/src/store/useLoginStore.js
import { create } from "zustand";
import { persist, createJSONStorage } from "zustand/middleware";

const useLoginStore = create(
  persist(
    (set) => ({
      step: 1,
      userPhoneData: null,
      setStep: (step) => set({ step }),
      setUserPhoneData: (data) => set({ userPhoneData: data }),
      resetLoginState: () => set({ step: 1, userPhoneData: null }),
    }),
    {
      name: "login-storage",
      storage: createJSONStorage(() => localStorage),
      partialize: (state) => ({ step: state.step, userPhoneData: state.userPhoneData }),
    }
  )
);

export default useLoginStore;
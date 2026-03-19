import { create } from 'zustand';
import { persist } from 'zustand/middleware';

export interface SavedMedicine {
  id: string;
  name: string;
  manufacturer?: string;
  dosageForm?: string;
  strength?: string;
  genericName?: string;
  description?: string;
  ingredients?: string[];
}

interface SavedDrugsState {
  savedDrugs: SavedMedicine[];
  toggleSaveDrug: (medicine: SavedMedicine) => void;
  isSaved: (id: string) => boolean;
}

export const useSavedDrugs = create<SavedDrugsState>()(
  persist(
    (set, get) => ({
      savedDrugs: [],
      toggleSaveDrug: (medicine) => {
        const { savedDrugs } = get();
        const exists = savedDrugs.find((m) => m.id === medicine.id);
        if (exists) {
          set({ savedDrugs: savedDrugs.filter((m) => m.id !== medicine.id) });
        } else {
          set({ savedDrugs: [...savedDrugs, medicine] });
        }
      },
      isSaved: (id) => get().savedDrugs.some((m) => m.id === id),
    }),
    {
      name: 'novapharm-saved-drugs',
    }
  )
);

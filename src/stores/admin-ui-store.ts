import { create } from 'zustand';
import { persist } from 'zustand/middleware';

type AdminUiState = {
  usersPageSize: number;
  setUsersPageSize: (size: number) => void;
};

export const useAdminUiStore = create<AdminUiState>()(
  persist(
    (set) => ({
      usersPageSize: 10,
      setUsersPageSize: (size) => set({ usersPageSize: size }),
    }),
    { name: 'zen-leader-admin-ui' },
  ),
);

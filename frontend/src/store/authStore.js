import { create } from 'zustand'
import { persist } from 'zustand/middleware'

export const useAuthStore = create(
  persist(
    (set) => ({
      user:  null,
      token: null,
      setAuth:    (user, token) => set({ user, token }),
      updateUser: (data) => set((s) => ({ user: { ...s.user, ...data } })),
      logout:     () => set({ user: null, token: null }),
    }),
    { name: 'macaw-auth' }
  )
)
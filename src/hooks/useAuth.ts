import { useAuthStore } from "@/store/authStore";

export function useAuth() {
  const user = useAuthStore((s) => s.user);
  const pendingPhone = useAuthStore((s) => s.pendingPhone);
  const setPendingPhone = useAuthStore((s) => s.setPendingPhone);
  const pendingRole = useAuthStore((s) => s.pendingRole);
  const setPendingRole = useAuthStore((s) => s.setPendingRole);
  const signIn = useAuthStore((s) => s.signIn);
  const updateName = useAuthStore((s) => s.updateName);
  const signOut = useAuthStore((s) => s.signOut);

  return {
    user,
    isAuthenticated: Boolean(user),
    pendingPhone,
    setPendingPhone,
    pendingRole,
    setPendingRole,
    signIn,
    updateName,
    signOut,
  };
}

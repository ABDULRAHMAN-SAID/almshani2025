import { useAuthStore } from "@/store/authStore";
import { signOutFromServer } from "@/services/authService";

export function useAuth() {
  const user = useAuthStore((s) => s.user);
  const signIn = useAuthStore((s) => s.signIn);
  const updateName = useAuthStore((s) => s.updateName);
  const clearLocal = useAuthStore((s) => s.signOut);

  /** الخروج ينهي جلسة الخادم أيضًا، وإلا بقي التوكن صالحًا على الجهاز. */
  const signOut = async () => {
    try {
      await signOutFromServer();
    } finally {
      clearLocal();
    }
  };

  return {
    user,
    isAuthenticated: Boolean(user),
    signIn,
    updateName,
    signOut,
  };
}

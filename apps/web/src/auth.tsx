import { createContext, useContext, useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useLocation, useNavigate } from "react-router-dom";

import { apiFetch } from "./lib/api";

export type AuthDialogMode = "login" | "register" | "forgot-request" | "forgot-verify";

type User = {
  id: string;
  email: string;
  displayName: string;
  role: "customer" | "admin";
  walletBalanceCents: number;
};

type SessionInfo = {
  id: string;
  expiresAt: string;
};

type AuthMeResponse = {
  user: User | null;
  session: SessionInfo | null;
};

type AuthContextValue = {
  user: User | null;
  session: SessionInfo | null;
  isLoading: boolean;
  isAuthenticated: boolean;
  isAuthOpen: boolean;
  authMode: AuthDialogMode;
  pendingRedirectPath: string | null;
  openAuth: (mode?: AuthDialogMode, redirectTo?: string | null) => void;
  closeAuth: () => void;
  setAuthMode: (mode: AuthDialogMode) => void;
  requireAuth: (redirectTo?: string, mode?: AuthDialogMode) => boolean;
  login: (input: { email: string; password: string }) => Promise<void>;
  register: (input: { email: string; password: string; displayName: string }) => Promise<void>;
  requestPasswordReset: (input: { email: string }) => Promise<{ message: string; previewOtp?: string }>;
  verifyPasswordReset: (input: { email: string; otp: string; newPassword: string }) => Promise<void>;
  changePassword: (input: { currentPassword: string; newPassword: string }) => Promise<void>;
  logout: () => Promise<void>;
};

const authMeQueryKey = ["auth", "me"] as const;
const AuthContext = createContext<AuthContextValue | null>(null);

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const queryClient = useQueryClient();
  const navigate = useNavigate();
  const location = useLocation();
  const [isAuthOpen, setIsAuthOpen] = useState(false);
  const [authMode, setAuthMode] = useState<AuthDialogMode>("login");
  const [pendingRedirectPath, setPendingRedirectPath] = useState<string | null>(null);

  const fetchAuthMe = () => apiFetch<AuthMeResponse>("/api/auth/me");

  const meQuery = useQuery({
    queryKey: authMeQueryKey,
    queryFn: fetchAuthMe
  });

  const syncAuthState = async () => {
    await queryClient.invalidateQueries({ queryKey: authMeQueryKey });
    await queryClient.fetchQuery({
      queryKey: authMeQueryKey,
      queryFn: fetchAuthMe
    });
  };

  const finishAuthFlow = async (nextPath?: string | null) => {
    await syncAuthState();
    setIsAuthOpen(false);

    const redirectTarget = nextPath ?? pendingRedirectPath;
    if (redirectTarget && redirectTarget !== location.pathname + location.search) {
      navigate(redirectTarget);
    }

    setPendingRedirectPath(null);
  };

  const loginMutation = useMutation({
    mutationFn: (input: { email: string; password: string }) =>
      apiFetch<{ message: string; user: User }>("/api/auth/login", {
        method: "POST",
        body: JSON.stringify(input)
      }),
    onSuccess: async () => {
      await finishAuthFlow();
    }
  });

  const registerMutation = useMutation({
    mutationFn: (input: { email: string; password: string; displayName: string }) =>
      apiFetch<{ message: string; user: User }>("/api/auth/register", {
        method: "POST",
        body: JSON.stringify(input)
      }),
    onSuccess: async () => {
      await finishAuthFlow();
    }
  });

  const forgotRequestMutation = useMutation({
    mutationFn: (input: { email: string }) =>
      apiFetch<{ message: string; previewOtp?: string }>("/api/auth/forgot-password/request", {
        method: "POST",
        body: JSON.stringify(input)
      })
  });

  const forgotVerifyMutation = useMutation({
    mutationFn: (input: { email: string; otp: string; newPassword: string }) =>
      apiFetch<{ message: string }>("/api/auth/forgot-password/verify", {
        method: "POST",
        body: JSON.stringify(input)
      }),
    onSuccess: async () => {
      await syncAuthState();
      setAuthMode("login");
      setPendingRedirectPath(null);
    }
  });

  const changePasswordMutation = useMutation({
    mutationFn: (input: { currentPassword: string; newPassword: string }) =>
      apiFetch<{ message: string; user: User }>("/api/auth/change-password", {
        method: "POST",
        body: JSON.stringify(input)
      }),
    onSuccess: async () => {
      await syncAuthState();
    }
  });

  const logoutMutation = useMutation({
    mutationFn: () =>
      apiFetch("/api/auth/logout", {
        method: "POST"
      }),
    onSuccess: async () => {
      await syncAuthState();
      setPendingRedirectPath(null);

      if (location.pathname.startsWith("/account") || location.pathname.startsWith("/admin")) {
        navigate("/");
      }
    }
  });

  const openAuth = (mode: AuthDialogMode = "login", redirectTo?: string | null) => {
    setAuthMode(mode);
    setIsAuthOpen(true);
    if (redirectTo) {
      setPendingRedirectPath(redirectTo);
    }
  };

  const value: AuthContextValue = {
    user: meQuery.data?.user ?? null,
    session: meQuery.data?.session ?? null,
    isLoading: meQuery.isLoading,
    isAuthenticated: Boolean(meQuery.data?.user),
    isAuthOpen,
    authMode,
    pendingRedirectPath,
    openAuth,
    closeAuth: () => setIsAuthOpen(false),
    setAuthMode,
    requireAuth: (redirectTo, mode = "login") => {
      if (meQuery.data?.user) {
        return true;
      }

      openAuth(mode, redirectTo ?? `${location.pathname}${location.search}`);
      return false;
    },
    login: async (input) => {
      await loginMutation.mutateAsync(input);
    },
    register: async (input) => {
      await registerMutation.mutateAsync(input);
    },
    requestPasswordReset: async (input) => forgotRequestMutation.mutateAsync(input),
    verifyPasswordReset: async (input) => {
      await forgotVerifyMutation.mutateAsync(input);
    },
    changePassword: async (input) => {
      await changePasswordMutation.mutateAsync(input);
    },
    logout: async () => {
      await logoutMutation.mutateAsync();
    }
  };

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuth() {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error("useAuth must be used within AuthProvider");
  }

  return context;
}

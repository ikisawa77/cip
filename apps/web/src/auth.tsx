import { createContext, useContext, useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";

import { apiFetch } from "./lib/api";

type User = {
  id: string;
  email: string;
  displayName: string;
  role: "customer" | "admin";
  walletBalanceCents: number;
};

type AuthContextValue = {
  user: User | null;
  isLoading: boolean;
  isAuthOpen: boolean;
  openAuth: () => void;
  closeAuth: () => void;
  login: (input: { email: string; password: string }) => Promise<void>;
  register: (input: { email: string; password: string; displayName: string }) => Promise<void>;
  logout: () => Promise<void>;
};

const AuthContext = createContext<AuthContextValue | null>(null);

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const queryClient = useQueryClient();
  const [isAuthOpen, setIsAuthOpen] = useState(false);

  const meQuery = useQuery({
    queryKey: ["auth", "me"],
    queryFn: () => apiFetch<{ user: User | null }>("/api/auth/me")
  });

  const loginMutation = useMutation({
    mutationFn: (input: { email: string; password: string }) =>
      apiFetch("/api/auth/login", {
        method: "POST",
        body: JSON.stringify(input)
      }),
    onSuccess: async () => {
      await queryClient.invalidateQueries({ queryKey: ["auth", "me"] });
      setIsAuthOpen(false);
    }
  });

  const registerMutation = useMutation({
    mutationFn: (input: { email: string; password: string; displayName: string }) =>
      apiFetch("/api/auth/register", {
        method: "POST",
        body: JSON.stringify(input)
      }),
    onSuccess: async () => {
      await queryClient.invalidateQueries({ queryKey: ["auth", "me"] });
    }
  });

  const logoutMutation = useMutation({
    mutationFn: () =>
      apiFetch("/api/auth/logout", {
        method: "POST"
      }),
    onSuccess: async () => {
      await queryClient.invalidateQueries({ queryKey: ["auth", "me"] });
    }
  });

  const value: AuthContextValue = {
    user: meQuery.data?.user ?? null,
    isLoading: meQuery.isLoading,
    isAuthOpen,
    openAuth: () => setIsAuthOpen(true),
    closeAuth: () => setIsAuthOpen(false),
    login: async (input) => {
      await loginMutation.mutateAsync(input);
    },
    register: async (input) => {
      await registerMutation.mutateAsync(input);
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

export type ApiError = {
  message: string;
};

const API_BASE = import.meta.env.VITE_API_BASE ?? "";

export async function apiFetch<T>(path: string, init?: RequestInit) {
  const response = await fetch(`${API_BASE}${path}`, {
    ...init,
    credentials: "include",
    headers: {
      "Content-Type": "application/json",
      ...(init?.headers ?? {})
    }
  });

  if (!response.ok) {
    const error = (await response.json().catch(() => ({ message: "เกิดข้อผิดพลาด" }))) as ApiError;
    throw new Error(error.message);
  }

  if (response.status === 204) {
    return undefined as T;
  }

  return (await response.json()) as T;
}

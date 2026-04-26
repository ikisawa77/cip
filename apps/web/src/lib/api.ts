export type ApiError = {
  message: string;
};

const API_BASE = import.meta.env.VITE_API_BASE ?? "";

type ZodErrorIssue = {
  code?: string;
  minimum?: number;
  path?: Array<string | number>;
  message?: string;
};

function translateApiMessage(message: unknown) {
  if (typeof message !== "string") {
    return "เกิดข้อผิดพลาด";
  }

  try {
    const parsed = JSON.parse(message) as ZodErrorIssue[];
    const issue = Array.isArray(parsed) ? parsed[0] : null;
    const field = issue?.path?.[0];

    if (issue?.code === "too_small" && issue.minimum && field === "newPassword") {
      return `รหัสผ่านใหม่ต้องมีอย่างน้อย ${issue.minimum} ตัวอักษร`;
    }

    if (issue?.code === "too_small" && issue.minimum && field === "currentPassword") {
      return `รหัสผ่านปัจจุบันต้องมีอย่างน้อย ${issue.minimum} ตัวอักษร`;
    }

    if (issue?.message) {
      return issue.message;
    }
  } catch {
  }

  return message || "เกิดข้อผิดพลาด";
}

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
    throw new Error(translateApiMessage(error.message));
  }

  if (response.status === 204) {
    return undefined as T;
  }

  return (await response.json()) as T;
}

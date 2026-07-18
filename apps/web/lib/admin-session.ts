/** Admin demo session — localStorage only, no real auth backend. */

export type AdminSession = {
  name: string;
  email: string;
  role: "admin" | "approver";
};

const SESSION_KEY = "aulacys-admin-session";

/** Demo credentials shown on the login screen (hackathon mock). */
export const ADMIN_DEMO = {
  email: "admin@aulacys.demo",
  password: "admin123",
  name: "Admin Demo",
  role: "admin" as const,
};

export function readAdminSession(): AdminSession | null {
  if (typeof window === "undefined") return null;
  try {
    const raw = localStorage.getItem(SESSION_KEY);
    if (!raw) return null;
    return JSON.parse(raw) as AdminSession;
  } catch {
    return null;
  }
}

export function writeAdminSession(session: AdminSession) {
  localStorage.setItem(SESSION_KEY, JSON.stringify(session));
}

export function clearAdminSession() {
  localStorage.removeItem(SESSION_KEY);
}

export function verifyAdminLogin(email: string, password: string): AdminSession | null {
  const normalized = email.trim().toLowerCase();
  if (normalized === ADMIN_DEMO.email && password === ADMIN_DEMO.password) {
    return {
      name: ADMIN_DEMO.name,
      email: ADMIN_DEMO.email,
      role: ADMIN_DEMO.role,
    };
  }
  return null;
}

export function adminInitials(session: AdminSession): string {
  const parts = session.name.trim().split(/\s+/);
  if (parts.length >= 2) {
    return `${parts[0]![0] ?? ""}${parts[parts.length - 1]![0] ?? ""}`.toUpperCase();
  }
  return (session.name.slice(0, 2) || "AD").toUpperCase();
}

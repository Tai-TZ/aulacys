/** Demo session helpers — localStorage only, no real auth. */

export type DemoSession = { name: string; email: string };

const SESSION_KEY = "aulacys-demo-session";

export function readDemoSession(): DemoSession | null {
  if (typeof window === "undefined") return null;
  try {
    const raw = localStorage.getItem(SESSION_KEY);
    if (!raw) return null;
    return JSON.parse(raw) as DemoSession;
  } catch {
    return null;
  }
}

export function writeDemoSession(session: DemoSession) {
  localStorage.setItem(SESSION_KEY, JSON.stringify(session));
}

export function clearDemoSession() {
  localStorage.removeItem(SESSION_KEY);
}

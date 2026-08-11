export interface AuthUser {
  user_id: string;
  email: string;
  role: string;
  access_token: string;
}

export function saveAuth(user: AuthUser) {
  localStorage.setItem("orbit_token", user.access_token);
  localStorage.setItem("orbit_user", JSON.stringify(user));
}

export function getAuth(): AuthUser | null {
  if (typeof window === "undefined") return null;
  const raw = localStorage.getItem("orbit_user");
  return raw ? JSON.parse(raw) : null;
}

export function clearAuth() {
  localStorage.removeItem("orbit_token");
  localStorage.removeItem("orbit_user");
}

export function isAuthenticated(): boolean {
  return !!getAuth();
}

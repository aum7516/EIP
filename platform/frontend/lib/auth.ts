export interface AuthUser {
  user_id: string;
  email: string;
  role: string;
  access_token: string;
}

export function saveAuth(user: AuthUser) {
  if (typeof window !== "undefined") {
    localStorage.setItem("orbit_token", user.access_token);
    localStorage.setItem("orbit_user", JSON.stringify(user));
    localStorage.removeItem("orbit_active_datamart_dataset");
  }
}

export function getAuth(): AuthUser | null {
  if (typeof window === "undefined") return null;
  const raw = localStorage.getItem("orbit_user");
  return raw ? JSON.parse(raw) : null;
}

export function clearAuth() {
  if (typeof window !== "undefined") {
    localStorage.removeItem("orbit_token");
    localStorage.removeItem("orbit_user");
    localStorage.removeItem("orbit_active_datamart_dataset");
    sessionStorage.clear();
  }
}

export function isAuthenticated(): boolean {
  return !!getAuth();
}

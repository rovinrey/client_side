export const setAuth = (token: string, role: "admin" | "beneficiary" | "staff") => {
  sessionStorage.setItem("token", token);
  sessionStorage.setItem("role", role);
};

export const logout = (): void => {
  sessionStorage.clear();
};

export const isAuthenticated = (): boolean => {
  return !!sessionStorage.getItem("token");
};

export const getRole = (): "admin" | "beneficiary" | "staff" | null => {
  const role = sessionStorage.getItem("role");
  if (role === "admin" || role === "beneficiary" || role === "staff") return role;
  return null;
};

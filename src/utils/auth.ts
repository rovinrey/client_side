export const setAuth = (token: string, role: "admin" | "beneficiary" | "staff") => {
  localStorage.setItem("token", token);
  localStorage.setItem("role", role);
};

export const logout = (): void => {
  localStorage.clear();
};

export const isAuthenticated = (): boolean => {
  return !!localStorage.getItem("token");
};

export const getRole = (): "admin" | "beneficiary" | "staff" | null => {
  const role = localStorage.getItem("role");
  if (role === "admin" || role === "beneficiary" || role === "staff") return role;
  return null;
};

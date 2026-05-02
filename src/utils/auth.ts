// utils/auth.ts

export const setAuth = (token: string, role: "admin" | "beneficiary" | "staff") => {
  localStorage.setItem("token", token);
  localStorage.setItem("role", role);
};

export const logout = (): void => {
  // Instead of clearing everything (which might wipe out theme settings, etc.), 
  // explicitly remove auth-related keys.
  localStorage.removeItem("token");
  localStorage.removeItem("role");
};

export const isAuthenticated = (): boolean => {
  const token = localStorage.getItem("token");
  if (!token) return false;

  try {
    // Basic structural validation: Ensure the token isn't corrupted or empty
    const payload = JSON.parse(atob(token.split('.')[1]));
    
    // Convert current time to seconds to compare with JWT 'exp'
    const currentTime = Math.floor(Date.now() / 1000);
    
    if (payload.exp && payload.exp < currentTime) {
      logout(); // Token has expired! Clean up storage
      return false;
    }
    
    return true;
  } catch (error) {
    // If decoding fails, the token is corrupted
    return false;
  }
};

export const getRole = (): "admin" | "beneficiary" | "staff" | null => {
  const role = localStorage.getItem("role");
  if (role === "admin" || role === "beneficiary" || role === "staff") return role;
  return null;
};
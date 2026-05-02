// utils/auth.ts
import { storageSet, storageRemove, storageGet } from './storage';

export const setAuth = (token: string, role: "admin" | "beneficiary" | "staff") => {
  storageSet("token", token);
  storageSet("role", role);
};

export const logout = (): void => {
  // Instead of clearing everything (which might wipe out theme settings, etc.), 
  // explicitly remove auth-related keys.
  storageRemove("token");
  storageRemove("role");
};

export const isAuthenticated = (): boolean => {
  const token = storageGet("token");
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
  const role = storageGet("role");
  if (role === "admin" || role === "beneficiary" || role === "staff") return role;
  return null;
};

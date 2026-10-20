import { createContext, useCallback, useEffect, useState } from 'react';
import { login as loginRequest, logout as logoutRequest, fetchCurrentUser } from '../services/authService';

export const AuthContext = createContext(null);

export function AuthProvider({ children }) {
  const [user, setUser] = useState(null);
  const [isLoading, setIsLoading] = useState(true); // true while we check for an existing session

  const refreshUser = useCallback(async () => {
    try {
      const { user: current } = await fetchCurrentUser();
      setUser(current);
    } catch {
      setUser(null);
    } finally {
      setIsLoading(false);
    }
  }, []);

  useEffect(() => {
    refreshUser();
  }, [refreshUser]);

  // If any API call comes back 401, treat the session as gone.
  useEffect(() => {
    const handleUnauthenticated = () => setUser(null);
    window.addEventListener('auth:unauthenticated', handleUnauthenticated);
    return () => window.removeEventListener('auth:unauthenticated', handleUnauthenticated);
  }, []);

  const login = useCallback(async (credentials) => {
    const { user: loggedInUser } = await loginRequest(credentials);
    setUser(loggedInUser);
    return loggedInUser;
  }, []);

  const logout = useCallback(async () => {
    await logoutRequest();
    setUser(null);
  }, []);

  const value = {
    user,
    isAuthenticated: !!user,
    isLoading,
    login,
    logout,
  };

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

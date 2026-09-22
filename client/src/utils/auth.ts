/**
 * Authentication storage utility for ReadEase
 */

export function getStoredToken(): string | null {
  try {
    // 1. Primary storage key used by LoginPage & SignUpPage
    const directToken = localStorage.getItem('readease_access_token');
    if (directToken && directToken.trim()) return directToken.trim();

    // 2. Secondary/fallback check in readease_user object
    const userStr = localStorage.getItem('readease_user');
    if (userStr) {
      const parsed = JSON.parse(userStr);
      if (parsed?.accessToken && typeof parsed.accessToken === 'string') {
        return parsed.accessToken.trim();
      }
    }
  } catch {
    // Fallback if localStorage or JSON parse fails
  }
  return null;
}

export function setStoredAuth(
  user: Record<string, unknown>,
  accessToken?: string,
  role?: string
): void {
  try {
    if (accessToken) {
      localStorage.setItem('readease_access_token', accessToken);
    }
    const sessionUser = {
      ...user,
      ...(role ? { role } : {}),
      ...(accessToken ? { accessToken } : {})
    };
    localStorage.setItem('readease_user', JSON.stringify(sessionUser));
    if (role) {
      localStorage.setItem('readease_role', role);
    }
  } catch (err) {
    console.error('Failed to save auth to localStorage:', err);
  }
}

export function clearStoredAuth(): void {
  try {
    localStorage.removeItem('readease_access_token');
    localStorage.removeItem('readease_user');
    localStorage.removeItem('readease_role');
  } catch (err) {
    console.error('Failed to clear auth from localStorage:', err);
  }
}

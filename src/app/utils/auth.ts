const AUTH_KEY = 'cckitchen_authed';

export function isAuthenticated(): boolean {
  return localStorage.getItem(AUTH_KEY) === 'true';
}

export function login(password: string): boolean {
  const correct = import.meta.env.VITE_APP_PASSWORD;
  if (password === correct) {
    localStorage.setItem(AUTH_KEY, 'true');
    return true;
  }
  return false;
}

export function logout(): void {
  localStorage.removeItem(AUTH_KEY);
}

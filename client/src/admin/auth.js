const STORAGE_KEY = 'noire-admin-auth';
const MAX_SESSION_AGE_MS = 8 * 60 * 60 * 1000;

export function isAdminAuthed() {
  if (typeof window === 'undefined') return false;
  const raw = localStorage.getItem(STORAGE_KEY);
  if (!raw) return false;

  try {
    const payload = JSON.parse(raw);
    if (!payload?.authedAt) return false;
    return Date.now() - payload.authedAt < MAX_SESSION_AGE_MS;
  } catch (error) {
    return false;
  }
}

export function setAdminAuthed(value) {
  if (typeof window === 'undefined') return;
  if (value) {
    localStorage.setItem(
      STORAGE_KEY,
      JSON.stringify({ authedAt: Date.now() })
    );
  } else {
    localStorage.removeItem(STORAGE_KEY);
  }
}

export function getAdminPassword() {
  return import.meta.env.VITE_ADMIN_PASSWORD || '';
}

const STORAGE_KEY = 'noire-admin-auth';

export function isAdminAuthed() {
  if (typeof window === 'undefined') return false;
  return localStorage.getItem(STORAGE_KEY) === 'true';
}

export function setAdminAuthed(value) {
  if (typeof window === 'undefined') return;
  if (value) {
    localStorage.setItem(STORAGE_KEY, 'true');
  } else {
    localStorage.removeItem(STORAGE_KEY);
  }
}

export function getAdminPassword() {
  return import.meta.env.VITE_ADMIN_PASSWORD || '';
}

import { useEffect } from 'react';
import { useLocation, useNavigate } from 'react-router-dom';
import { isAdminAuthed } from './auth';

export default function AdminGuard({ children }) {
  const navigate = useNavigate();
  const location = useLocation();

  useEffect(() => {
    if (!isAdminAuthed()) {
      navigate('/admin/login', { replace: true, state: { from: location.pathname } });
    }
  }, [navigate, location.pathname]);

  if (!isAdminAuthed()) {
    return null;
  }

  return children;
}

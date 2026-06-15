import { Navigate, Outlet } from 'react-router-dom';
import { isParentUnlocked } from './parentAuth';

export function ParentGate() {
  if (!isParentUnlocked()) {
    return <Navigate to="/parent/unlock" replace />;
  }
  return <Outlet />;
}

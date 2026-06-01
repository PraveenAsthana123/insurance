// useRole — React hook wrapping getCurrentRole/setCurrentRole + listening
// for insur:role-change events so all role-aware components stay in sync.
import { useEffect, useState } from 'react';

import {
  getCurrentRole,
  setCurrentRole,
  ROLE_CHANGE_EVENT_NAME,
} from '../services/apiFetch';

export const ROLES = ['manager', 'team-member', 'compliance', 'reporting-monitoring', 'tester'];

export function useRole() {
  const [role, setRole] = useState(getCurrentRole);

  useEffect(() => {
    const onChange = (e) => setRole(e.detail);
    window.addEventListener(ROLE_CHANGE_EVENT_NAME, onChange);
    return () => window.removeEventListener(ROLE_CHANGE_EVENT_NAME, onChange);
  }, []);

  return [role, (next) => setCurrentRole(next)];
}

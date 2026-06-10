// TopProgressBar · Iter 24 · route transition indicator.
// Mount once in layout · animates on route change.

import { useEffect, useState } from 'react';
import { useLocation } from 'react-router-dom';

export default function TopProgressBar({ color = '#3b82f6' }) {
  const location = useLocation();
  const [progress, setProgress] = useState(0);
  const [visible, setVisible] = useState(false);

  useEffect(() => {
    let t1 = null, t2 = null, t3 = null;
    setVisible(true);
    setProgress(15);
    t1 = setTimeout(() => setProgress(60), 80);
    t2 = setTimeout(() => setProgress(95), 240);
    t3 = setTimeout(() => {
      setProgress(100);
      setTimeout(() => { setVisible(false); setProgress(0); }, 200);
    }, 400);
    return () => { clearTimeout(t1); clearTimeout(t2); clearTimeout(t3); };
  }, [location.pathname]);

  if (!visible) return null;
  return (
    <div role="progressbar" aria-label="Page loading" aria-valuemin={0} aria-valuemax={100} aria-valuenow={progress}
      style={{
        position: 'fixed', top: 0, left: 0,
        height: 3, width: `${progress}%`,
        background: color, zIndex: 10000,
        transition: 'width 200ms ease-out, opacity 200ms ease-out',
        opacity: progress >= 100 ? 0 : 1,
        boxShadow: `0 0 8px ${color}aa`,
      }} />
  );
}

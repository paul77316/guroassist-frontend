import { useEffect, useState } from 'react';

export default function MobileMenu({ active, onAttendance, onScanner }) {
  const [open, setOpen] = useState(false);
  useEffect(() => {
    if (!open) return undefined;
    const closeOnEscape = (event) => { if (event.key === 'Escape') setOpen(false); };
    window.addEventListener('keydown', closeOnEscape);
    return () => window.removeEventListener('keydown', closeOnEscape);
  }, [open]);

  const navigate = (action) => { setOpen(false); action(); };
  return <>
    <button type="button" className="mobile-menu-trigger" aria-label="Open navigation menu" aria-expanded={open} onClick={() => setOpen(true)}>
      <span /><span /><span />
    </button>
    {open && <div className="mobile-drawer-layer" onMouseDown={(event) => { if (event.target === event.currentTarget) setOpen(false); }}>
      <nav className="mobile-drawer" aria-label="Main navigation">
        <div className="mobile-drawer-brand"><span className="mobile-brand-mark">GA</span><div><p>GuroAssist</p><span>Teacher tools</span></div>
          <button type="button" onClick={() => setOpen(false)} aria-label="Close navigation" className="mobile-drawer-close">×</button>
        </div>
        <p className="mobile-drawer-label">WORKSPACE</p>
        <button type="button" className={`mobile-drawer-item ${active === 'attendance' ? 'is-active' : ''}`} aria-current={active === 'attendance' ? 'page' : undefined} onClick={() => navigate(onAttendance)}>
          <span className="mobile-drawer-icon">✓</span><span><strong>Attendance</strong><small>Take class attendance</small></span><span className="mobile-drawer-chevron">›</span>
        </button>
        <button type="button" className={`mobile-drawer-item ${active === 'scanner' ? 'is-active' : ''}`} aria-current={active === 'scanner' ? 'page' : undefined} onClick={() => navigate(onScanner)}>
          <span className="mobile-drawer-icon">▦</span><span><strong>Exam scanner</strong><small>Scan answer sheets</small></span><span className="mobile-drawer-chevron">›</span>
        </button>
        <div className="mobile-drawer-footer">GuroAssist mobile</div>
      </nav>
    </div>}
  </>;
}

import { StrictMode } from 'react';
import { createRoot } from 'react-dom/client';
import '../index.css';
import MobileApp from './MobileApp.jsx';

createRoot(document.getElementById('root')).render(
  <StrictMode>
    <MobileApp />
  </StrictMode>,
);

if ('serviceWorker' in navigator && import.meta.env.PROD) {
  window.addEventListener('load', () => {
    navigator.serviceWorker.register('/m/sw.js', { scope: '/m/' }).catch(() => {
      // The app still works online without it; offline start-up just needs a prior visit.
    });
  });
}

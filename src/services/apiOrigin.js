/**
 * In development, keep API requests same-origin so Vite can proxy them to Laravel.
 * Production builds can point at a separately hosted Laravel API with VITE_API_URL.
 */
export function getApiOrigin(isDevelopment = import.meta.env.DEV, configuredApiUrl = import.meta.env.VITE_API_URL) {
  if (isDevelopment) {
    return '';
  }

  return String(configuredApiUrl ?? '').trim().replace(/\/+$/, '');
}

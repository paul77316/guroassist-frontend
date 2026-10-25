import { describe, expect, it } from 'vitest';
import { getApiOrigin } from './apiOrigin';

describe('getApiOrigin', () => {
  it('keeps development requests same-origin for the Vite proxy', () => {
    expect(getApiOrigin(true, 'https://api.example.com/')).toBe('');
  });

  it('uses the configured Laravel origin in production and trims trailing slashes', () => {
    expect(getApiOrigin(false, 'https://api.example.com///')).toBe('https://api.example.com');
  });

  it('keeps requests same-origin when no production API origin is configured', () => {
    expect(getApiOrigin(false, '')).toBe('');
  });
});

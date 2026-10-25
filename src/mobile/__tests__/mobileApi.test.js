import { describe, expect, it } from 'vitest';
import mobileApi from '../lib/mobileApi';

describe('mobile API transport', () => {
  it('omits same-origin web session cookies while using bearer tokens', () => {
    expect(mobileApi.defaults.adapter).toBe('fetch');
    expect(mobileApi.defaults.withCredentials).toBe(false);
  });
});

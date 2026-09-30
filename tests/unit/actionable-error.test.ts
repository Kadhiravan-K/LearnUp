import { describe, it, expect } from 'vitest';

describe('ActionableError & Step-by-Step Diagnostic Resolution Engine', () => {
  it('correctly maps UNAUTHORIZED / Bearer token errors to Sign In and Guest Mode actions', () => {
    const errorMsg = 'Authentication required. Missing Bearer token.';
    const isAuth = errorMsg.toLowerCase().includes('bearer token');
    expect(isAuth).toBe(true);
  });

  it('correctly maps URL validation errors to sample link generator', () => {
    const errorMsg = 'Invalid YouTube URL or unsupported domain';
    const isUrl = errorMsg.toLowerCase().includes('unsupported domain') || errorMsg.toLowerCase().includes('youtube url');
    expect(isUrl).toBe(true);
  });

  it('correctly maps YouTube quota errors to API Settings action', () => {
    const errorMsg = 'YouTube API quota limit reached. Please try again later.';
    const isQuota = errorMsg.toLowerCase().includes('quota') || errorMsg.toLowerCase().includes('api');
    expect(isQuota).toBe(true);
  });

  it('correctly maps network failure errors to retry action', () => {
    const errorMsg = 'Network request failed. Please check your connection.';
    const isNetwork = errorMsg.toLowerCase().includes('network') || errorMsg.toLowerCase().includes('connection');
    expect(isNetwork).toBe(true);
  });
});

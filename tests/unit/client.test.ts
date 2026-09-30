import { describe, it, expect } from 'vitest';
import { ApiError } from '@/lib/api/client';

describe('API Error Handling and Envelope Parsing Unit Tests', () => {
  it('correctly constructs ApiError with error code and human message', () => {
    const error = new ApiError('VALIDATION_ERROR', 'The URL provided is not supported.');
    expect(error.code).toBe('VALIDATION_ERROR');
    expect(error.message).toBe('The URL provided is not supported.');
    expect(error.name).toBe('ApiError');
    expect(error).toBeInstanceOf(Error);
  });

  it('handles NETWORK_ERROR and UNKNOWN_ERROR gracefully', () => {
    const networkErr = new ApiError('NETWORK_ERROR', 'Network connection failed.');
    expect(networkErr.code).toBe('NETWORK_ERROR');

    const unknownErr = new ApiError('UNKNOWN_ERROR', 'HTTP Error 500');
    expect(unknownErr.code).toBe('UNKNOWN_ERROR');
  });
});

import { describe, expect, it } from 'vitest';
import {
  ensureMediaDevicesShim,
  getErrorMessageFromUnknown,
  isLikelyMediaCaptureError,
  isMediaCaptureSupported,
} from './mediaSupport';

describe('isMediaCaptureSupported', () => {
  it('returns false for insecure contexts', () => {
    const supported = isMediaCaptureSupported({
      isSecureContext: false,
      mediaDevices: { getUserMedia: () => Promise.resolve() },
    });
    expect(supported).toBe(false);
  });

  it('returns false when getUserMedia is missing', () => {
    const supported = isMediaCaptureSupported({
      isSecureContext: true,
      mediaDevices: {},
    });
    expect(supported).toBe(false);
  });

  it('returns true for secure context with getUserMedia', () => {
    const supported = isMediaCaptureSupported({
      isSecureContext: true,
      mediaDevices: { getUserMedia: () => Promise.resolve() },
    });
    expect(supported).toBe(true);
  });
});

describe('isLikelyMediaCaptureError', () => {
  it('detects getUserMedia errors', () => {
    expect(isLikelyMediaCaptureError(new Error("Cannot read properties of undefined (reading 'getUserMedia')"))).toBe(true);
  });

  it('ignores unrelated errors', () => {
    expect(isLikelyMediaCaptureError(new Error('Socket disconnected'))).toBe(false);
  });

  it('detects enumerateDevices errors', () => {
    expect(
      isLikelyMediaCaptureError(
        new Error("Cannot read properties of undefined (reading 'enumerateDevices')"),
      ),
    ).toBe(true);
  });
});

describe('getErrorMessageFromUnknown', () => {
  it('returns message for Error', () => {
    expect(getErrorMessageFromUnknown(new Error('boom'))).toBe('boom');
  });

  it('returns default for unknown values', () => {
    expect(getErrorMessageFromUnknown(null)).toBe('Unexpected error');
  });
});

describe('ensureMediaDevicesShim', () => {
  it('installs fallback mediaDevices when missing', async () => {
    const target: { mediaDevices?: Record<string, unknown> | null } = { mediaDevices: null };
    const result = ensureMediaDevicesShim(target);
    expect(result).toBe(true);
    expect(typeof target.mediaDevices?.getUserMedia).toBe('function');
    expect(typeof target.mediaDevices?.enumerateDevices).toBe('function');
  });
});

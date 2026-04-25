export function isMediaCaptureSupported(
  input:
    | {
        isSecureContext: boolean;
        mediaDevices?: { getUserMedia?: unknown } | null;
      }
    | undefined = undefined,
): boolean {
  if (input) {
    return Boolean(input.isSecureContext && typeof input.mediaDevices?.getUserMedia === 'function');
  }
  if (typeof window === 'undefined' || typeof navigator === 'undefined') {
    return false;
  }
  return Boolean(window.isSecureContext && typeof navigator.mediaDevices?.getUserMedia === 'function');
}

export function ensureMediaDevicesShim(
  target:
    | {
        mediaDevices?: Record<string, unknown> | null;
      }
    | undefined = typeof navigator !== 'undefined'
    ? (navigator as unknown as { mediaDevices?: Record<string, unknown> | null })
    : undefined,
): boolean {
  if (!target) return false;

  const fallback = {
    getUserMedia: async () => {
      throw new Error('getUserMedia is unavailable in insecure HTTP context');
    },
    enumerateDevices: async () => [],
    getDisplayMedia: async () => {
      throw new Error('getDisplayMedia is unavailable in insecure HTTP context');
    },
  };

  try {
    if (!target.mediaDevices) {
      try {
        target.mediaDevices = fallback;
      } catch {
        Object.defineProperty(target, 'mediaDevices', {
          configurable: true,
          value: fallback,
        });
      }
      return true;
    }
    if (typeof target.mediaDevices.getUserMedia !== 'function') {
      target.mediaDevices.getUserMedia = fallback.getUserMedia;
    }
    if (typeof target.mediaDevices.enumerateDevices !== 'function') {
      target.mediaDevices.enumerateDevices = fallback.enumerateDevices;
    }
    if (typeof target.mediaDevices.getDisplayMedia !== 'function') {
      target.mediaDevices.getDisplayMedia = fallback.getDisplayMedia;
    }
    return true;
  } catch {
    return false;
  }
}

export function isLikelyMediaCaptureError(error: unknown): boolean {
  const message = getErrorMessageFromUnknown(error).toLowerCase();
  return (
    message.includes('getusermedia') ||
    message.includes('enumeratedevices') ||
    message.includes('mediadevices') ||
    message.includes('insecure') ||
    message.includes('secure context') ||
    message.includes('permission denied')
  );
}

export function getErrorMessageFromUnknown(error: unknown): string {
  if (error instanceof Error && error.message) {
    return error.message;
  }
  return 'Unexpected error';
}

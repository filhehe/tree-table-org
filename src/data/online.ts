export function isBrowserOnline() {
  if (typeof navigator === 'undefined') return true;
  return navigator.onLine !== false;
}

export function subscribeBrowserOnline(onChange: (online: boolean) => void) {
  if (typeof window === 'undefined') return () => {};

  const onOnline = () => onChange(true);
  const onOffline = () => onChange(false);
  window.addEventListener('online', onOnline);
  window.addEventListener('offline', onOffline);
  return () => {
    window.removeEventListener('online', onOnline);
    window.removeEventListener('offline', onOffline);
  };
}

export function waitUntilOnline(signal: AbortSignal) {
  return new Promise<void>((resolve) => {
    if (signal.aborted || isBrowserOnline()) {
      resolve();
      return;
    }

    const stop = subscribeBrowserOnline((online) => {
      if (!online) return;
      cleanup();
      resolve();
    });

    const onAbort = () => {
      cleanup();
      resolve();
    };

    const cleanup = () => {
      stop();
      signal.removeEventListener('abort', onAbort);
    };

    signal.addEventListener('abort', onAbort, { once: true });
  });
}

export function anyAbortSignal(a: AbortSignal, b: AbortSignal) {
  if (typeof AbortSignal.any === 'function') {
    return AbortSignal.any([a, b]);
  }

  const controller = new AbortController();
  const onAbort = () => controller.abort();
  if (a.aborted || b.aborted) {
    controller.abort();
    return controller.signal;
  }
  a.addEventListener('abort', onAbort, { once: true });
  b.addEventListener('abort', onAbort, { once: true });
  return controller.signal;
}

import { useCallback, useRef } from 'react';

// Simple fallback implementation of useLatestCallback
function fallbackUseLatestCallback<T extends (...args: any[]) => any>(fn: T): T {
  const ref = useRef(fn);
  ref.current = fn;
  // eslint-disable-next-line react-hooks/exhaustive-deps
  return useCallback((...args: any[]) => ref.current(...args), []) as unknown as T;
}

try {
  // eslint-disable-next-line @typescript-eslint/no-var-requires
  const mod = require('use-latest-callback');
  if (mod) {
    const candidate = typeof mod.default === 'function' ? mod.default : mod;
    const useLatest = typeof candidate === 'function' ? candidate : fallbackUseLatestCallback;
    // Patch default export
    (mod as any).default = useLatest;
    // Patch CJS export so require('use-latest-callback') returns the function
    module.exports = useLatest;
    // Also patch global for any cached references
    (globalThis as any).useLatestCallback = useLatest;
  }
} catch {
  // ignore and fall back to our own
}

export default fallbackUseLatestCallback;

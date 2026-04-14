// ═══════════════════════════════════════════════════════════════
// hooks/useSuccessToast.ts
// Simple state hook for SuccessToast visibility (S149b).
//
// Mirrors the architecture of useErrorToast.ts exactly — same shape,
// same single-string state, same useCallback show/clear pair.
// The visual differences live in components/shared/SuccessToast.tsx.
//
// Auto-dismiss timing (3000ms) is owned by SuccessToast itself, NOT
// here — this hook only stores the message. Screens just call
// showSuccess(...) and render <SuccessToast/> when successMessage != null.
//
// Usage:
//   const { successMessage, showSuccess, clearSuccess } = useSuccessToast();
//   // in mutation onSuccess:
//   showSuccess('Profile saved');
//   // in render:
//   {successMessage ? <SuccessToast message={successMessage} onDismiss={clearSuccess} /> : null}
// ═══════════════════════════════════════════════════════════════

import { useCallback, useState } from 'react';

export function useSuccessToast() {
  const [successMessage, setSuccessMessage] = useState<string | null>(null);

  const showSuccess = useCallback((message: string) => {
    setSuccessMessage(message);
  }, []);

  const clearSuccess = useCallback(() => {
    setSuccessMessage(null);
  }, []);

  return { successMessage, showSuccess, clearSuccess };
}

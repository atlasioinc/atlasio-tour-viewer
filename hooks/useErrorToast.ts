// ═══════════════════════════════════════════════════════════════
// hooks/useErrorToast.ts
// Simple state hook for error toast visibility
//
// Usage: const { errorMessage, showError, dismissError } = useErrorToast();
// Pass showError to error handlers, dismissError to ErrorToast onDismiss
// ═══════════════════════════════════════════════════════════════

import { useState, useCallback } from 'react';

export function useErrorToast() {
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  const showError = useCallback((message: string) => {
    setErrorMessage(message);
  }, []);

  const dismissError = useCallback(() => {
    setErrorMessage(null);
  }, []);

  return { errorMessage, showError, dismissError };
}

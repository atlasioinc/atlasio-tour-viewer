// hooks/useDebounce.ts
// ═══════════════════════════════════════════════════════════════
// Debounce hook for search inputs
// Prevents API calls on every keystroke — waits until user stops typing
//
// Usage:
//   const [searchText, setSearchText] = useState('');
//   const debouncedSearch = useDebounce(searchText, 300);
//   const { data } = useFindPros(debouncedSearch, role, sort);
// ═══════════════════════════════════════════════════════════════

import { useState, useEffect } from 'react';

export function useDebounce<T>(value: T, delay: number = 300): T {
  const [debouncedValue, setDebouncedValue] = useState<T>(value);

  useEffect(() => {
    const timer = setTimeout(() => setDebouncedValue(value), delay);
    return () => clearTimeout(timer);
  }, [value, delay]);

  return debouncedValue;
}

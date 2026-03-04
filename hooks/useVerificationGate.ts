// hooks/useVerificationGate.ts
// ═══════════════════════════════════════════════════════════════
// Centralized verification gating hook
// Single source of truth for all access-control decisions.
//
// Usage:
//   const { canPostJob, showBanner, level } = useVerificationGate();
//   if (!canPostJob) showBlockingModal();
// ═══════════════════════════════════════════════════════════════

import { useMyProfile } from './useData';
import type { VerificationLevel } from '../types';

interface VerificationGate {
  /** Current verification level */
  level: VerificationLevel;
  /** At least 'basic' (phone verified) */
  isVerified: boolean;
  /** All three steps complete */
  isFullyVerified: boolean;
  /** Can post jobs — requires at least 'basic' verification */
  canPostJob: boolean;
  /** Should show encouragement banner (anything below fully_verified) */
  showBanner: boolean;
  /** Profile is still loading */
  isLoading: boolean;
}

export const useVerificationGate = (): VerificationGate => {
  const { data: profile, isLoading } = useMyProfile();

  const level: VerificationLevel = profile?.verification_level ?? 'none';
  const isVerified = level !== 'none';
  const isFullyVerified = level === 'fully_verified';

  return {
    level,
    isVerified,
    isFullyVerified,
    canPostJob: isVerified,
    showBanner: !isFullyVerified,
    isLoading,
  };
};

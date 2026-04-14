// ═══════════════════════════════════════════════════════════════
// hooks/useMomentBanner.ts
// State hook for MomentBanner visibility (S150).
//
// Mirrors the architecture of useSuccessToast.ts — same shape, same
// useCallback show/clear pair. Screens manage their own instance; no
// global state. The auto-dismiss timing (2500ms) is owned by
// MomentBanner itself, NOT here — this hook only stores the config.
//
// Usage:
//   const { bannerConfig, showBanner, clearBanner } = useMomentBanner();
//   // in a mutation onSuccess / effect:
//   showBanner({ icon: '🎯', message: 'First bid submitted — good luck!' });
//   // in render:
//   <MomentBanner
//     visible={bannerConfig !== null}
//     icon={bannerConfig?.icon ?? ''}
//     message={bannerConfig?.message ?? ''}
//     accentColor={bannerConfig?.accentColor}
//     onDismiss={clearBanner}
//   />
//
// First-bid AsyncStorage pattern (BidSubmissionScreen, S150):
//   Because Profile has no `bids_count` field, first-bid detection uses a
//   local AsyncStorage flag:
//     const KEY = 'atlasio_first_bid_shown';
//     const alreadyShown = await AsyncStorage.getItem(KEY);
//     if (!alreadyShown) {
//       showBanner({ icon: '🎯', message: 'First bid submitted — good luck!' });
//       await AsyncStorage.setItem(KEY, '1');
//     } else {
//       showSuccess('Bid submitted'); // existing SuccessToast path
//     }
//   The banner and toast never fire simultaneously — the branch guarantees it.
//   @backend: replace with `profile.bids_count === 0` check when the field
//   is added to the Profile shape.
// ═══════════════════════════════════════════════════════════════

import { useCallback, useState } from 'react';

export interface MomentBannerConfig {
  icon: string;
  message: string;
  accentColor?: string;
}

export function useMomentBanner() {
  const [bannerConfig, setBannerConfig] = useState<MomentBannerConfig | null>(null);

  const showBanner = useCallback((config: MomentBannerConfig) => {
    setBannerConfig(config);
  }, []);

  const clearBanner = useCallback(() => {
    setBannerConfig(null);
  }, []);

  return { bannerConfig, showBanner, clearBanner };
}

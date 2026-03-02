// proProfileHelpers.ts
// ═══════════════════════════════════════════════════════════════
// Helper functions to map various app data types to ProProfileData
// Used when navigating to ProProfile from Find Tab, Network Tab,
// bid cards, vouch feed, etc.
// Production: These mappers become unnecessary once ProProfile
//   fetches its own data by ID from the backend.
//   e.g., navigation.navigate('ProProfile', { proId: '123' })
//   and ProProfile fetches from supabase.from('profiles').eq('id', proId)
// ═══════════════════════════════════════════════════════════════

import type { ProProfileData, PerformanceStats as LocalPerformanceStats } from './ProProfile';
import type { Profile, PerformanceStats as DbPerformanceStats } from '../types';

// ─────────────────────────────────────────────
// MOCK PORTFOLIO PHOTOS (demo only)
// Production: fetched from portfolio_photos table via Supabase
// ─────────────────────────────────────────────

const MOCK_PORTFOLIO_PHOTOS: string[] = [
  'https://images.unsplash.com/photo-1621905251189-08b45d6a269e?w=800&h=600&fit=crop',
  'https://images.unsplash.com/photo-1504328345606-18bbc8c9d7d1?w=800&h=600&fit=crop',
  'https://images.unsplash.com/photo-1558618666-fcd25c85f82e?w=800&h=600&fit=crop',
  'https://images.unsplash.com/photo-1581094794329-c8112a89af12?w=800&h=600&fit=crop',
  'https://images.unsplash.com/photo-1585704032915-c3400ca199e7?w=800&h=600&fit=crop',
  'https://images.unsplash.com/photo-1523413363574-c30aa1c2a516?w=800&h=600&fit=crop',
  'https://images.unsplash.com/photo-1513694203232-719a280e022f?w=800&h=600&fit=crop',
  'https://images.unsplash.com/photo-1560448204-e02f11c3d0e2?w=800&h=600&fit=crop',
];

// Roles that get portfolio photos in demo mode
const GALLERY_ROLES = ['Contractor', 'Home Stager', 'Real Estate Photographer'];

// ─────────────────────────────────────────────
// FROM FIND TAB (ProCard)
// ─────────────────────────────────────────────

interface FindTabProCard {
  id: string;
  name: string;
  company: string;
  role: string;
  /** Primary trade specialty — populated for Contractor, Home Stager, RE Photographer */
  trade?: string;
  /** Up to 2 secondary specialties */
  secondary_trades?: string[];
  rating: number;
  vouches: number;
  tags: string[];
  stat: string;
  avatarColor: string;
  closingDays?: number;
  distanceMi?: number;
}

export const mapFindProToProfile = (pro: FindTabProCard): ProProfileData => ({
  id: pro.id,
  name: pro.name,
  company: pro.company,
  location: 'Denver, CO',
  rating: pro.rating,
  vouches: pro.vouches,
  active_since: '2022',
  role: pro.role,
  // Use explicit trade if provided, otherwise fall back to role
  trade: pro.trade || pro.role,
  // Carry secondary trades through (max 2, enforced at data entry)
  secondary_trades: pro.secondary_trades?.slice(0, 2),
  licensed: 'Licensed CO',
  distance: pro.distanceMi ? `${pro.distanceMi} mi` : '—',
  bio: `${pro.role} at ${pro.company}. ${pro.stat}. Highly vouched by agents in the Denver area.`,
  avatarColor: pro.avatarColor,
  // Production: these come from the profiles + performance tables
  performance_stats: {
    completed_jobs: Math.floor(pro.vouches * 0.4),
    on_time_rate: pro.rating >= 4.9 ? 100 : 96,
    avg_response: pro.closingDays && pro.closingDays <= 5 ? '<2h' : '<4h',
  },
  tags: pro.tags,
  // Production: fetched from vouches table joined with profiles
  recent_vouches: [
    { id: `${pro.id}-v1`, name: 'Sarah J.', quote: '"Great to work with, highly recommend"' },
    { id: `${pro.id}-v2`, name: 'Mike R.', quote: '"Fast and professional service"' },
    { id: `${pro.id}-v3`, name: 'Lisa K.', quote: '"Always responsive and reliable"' },
  ],
  is_connected: false,
  is_own_profile: false,
  // Portfolio: only populate for gallery-eligible roles
  portfolio_photos: GALLERY_ROLES.includes(pro.role) ? MOCK_PORTFOLIO_PHOTOS : [],
});

// ─────────────────────────────────────────────
// FROM NETWORK TAB (NetworkContact)
// Squad toggle removed Session 21 — isInSquad no longer tracked here
// ─────────────────────────────────────────────

interface NetworkTabContact {
  id: string;
  name: string;
  company: string;
  role: string;
  group: string;
  tags: string[];
  avatarColor: string;
  tab: 'partners' | 'contractors';
}

export const mapNetworkContactToProfile = (contact: NetworkTabContact): ProProfileData => ({
  id: contact.id,
  name: contact.name,
  company: contact.company,
  location: 'Denver, CO',
  rating: 4.8, // Production: fetched from profiles table
  vouches: 30, // Production: COUNT from vouches table
  active_since: '2022',
  // Contractors from network tab get role: 'Contractor'
  // Partners get their specific role (e.g., 'Mortgage Pro')
  role: contact.tab === 'contractors' ? 'Contractor' : contact.role,
  trade: contact.group, // Use group (e.g., 'Electrical') not role
  // Production: secondary_trades fetched from profiles table
  secondary_trades: undefined,
  licensed: contact.tab === 'contractors' ? 'Licensed CO' : '',
  distance: '—', // Production: computed from geolocation
  bio: `${contact.role} at ${contact.company}. Part of the Denver professional network.`,
  avatarColor: contact.avatarColor,
  // Production: fetched from performance table
  performance_stats: {
    completed_jobs: 14,
    on_time_rate: 98,
    avg_response: '<4h',
  },
  tags: contact.tags,
  // Production: fetched from vouches table with LIMIT 5
  recent_vouches: [
    { id: `${contact.id}-v1`, name: 'Agent A.', quote: '"Excellent professional to work with"' },
    { id: `${contact.id}-v2`, name: 'Agent B.', quote: '"Reliable and responsive"' },
    { id: `${contact.id}-v3`, name: 'Agent C.', quote: '"Would recommend to anyone"' },
  ],
  is_connected: true, // They're in your network
  is_own_profile: false,
  // Portfolio: contractors from network get demo photos
  portfolio_photos: contact.tab === 'contractors' ? MOCK_PORTFOLIO_PHOTOS : [],
});

// ─────────────────────────────────────────────
// FROM SUPABASE PROFILE (useProfile hook response)
// Maps Profile & { performance_stats } → ProProfileData
// Used by ProProfile when fetching by profileId
// ─────────────────────────────────────────────

export const mapProfileToProProfileData = (
  p: Profile & { performance_stats: DbPerformanceStats | null },
): ProProfileData => ({
  id: p.id,
  name: p.name,
  company: p.company,
  location: p.location || 'Denver, CO',
  rating: p.rating,
  vouches: p.vouch_count,
  active_since: p.active_since || '',
  role: p.display_role,
  trade: p.trade || p.display_role,
  secondary_trades: p.trades?.length > 1 ? p.trades.slice(1).map(String) : undefined,
  licensed: p.licensed || '',
  distance: '—', // TODO: compute from geolocation
  bio: p.bio || '',
  avatarColor: p.avatar_color,
  performance_stats: p.performance_stats
    ? {
        completed_jobs: p.performance_stats.completed_jobs,
        on_time_rate: p.performance_stats.on_time_rate,
        avg_response: p.performance_stats.avg_response_time,
      }
    : { completed_jobs: 0, on_time_rate: 0, avg_response: '—' },
  tags: p.tags as string[],
  recent_vouches: [], // TODO: fetch from vouches join
  is_connected: false, // TODO: check connection status
  is_own_profile: false, // TODO: compare with current user
  portfolio_photos: GALLERY_ROLES.includes(p.display_role) ? MOCK_PORTFOLIO_PHOTOS : [],
});
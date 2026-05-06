# Component Inventory
# tasks/component-inventory.md
# Last updated: S177 — May 6, 2026
# Source of truth for all shared components.
# Always import from components/shared/index.ts — never import directly from component files.

---

## ScreenHeader
- File: components/ScreenHeader.tsx
- Exported from: components/shared/index.ts
- Props: title, leftAction, rightAction, borderColor
- Notes: Header border always COLORS.border (#E5E7EB) — never #000000
- Last modified: S148

---

## Button
- File: components/Button.tsx
- Exported from: components/shared/index.ts
- Variants: primary | secondary | ghost | destructive | outline | text
- Props: label, onPress, variant, disabled, loading, size
- Last modified: S148

---

## DisplayTag
- File: components/DisplayTag.tsx
- Exported from: components/shared/index.ts
- Variants: default | success | warning | danger | info | ghost
- Props: label, variant, fontSize, onPress
- Notes: ghost variant = transparent bg + dashed border — CTA affordance only ("+ Add License" style).
  Use default for informational trade/role pills. Never use ghost for read-only tags.
- Last modified: S177 (ghost vs default clarified)

---

## VerificationBadge
- File: components/VerificationBadge.tsx
- Exported from: components/shared/index.ts
- States: verified | pending | unverified
- Sizes: small | large
- Last modified: S148

---

## VerificationBanner
- File: components/VerificationBanner.tsx
- Exported from: components/shared/index.ts
- Props: role, level, onPress
- Notes: Amber tone. Role-aware and level-aware.
- Last modified: S148

---

## VouchFeedSection
- File: components/VouchFeedSection.tsx
- Exported from: components/shared/index.ts
- Props: profileId, limit
- Last modified: S148

---

## GroupAvatar
- File: components/GroupAvatar.tsx
- Exported from: components/shared/index.ts
- Props: profiles, size, max
- Last modified: S148

---

## UnreadIndicator
- File: components/UnreadIndicator.tsx
- Exported from: components/shared/index.ts
- Variants: dot | count
- Tones: primary | danger
- Last modified: S148

---

## JobInviteCard
- File: components/ContractorHomeTab.tsx (inline component)
- Exported from: n/a — internal to ContractorHomeTab
- Props: invitation: JobInvitationRow, invitationId: string, note?: string | null, onPress: () => void
- Visual treatment: 3px primary left accent bar, COLORS.infoBorder outline,
  Invited badge (backgroundInfo / infoBorder / infoText tokens),
  agent note block (backgroundInfo + 3px primary left border, italic infoText)
- Last modified: S177 (ATL-CONTRACTOR-INVITES-01)

---

## AgentMessageBanner
- File: components/ContractorJobDetails.tsx (inline component)
- Exported from: n/a — internal to ContractorJobDetails
- Props: agentName: string, message: string, invitedAt: string
- Notes: Renders only when job.job_type === 'invite' && job.agent_message. Left blue rule. backgroundInfo tone.
- Last modified: S177 (ATL-BID-FLOW-01)

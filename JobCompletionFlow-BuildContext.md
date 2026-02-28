# Job Completion Flow — Build Context
## Session 12 Handoff Document
*Generated: Feb 25, 2026*

---

## 🎯 What We're Building

A **two-sided Job Completion handshake** between contractor and agent, plus a **Vouch Prompt Modal** that fires on confirmation. This is the final piece of the agent-side feature set.

### Flow Sequence
1. **Contractor marks job complete** → uploads proof photos (max 5), adds completion notes → job status → `pending_confirmation`
2. **Agent gets notified** → reviews proof photos + chat history in Job Detail
3. **Agent confirms or disputes** → "Confirm Complete" (closes job → `completed`, triggers vouch + fee capture) OR "Request Revision" (opens chat, status → `under_review`)
4. **On confirmation** → both sides get `VouchPromptModal` (1 hour delay in prod, immediate for demo)

### Architecture Decision (from Session 11 discussion)
**ONE shared `JobCompletionScreen` with role-conditional behavior** — not two separate screens.
- ~80% of UI identical for both roles: job summary card, status timeline, proof photos, notes
- Only differences: CTAs at bottom + which sections are editable vs read-only
- Same pattern as EditProfileScreen (one component, role-conditional fields)

---

## 📁 Files to Upload to New Chat

Upload these reference files for the new chat to have full context:

### Required Uploads
1. **`ATLASIO_CONTEXT.md`** — project-wide context (tech stack, nav architecture, screens built, design standards, shared components, pending work)
2. **`FindTab_updated.tsx`** — reference for design tokens, ProCardComponent pattern, AvatarPlaceholder, SVG icons, filter/sort patterns (already in Project files)
3. **`SendSquadScreen.tsx`** — reference for fullScreenModal presentation, bottom sheet animation, sequential modal opening, native Share API pattern
4. **This file (`JobCompletionFlow-BuildContext.md`)** — architecture decisions, PRD specs, component breakdown, build order

### Optional (if context window allows)
5. **`atlasio-build-tracker.html`** — visual reference of all screens/status (session log)

---

## 🏗️ Architecture Spec

### Component: `JobCompletionScreen.tsx`
**Location:** `/app/components/JobCompletionScreen.tsx` (shared — not exclusive to either role's stack)
**Navigation:** Registered in both `HomeStack` (agent) and future `ContractorJobStack`
**Presentation:** `fullScreenModal` with `slide_from_bottom` animation (same as SendSquadScreen)

#### Nav Params
```typescript
type JobCompletionParams = {
  jobId: string;
  userRole: 'agent' | 'contractor'; // determines view mode
};
```

#### State Machine (job status values)
```
in_progress → pending_confirmation → completed (happy path)
in_progress → pending_confirmation → under_review → pending_confirmation → completed (revision path)
```

#### Role-Conditional Behavior

| Section | Contractor View | Agent View |
|---------|----------------|------------|
| Job Summary Card | Read-only | Read-only |
| Status Timeline | Shows current step highlighted | Shows current step highlighted |
| Proof Photos | **Editable** — upload via AttachSheet (max 5, 10MB each) | **Read-only** — gallery view of contractor uploads |
| Completion Notes | **Editable** — TextInput for notes | Read-only display |
| Bottom CTAs | "Mark Complete" (primary) | "Confirm Complete" (primary) + "Request Revision" (secondary) |
| Revision Notes | Hidden (unless `under_review`) | **Editable** — TextInput when requesting revision |

#### Key States
```typescript
// Screen states
const [proofPhotos, setProofPhotos] = useState<string[]>([]); // Storage URLs
const [completionNotes, setCompletionNotes] = useState('');
const [revisionNotes, setRevisionNotes] = useState('');
const [isSubmitting, setIsSubmitting] = useState(false);

// Job data (from TanStack Query hook, mock fallback for now)
const [jobStatus, setJobStatus] = useState<'in_progress' | 'pending_confirmation' | 'under_review' | 'completed'>('in_progress');
```

### Component: `VouchPromptModal.tsx`
**Location:** `/app/components/VouchPromptModal.tsx` (shared)
**Trigger:** Fires after agent confirms completion
**Pattern:** Follows ConfirmationModal overlay pattern with text input

#### Props
```typescript
type VouchPromptModalProps = {
  visible: boolean;
  onClose: () => void;
  recipientName: string;
  recipientAvatar: { name: string; color: string };
  recipientRole: string;
  jobTitle: string;
  onSubmitVouch: (data: { rating: number; comment: string; tags: string[]; isVouch: boolean; isAnonymous?: boolean }) => void;
};
```

#### Features
- 1–5 star rating (required) — tappable stars
- Optional comment (max 500 chars) with character counter
- If rating ≥ 4: vouch checkbox appears ("⭐ Vouch for [Name]") — unchecked by default
- If contractor reviewing agent: anonymity checkbox available
- Tags: free-text for MVP (future: standardized from tagEnums.ts)
- Submit creates review row + optionally vouch row

### Component: `StatusTimeline.tsx` (sub-component)
**Location:** Inline in JobCompletionScreen or extracted if reused
**Pattern:** Vertical timeline with step indicators

Steps:
1. Job Awarded ✓ (always complete)
2. Work In Progress ✓ (always complete when this screen shows)
3. Completion Submitted (active for contractor, pending for agent)
4. Agent Confirmed (final step)

---

## 🎨 Design Tokens (from tokens.ts)

### Colors Used in This Flow
```typescript
// From lib/tokens.ts — import COLORS from '../lib/tokens'
const COLORS = {
  // Core
  primary: '#003DC3',        // CTAs, links, active states
  background: '#FFFFFF',     // Cards, modals, headers
  screenBg: '#F7F7FC',       // Page background
  
  // Text
  darkText: '#1C1C1E',       // Headings, names
  headingText: '#101828',     // Screen titles
  bodyText: '#4A5565',        // Body copy, descriptions
  secondaryText: '#666666',   // Subtitles, metadata
  lightText: '#99A1AF',       // Placeholders, timestamps
  statText: '#364153',        // Stat values, form labels
  
  // Borders
  border: '#E5E7EB',         // Headers, dividers — NEVER black
  cardBorder: '#F3F4F6',     // Card outlines
  inputBorder: '#D1D5DC',    // Form inputs
  
  // Status (important for this flow)
  successGreen: '#16A34A',   // "Completed" badge, confirm states
  errorRed: '#E7000B',       // Reject/revision states
  counterAmber: '#D97706',   // Pending states
  starColor: '#FFB900',      // Rating stars
  
  // Backgrounds
  tagBg: '#F4F7FF',          // Tags, stat pills
  infoBg: '#EFF6FF',         // Info banners
  infoBorder: '#DBEAFE',     // Info banner borders
  feeBg: '#F0FDF4',          // Success/fee banners
  feeText: '#15803D',        // Success banner text
  warningBg: '#FFFBEB',      // Warning banners
  warningText: '#92400E',    // Warning text
  
  // Overlays
  overlayDark: 'rgba(0, 0, 0, 0.5)',  // Modal backdrops
};
```

### Typography (strict rules — each fontSize has ONE lineHeight)
```
headingL:   18px / 600 / lineHeight 28  — Section titles
headingM:   16px / 600 / lineHeight 24  — Card titles, modal titles
bodyL:      16px / 400 / lineHeight 24  — Form labels, descriptions
bodyM:      14px / 400 / lineHeight 20  — Body text
bodyMBold:  14px / 500 / lineHeight 20  — Button labels, links
bodyS:      13px / 400 / lineHeight 18  — Helper text, info banners
caption:    12px / 400 / lineHeight 16  — Metadata, timestamps, tags
```

### Component Dimensions
```
Cards:        14px borderRadius, 0.68px border #F3F4F6, shadow(0.1, 3, 2)
Buttons:      36px height (card), 44-48px height (modal), 8-10px radius
Form inputs:  48px height, 10px radius, 1px border #D1D5DC
Avatars:      56px (pro cards), 52px (bid cards), 32px (chat header)
Modal:        24px borderRadius, max-width 360px
Bottom sheet: 20px top radius, full width
```

### Shadows (one pattern, 95% of surfaces)
```typescript
shadowColor: '#000000',
shadowOffset: { width: 0, height: 1 },
shadowOpacity: 0.1,
shadowRadius: 3,
elevation: 2,
```

---

## 🔧 Existing Patterns to Reuse

### 1. fullScreenModal Presentation (from SendSquadScreen)
```typescript
// In HomeStack navigator
<HomeStack.Screen
  name="JobCompletion"
  component={JobCompletionScreen}
  options={{
    headerShown: false,
    presentation: 'fullScreenModal',
    animation: 'slide_from_bottom',
  }}
/>
```

### 2. Photo Upload (from AttachSheet pattern)
- AttachSheet bottom sheet for camera/gallery selection
- Max 5 photos, 10MB each
- Display as horizontal thumbnail strip with delete buttons
- Future: Supabase Storage signed URLs

### 3. Bottom Sheet Animation (from SquadSlotPicker)
```typescript
// animationType="none" + custom Animated
// Backdrop: opacity fade 300ms
// Sheet: spring up (damping: 24, stiffness: 220)
// Close: backdrop fade 200ms, sheet slide 250ms, unmount in callback
```

### 4. Card Pattern (from RepairJobDetails / ProCardComponent)
```typescript
// Standard card wrapper
{
  backgroundColor: COLORS.background,
  borderRadius: 14,
  borderWidth: 0.68,
  borderColor: COLORS.cardBorder,
  shadowColor: '#000000',
  shadowOffset: { width: 0, height: 1 },
  shadowOpacity: 0.1,
  shadowRadius: 3,
  elevation: 2,
  padding: 16,
}
```

### 5. AvatarPlaceholder (from FindTab)
```typescript
const AvatarPlaceholder: React.FC<{ name: string; color: string; size?: number }> = ({ name, color, size = 56 }) => {
  const initials = name.split(' ').map(n => n[0]).join('').substring(0, 2);
  return (
    <View style={{ width: size, height: size, borderRadius: 9999, backgroundColor: color, alignItems: 'center', justifyContent: 'center' }}>
      <Text style={{ fontSize: size * 0.32, fontWeight: '600', color: '#FFFFFF' }}>{initials}</Text>
    </View>
  );
};
```

### 6. Header Pattern (48px, border #E5E7EB)
```typescript
// Standard screen header
<View style={{
  height: 48,
  flexDirection: 'row',
  alignItems: 'center',
  justifyContent: 'space-between',
  paddingHorizontal: 16,
  borderBottomWidth: 0.68,
  borderBottomColor: COLORS.border, // #E5E7EB — NEVER black
  backgroundColor: COLORS.background,
}}>
  {/* Equal-width bookends for centered title */}
  <Pressable style={{ width: 60 }} onPress={goBack}>
    <Text style={{ fontSize: 14, fontWeight: '500', color: COLORS.primary }}>Cancel</Text>
  </Pressable>
  <Text style={{ fontSize: 16, fontWeight: '600', color: COLORS.darkText, textAlign: 'center' }}>
    Job Completion
  </Text>
  <View style={{ width: 60 }} />
</View>
```

### 7. SVG Icons (all inline, react-native-svg)
```
Nav/header: 20×20, strokeWidth 1.67
Action:     24×24, strokeWidth 2.0
Inline:     14×14, strokeWidth 1.17
Small:      16×16, strokeWidth 1.33
```

---

## 📋 Mock Data Structure

### Job Data (for demo)
```typescript
const MOCK_JOB = {
  id: 'job-001',
  title: 'Kitchen Faucet Replacement',
  address: '1847 Pearl St, Denver, CO 80203',
  trade: 'Plumber',
  status: 'in_progress' as const,
  postedDate: '2026-02-20',
  dueDate: '2026-02-28',
  awardedBid: {
    amount: 850,
    contractorId: 'contractor-001',
    contractorName: 'Brian Cooper',
    contractorCompany: 'ProBuild Contractors',
    contractorAvatar: '#7BA3C9',
    contractorRating: 5.0,
    contractorVouches: 67,
  },
  agent: {
    id: 'agent-001',
    name: 'Tony Martinez',
    company: 'Keller Williams Denver',
    avatar: '#C4A882',
  },
  proofPhotos: [], // filled by contractor
  completionNotes: '', // filled by contractor
  revisionNotes: '', // filled by agent if disputing
};
```

---

## 🏗️ Build Order

### Step 1: JobCompletionScreen — Contractor View
The "submit completion" side. Contractor uploads proof, adds notes, taps "Mark Complete."
- Job summary card (read-only)
- Status timeline showing "Completion Submitted" as active step
- Photo upload section (editable, uses AttachSheet pattern)
- Completion notes TextInput
- "Mark Complete" primary CTA at bottom
- Confirmation success overlay on submit

### Step 2: JobCompletionScreen — Agent View  
The "review and confirm" side. Agent sees proof, confirms or requests revision.
- Same job summary card
- Status timeline showing "Agent Review" as active step
- Proof photos gallery (read-only, horizontal scroll)
- Contractor's completion notes (read-only)
- "Confirm Complete" (primary) + "Request Revision" (secondary outline) CTAs
- On confirm: success overlay → triggers VouchPromptModal
- On revision: revision notes TextInput appears, "Submit Revision Request" CTA

### Step 3: VouchPromptModal
Fires after agent confirms. Both roles see it with other person's info.
- Star rating (1-5, tappable)
- Comment TextInput (optional, 500 char max)
- Vouch checkbox (appears at 4+ stars)
- Anonymity checkbox (contractor reviewing agent only)
- Submit + Skip CTAs

---

## 📐 Supabase Schema Reference

### Jobs Table (relevant fields)
```sql
status TEXT CHECK (status IN (
  'draft', 'open', 'awarded', 'in_progress', 
  'pending_confirmation', 'under_review', 'completed', 
  'cancelled', 'expired'
))
proof_photos TEXT[]  -- Storage URLs, max 5
completion_notes TEXT
revision_notes TEXT
agent_confirmed_at TIMESTAMPTZ
contractor_completed_at TIMESTAMPTZ
```

### Reviews Table
```sql
CREATE TABLE reviews (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  from_id UUID REFERENCES profiles(id),
  to_id UUID REFERENCES profiles(id),
  rating INTEGER CHECK (rating BETWEEN 1 AND 5),
  comment TEXT CHECK (length(comment) <= 500),
  tags TEXT[],
  job_id UUID REFERENCES jobs(id),
  is_anonymous BOOLEAN DEFAULT false,
  created_at TIMESTAMPTZ DEFAULT now()
);
```

### Vouches Table
```sql
CREATE TABLE vouches (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  from_id UUID REFERENCES profiles(id),
  to_id UUID REFERENCES profiles(id),
  comment TEXT CHECK (length(comment) <= 500),
  tags TEXT[],
  review_id UUID REFERENCES reviews(id), -- NULL for standalone vouches
  created_at TIMESTAMPTZ DEFAULT now(),
  UNIQUE(from_id, to_id)
);
```

---

## ⚠️ Important Rules

1. **Header borders: `#E5E7EB` (COLORS.border) — NEVER `#000000`**
2. **Section header bottom padding: 8px**
3. **Bottom sheets: `animationType="none"` + custom Animated** (never `animationType="slide"`)
4. **Sequential modals: queue in useRef, execute in close callback with 100ms setTimeout**
5. **All icons: inline SVG via react-native-svg** (no icon libraries)
6. **Import COLORS from `'../lib/tokens'`** (centralized design tokens)
7. **Nav params use IDs, not full objects:** `{ jobId: string }` — screens fetch fresh data on mount
8. **TanStack Query hooks exist in `hooks/useData.ts`** with mock fallback — wire to those interfaces

---

## 💼 Business Context

This flow is critical because it:
- **Triggers 3% fee capture** on Stripe (primary revenue event)
- **Triggers mutual vouch prompts** (trust flywheel — more vouches → more bids → more revenue)
- **Closes the job lifecycle loop** — the final state transition for the repair job feature
- **Enables the "deals_closed" stat** that appears on both profiles
- **Demo story:** Contractor submits → Agent reviews → Job closes → Both vouch. Shows investors the complete transaction lifecycle.

---

## 📝 Prompt for New Chat

Paste this at the start of the new conversation:

> Take the Persona of our Principal Full Stack Software Engineer and Expert Business Consultant for our startup Atlasio, with over 15 years of experience in scaling real estate tech platforms. Build the Job Completion Flow as described in the attached `JobCompletionFlow-BuildContext.md`. Follow the architecture spec exactly — one shared `JobCompletionScreen` with role-conditional behavior, plus a `VouchPromptModal`. Use our existing design tokens (COLORS from tokens.ts), component patterns (cards, headers, avatars, bottom sheets), and animation standards. Reference `FindTab_updated.tsx` and `SendSquadScreen.tsx` for pattern examples. Build in order: contractor view first, then agent view, then vouch modal. Make it production-ready with proper TypeScript interfaces, scalable to integrate with our Supabase backend and TanStack Query hooks. Include mock data for demo.

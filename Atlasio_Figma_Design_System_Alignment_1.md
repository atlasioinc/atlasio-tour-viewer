# Atlasio — Figma Design System Alignment Guide
## Source of Truth: Production Codebase (React Native 0.81.5 + Expo SDK 54)

> **Purpose:** This document captures every design decision finalized during development. Use it to retroactively update Figma files so designs match the shipped product. All values are pixel-exact from the built components.

---

## 1. Color Palette

### Brand
| Token | Hex | Usage |
|-------|-----|-------|
| Primary | `#003DC3` | CTAs, active states, links, nav titles, toggle tracks, info banner text |
| Accent Blue | `#155DFC` | Secondary blue accent |

### Backgrounds
| Token | Hex | Usage |
|-------|-----|-------|
| Screen | `#F7F7FC` | Default screen background |
| Card / Modal | `#FFFFFF` | Cards, modals, inputs |
| Filter Panel | `#F9FAFB` | Expandable filter area |
| Tag | `#F4F7FF` | Tag pill backgrounds |
| Stat | `#F2F6FE` | Stat bar background |
| Chip | `#F3F4F6` | Inactive filter chips |
| Info Banner | `#EFF6FF` | InfoBanner component background |
| Sort Dropdown | `#F2F2F7` | Sort pill background |
| Selected Filter | `rgba(0,61,195,0.10)` | Active filter chip background |
| Job Summary Card | `#F7F7FC` | Confirmation modal job card |
| Success Circle | `#ECFDF5` | Success checkmark background (deprecated — now uses `#003DC3`) |

### Text Hierarchy
| Token | Value | Usage |
|-------|-------|-------|
| Dark | `#1C1C1E` | Primary headings, card titles, modal titles |
| Heading | `#101828` | Screen-level headings |
| Body | `#4A5565` | Primary body text |
| Stat | `#364153` | Stat values, form labels |
| Secondary | `#757575` / `#666666` | Supporting text, subtitles, descriptions |
| Sort | `#333333` | Sort dropdown text |
| Tag | `#707070` | Tag pill text |
| Light | `#99A1AF` | Placeholder icons, close button strokes |
| Placeholder | `rgba(10,10,10,0.5)` | Input placeholder text |

### Borders
| Token | Value | Usage |
|-------|-------|-------|
| Standard | `#E5E7EB` | Header bottom borders, dividers, toggle card borders |
| Card | `#F3F4F6` | Card outlines |
| Input | `#D1D5DC` | Form input borders, outline button borders |
| Active Filter | `#003DC3` | Selected filter chip border |
| Info Banner | `#DBEAFE` | InfoBanner component border |
| Error | `#FB2C36` | Validation error borders and asterisks |

### Status Colors
| Token | Value | Usage |
|-------|-------|-------|
| Star | `#FFB900` | Rating stars (text variant `#D08700`) |
| Error | `#E7000B` | System errors |
| Notification Red | `#FB2C36` | Required field asterisks, validation errors |
| Success | `#16A34A` | General success |
| Added Green | `#219653` | Squad added checkmark |
| Online | `#00C950` | Online status dot |
| Counter Amber | `#D97706` | Counter bid actions |
| Reject Red | `#E7000B` | Reject bid actions |

### Overlays
| Token | Value | Usage |
|-------|-------|-------|
| Modal | `rgba(0,0,0,0.5)` | Bid action modals, confirmation modals |
| Menu | `rgba(0,0,0,0.3)` | Sort dropdown, lightweight overlays |
| Photo Delete | `rgba(0,0,0,0.6)` | Photo overlay with delete icon |
| Backdrop (Connect Modal) | `rgba(0,0,0,0.4)` | Request to Connect modal |

---

## 2. Typography Scale

### Rule: Each fontSize has exactly ONE lineHeight. No exceptions.

| Style | Size | Weight | Line Height | Usage |
|-------|------|--------|-------------|-------|
| Display Large | 30 | 700 | 36 | Modal prices (Accept Bid amount) |
| Display | 24 | 700 | 32 | Card prices, profile stat numbers |
| Heading Large | 20 | 600 | 30 | Confirmation modal title ("Job Posted Successfully!") |
| Heading | 18 | 600 | 28 | Section titles ("Recommended for You"), screen names |
| Heading Small | 16 | 600 | 24 | Card titles, modal headers, nav header titles |
| Body | 16 | 400 | 24 | Form inputs, menus, bios, descriptions |
| Body Medium | 16 | 500 | 24 | Nav action text ("Network"), emphasis text |
| Body Small | 14 | 400 | 20 | Primary body, form labels, tag text, descriptions |
| Body Small Medium | 14 | 500 | 20 | Buttons, links, card action text |
| Body Detail | 14 | 400 | 22.75 | InfoBanner body text (md size), confirmation modal description |
| Filter | 13 | 400 | 18 | Filter chips, helper text |
| Caption | 12 | 400 | 16 | Metadata, timestamps, tags, subtitles, InfoBanner text (sm size) |
| Micro | 11 | 600 | — | Badge counts, notification dots, tab labels |

### Section Header Variants
| Variant | Size | Weight | Line Height | Transform | Letter Spacing |
|---------|------|--------|-------------|-----------|---------------|
| Large | 15 | 400 | 22 | uppercase | 0.14 |
| Standard | 13 | 600 | 18 | uppercase | 0.5 |
| Small | 12 | 400 | 16 | uppercase | 0.3 |

### Nav Title
- **Screen title in header:** 16 / 500 / `#003DC3` — NOT bold 600, and always primary blue
- **Modal header title:** 16 / 600 / `#1C1C1E` — bold, dark text, centered

---

## 3. Spacing System

### Screen Padding
| Context | Value |
|---------|-------|
| Screen horizontal | 16px |
| Modal internal | 24px |
| Card internal | 16px |
| Form scroll content | `paddingHorizontal: 24` (wizard forms) |
| Review/Details scroll | `paddingHorizontal: 24` |

### Gap Scale
`2 → 4 → 6 → 8 → 10 → 12 → 16 → 20 → 24 → 32 → 48`

### Content Gaps
| Context | Gap |
|---------|-----|
| Form fields (within a step) | 24px |
| Review sections | 32px |
| Card internal sections | 16px |
| Modal body sections | 16px |
| Modal body (confirmation) | 20px |
| Buttons row gap | 12px |
| Tag pill gap | 6px |
| Filter chip gap | 8px |

---

## 4. Component Dimensions

### Headers
| Property | Value |
|----------|-------|
| Height | 48px (standardized across ALL screens) |
| Bottom border | 0.68px `#E5E7EB` — NEVER black |
| Nav title style | 16 / 500 / `#003DC3` |
| Back chevron | 20×20, stroke 1.67, `#003DC3` |

### Progress Bar (Wizard)
| Property | Value |
|----------|-------|
| Track height | 4px |
| Track color | `#E5E7EB` |
| Fill color | `#003DC3` |
| Border radius | 9999 (full round) |
| Container padding | `paddingHorizontal: 24`, `paddingBottom: 8` |

### Buttons
| Type | Height | Radius | Details |
|------|--------|--------|---------|
| Card action (Message, Invite to Job) | 36px | r8 | Outlined: 1.35px `#003DC3` border, Filled: `#003DC3` bg |
| Modal CTA | 48px | r8 | Primary: `#003DC3` bg, Outline: 1.35px `#D1D5DC` border |
| Connect modal CTA | 47px | r14 | Primary: `#003DC3` bg with shadow, Outline: 1.35px border |
| Wizard footer | 48px | r8 | Full width, `#003DC3` bg |
| Send button | 40px | r9999 | Circular |
| Filter clear | text-only | — | `#E7000B` text |

### ConfirmationModal (shared component)
| Property | Value |
|----------|-------|
| File | `ConfirmationModal.tsx` |
| Overlay | `rgba(0,0,0,0.5)`, fade animation |
| Card | maxWidth 360, p24, r16, gap 20 |
| Shadow | offset(0,20), opacity 0.1, radius 25, elevation 10 |
| Icon circle | 64px, `#003DC3` bg, r9999, 32×32 white SVG |
| Title | 20/600/`#1C1C1E`, lh30 |
| Subtitle | 16/400/`#666666`, lh24 (optional) |
| Body | 14/400/`#666666`, lh22.75, px2 (optional) |
| Primary CTA | 48h, r8, `#003DC3` bg, 14/500/white |
| Outline CTA | 48h, r8, 1.35px `#D1D5DC` border, 14/500/`#003DC3` (optional) |
| Used in | PostJobWizard, InviteToJobModal, RequestConnect (future) |

### Form Inputs
| Type | Height | Radius | Border |
|------|--------|--------|--------|
| Search field | 44px | r9999 | 0.69px `#D1D5DC` |
| Standard input | 50px | r14 | 1.35px `#D1D5DC` |
| Textarea (Description) | min 146px | r14 | 1.35px `#D1D5DC` |
| Chat input | 45px | r9999 | — |
| Counter input | 48px | r10 | 1px `#D1D5DC` |

**Input text styles:**
- Value: 16 / 400 / `#0A0A0A`
- Placeholder: 16 / 400 / `rgba(10,10,10,0.5)`
- Label: 14 / 500 / `#364153`
- Helper text: 12 / 400 / `#999999`
- Error text: 12 / 400 / `#FB2C36`

**Input vertical centering (critical):**
- Single-line inputs: `flex: 1`, `textAlignVertical: 'center'` on TextInput
- Multiline (Description): `textAlignVertical: 'top'`, `paddingTop: 20`, `paddingBottom: 12`

### Cards
| Type | Radius | Border |
|------|--------|--------|
| Pro card | r14 | 0.68px `#F3F4F6` |
| Bid card | r16 | none |
| Review summary card | r20 | 1.35px `#E5E7EB` |
| Toggle card (invite) | r16 | 1.35px `#E5E7EB` |

### Avatars
| Context | Size |
|---------|------|
| Profile page | 100–120px |
| Bid card | 52px |
| Pro card / Modal | 56px |
| Chat header | 32px |
| Message bubble | 40px |
| Squad | 48px |
| Compact | 24–28px |
| All | r9999 (circular) |

### Pills & Tags
| Type | Radius | Padding H | Padding V | Border |
|------|--------|-----------|-----------|--------|
| Role pill | r9999 | 16px | 7px | Active: none (`#003DC3` bg), Inactive: 0.69px `#E5E7EB` |
| Tag pill | r10 | 8px | 5px | none |
| Trade pill (active) | r9999 | 10px | — | 1.35px `#003DC3`, bg `#003DC3`, text 14/500 white |
| Trade pill (inactive) | r9999 | 10px | — | 1.35px `#D1D5DC`, bg white, text 14/500 `#364153` |

**Trade pill labels (22 options, this order):** General Contractor, Electrical, Plumbing, HVAC, Roofing, Carpentry / Handyman, Painting, Flooring, Windows & Doors, Foundation / Structural, Drywall / Sheetrock, Pest Control / Termite, Mold Remediation, Sewer / Septic, Pool & Spa, Chimney / Fireplace, Garage Door, Appliances, Landscaping / Drainage, Locksmith / Re-key, Cleaning / Junk Removal, Other. **General Contractor is always listed first.**
| Filter chip | r9999 | 12px | 7px | Active: 1px `#003DC3`, Inactive: transparent |

### Modals
| Type | Radius | Max Width | Overlay |
|------|--------|-----------|---------|
| Bid action (Accept/Counter/Reject) | r24 | 360px | `rgba(0,0,0,0.5)` |
| Confirmation (Job Posted) | r16 | 360px | `rgba(0,0,0,0.5)` |
| Sort dropdown | r14 | 280px | `rgba(0,0,0,0.3)` |
| Request to Connect | r20 | 380px | `rgba(0,0,0,0.4)` |

### Toggle Switch
| Property | Value |
|----------|-------|
| Inactive track | `#D1D5DC` |
| Active track | `#003DC3` |
| Thumb | `#FFFFFF` |
| `ios_backgroundColor` | `#D1D5DC` (required — iOS ignores `trackColor.false` without it) |

---

## 5. Shadows

### Standard (Cards)
```
shadowColor: #000000
shadowOffset: { width: 0, height: 1 }
shadowOpacity: 0.1
shadowRadius: 3
elevation: 2
```

### Heavy (Modals)
```
shadowColor: #000000
shadowOffset: { width: 0, height: 20 }
shadowOpacity: 0.1
shadowRadius: 25
elevation: 10
```

### Connect Modal
```
shadowColor: #000000
shadowOffset: { width: 0, height: 25 }
shadowOpacity: 0.15
shadowRadius: 50
elevation: 10
```

---

## 6. Shared Components

### InfoBanner
Blue callout used for contextual guidance and next-step info.

| Property | Value |
|----------|-------|
| Background | `#EFF6FF` |
| Border | 1.35px `#DBEAFE` |
| Border radius | 14px |
| Padding | 16px |
| Text color | `#003DC3` |
| Size "sm" | 12 / 400 / lineHeight 16 (for modals) |
| Size "md" | 14 / 400 / lineHeight 22.75 (for screens) |
| Bold prefix | 14 / 700 / `#003DC3` (optional, e.g. "What happens next:") |

**Used in:** PostJobWizard Review step (md + bold), RepairJobDetails Accept Bid modal (sm)

### SearchField
Shared search input across all tabs.

| Property | Value |
|----------|-------|
| Height | 44px |
| Border radius | 9999 (pill) |
| Border | 0.69px `#D1D5DC` |
| Icon | 20×20 search magnifier, stroke `#99A1AF` |
| Padding horizontal | 12px |
| Icon-to-text gap | 8px |
| Input font | 14 / 400 / `#1C1C1E` |
| Placeholder color | Defined by `COLORS.placeholderText` |
| Clear button | "✕" 16px `#99A1AF`, appears when value.length > 0 |
| TextInput height | Must match container (44px) to prevent descender clipping |
| TextInput lineHeight | 20 |

**Used on:** Home, Find, Network, Inbox tabs

### AvatarPlaceholder
Colored circle with initials.

| Property | Value |
|----------|-------|
| Shape | Circle (r9999) |
| Font size | `size × 0.32` |
| Font weight | 600 |
| Text color | `#FFFFFF` |
| Background | Per-user `avatarColor` prop |

---

## 7. Screen-Specific Specs

### Post Job Wizard (3-step)
| Element | Spec |
|---------|------|
| Header | 48px, nav title 16/500/`#003DC3`, back chevron left |
| Progress bar | 4px track, `paddingHorizontal: 24`, `paddingBottom: 8` |
| Form padding | `paddingHorizontal: 24`, `gap: 24` |
| Input height | 50px, r14, 1.35px border |
| Required asterisk | `#FB2C36`, inline after label |
| Error border | `#FB2C36` (replaces `#D1D5DC`) |
| Date picker | Inline, `themeVariant: 'light'` |
| Photo grid | 3-column, 6 max, r12, aspect 1:1 |
| Footer | 48px button, r8, `#003DC3`, 14/500/white |

### Confirmation Modal (Job Posted)
| Element | Spec |
|---------|------|
| Card | r16, padding 24, gap 20, no header bar |
| Icon | 64px circle, `#003DC3` bg, white shield+checkmark SVG |
| Title | 20 / 600 / `#1C1C1E` / lineHeight 30, left-aligned |
| Subtitle | 16 / 400 / `#666666` / lineHeight 24 — `"{jobTitle}" is now live` |
| Body | 14 / 400 / `#666666` / lineHeight 22.75 |
| Primary CTA | "View Job" — 48px, r8, `#003DC3` bg, 14/500 white |
| Secondary CTA | "Back to Home" — 48px, r8, 1.35px `#D1D5DC` border, 14/500 `#003DC3` |
| Button gap | 12px vertical stack |

### Accept Bid Modal
| Element | Spec |
|---------|------|
| Card | r24, maxWidth 360, overlay `rgba(0,0,0,0.5)` |
| Header | 56px, centered title 16/600/`#1C1C1E`, X button absolute right |
| Avatar | 56px circle |
| Bid amount card | `#F7F7FC` bg, r16, p16, amount 30/700/`#003DC3` |
| InfoBanner | sm size (12/16) |
| Buttons | 48px, r8, Cancel (outline) + Accept Bid (primary), gap 12 |

### Request to Connect Modal
| Element | Spec |
|---------|------|
| Card | r20, maxWidth 380, overlay `rgba(0,0,0,0.4)` |
| Title | 20 / 600 / `#1C1C1E` / lineHeight 28, with close X button |
| Avatar | 56px |
| Divider | 0.68px `#F3F4F6` below pro info row |
| Message input | height 105, r14, 0.68px border, placeholder `#99A1AF` |
| Character count | 12 / 400 / `#757575` |
| Buttons | 47px, r14, Cancel (1.35px outline) + Send Request (primary with shadow), gap 12 |

### Find Tab
| Element | Spec |
|---------|------|
| Top bar | Location pin + SearchField + Sort icon (right) |
| Sort icon | Filter lines icon, turns `#003DC3` + 8px blue dot when non-default sort active |
| Role pills | r9999, active: `#003DC3` bg / white text, inactive: 0.69px `#E5E7EB` border |
| Filter toggle | "Show filters" / "Hide filters" text, `#003DC3`, with chevron |
| Filter count badge | 20px circle, `#003DC3` bg, 11/600 white text |
| Pro cards | r14, 0.68px `#F3F4F6` border, standard shadow |
| Card buttons | Message (outline) + Request to Connect (primary), 36px, r8 |

### Network Tab
| Element | Spec |
|---------|------|
| Top bar | "Network" title (16/600/`#003DC3`) + SearchField + Contact Requests icon |
| Tab switcher | r10 container, `#F7F7FC` bg, r8 active tab with shadow |
| Group headers | 15/400/uppercase/`#003DC3` |
| Squad toggle | 40×40 hit area, AddToSquad icon (person+) / Added checkmark |

---

## 8. Icon Specs

| Context | Size | Stroke Width |
|---------|------|-------------|
| Nav / Header | 20×20 | 1.67 |
| Action buttons | 24×24 | 2.0 |
| Inline (stat, tag) | 14×14 | 1.17 |
| Small (location, etc.) | 16×16 | 1.33 |
| Tab bar | 28×28 | 2.0–2.5 |
| Modal close (X) | 20×20 | 1.67 |

All icons: inline SVG, stroke-based (not filled unless star/lightning), `strokeLinecap: round`, `strokeLinejoin: round`.

---

## 9. Interaction States

| Interaction | Value |
|-------------|-------|
| Pressed opacity (typical) | 0.7 |
| Pressed opacity (light) | 0.5 |
| Pressed opacity (primary CTA) | 0.85 |
| Disabled / submitting opacity | 0.7 |
| Modal animation | `animationType="fade"` |
| Chat screen transition | `fullScreenModal` + `slide_from_bottom` |
| Filter panel | `LayoutAnimation.easeInEaseOut` |
| Keyboard avoiding | `behavior="padding"` iOS, `undefined` Android |

---

## 10. Critical Consistency Rules

1. **Header height is ALWAYS 48px** — every screen, no exceptions
2. **Header bottom border is ALWAYS `#E5E7EB`** — NEVER `#000000`
3. **Each fontSize maps to exactly ONE lineHeight** — zero drift
4. **Nav titles are 16/500/`#003DC3`** — not 600, not dark
5. **Modal header titles are 16/600/`#1C1C1E`** — bold, dark, centered
6. **Form input borders are 1.35px** — not 1px, not 0.68px
7. **Info banners use the `InfoBanner` component** — never inline the blue callout
8. **Toggle inactive track is `#D1D5DC`** with `ios_backgroundColor="#D1D5DC"` — iOS requires this prop for off-state color
9. **Required field asterisks are `#FB2C36`** — inline `*` after label text
10. **Trade pills use `paddingHorizontal: 10`** with 1.35px border — active AND inactive consistent
11. **Search field TextInput must have explicit `height: 44` and `lineHeight: 20`** — prevents descender clipping on "y", "g", "p"
12. **Confirmation modals have NO header bar** — icon + text + stacked buttons, `r16`, `p24`
13. **Bid action modals have a 56px header** — centered title + X close button

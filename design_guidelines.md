# FitMeal PWA - Design Guidelines

## Design Approach

**Selected Approach:** Design System Foundation with Health App Optimization

Drawing from Material Design principles and modern health tracking applications (MyFitnessPal, Cronometer, Apple Health), optimized for data-dense nutritional information and quick mobile interactions.

**Core Design Principles:**
- Data Clarity: Nutritional information must be instantly scannable
- Touch-First: Large tap targets for rapid logging
- Visual Feedback: Immediate response to all user actions
- Progress Visibility: Always show remaining goals at a glance

---

## Typography System

**Font Family:**
- Primary: Inter (Google Fonts) - excellent readability for numbers and data
- Monospace: JetBrains Mono - for precise nutritional values

**Type Scale:**
- Page Headers: 2xl (24px), semibold
- Section Headers: xl (20px), semibold  
- Data Labels: base (16px), medium
- Nutritional Values: lg (18px), semibold (monospace)
- Supporting Text: sm (14px), regular
- Micro Labels: xs (12px), medium

**Hierarchy Rules:**
- Nutritional macros (kcal/P/F/C) always displayed in monospace at lg size for quick scanning
- Current values vs goals use weight contrast (semibold vs regular)
- Unit labels (g, oz, kcal) in xs, slightly muted

---

## Layout System

**Spacing Primitives:**
Using Tailwind units: 2, 3, 4, 6, 8, 12, 16, 20

- Component internal padding: p-4
- Section spacing: space-y-6 or gap-6
- Page margins: px-4 (mobile), px-6 (tablet+)
- Card padding: p-6
- Icon-text gaps: gap-2 or gap-3
- List item spacing: py-3 or py-4
- Bottom navigation height: h-16

**Container Strategy:**
- Full-width app container (no max-width constraint)
- Content sections: max-w-7xl mx-auto for very large screens
- Bottom sheets/modals: max-w-2xl mx-auto
- Scan camera: fullscreen (w-screen h-screen)

**Grid Patterns:**
- Nutritional macro cards: grid-cols-2 gap-3 (mobile), grid-cols-4 gap-4 (desktop)
- Food search results: single column list
- Suggestion combinations: stacked cards with dividers

---

## Component Library

### Navigation
**Bottom Tab Bar (Fixed):**
- 5 tabs: Dashboard, Water, Log Food, Timeline, Settings
- Icon + label vertical stack
- Active state: icon fill + label semibold
- Height: h-16 with safe-area-inset-bottom
- Icons: Heroicons (outline for inactive, solid for active)

### Dashboard Components

**Circular Progress Ring (Calories):**
- Size: w-48 h-48 (mobile), w-64 h-64 (tablet+)
- Stroke width: 12px
- Center display: Current kcal (3xl, semibold) + "/ Goal" (sm, muted)
- Ring animates on value change

**Horizontal Progress Bars (Macros):**
- Stack of 5 bars: Protein, Fat, Carbs, Fiber, Water
- Each bar: h-12, rounded-lg, with inner fill animation
- Left side: Icon (w-6 h-6) + Label
- Center: Progress fill with gradient
- Right side: "Current / Goal" in monospace

**Remaining Nutrients Summary Card:**
- Positioned above bottom nav (sticky)
- Shows remaining P/F/C/kcal in compact grid
- Large "✨ Fill Remaining" button spans full width
- Background: subtle gradient or elevated surface

### Food Logging Components

**Search Bar:**
- Sticky top position
- Large touch target: h-14
- Left icon: Search (Heroicons)
- Right icons: Barcode scan, Recent items (2-icon cluster)
- Placeholder: "Search foods or scan barcode"

**Food Item Row (Search Results):**
- Height: min-h-20
- Left: Food icon or thumbnail (w-12 h-12, rounded)
- Center: Food name (base, semibold) + Brand (sm, muted) stacked
- Right: Quick add "+" button (w-10 h-10, circular)

**Portion Input Bottom Sheet:**
- Slides up from bottom, rounded-t-3xl
- Header: Food name + brand
- Nutrition Preview: 2×2 grid showing per-100g values
- Amount Input: Large number input (2xl) with unit selector (g/oz/kg) as segmented control
- Real-time Calculation Display: Macro grid updates as you type
- Actions: "Add to Log" (primary, full-width) + "Use to Fill Remaining" (secondary, full-width)

### Barcode Scanning Interface

**Camera View:**
- Fullscreen with semi-transparent overlay
- Center: Scanning reticle (w-64 h-40, rounded border with corners highlighted)
- Top bar: Close button + Flashlight toggle
- Bottom: "Scan barcode on package" instruction text
- On detection: Haptic feedback + bottom sheet slides up

**Scan Result Bottom Sheet:**
- Compact header: Product image (if available) + Brand + Name
- Nutrition table: Toggle between "Per Serving" / "Per 100g" tabs
- Serving size selector: Stepper (- / input / +) with unit dropdown
- Live calculation card: "This serving contains" with kcal/P/F/C/Fiber
- Two action buttons stacked:
  - Primary: "Add to Food Log"
  - Secondary: "Calculate Portion to Fill Remaining"

### Water Tracking Interface

**Water Bottle Visualization:**
- SVG bottle container: w-40 h-80 (mobile), w-48 h-96 (tablet+)
- Fill animation: CSS transition on height change
- Wave effect on top of water level
- Labels: Current oz / Goal oz (outside bottle)

**Quick Add Buttons:**
- Horizontal row of 3 large buttons: "+8 oz" / "+12 oz" / "Custom"
- Each button: h-14, rounded-xl
- Icons: Droplet sizes (sm/md/lg)

**Progress Ring (Alternative View):**
- Circular ring similar to calorie tracker
- Center: oz consumed / goal
- Surrounding: Time-based markers for hydration schedule

### Timeline/Reminders Interface

**Meal/Hydration Cards:**
- Card per event: rounded-xl, p-4, with left border accent
- Header: Time (lg, semibold) + Event type (base)
- Status badge: "Pending" / "Countdown" / "Complete" / "Delayed"
- Countdown timer: Circular progress (when active) or linear progress bar
- Actions row: "Complete" / "Delay 15m" / "Go to Scanner" quick links
- State-specific styling: Muted for future, highlighted for active, checkmark for complete

### Recommendation Cards (Fill Remaining)

**Combination Card:**
- Bordered card with header: "Option 1/2/3"
- Food items list: Each item shows name + calculated portion + macros
- Deviation summary: "±X kcal from target" in small badge
- Action: "Add All to Log" button
- Collapse/expand for multiple food details

### Settings Components

**Preference Sections:**
- Grouped cards with headers
- Toggle switches: h-6 with smooth animation
- Unit selectors: Segmented control (g/oz/kg)
- Number inputs: Steppers with +/- buttons
- Time pickers: Native mobile time input

---

## Data Visualization Patterns

**Progress Indicators:**
- Use fill animations (duration-300 ease-out)
- Rings: SVG stroke-dasharray animation
- Bars: Width transition with gradient fill
- Threshold markers: Vertical line at 100% mark

**Nutritional Value Display:**
- Always pair value with unit: "25g" not "25 g"
- Use monospace font for alignment
- Color-code when appropriate: Under target (muted), At target (success), Over target (warning)
- Decimal precision: 0 decimals for kcal, 1 decimal for macros

**Comparison Layout:**
- Side-by-side: Current | Target | Remaining
- Use visual separators (dividers or subtle borders)
- Remaining value gets visual emphasis (bolder weight)

---

## Interaction Patterns

**Touch Targets:**
- Minimum: 44×44px for all tappable elements
- Primary buttons: h-12 minimum
- List items: h-16 minimum (h-20 preferred for data-heavy rows)

**Feedback:**
- Tap: Scale down to 98% (active state)
- Success actions: Checkmark icon + brief success message
- Additions to log: Subtle slide-in animation + auto-dismiss toast
- Barcode detection: Haptic vibration + visual flash

**Sheet/Modal Behavior:**
- Bottom sheets: Slide up from bottom with backdrop
- Dismissal: Swipe down or tap backdrop
- Multi-step flows: Progress dots at top
- Fullscreen modals: Camera, OCR capture

**Loading States:**
- Skeleton screens for list loading (shimmer effect)
- Spinner for calculations/API calls
- Progress bars for scanning/OCR processing

---

## Accessibility Requirements

**Touch & Interaction:**
- All interactive elements meet 44×44px minimum
- Sufficient spacing between tappable elements (gap-3 minimum)
- Clear focus indicators for keyboard navigation

**Visual Hierarchy:**
- High contrast for nutritional values (WCAG AA minimum)
- Icon + text labels for all actions (not icon-only)
- Large text for critical numbers (kcal, macros)

**Feedback:**
- Success/error states always include text, not just icon
- Form validation: Inline error messages
- Loading states: Progress indication + text label

---

## Animation Guidelines

**Use Sparingly:**
- Water bottle fill: Smooth height transition (duration-700)
- Progress rings/bars: Update on data change (duration-500)
- Bottom sheet entrance: Slide up (duration-300)
- Page transitions: Subtle fade (duration-200)

**Prohibited:**
- No scroll-triggered animations
- No decorative animations on data displays
- No auto-playing looping animations
- Keep micro-interactions under 300ms

---

## Images & Icons

**Icons:**
- Library: Heroicons via CDN
- Size scale: w-4 h-4 (micro), w-5 h-5 (standard), w-6 h-6 (prominent), w-8 h-8 (feature)
- Style: Outline for inactive/secondary, Solid for active/primary
- Nutritional macro icons: Custom set for P/F/C/Fiber/Water (use <!-- CUSTOM ICON: protein molecule --> placeholders)

**Food Images:**
- Search results: Small thumbnails (w-12 h-12, rounded)
- Scan results: Product photo (w-24 h-24 or w-full max-h-40)
- Placeholder: Generic food icon when no image available

**No Hero Images:**
This is a utility app—no marketing hero sections. Dashboard is data-first.

---

## Platform-Specific (PWA)

**Install Prompt:**
- Compact banner at top of dashboard
- Icon + "Install FitMeal" + Dismiss
- Appears after 2 uses

**Offline State:**
- Banner notification when offline
- Cached food library accessible
- Sync indicator when reconnected

**Camera Access:**
- Permission prompt with clear explanation
- Fallback: "Upload image" button if camera denied

---

## Key Screens Layout Summary

**Dashboard:** Calorie ring (center) → Macro bars (stacked) → Remaining card (sticky bottom)

**Water:** Bottle visualization (center) → Quick add buttons (below) → Progress ring (alternative tab)

**Log Food:** Search bar (top sticky) → Results list → Portion bottom sheet (on select)

**Scanner:** Fullscreen camera → Reticle overlay → Result bottom sheet

**Timeline:** Scrollable card list → Countdown timers → Quick actions per card

**Settings:** Grouped sections → Toggle/stepper controls → Unit preferences
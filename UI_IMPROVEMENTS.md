# UI Improvements - Component Checklist

## ✅ Completed

### ChatInput (`components/ChatInput.tsx`)
- [x] Fixed bottom bar positioning
- [x] Updated colors to match old tracker exactly
- [x] Added hover states with transitions
- [x] Black button with gray-800 hover
- [x] Proper input border and focus states
- [x] Refined spacing (px-12, py-10)

## 🔄 In Progress / TODO

### High Priority (Most Visible)

#### 1. MacroTable (`components/MacroTable.tsx`)
**Issues:**
- Generic Gluestack colors instead of precise grays
- Missing hover states on rows
- Delete/duplicate buttons need better styling

**Fixes Needed:**
```tsx
// Row styling
borderBottomColor: '#E5E7EB'  // instead of $borderLight100
':hover': {
  backgroundColor: '#F9FAFB',  // gray-50
  transition: 'all 0.15s'
}

// Header
backgroundColor: '#F9FAFB'  // gray-50
borderBottomColor: '#E5E7EB'  // gray-200

// Action buttons
color: '#9CA3AF'  // gray-400
':hover': { color: '#111827' }  // gray-900

// Delete button
color: '#EF4444'  // red-500
':hover': { backgroundColor: '#FEF2F2' }  // red-50
```

#### 2. FoodLogView (`components/FoodLogView.tsx`)
**Issues:**
- Card borders and shadows too subtle
- Missing hover states
- Action buttons need refinement

**Fixes Needed:**
```tsx
// Card
backgroundColor: 'white'
borderColor: '#E5E7EB'  // gray-200
borderRadius: 12  // xl
shadowColor: 'black'
shadowOpacity: 0.05
shadowRadius: 2

':hover': {
  borderColor: '#D1D5DB',  // gray-300
  transition: 'all 0.15s'
}

// Action buttons
padding: 4
borderRadius: 6
opacity: 0  // show on hover
groupHover: { opacity: 1 }
```

#### 3. Totals (`components/Totals.tsx`)
**Issues:**
- Needs to match old tracker's donut charts exactly
- Colors might be off
- Spacing and typography need refinement

**Fixes Needed:**
```tsx
// Donut background circle
stroke: '#E5E7EB'  // gray-200

// OpenAI green
stroke: '#10A37F'  // when on target

// Amber warning
stroke: '#F59E0B'  // amber-500

// Red over
stroke: '#EF4444'  // red-500

// Text colors
primary: '#111827'  // gray-900
secondary: '#4B5563'  // gray-600
tertiary: '#6B7280'  // gray-500
```

### Medium Priority

#### 4. Track Screen (`app/(tabs)/index.tsx`)
**Issues:**
- Date navigation needs polish
- Background color should be more subtle
- Card shadows need adjustment

**Fixes Needed:**
```tsx
// Background
backgroundColor: '#F9FAFB'  // gray-50

// Date navigation
borderBottomColor: '#E5E7EB'

// Today button
backgroundColor: '#000000'
':hover': { backgroundColor: '#1F2937' }

// Settings button
borderColor: '#E5E7EB'
shadowOpacity: 0.05
```

#### 5. Settings Screen (`app/settings.tsx`)
**Issues:**
- Cards need better styling
- Input fields need refinement
- Save button needs polish

**Fixes Needed:**
```tsx
// Card
backgroundColor: 'white'
borderColor: '#E5E7EB'
borderRadius: 12
shadowOpacity: 0.05

// Input
borderColor: '#D1D5DB'
':focus': {
  borderColor: '#9CA3AF',
  shadowOpacity: 0.1
}

// Save button
backgroundColor: '#000000'
':hover': { backgroundColor: '#1F2937' }
```

#### 6. Analytics Screen (`app/(tabs)/analytics.tsx`)
**Issues:**
- Summary cards need better shadows
- Table needs refinement
- Dropdown styling

**Fixes Needed:**
```tsx
// Summary cards
backgroundColor: 'white'
borderColor: '#E5E7EB'
shadowOpacity: 0.05

// Icon backgrounds
blue: '#DBEAFE'
green: '#D1FAE5'
purple: '#F3E8FF'

// Table
headerBg: '#F9FAFB'
rowHover: '#F9FAFB'
borderColor: '#E5E7EB'
```

### Low Priority

#### 7. Coach Screen (`app/(tabs)/coach.tsx`)
**Issues:**
- Chat bubbles need styling
- Input area needs polish
- Send button styling

**Fixes Needed:**
```tsx
// User message
backgroundColor: '#000000'
color: 'white'
borderRadius: 12

// Assistant message
backgroundColor: '#F3F4F6'  // gray-100
color: '#111827'
borderRadius: 12
```

#### 8. Feedback Screen (`app/(tabs)/feedback.tsx`)
**Issues:**
- Rating stars need better styling
- Submit button needs polish
- History cards need refinement

**Fixes Needed:**
```tsx
// Rating stars
color: '#F59E0B'  // amber-500
emptyColor: '#E5E7EB'  // gray-200

// Submit button
backgroundColor: '#000000'
':hover': { backgroundColor: '#1F2937' }

// History cards
borderColor: '#E5E7EB'
shadowOpacity: 0.05
```

#### 9. Waitlist Screen (`app/waitlist.tsx`)
**Issues:**
- Progress bar needs refinement
- Typography needs polish

**Fixes Needed:**
```tsx
// Progress bar background
backgroundColor: '#E5E7EB'

// Progress fill
backgroundColor: '#10A37F'  // OpenAI green

// Text
title: '#111827'  // gray-900
subtitle: '#4B5563'  // gray-600
```

## General Fixes Needed Across All Components

### Colors
Replace all instances of:
- `$backgroundLight50` → `#F9FAFB` (gray-50)
- `$backgroundLight100` → `#F3F4F6` (gray-100)
- `$backgroundLight200` → `#E5E7EB` (gray-200)
- `$borderLight200` → `#E5E7EB` (gray-200)
- `$borderLight300` → `#D1D5DB` (gray-300)
- `$textLight500` → `#6B7280` (gray-500)
- `$textLight600` → `#4B5563` (gray-600)
- `$textLight700` → `#374151` (gray-700)
- `$textLight900` → `#111827` (gray-900)
- `$black` → `#000000`
- `$white` → `white` or `#FFFFFF`

### Transitions
Add to all interactive elements:
```tsx
sx={{
  transition: 'all 0.15s',
  ':hover': {
    // hover state
  }
}}
```

### Shadows
Standard shadow for cards:
```tsx
shadowColor: 'black',
shadowOpacity: 0.05,
shadowRadius: 2,
shadowOffset: { width: 0, height: 1 }
```

### Border Radius
- Small elements (buttons, inputs): `8` (lg)
- Cards: `12` (xl)
- Pills/badges: `9999` (full)

### Spacing
- Tight: `gap-2` = `8`
- Normal: `gap-3` = `12`
- Comfortable: `gap-4` = `16`
- Padding: `px-3` = `12`, `py-2.5` = `10`

## Testing Checklist

After each component update, verify:
- [ ] Colors match old tracker exactly
- [ ] Hover states work smoothly
- [ ] Transitions are 150ms
- [ ] Borders are #E5E7EB (gray-200)
- [ ] Shadows are subtle (0.05 opacity)
- [ ] Black buttons hover to #1F2937 (gray-800)
- [ ] Typography uses gray-900/600/500 hierarchy
- [ ] Spacing is consistent

## Priority Order

1. ✅ ChatInput (DONE)
2. MacroTable (HIGH - most used)
3. FoodLogView (HIGH - most used)
4. Totals (HIGH - always visible)
5. Track Screen layout (MEDIUM)
6. Settings Screen (MEDIUM)
7. Analytics Screen (MEDIUM)
8. Coach Screen (LOW)
9. Feedback Screen (LOW)
10. Waitlist Screen (LOW)

## Commands for Testing

```bash
# App should auto-reload
# Open http://localhost:8081
# Test each screen and verify styling matches old tracker
```

## Notes

- Use hex colors instead of Gluestack tokens for precision
- Always include `:hover` pseudo-class with transitions
- Test on web (localhost:8081) primarily since that's where we're running
- Keep accessibility in mind (focus states, contrast)
- Match the old tracker pixel-perfect where possible

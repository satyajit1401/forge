# UI Polish Guide - Premium Design System

## Color System (Match Old Tracker)

### Primary Colors
```
Black: #000000
White: #FFFFFF
```

### Gray Scale (Tailwind gray)
```
gray-50:  #F9FAFB
gray-100: #F3F4F6
gray-200: #E5E7EB
gray-300: #D1D5DB
gray-400: #9CA3AF
gray-500: #6B7280
gray-600: #4B5563
gray-700: #374151
gray-800: #1F2937
gray-900: #111827
```

### Accent Colors
```
red-50:    #FEF2F2
red-200:   #FECACA
red-800:   #991B1B
red-500:   #EF4444

green-100: #D1FAE5
green-600: #10A37F (OpenAI green)

blue-100:  #DBEAFE
blue-600:  #2563EB

amber-500: #F59E0B

purple-100: #F3E8FF
purple-600: #9333EA
```

## Typography

### Font Sizes
```
xs:   12px / 0.75rem
sm:   14px / 0.875rem
base: 16px / 1rem
lg:   18px / 1.125rem
xl:   20px / 1.25rem
2xl:  24px / 1.5rem
```

### Font Weights
```
normal:   400
medium:   500
semibold: 600
bold:     700
```

### Text Colors
```
Primary:   text-gray-900 (#111827)
Secondary: text-gray-600 (#4B5563)
Tertiary:  text-gray-500 (#6B7280)
Muted:     text-gray-400 (#9CA3AF)
```

## Spacing System

### Padding/Margin
```
0.5: 2px
1:   4px
1.5: 6px
2:   8px
2.5: 10px
3:   12px
4:   16px
6:   24px
8:   32px
12:  48px
```

### Gap
```
xs:  4px
sm:  8px
md:  12px
lg:  16px
xl:  24px
```

## Border & Radius

### Border Width
```
Default: 1px
```

### Border Colors
```
Light:  border-gray-200 (#E5E7EB)
Medium: border-gray-300 (#D1D5DB)
```

### Border Radius
```
sm:  4px
md:  6px
lg:  8px
xl:  12px
full: 9999px
```

## Shadows
```
sm: 0 1px 2px 0 rgb(0 0 0 / 0.05)
DEFAULT: 0 1px 3px 0 rgb(0 0 0 / 0.1), 0 1px 2px -1px rgb(0 0 0 / 0.1)
```

## Interactive States

### Buttons

**Primary Button (Black)**:
```
bg: #000
hover: #1F2937 (gray-800)
disabled: #D1D5DB (gray-300)
text: white
padding: py-2.5 px-4
border-radius: 8px
transition: all 150ms
```

**Secondary Button (Gray)**:
```
bg: #F3F4F6 (gray-100)
hover: #E5E7EB (gray-200)
text: #4B5563 (gray-600)
```

### Input Fields
```
bg: white
border: 1px solid #D1D5DB (gray-300)
border-radius: 8px
padding: py-2.5 px-3
focus: ring-1 ring-gray-400
placeholder: #9CA3AF (gray-400)
```

### Hover States
- Always use `transition-all` for smooth transitions
- Buttons: Darken by one shade
- Cards: `hover:border-gray-300`
- Icons: `hover:text-gray-900`

## Component Guidelines

### Cards
```
bg: white
border: 1px solid #E5E7EB
border-radius: 12px
padding: 16px
shadow: 0 1px 2px rgba(0,0,0,0.05)
```

### Modals/Sheets
```
backdrop: rgba(0,0,0,0.5)
bg: white
border-radius: 16px (top only for bottom sheets)
padding: 24px
```

### Empty States
```
icon-bg: gray-100
icon-color: gray-400
title: gray-900, font-medium
subtitle: gray-500
```

## Animation Timing
```
Fast: 150ms (buttons, hovers)
Normal: 300ms (modals, dropdowns)
Slow: 500ms (progress bars, charts)
```

## Best Practices

1. **Always use transition-all** on interactive elements
2. **Consistent hover states** - darken by one shade
3. **Black for primary actions**, gray for secondary
4. **Gray-900 for primary text**, gray-600 for secondary
5. **Border-gray-200** for most borders
6. **Rounded-lg (8px)** for most elements, rounded-xl (12px) for cards
7. **Shadow-sm** on elevated elements
8. **Gap-2 (8px)** for tight spacing, gap-3 (12px) for comfortable spacing

## Component Checklist

When creating/updating components:
- [ ] Uses correct color hex values
- [ ] Has transition-all on interactive elements
- [ ] Has hover states defined
- [ ] Uses consistent spacing (gap-2, px-3, py-2.5)
- [ ] Has proper border-radius (8px/12px)
- [ ] Has shadow-sm on cards
- [ ] Text uses gray-900/600/500 hierarchy
- [ ] Disabled states are handled
- [ ] Focus states are visible
- [ ] Animations are smooth (150ms-500ms)

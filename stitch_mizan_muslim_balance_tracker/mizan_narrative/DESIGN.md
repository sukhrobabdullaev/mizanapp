---
name: Mizan Narrative
colors:
  surface: '#f9f9f8'
  surface-dim: '#d9dad9'
  surface-bright: '#f9f9f8'
  surface-container-lowest: '#ffffff'
  surface-container-low: '#f3f4f3'
  surface-container: '#edeeed'
  surface-container-high: '#e7e8e7'
  surface-container-highest: '#e1e3e2'
  on-surface: '#191c1c'
  on-surface-variant: '#3d4a41'
  inverse-surface: '#2e3131'
  inverse-on-surface: '#f0f1f0'
  outline: '#6d7a71'
  outline-variant: '#bccabf'
  surface-tint: '#006c45'
  primary: '#006a43'
  on-primary: '#ffffff'
  primary-container: '#008656'
  on-primary-container: '#f6fff6'
  inverse-primary: '#60dd9f'
  secondary: '#006c49'
  on-secondary: '#ffffff'
  secondary-container: '#64f9ba'
  on-secondary-container: '#00714d'
  tertiary: '#4b6157'
  on-tertiary: '#ffffff'
  tertiary-container: '#64796f'
  on-tertiary-container: '#f5fff8'
  error: '#ba1a1a'
  on-error: '#ffffff'
  error-container: '#ffdad6'
  on-error-container: '#93000a'
  primary-fixed: '#7efaba'
  primary-fixed-dim: '#60dd9f'
  on-primary-fixed: '#002112'
  on-primary-fixed-variant: '#005233'
  secondary-fixed: '#68fcbc'
  secondary-fixed-dim: '#45dfa2'
  on-secondary-fixed: '#002113'
  on-secondary-fixed-variant: '#005236'
  tertiary-fixed: '#d0e8dc'
  tertiary-fixed-dim: '#b5ccc0'
  on-tertiary-fixed: '#0b1f18'
  on-tertiary-fixed-variant: '#374b42'
  background: '#f9f9f8'
  on-background: '#191c1c'
  surface-variant: '#e1e3e2'
typography:
  display-numeral:
    fontFamily: Plus Jakarta Sans
    fontSize: 48px
    fontWeight: '700'
    lineHeight: 56px
    letterSpacing: -0.02em
  headline-lg:
    fontFamily: Plus Jakarta Sans
    fontSize: 32px
    fontWeight: '800'
    lineHeight: 40px
    letterSpacing: -0.02em
  headline-lg-mobile:
    fontFamily: Plus Jakarta Sans
    fontSize: 28px
    fontWeight: '800'
    lineHeight: 34px
  headline-md:
    fontFamily: Plus Jakarta Sans
    fontSize: 22px
    fontWeight: '700'
    lineHeight: 28px
  body-lg:
    fontFamily: Plus Jakarta Sans
    fontSize: 17px
    fontWeight: '400'
    lineHeight: 24px
  body-sm:
    fontFamily: Plus Jakarta Sans
    fontSize: 14px
    fontWeight: '400'
    lineHeight: 20px
  label-caps:
    fontFamily: Plus Jakarta Sans
    fontSize: 12px
    fontWeight: '600'
    lineHeight: 16px
    letterSpacing: 0.05em
rounded:
  sm: 0.25rem
  DEFAULT: 0.5rem
  md: 0.75rem
  lg: 1rem
  xl: 1.5rem
  full: 9999px
spacing:
  container-margin: 20px
  gutter: 12px
  card-padding: 24px
  stack-gap-lg: 32px
  stack-gap-md: 16px
  stack-gap-sm: 8px
---

## Brand & Style

The design system is centered on the concept of "Mizan" (Balance), catering to modern Muslims seeking a harmonious lifestyle between spiritual duties and daily productivity. The aesthetic is **Spiritual Minimalism**—a blend of high-end SaaS clarity and traditional serenity. 

The interface prioritizes a sense of calm and clarity through generous whitespace, avoiding clutter to allow for focused reflection. The target emotional response is one of tranquility, discipline, and premium quality. The style utilizes light, ethereal layers with subtle gradients that symbolize growth and vitality.

## Colors

The palette is anchored by the **Emerald-to-Mint gradient**, representing the traditional green of heritage modernized into a vibrant, digital-first glow. 

- **Primary & Secondary:** Used for "active" states, successful completions, and spiritual progress.
- **Backgrounds:** The light mode uses a warm, off-white gray (#F7F8F7) to reduce eye strain and feel more organic than pure white. 
- **Dark Mode:** Transitions to a deep "Midnight Jungle" green-black (#0A1712), where the gradients take on a neon-like glow to maintain visibility and energy in low-light environments.
- **Tertiary:** A deep charcoal-green used for high-contrast text and icon details to ensure legibility.

## Typography

Since system fonts were requested, the design system utilizes **Plus Jakarta Sans** as the digital equivalent for its friendly, modern, and highly legible characteristics which mirror SF Pro's logic but with a more "spiritual-modern" geometric touch.

- **Numerals:** Large, extra-bold numerals are used for prayer times and habit counters to make them the focal point of the dashboard.
- **Titles:** Extra-bold weights (800) are reserved for page headers and card titles to create a strong visual hierarchy.
- **Uzbek Language:** Ensure full support for Latin characters, specifically observing the height of 'o‘' and 'g‘' to prevent line-height clipping.

## Layout & Spacing

This design system follows a **Fluid Margin Model** optimized for handheld devices.
- **Margins:** A standard 20px side margin ensures content does not feel "stuck" to the screen edges.
- **Vertical Rhythm:** Elements are grouped in 8px increments. Larger 32px gaps are used between distinct sections (e.g., between the Hero card and the Habit list).
- **Safe Areas:** All interactive elements must sit within the iOS safe area, with the bottom navigation bar utilizing a frosted glass background.

## Elevation & Depth

Hierarchy is established through **Ambient Shadows** and **Tonal Layering** rather than heavy borders.
- **Level 0:** Background (#F7F8F7).
- **Level 1 (Cards):** Pure white surface with a soft, expansive shadow. Shadow specs: `x: 0, y: 10, blur: 30, color: rgba(15, 163, 107, 0.08)`. Note the slight emerald tint in the shadow to unify the surface with the brand color.
- **Level 2 (Interactive):** Floating buttons or active states use a slightly more pronounced shadow with higher opacity to suggest "tap-ability."

## Shapes

The shape language is "Hyper-Rounded" to evoke friendliness and modern tech sensibilities.
- **Standard Cards:** `rounded-2xl` (1.5rem / 24px) is the default for habit rows and content containers.
- **Hero Cards:** May utilize larger corner radii or even "Squircle" masking for a more premium iOS-native feel.
- **Interactive Elements:** Buttons and checkboxes use the **Pill** shape (fully rounded) to contrast against the rectangular cards.

## Components

- **Habit Rows:** Horizontal containers with a fixed-height icon tile on the left. The icon tile should use a light version of the accent color (10% opacity) or the full gradient for "complete" states.
- **Circular Gradient Checkboxes:** Checkboxes are not square; they are circles. When "unfilled," they show a subtle 1px emerald border. When "checked," they fill with the `#0FA36B → #4EE6A8` gradient and a white checkmark.
- **Hero Cards:** Prominent dashboard elements featuring minimal, vector-style mountain or crescent silhouettes in the background. These silhouettes should be low-contrast (slightly darker or lighter than the gradient) to ensure text remains legible.
- **Progress Rings:** Use the primary gradient for the active progress line and a soft gray-green for the track.
- **Buttons:** Primary buttons should be the full gradient with white text. Secondary buttons are "Ghost" style with an emerald text color.
- **Iconography:** Use "Duotone" or "Thin-line" icons with rounded terminals to match the typography's softness.
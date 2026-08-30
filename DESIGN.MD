---
name: Cinematic Education
colors:
  surface: '#131313'
  surface-dim: '#131313'
  surface-bright: '#3a3939'
  surface-container-lowest: '#0e0e0e'
  surface-container-low: '#1c1b1b'
  surface-container: '#201f1f'
  surface-container-high: '#2a2a2a'
  surface-container-highest: '#353534'
  on-surface: '#e5e2e1'
  on-surface-variant: '#e9bcb6'
  inverse-surface: '#e5e2e1'
  inverse-on-surface: '#313030'
  outline: '#af8782'
  outline-variant: '#5e3f3b'
  surface-tint: '#ffb4aa'
  primary: '#ffb4aa'
  on-primary: '#690003'
  primary-container: '#e50914'
  on-primary-container: '#fff7f6'
  inverse-primary: '#c0000c'
  secondary: '#c8c6c5'
  on-secondary: '#313030'
  secondary-container: '#474746'
  on-secondary-container: '#b7b5b4'
  tertiary: '#ffb4aa'
  on-tertiary: '#690004'
  tertiary-container: '#d92e28'
  on-tertiary-container: '#fff7f6'
  error: '#ffb4ab'
  on-error: '#690005'
  error-container: '#93000a'
  on-error-container: '#ffdad6'
  primary-fixed: '#ffdad5'
  primary-fixed-dim: '#ffb4aa'
  on-primary-fixed: '#410001'
  on-primary-fixed-variant: '#930007'
  secondary-fixed: '#e5e2e1'
  secondary-fixed-dim: '#c8c6c5'
  on-secondary-fixed: '#1b1b1b'
  on-secondary-fixed-variant: '#474746'
  tertiary-fixed: '#ffdad5'
  tertiary-fixed-dim: '#ffb4aa'
  on-tertiary-fixed: '#410001'
  on-tertiary-fixed-variant: '#930009'
  background: '#131313'
  on-background: '#e5e2e1'
  surface-variant: '#353534'
typography:
  headline-h1:
    fontFamily: Inter
    fontSize: 32px
    fontWeight: '700'
    lineHeight: '1.2'
    letterSpacing: -0.02em
  headline-h1-mobile:
    fontFamily: Inter
    fontSize: 24px
    fontWeight: '700'
    lineHeight: '1.2'
  headline-h2:
    fontFamily: Inter
    fontSize: 24px
    fontWeight: '600'
    lineHeight: '1.3'
  headline-h2-mobile:
    fontFamily: Inter
    fontSize: 20px
    fontWeight: '600'
    lineHeight: '1.3'
  body-md:
    fontFamily: Inter
    fontSize: 16px
    fontWeight: '400'
    lineHeight: '1.6'
  label-sm:
    fontFamily: Inter
    fontSize: 13px
    fontWeight: '500'
    lineHeight: '1.0'
    letterSpacing: 0.01em
rounded:
  sm: 0.25rem
  DEFAULT: 0.5rem
  md: 0.75rem
  lg: 1rem
  xl: 1.5rem
  full: 9999px
spacing:
  unit: 8px
  container-padding: 4rem
  container-padding-mobile: 1rem
  gutter: 1.5rem
  stack-gap: 2rem
---

## Brand & Style

This design system is built for a premium, immersive learning experience that mirrors high-end streaming platforms. The brand personality is authoritative yet effortless, focusing on content consumption without the friction of traditional LMS interfaces. 

The design style is **Minimalist with an emphasis on Cinematic Depth**. By utilizing a deep, near-black foundation, the interface recedes to allow course thumbnails and video content to take center stage. The emotional response should be one of "entertainment-first" learning—reducing the cognitive load typically associated with education by adopting the familiar, low-stress patterns of media entertainment.

## Colors

The palette is anchored in a high-contrast dark mode. 

- **Primary & Action**: #E50914 (Red) is reserved exclusively for primary actions, progress indicators, and active states. 
- **Surface**: #1C1C1C is used for cards, navigation bars, and modals to create a subtle lift from the background.
- **Background**: #0F0F0F provides a "void" effect, ensuring zero distraction during video playback.
- **Typography**: Pure white (#FFFFFF) is used for titles to ensure maximum legibility, while a muted grey (#A0A0A0) is applied to metadata and secondary labels to maintain visual hierarchy.

## Typography

The design system utilizes **Inter** for its systematic, utilitarian precision. The typographic scale is deliberate and tight, prioritizing readability in low-light environments. 

- **Headlines**: Use heavy weights (Bold/Semibold) with slight negative letter-spacing for a modern, "poster" feel.
- **Body**: Standardized at 16px to ensure comfortable reading of course descriptions and lesson notes.
- **Labels**: Used for timestamps, category tags, and secondary metadata, set in Medium weight to retain clarity at smaller scales.

## Layout & Spacing

This design system employs a **Fluid Grid** with generous horizontal breathing room to simulate a cinematic widescreen experience.

- **Desktop Layout**: 12-column grid with 64px (4rem) outer margins. Content rows (Course Carousels) should have a 24px gutter between items.
- **Mobile Layout**: 4-column grid with 16px (1rem) outer margins. Vertical stacking is preferred, though horizontal swiping is permitted for "Continue Watching" rows.
- **Rhythm**: All spacing is based on an 8px base unit. Component internal padding should follow this scale (8, 16, 24, 32).

## Elevation & Depth

Hierarchy is established through **Tonal Layering** rather than aggressive shadows. 

1. **Floor (Level 0)**: #0F0F0F (Main background).
2. **Elevated (Level 1)**: #1C1C1C (Cards, Input fields, Top Navigation).
3. **Overlays (Level 2)**: #2A2A2A with a very soft, 15% opacity black shadow (0px 8px 24px). Use this for dropdowns and tooltips.

**Interactive States**: On hover, cards should scale slightly (1.05x) rather than changing shadow depth, mimicking the "focus" state of smart TV interfaces.

## Shapes

The design system adopts a **Rounded** aesthetic (8px / 0.5rem) to soften the "dark mode" edges and feel more approachable. 

- **Cards/Thumbnails**: 8px corner radius.
- **Buttons**: 8px corner radius (avoid pill-shapes to maintain the minimalist geometric look).
- **Inputs**: 8px corner radius for a consistent container language.
- **Media**: Video players and hero banners must also adhere to the 8px radius to maintain the cohesive visual language.

## Components

### Buttons
- **Primary**: Solid #E50914 background, white text. No border. On hover, transition to #B0060F.
- **Secondary**: Ghost style with #FFFFFF border (1px) or subtle #1C1C1C fill.

### Cards
- Aspect ratio for course thumbnails: 16:9.
- Content: No borders. Title sits below the image or overlays on hover with a bottom-to-top gradient.

### Input Fields
- Background: #1C1C1C. 
- Border: 1px solid #333333. 
- Focus State: 1px solid #E50914.

### Progress Bars
- Height: 4px.
- Track: #333333.
- Indicator: #E50914.

### Video Player
- Custom controls styled with Primary Red for the seek bar and White for icons. Use high-contrast iconography.

### Course Sidebar
- Use a "list item" pattern with 16px vertical padding. Active lessons are highlighted with a vertical red bar (4px width) on the left edge.
# Visual Reference Comparison Notes

This document records comparison notes between the implemented user interfaces and the approved reference designs.

## Participant Experience (Mobile-First)

- **Color Scheme:** Limited to 3-tone families (Blue-Cyan, Pink, and Yellow). Neutral tones (White/Gray) are used for backgrounds, card borders, and shadows to maintain contrast and visual appeal.
- **Header:** Features the IPST logo, full training name in gray text, a styled bold blue header, and a time duration badge in a blue capsule.
- **Card 1 (Answers):** Question circle badge with blue gradient. Form labels and inputs styled with rounded borders (`--radius-md`).
- **Card 2 (Emojis):** Responsive grid (4 columns on desktop/medium devices, 2 columns on mobile/small devices). Emojis styled with light-blue backgrounds, border highlight, and checkmark overlay when selected.
- **Submit Button:** A full-width styled capsule button with linear gradient and subtle drop shadow.

## Presenter Experience (16:9 Dashboard)

- **Layout:** Uses a 60/40 grid layout on wide screens (>= 1024px) for side-by-side card views, stacking vertically on narrower widths. Fully responsive down to 320px without horizontal scrollbars.
- **Connection Indicator:** Rounded capsule showing connection states (`connected`, `reconnecting`, `disconnected`) with dynamic status dots.
- **Word Cloud:** Stable horizontal tags in 3-tone colors. Font sizes scale using a clamped square-root mapping (20px to 96px).
- **Emoji Results:** Ordered list of all 8 emojis with custom ranked badges (Winner gets a blue-600 background). Relative percentage bars are colored in blue.

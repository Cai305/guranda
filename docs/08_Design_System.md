# Mobile App Design System: MXit 2.0

## 1. Design Philosophy
- **Vibrant & Premium**: Modern aesthetics with glassmorphism elements, dark modes, and curated African-inspired color palettes.
- **Accessible**: High contrast ratios, dynamic typography scaling.
- **Mobile-First**: Touch targets of at least 44x44pt, thumb-friendly navigation.

## 2. Color Palette
- **Primary**: Electric Purple (`#7B2CBF`) - Nod to the original MXit, modernized.
- **Secondary**: Neon Cyan (`#00F5D4`) - Used for active states and Masheleni 2.0 wallet actions.
- **Background (Dark Mode)**: Deep Slate (`#121212`) and Surface (`#1E1E1E`).
- **Background (Light Mode)**: Off-White (`#F8F9FA`) and Surface (`#FFFFFF`).
- **Semantic**: Success Green (`#2D6A4F`), Error Red (`#E63946`), Warning Yellow (`#F4A261`).

## 3. Typography
- **Primary Font**: *Inter* or *Outfit* (Clean, highly legible sans-serif for UI elements).
- **Headings**: H1 (32sp, Bold), H2 (24sp, SemiBold), H3 (20sp, Medium).
- **Body**: Body 1 (16sp, Regular), Body 2 (14sp, Regular - standard chat text).
- **Caption**: 12sp, Medium.

## 4. Component Library Specification

### Buttons
- **Primary**: Solid Electric Purple background, White text, 12px border radius, subtle drop shadow.
- **Secondary**: Outlined Electric Purple, transparent background.
- **Tertiary/Ghost**: Text only, for less important actions.

### Inputs & Forms
- **Chat Input**: Pill-shaped (`border-radius: 999px`), light grey background in light mode, dark grey in dark mode.
- **Text Fields**: Underline or soft bordered, active state turns border Neon Cyan.

### Cards & Surfaces
- **Mini-App Cards**: Aspect ratio 1:1 or 16:9, rounded corners (16px), image background with dark gradient overlay for text legibility.
- **Message Bubbles**: 
  - Sent by user: Primary color, rounded except bottom-right corner.
  - Received: Surface color, rounded except bottom-left corner.

## 5. Motion & Micro-Animations
- **Page Transitions**: Smooth horizontal slides.
- **Interactions**: Subtle scale-down effect (0.95x) on button press.
- **Wallet**: Confetti or checkmark animation upon successful Masheleni transfer.

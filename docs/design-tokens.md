# Design Tokens

Where the app's visual constants live and what they are. Two authorities: Tailwind theme (`app/globals.css`) for everything, and the MUI theme (`components/ui/archiveMuiTheme.ts`) for pickers and fields only.

## Fonts

| Token | Value | Used for |
|---|---|---|
| `font-sans` | Plus Jakarta Sans (`--font-plus-jakarta-sans`) | Body text, the default everywhere |
| `font-heading` | Sora (`--font-sora`) | Headings (`h1`–`h6` are Sora bold by default), avatars, numbers |

Loaded via `next/font/google` in `app/layout.tsx`. Base body size is 16px.

## Brand

| Token | Value | Used for |
|---|---|---|
| Primary indigo | `#707dff` | Buttons, active states, links, focus rings, selected days |
| Indigo hover | `#5565ff` / `#5a67ff` | Button and selected-day hover |
| Indigo wash | `rgba(112,125,255,…)` at 5–19% opacity | Active nav pills, hover fills, focus shadows |

Primary buttons use a `135deg` gradient (`#707dff → #5565ff`) with a soft indigo shadow.

## Ink scale (text)

| Token | Value | Used for |
|---|---|---|
| Ink | `#10133a` | Page titles, strongest headings |
| Body ink | `#1e2145` | Names, primary content text |
| Muted | `#5a6382` | Secondary text, labels |
| Faint | `#8a93b4` | Placeholders, captions, tertiary text |
| Ghost | `#9ea8c6` | Column headers, disabled text |

## Surfaces and borders

| Token | Value | Used for |
|---|---|---|
| Card | `#ffffff` on `#f8f9fe` / `#f4f6ff` grounds | Cards on tinted page grounds |
| Bar strip | `#eef2ff` with `#dfe3fb` bottom border | Action/filter bars, table header strips |
| Header row | `#fafbff` | Table header background |
| Border | `#eceef8` | Card and row borders |
| Input border | `#e8ebf8` | Fields, selects, dropdowns |
| Focus ring | `rgba(112,125,255,0.18)` + `#707dff` border | Focused inputs |

## Shape

| Token | Value | Used for |
|---|---|---|
| Radius sm | `8–9px` | Inputs, pagination buttons, pills |
| Radius md | `10–12px` | Buttons, dropdowns,’avatars tiles |
| Radius lg | `14px` | Cards, modals, drawers |
| Radius pill | `9999px` | Badges, active dots, selected calendar days |

MUI mirrors this: shape `10px`, picker inputs `8px`, dialogs `14px` with a `#eceef8` border.

## Status colors

| Meaning | Text | Wash |
|---|---|---|
| Success | `#16a34a` / `#15803d` | `rgba(22,163,74,…)` |
| Warning | `#f59e0b` / `#e08800` | amber washes |
| Danger | `#e11d48` / `#e85555` / `#ef4444` | red washes |
| Info | `#1a6fa8` on `#e8f4fd` | blue wash |

Role badges follow the same logic (superadmin solid indigo, faculty blue, student green, guest grey).

## Shadows

- Card: `0 2px 12px rgba(30,58,138,0.06), 0 1px 3px rgba(0,0,0,0.04)`
- Primary button: `0 4px 12px rgba(112,125,255,0.32)`
- Drawer/modal: `0 20px 60px rgba(16,20,58,0.18), 0 4px 16px rgba(0,0,0,0.06)`

## Motion and feedback

- Transitions `150–500ms`; hover darkens or lifts, active presses scale to `0.98`.
- Loading uses `animate-pulse` grey blocks (never colored spinners except the 20px table spinner).
- Toasts (Sonner): `14px 16px` padding, `12px` gap, `18px` icons.

## Rules for new UI

1. Tailwind first; MUI theme only inside pickers/fields.
2. Text uses the ink scale — never pure black except the legacy `--accent`.
3. Borders come from the surface list; one-off hex borders are a smell.
4. New status colors must reuse the status table, not invent hues.
5. Skeletons are grey blocks shaped like the content they replace.

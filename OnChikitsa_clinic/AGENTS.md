# Contributor / agent build guide — OnChikitsa Clinic

Read this before building any screen. Full screen specs live in [`ClinicAPPUI.md`](ClinicAPPUI.md).
House style: read `app/dashboard/page.js` (tab root), `app/verify/page.js` + `app/login/page.js`
(forms), and `app/globals.css` (the whole design system) before writing.

## Hard rules
1. **Only create/edit files inside your assigned route folder(s).** Never touch
   `app/globals.css`, `app/layout.js`, `app/_components/*`, or `app/_lib/*`. Need a glyph that
   isn't in `icons.js`? Inline a tiny local `<svg>` — don't edit the shared file.
2. **Static export, no dynamic routes.** Detail screens read `?id=` **client-side** to avoid a
   Suspense boundary requirement:
   ```js
   const [id, setId] = useState(null);
   useEffect(() => { setId(new URLSearchParams(window.location.search).get('id')); }, []);
   ```
   Resolve with the `find*` helpers in `data.js` (they fall back to a default so the page always
   renders). **Do NOT use `useSearchParams`** — under `output:'export'` it forces `<Suspense>`.
3. Every interactive page begins with `'use client'`.
4. **Do NOT run `npm run build` / `npm run dev`** — the orchestrator builds once at the end.
5. A11y: icon-only buttons need `aria-label`; every list needs an `EmptyState` fallback; tap
   targets ≥ 44px; no emoji as icons.
6. Use the mock data in `app/_lib/data.js`. Money via `rupee(n)`. Tokens look like `A-12`.
7. Light + dark both work automatically if you use the CSS variables/classes — never hard-code
   hex outside the gradients already defined.

## Shared components (`app/_components/`, import with the right `../` depth)
- `Screen` — full-height flex shell.
  - Tab root: `<Screen><div className="content with-tabbar">…</div><BottomNav active="…"/></Screen>`
  - Other: `<Screen><TopBar title="…"/><div className="content">…</div></Screen>`
- `TopBar {title, subtitle, right, onBack, back=true, solid}` — header, back button wired to
  `router.back()` and the Android hardware back button.
- `BottomNav {active}` — `active ∈ 'home'|'appointments'|'queue'|'patients'|'more'`. Tab roots only.
- `SubTabs {tabs, active, onChange, variant='seg'|'under'}` — `tabs` = strings or `{key,label}`.
- `Sheet {open, onClose, title, children}` — bottom sheet (filters / confirm / pickers).
- `Avatar {name, src, size=40|46|56|72, square, status='on'|'off'}`.
- `StatusPill {status, label}` — status key → badge (confirmed/pending/arrived/consulting/
  completed/cancelled/paid/pay_at_clinic/refunded/success).
- `EmptyState {icon, title, hint, action}`.
- `Field {label, htmlFor, required, optional, hint, error, lead, trail, bare}` — labeled field;
  wraps children in `.input-wrap` unless `bare`. Put `<input className="input"/>` inside.
- `Toggle {on, onChange, label}` · `Stepper {value, onChange, min, max, step, suffix}` ·
  `Segmented {options, value, onChange}`.

## CSS class map (all in `globals.css` — compose, don't reinvent)
- layout: `.content(.with-tabbar)` `.page-title` `.section/.section-head/.link` `.pad .stack .grow`
- buttons: `.btn` + `.btn-primary/.btn-accent/.btn-outline/.btn-ghost/.btn-soft/.btn-block`,
  `.fab-add` (fixed add FAB), `.icon-btn` `.icon-back`
- lists/cards: `.card`, `.list/.list-row` (`.lr-main/.lr-title/.lr-sub/.lr-end/.lr-price`),
  `.thumb-ic(.accent)`, `.qa-grid/.qa` (`.qa-ic/.qa-t/.qa-s`),
  `.stat-grid(.g3)/.stat(.accent/.warn/.danger)` (`.st-ic/.st-v/.st-l`),
  `.stat-hero` (`.lbl/.val`)
- appt: `.appt-card` (`.ac-top/.ac-name/.ac-sub/.ac-meta`), `.token-chip` (`.k/.v`)
- chips/badges: `.chip(.chip-accent/.chip-plain)`, `.badge(.badge-success/-warning/-info/-danger/-muted)`, `.badge-dot`
- queue: `.q-now` (`.q-cap/.q-tok/.q-name/.q-timer`), `.q-actions`, `.q-wait` (`.q-pos/.q-wtok`)
- money: `.money`, `.pay-split` (`.ps .k/.v`), `.breakdown` (`.br .lbl/.val`, `.br.total`)
- charts: `.chart` (`.bar-col/.bar(.mut)/.bar-lbl`), `.progress(.accent/.star)>span`
- reviews: `.rating-big` (`.score/.stars`), `.rdist` (`.rd`)
- wizard: `.wiz` (`.wseg.done/.now`), `.wiz-step`
- uploads: `.up-tile` (`.ut-hint`), `.up-row` (`.ur-ic`), `.photo-grid` (`.ph-cell .rm`)
- controls: `.toggle .stepper .seg-ctrl .subnav/.seg .undernav/.utab`
- settings: `.set-group` (`.sg-h`) / `.set-row` (`.sr-ic/.sr-t/.sr-v`, `.danger`), `.empty(.em-ic)`
- chat: `.chat/.bubble(.them/.me, .t)`
- calendar: `.cal/.cal-head/.cal-grid/.cal-dow/.cal-day(.muted/.sel/.dot)`, `.slots/.slot-btn(.sel)`
- forms: `.field/.field-label/.field-req/.field-opt`, `.input-wrap(.error)/.input/.input-suffix`,
  `.field-msg(.hint/.bad)`, `.field-row`, `.otp-*`, `.phone-control`

One-offs: inline `style={{}}` composing CSS vars (`var(--primary)`, `var(--muted-fg)`,
`var(--card)`, `var(--border)`, `var(--accent-tint)`, `var(--radius)`, …) — matches the codebase.

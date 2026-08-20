# Digital ID X UX/UI Standard

## Product direction

Digital ID X is a high-trust identity operations workspace for HR, security, and operations teams. The interface should feel calm, precise, fast, and unmistakably operational: warm paper-like surfaces, near-black navigation, and a sharp lime verification signal.

The interface is not a collection of dashboards. It is one workspace with predictable page anatomy, controls, feedback, and navigation.

## Experience principles

1. **Orient before asking.** Every page begins with an eyebrow, a clear title, one sentence of context, and at most one primary action.
2. **Show the next best action.** Empty states, errors, and completed states always explain what to do next.
3. **Keep work in context.** Filters, bulk actions, selection, and save states remain close to the records they affect.
4. **Progressive disclosure.** Common tasks stay visible; advanced and destructive actions move into secondary menus or dedicated sections.
5. **Trust through feedback.** Every network action has a pending state, success confirmation, useful error, and safe retry path.
6. **Dense, never cramped.** Operational screens prioritize scanability and comparison while retaining 44px minimum interactive targets.
7. **Tenant branding is an accent.** Workspace colors identify the tenant, but never replace semantic success, warning, danger, or product navigation colors.

## Visual language

- **Canvas:** warm off-white `#f3f1eb`
- **Surface:** white `#ffffff`
- **Ink:** near-black `#171915`
- **Muted ink:** `#6f7269`
- **Line:** `#dedbd2`
- **Signal:** lime `#c8ff4d`
- **Success:** green `#177245`
- **Warning:** amber `#9a5b08`
- **Danger:** red `#b42318`
- **Radius:** 12px controls, 18px cards, 24px feature surfaces
- **Depth:** borders first, restrained shadows second; never stack multiple heavy shadows
- **Motion:** 140–220ms, small translations only, and disabled under reduced-motion preferences

## Standard page anatomy

1. Page header: eyebrow, title, description, optional status, primary action
2. Optional summary strip: 2–4 decision-useful metrics only
3. Control bar: search, filters, view options, bulk actions
4. Primary work surface: table, form, workflow, or detail view
5. Secondary context: activity, help, audit information, or related records

Pages use a maximum readable width of 1600px. Forms use 720px for focused tasks and 1120px when a live preview or secondary context is required.

## Component rules

- **Buttons:** one primary action per region; secondary actions use borders; destructive actions are red and require confirmation.
- **Cards:** cards group one concept. Do not place a card around every label or number.
- **Forms:** labels above controls, help below, inline validation after blur or Continue, sticky save bar for long forms.
- **Tables:** sticky header, clear row hover, useful empty state, filters reflected in the URL, bulk actions only after selection.
- **Status:** icon/shape plus text; never communicate status by color alone.
- **Navigation:** nouns for destinations, verbs for actions, and no duplicate destination in the same navigation level.
- **Feedback:** skeleton for first load, local spinner for mutations, toast for completion, inline error for recovery.

## Accessibility and responsive baseline

- WCAG AA contrast for text and controls
- Visible keyboard focus using the signal color and ink outline
- 44px minimum hit area for primary interactive controls
- Semantic headings, labels, tables, and landmarks
- Mobile layouts preserve task order; tables become scrollable or focused record lists
- Motion respects `prefers-reduced-motion`

## Migration plan

### Phase 0 — Foundation

- Product tokens and global interaction states
- Shared page, surface, action, status, loading, empty, and metric primitives
- Application shell and dashboard reference implementation

### Phase 1 — Staff lifecycle

- Staff list, search, filters, and bulk selection
- Create/edit workflow
- Staff profile, documents, checklist, digital ID, and password flows

### Phase 2 — Access and security

- Users, invitations, roles, permissions, audit logs, and security center

### Phase 3 — Operations

- Alerts, expiry alerts, renewals, notifications, bulk actions, imports, and reports

### Phase 4 — Workspace administration

- Setup wizard, settings, billing, branding, domains, automations, scheduled jobs, and launch readiness

### Phase 5 — External experiences

- Marketing, authentication, invitation, portal, verification, digital ID, legal, and error states

## Definition of done for each page

- Uses standard page anatomy and shared primitives
- Has loading, empty, error, success, and permission-denied states where applicable
- Works at 360px, 768px, 1280px, and wide desktop sizes
- Is keyboard usable and passes contrast checks
- Has no dead-end state or ambiguous primary action
- Preserves authorization, data scoping, and existing behavior
- Passes lint, tests, production build, and a browser visual check

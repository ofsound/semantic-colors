# Semantic Color Token Usage Guide

This document is the source of truth for choosing color tokens in projects that use the semantic color boilerplate. If an element falls within the scope of this system, assign color through these token definitions only. Do not pick ad hoc colors because something "looks close enough."

The goal is semantic consistency:

- A token is chosen because of the job an element is doing, not because of the hue or lightness you happen to want.
- If two elements play the same role, they should usually use the same token even if they appear in different screens.
- If no existing token fits, that is a system gap. Do not silently repurpose a nearby token to fake support for a new role.

## Scope

This system is for application UI color decisions, including:

- App and page backgrounds
- Panels, cards, drawers, popovers, and overlays
- Text hierarchy
- Borders, separators, and focus states
- Links and accent treatments
- Status messaging
- Inputs and button-like controls

This system is not a complete answer for every possible colored thing. It is usually out of scope for:

- Brand illustration
- Data visualization palettes
- Photos, gradients, hero art, or marketing-only composition
- One-off campaign themes
- Complex product-specific states that need new semantics

If a UI element is in scope, use this document. If it is out of scope, create or adopt a separate token contract instead of stretching this one until it becomes inconsistent.

## Non-Negotiable Rules

- Use semantic tokens, not raw color values, for in-scope UI.
- Prefer canonical bridge variables like `--color-surface` and `--color-text`. Local aliases are fine only when they map back to these tokens.
- Choose from the narrowest correct semantic role. Do not use a more dramatic token just to make something feel louder.
- Keep neutral structure neutral. Do not use accent or status tokens for ordinary layout separation.
- Keep status colors reserved for semantic meaning. A warning color should mean warning, not "looks warm."
- Keep control tokens reserved for interactive controls. Do not use button fills as generic panel backgrounds.
- If an element needs more emphasis, first ask whether its semantic role changed. Do not jump tokens purely to add visual variety.

## How To Choose A Token

Use this order of operations when scaffolding a new screen:

1. Decide the element role: surface, text, border, accent, status, or control.
2. Decide emphasis inside that role: default, secondary, muted, subtle, raised, strong, inverse, and so on.
3. Choose the token that matches the role and emphasis.
4. Verify the element is not borrowing a token from another role only for aesthetics.

## Surface Decision Rules

These choices drive most mistakes, so they need to be explicit.

### `app` vs `shell` vs `surface`

- Use `app` for the outermost canvas of the product.
- Use `shell` for persistent structural framing inside the app canvas.
- Use `surface` for the default content container where most work happens.

Typical mapping:

- `app`: page background behind everything
- `shell`: sidebars, app chrome, persistent rails, workspace framing
- `surface`: cards, content panes, settings sections, default panels

### `surface` vs `surface-raised`

Use `surface` when the panel is part of the normal reading plane.

Use `surface-raised` when the panel should feel more separated than the default surface, such as:

- A card sitting inside another surface
- An elevated panel inside a dashboard region
- A control cluster that needs stronger containment
- A selectable tile that should feel like its own object

Choose `surface-raised` because you want spatial separation or stronger containment. Do not choose it just because the default surface feels boring.

### `surface-raised` vs `surface-subtle`

Use `surface-raised` when you want the user to perceive a separate object.

Use `surface-subtle` when you want just enough fill change to group content without creating an elevated object.

Choose `surface-subtle` for:

- Hoverable rows
- Quiet grouping bands
- Lightweight callouts that should not compete with primary panels
- Ghost control hover backgrounds

Choose `surface-raised` for:

- Cards inside cards
- Detached modules
- Interactive objects that should feel more button-like or card-like

The short version:

- `surface-raised` says "this is its own thing."
- `surface-subtle` says "this belongs here, but needs a small amount of separation."

### `surface-muted` vs `surface-subtle`

Use `surface-muted` when you need a clearly differentiated supporting surface that still reads as background, not emphasis.

Use `surface-subtle` when the distinction should be softer and closer to a hover or quiet grouping treatment.

Choose `surface-muted` for:

- Secondary panels
- Tinted support regions
- Summary blocks that are present but not dominant
- Areas that need more separation than subtle fill alone

Choose `surface-subtle` for:

- Inline grouping
- Hover states
- Minor emphasis shifts within a larger panel

### `field` vs `surface-subtle` vs `surface-raised`

Use `field` specifically for inset, input-like, or recessed surfaces.

Choose `field` when the element should feel editable, enterable, or inset into the UI. This includes:

- Input wells
- Composer areas
- Filter fields
- Search bars
- Recessed data-entry regions

Do not use `field` for ordinary cards or layout panels.

### `surface-overlay`

Use `surface-overlay` only for detached layers that sit above the rest of the interface, such as:

- Modals
- Popovers
- Menus
- Detached inspectors
- Floating command surfaces

Do not use `surface-overlay` for standard cards, drawers that visually behave like regular layout, or ordinary side panels.

## Action Hierarchy Decision Rules

### `control-primary` vs `control-secondary`

Use `control-primary` when the action is the main forward action in the current context.

That usually means:

- There is one most important next step
- The interface should guide the user toward that step
- Not taking the action leaves the task incomplete

Examples:

- Save changes
- Continue
- Publish
- Confirm purchase
- Create project

Use `control-secondary` when the action matters, but is not the main action competing for attention.

That usually means:

- The action is valid but not dominant
- The user may need it alongside a primary action
- It should remain clearly interactive without stealing hierarchy

Examples:

- Cancel
- Back
- View details
- Duplicate
- Open settings

The short version:

- `control-primary` is the action you want the eye to find first.
- `control-secondary` is the action you want available without creating competing emphasis.

### `control-secondary` vs ghost behavior

Use `control-secondary` for an explicit, always-visible button container.

Use `control-ghost-hover` only as the hover or active background for a ghost-style action whose resting state is mostly transparent.

Do not use `control-ghost-hover` as a persistent button fill.

## Text Hierarchy Decision Rules

- Use `text` for default readable copy and important labels.
- Use `text-secondary` for supporting information that should still be comfortably readable.
- Use `text-muted` for annotations, helper copy, metadata, and lower-priority details.
- Use `text-faint` for the lowest emphasis text that should still be discoverable.
- Use `text-inverse` only when text sits on a dark, accent, or otherwise high-emphasis fill that needs the opposite contrast direction.

If body copy starts drifting into `text-muted` because the default text feels too strong, the problem is usually layout hierarchy, not the text token.

## Accent Decision Rules

- Use `accent` for the standard brand-aligned interactive emphasis.
- Use `accent-strong` for higher-impact accent moments that need stronger weight than `accent`.
- Use `accent-surface` for tinted accent backgrounds, not foreground text.
- Use `link` for ordinary textual links.
- Use `link-hover` only for hovered or otherwise intensified link states.

Do not use accent tokens as generic substitutes for controls when control tokens already exist.

## Status Decision Rules

Status tokens are semantic, not decorative.

- `success` and `success-surface` mean a positive or completed state.
- `warning` and `warning-surface` mean caution or elevated attention.
- `danger` and `danger-surface` mean destructive, critical, or error state.
- `info` and `info-surface` mean informative, neutral guidance.

Use the foreground token for text, icon, or emphasis inside the status message. Use the matching `*-surface` token for the background of that status container.

Do not mix status families unless the UI is explicitly communicating multiple states at once.

## Border Decision Rules

- Use `border` for the standard default border.
- Use `border-subtle` when separation should be present but visually quiet.
- Use `border-strong` when the boundary needs clearer definition.
- Use `focus-ring` only for focus outlines or other keyboard-focus indicators.

Do not use `focus-ring` as a regular border color.

## Canonical Token Definitions

Each entry below is normative. If an agent is choosing a token during scaffolding, these are the meanings to follow.

## Surfaces

### `app`

Use for the outermost application background.

Choose this for:

- The full viewport canvas
- Background behind the shell and content regions
- The base layer everything else sits on

Do not use for:

- Individual panels
- Cards
- Inputs

### `shell`

Use for persistent structural framing inside the app.

Choose this for:

- Sidebars
- Header bars
- Workspace rails
- Persistent navigation containers
- Framing regions around content panes

Do not use for:

- The main content card itself
- Detached overlays

### `surface`

Use for the default content plane.

Choose this for:

- Main panels
- Cards that are not visually elevated relative to their parent
- Settings sections
- Content areas where reading and task work happen

Do not use for:

- Overlays
- Recessed inputs
- Surfaces that need stronger separation than the default plane

### `surface-raised`

Use for elevated or more contained content objects.

Choose this for:

- Nested cards
- Elevated modules
- Interactive tiles
- Panels that need to read as separated from the parent surface

Why choose it:

- It creates stronger objecthood than `surface`
- It helps nested content avoid flattening into the parent panel

Do not use for:

- Ordinary page backgrounds
- Hover-only treatments
- Input wells

### `surface-muted`

Use for supporting surfaces with clearer differentiation than subtle fill.

Choose this for:

- Secondary content regions
- Tinted support panels
- Side information blocks
- Quiet but clearly separated background zones

Why choose it:

- It gives support content its own region without making it feel elevated like `surface-raised`

Do not use for:

- The main call to action
- Status containers
- Tiny hover states

### `surface-subtle`

Use for the lightest structural separation.

Choose this for:

- Quiet grouping inside a larger surface
- Row hovers
- Minor emphasis areas
- Soft highlight backgrounds

Why choose it:

- It preserves the current reading plane while still signaling grouping or interaction

Do not use for:

- Detached cards
- High-emphasis callouts
- Primary panel backgrounds when stronger containment is needed

### `surface-overlay`

Use for detached layers floating above the regular UI.

Choose this for:

- Modals
- Popovers
- Menus
- Floating inspectors
- Detached chrome

Why choose it:

- It communicates an above-the-interface layer instead of a normal layout panel

Do not use for:

- Standard cards
- Inline dropdown sections that remain part of layout flow

### `field`

Use for inset or entry-oriented surfaces.

Choose this for:

- Input wells
- Search surfaces
- Text entry areas
- Inset filter bars
- Recessed editable regions

Why choose it:

- It tells the user this area is for entry or feels recessed rather than card-like

Do not use for:

- Generic layout containers
- Elevated cards

## Text

### `text`

Use for primary readable text.

Choose this for:

- Body copy
- Standard labels
- Titles on ordinary surfaces
- Default icon color when no other semantic role applies

Do not use for:

- Low-priority metadata that needs weaker emphasis
- Text on strong accent fills that need inverse contrast

### `text-secondary`

Use for supporting but still important text.

Choose this for:

- Section descriptions
- Secondary labels
- Supporting content under headings
- Content that should be readable without dominating the page

Why choose it:

- It lowers hierarchy without making the text feel disabled or ignorable

Do not use for:

- Primary body copy
- Extremely low-priority hints

### `text-muted`

Use for lower-priority explanatory or metadata text.

Choose this for:

- Helper text
- Metadata
- Captions
- Annotations
- Supporting timestamps and counts

Do not use for:

- Core instructions
- Text the user must act on immediately

### `text-faint`

Use for the weakest intentional text emphasis.

Choose this for:

- Placeholder-adjacent hints
- Very low-priority metadata
- Peripheral labels that should stay out of the way

Why choose it:

- It creates distance without implying the element is disabled

Do not use for:

- Essential instructions
- Anything that must remain comfortably readable at a glance

### `text-inverse`

Use for text that sits on dark, accent, or otherwise strong fills.

Choose this for:

- Text on `accent`
- Text on `accent-strong`
- Text on `control-primary`
- Text on other high-emphasis dark fills when the inverse direction is required

Do not use for:

- Standard text on neutral surfaces

## Borders

### `border`

Use for the default border treatment.

Choose this for:

- Inputs
- Cards
- Dividers with standard visibility
- Container outlines

Do not use for:

- Focus rings
- Cases where the line should be intentionally quieter or stronger

### `border-subtle`

Use for quiet separation.

Choose this for:

- Hairline dividers
- Low-emphasis separators
- Large layout regions where a stronger outline would feel noisy

Do not use for:

- Inputs that need obvious affordance
- Strong selection boundaries

### `border-strong`

Use for high-emphasis boundaries.

Choose this for:

- Secondary buttons
- Important selection outlines
- Containers that need stronger definition than the default border

Do not use for:

- Every border in the UI

### `focus-ring`

Use for focus indication only.

Choose this for:

- Keyboard focus outlines
- Accessible focus halos
- Interaction states where focus visibility is the semantic point

Do not use for:

- Static borders
- Decorative emphasis

## Accent

### `accent`

Use for standard accent emphasis.

Choose this for:

- Active indicators
- Small accent highlights
- Non-button emphasis that should read as branded and interactive

Do not use for:

- Primary button fills if `control-primary` exists
- Success or warning semantics

### `accent-strong`

Use for the highest-impact accent fill or emphasis.

Choose this for:

- Hero accent chips
- Selected states that need heavier emphasis
- Strong branded containers

Why choose it:

- It carries more visual weight than `accent`
- It supports inverse text pairings well

Do not use for:

- Every accent treatment
- Routine text links

### `accent-surface`

Use for tinted accent backgrounds.

Choose this for:

- Accent callout panels
- Selected list rows with a tinted fill
- Branded supporting surfaces behind neutral text

Do not use for:

- Primary text color
- Button labels

### `link`

Use for default textual links.

Choose this for:

- Inline links in body copy
- Navigation links when styled as text
- Text actions that should read as links rather than buttons

Do not use for:

- Filled buttons
- Generic accent icons that are not links

### `link-hover`

Use for hovered or intensified link states.

Choose this for:

- Hovered inline links
- Focused text links when the design intensifies color
- Link states that need stronger emphasis than the resting link color

Do not use for:

- Resting link color
- Generic accent text unrelated to link behavior

## Status

### `success`

Use for positive status foreground content.

Choose this for:

- Success text
- Success icons
- Positive confirmation accents inside a success container

Do not use for:

- Generic green decoration

### `success-surface`

Use for success background surfaces.

Choose this for:

- Success banners
- Positive inline notices
- Completed-state chips or containers

Do not use for:

- Neutral panels with no positive semantic meaning

### `warning`

Use for caution-oriented status foreground content.

Choose this for:

- Warning text
- Warning icons
- Caution indicators

Do not use for:

- Generic warm highlights with no caution meaning

### `warning-surface`

Use for warning background surfaces.

Choose this for:

- Warning callouts
- Attention banners
- Elevated-caution containers

Do not use for:

- Neutral highlighted cards

### `danger`

Use for destructive or error foreground content.

Choose this for:

- Error text
- Destructive action indicators
- Critical-state icons

Do not use for:

- Accent emphasis
- Decorative red moments

### `danger-surface`

Use for destructive or error background surfaces.

Choose this for:

- Error alerts
- Destructive confirmation warnings
- Critical status containers

Do not use for:

- Standard destructive buttons unless the system explicitly maps them here

### `info`

Use for neutral informative foreground content.

Choose this for:

- Informational text
- Guidance icons
- Neutral status messaging that is not warning or success

Do not use for:

- Default brand accents

### `info-surface`

Use for informational background surfaces.

Choose this for:

- Informational notices
- Help callouts
- Neutral instructional banners

Do not use for:

- Generic blue-tinted layout panels

## Controls

### `control-primary`

Use for the fill of the dominant action in the local context.

Choose this for:

- The main submit action
- The forward path in a modal or form
- The single action that should carry the highest visual weight

Why choose it:

- It is for action hierarchy, not just color preference

Do not use for:

- Every button
- Passive tags or decorative chips

### `control-primary-text`

Use for text and icon content that sits on `control-primary`.

Choose this for:

- Button labels on primary actions
- Icons inside primary action buttons

Do not use for:

- Text on secondary buttons
- Ordinary text on neutral surfaces

### `control-secondary`

Use for visible but non-dominant action fills.

Choose this for:

- Cancel
- Back
- More details
- Secondary toolbar actions
- Supporting modal actions

Why choose it:

- It stays clearly interactive without competing with the primary action

Do not use for:

- Plain cards
- Hover-only ghost treatments

### `control-secondary-text`

Use for text and icon content on `control-secondary`.

Choose this for:

- Secondary button labels
- Icons inside secondary actions

Do not use for:

- Primary button labels

### `control-secondary-border`

Use for the outline of `control-secondary`.

Choose this for:

- Secondary action borders
- Outlined control boundaries that need stronger definition than standard borders

Do not use for:

- Default card borders
- Focus treatment

### `control-ghost-hover`

Use for the hover or active surface behind ghost-style controls.

Choose this for:

- Hovered icon buttons with transparent resting states
- Hover background for low-chrome text actions
- Toolbar actions that only gain a fill on interaction

Do not use for:

- Persistent card backgrounds
- Standard filled buttons

### `input`

Use for input backgrounds.

Choose this for:

- Text inputs
- Search inputs
- Textareas
- Select triggers when they visually read as fields

Do not use for:

- Generic panels
- Buttons

### `input-border`

Use for input outlines.

Choose this for:

- Text field borders
- Select borders
- Input affordance outlines

Do not use for:

- General card borders unless the intent is specifically field-like

### `input-placeholder`

Use for placeholder text inside inputs.

Choose this for:

- Placeholder copy
- In-field hints that should read weaker than entered content

Do not use for:

- Actual input values
- Labels outside the field

## Recommended Pairings

These are the most canonical foreground/background relationships in the system:

- `text` on `surface`
- `text-secondary` on `surface-muted`
- `text-inverse` on `accent-strong`
- `control-primary-text` on `control-primary`
- `control-secondary-text` on `control-secondary`
- `input-placeholder` on `input`
- `success` on `success-surface`
- `warning` on `warning-surface`
- `danger` on `danger-surface`
- `info` on `info-surface`

If a design keeps violating these pairings, that is usually a sign the element is using the wrong token family.

## Practical Scaffolding Guidance

When generating a new screen or component:

- Start all structure with neutral surface, text, and border tokens.
- Add accent only where interaction or brand emphasis is semantically useful.
- Add status color only when communicating status.
- Use one primary action per action cluster by default.
- Default other actions to secondary or ghost behavior.
- Prefer `surface` before `surface-raised`.
- Prefer `surface-subtle` before `surface-muted` when the need is only light grouping.
- Prefer `text-secondary` before `text-muted` when readability still matters.

## Anti-Patterns

Avoid these common mistakes:

- Using `accent` or `accent-strong` as a generic panel background
- Using `control-primary` for any button that merely exists
- Using `danger` for brand red styling that is not destructive
- Using `surface-raised` for every card until the hierarchy collapses
- Using `surface-subtle` when the element should actually feel elevated
- Using `text-faint` for content users need to read
- Using `focus-ring` as a regular outline color
- Using `field` for any inset-looking decorative container that is not actually field-like

## Rule For Agents

If you are scaffolding a site with this boilerplate, assume every in-scope color decision must map to one of these tokens or to a local alias that maps back to one of these tokens.

If no token fits:

- Stop
- Name the gap
- Propose a token-system extension instead of improvising with raw color or semantic misuse

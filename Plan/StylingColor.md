# Odoo 18 Product Color System

## Purpose

This document defines the complete color system for the product. It is
intended to be used as a standalone design and implementation
specification, especially for an Odoo 18 website/theme.

The five colors defined below are the **only colors permitted anywhere
in the product**. They are the single source of truth for all
backgrounds, surfaces, text, headings, links, buttons, borders, icons,
states, notifications, and other UI elements.

The visual identity should be consistent across every page and component
rather than allowing individual components to introduce their own
colors.

------------------------------------------------------------------------

## 1. Core Palette

  -------------------------------------------------------------------------------
  Odoo Token     Role           Hex            RGB               Description
  -------------- -------------- -------------- ----------------- ----------------
  `o-color-1`    Primary /      `#724B66`      `114, 75, 102`    Muted mauve/plum
                 Brand                                           purple

  `o-color-2`    Secondary      `#2E3141`      `46, 49, 65`      Deep
                                                                 blue-gray/navy

  `o-color-3`    Extra Light    `#F3F2F2`      `243, 242, 242`   Soft neutral
                                                                 off-white

  `o-color-4`    Whitish        `#FFFFFF`      `255, 255, 255`   Pure white

  `o-color-5`    Blackish       `#111826`      `17, 24, 38`      Very dark navy
  -------------------------------------------------------------------------------

### `o-color-1` --- Primary / Brand

**`#724B66`**

The main brand and accent color. It is a muted, dusty mauve/plum rather
than a bright purple.

Use it for: - Primary buttons - Primary actions - Active navigation -
Selected controls - Important highlights - Accent elements - Links when
contrast is sufficient - Brand-focused UI elements - Intentional accent
borders

It must remain sophisticated and muted. Do not replace it with brighter
purple, violet, magenta, or pink.

### `o-color-2` --- Secondary

**`#2E3141`**

A deep blue-gray/navy used to provide structure and secondary contrast.

Use it for: - Secondary actions - Secondary dark surfaces - Navigation
elements - Supporting UI - Dark components - Secondary text on light
backgrounds - Dark borders where appropriate

### `o-color-3` --- Extra Light

**`#F3F2F2`**

A soft neutral off-white used for subtle light surfaces and secondary
light content.

Use it for: - Secondary light backgrounds - Cards and subtle surfaces -
Light input areas - Secondary UI surfaces - Secondary text on dark
backgrounds - Light button backgrounds where appropriate

It should remain a soft neutral rather than becoming a noticeable gray.

### `o-color-4` --- Whitish

**`#FFFFFF`**

Pure white and the brightest color in the system.

Use it for: - Primary light backgrounds - Bright surfaces - Primary text
on dark backgrounds - Text on the primary mauve background - Light
button backgrounds where appropriate

### `o-color-5` --- Blackish

**`#111826`**

The darkest color in the system. It is a very dark navy, not pure black.

Use it for: - Darkest backgrounds - Dark theme surfaces - Strong
headings on light backgrounds - Primary text on light backgrounds - Dark
buttons - High-contrast elements - Dark borders where appropriate

Do not replace it with `#000000`.

------------------------------------------------------------------------

## 2. Odoo 18 Theme Mapping

The palette must map directly to Odoo's five-color theme structure:

``` text
o-color-1 = #724B66
o-color-2 = #2E3141
o-color-3 = #F3F2F2
o-color-4 = #FFFFFF
o-color-5 = #111826
```

Use these centralized theme tokens as the source of truth instead of
defining unrelated colors inside individual components.

Odoo's color-combination system should be configured so that
backgrounds, normal text, headings, links, buttons, and button borders
remain within these five colors.

------------------------------------------------------------------------

## 3. Backgrounds and Surfaces

### Light Theme

Use:

-   Main background: `o-color-4`
-   Secondary/subtle surface: `o-color-3`
-   Primary text: `o-color-5`
-   Secondary text: `o-color-2`
-   Primary accent: `o-color-1`
-   Dark controls/buttons: `o-color-5`

The light theme should feel clean, bright, and spacious.

### Dark Theme

Use:

-   Main background: `o-color-5`
-   Secondary dark surface: `o-color-2`
-   Primary text: `o-color-4`
-   Secondary text: `o-color-3`
-   Primary accent: `o-color-1`
-   Light controls/buttons: `o-color-4` or `o-color-3`

The dark theme should use navy rather than black and preserve strong
readability.

### Accent/Mauve Sections

For sections where the brand color is intended to dominate:

-   Background: `o-color-1`
-   Primary text: `o-color-4`
-   Secondary text: `o-color-3`
-   Dark contrast elements: `o-color-5`

------------------------------------------------------------------------

## 4. Typography and Text

Text must use only the five defined colors.

### Text on Light Backgrounds

-   Primary text: `o-color-5` (`#111826`)
-   Secondary text: `o-color-2` (`#2E3141`)

Use `o-color-5` for: - Page titles - Important headings - Primary
labels - Main body text where strong contrast is required

Use `o-color-2` for: - Supporting text - Descriptions - Metadata -
Secondary labels

### Text on Dark Backgrounds

-   Primary text: `o-color-4` (`#FFFFFF`)
-   Secondary text: `o-color-3` (`#F3F2F2`)

Use pure white for important headings and primary content. Use off-white
for supporting content.

### Text on Mauve Backgrounds

-   Primary text: `o-color-4`
-   Secondary text: `o-color-3`

Avoid dark text on `o-color-1` unless a specific component has a
demonstrated contrast requirement.

### Headings

Headings from `h1` through `h6` must use the appropriate existing text
color for their background.

Do not create separate heading colors outside the palette.

For Odoo color combinations, explicitly define the colors for: - `h1` -
`h2` - `h3` - `h4` - `h5` - `h6`

------------------------------------------------------------------------

## 5. Links

Links must not use the browser's default blue.

Preferred link color:

-   Light backgrounds: `o-color-1`
-   Dark backgrounds: `o-color-4` when necessary for contrast

Link styling should communicate interactivity without introducing a new
color.

Visited, hover, and active link states must also remain within the
five-color system.

------------------------------------------------------------------------

## 6. Buttons

### Primary Button

``` text
Background: #724B66
Text:       #FFFFFF
Border:     #724B66
```

Use for the primary action of a component or page.

### Dark / Secondary Button

``` text
Background: #111826
Text:       #FFFFFF
Border:     #111826
```

Use for dark secondary actions and high-contrast controls.

`#2E3141` may also be used for secondary dark surfaces or controls when
it provides the intended hierarchy.

### Light Button

``` text
Background: #FFFFFF or #F3F2F2
Text:       #111826
Border:     an approved palette color
```

Use on dark or accent backgrounds when a light contrasting action is
required.

### Button Requirements

Odoo/Bootstrap default button colors must not leak into the product.

Every button must have an explicitly controlled: - Background - Text
color - Border color - Hover state - Focus state - Active/pressed
state - Disabled state

All of these must use only the five approved colors.

------------------------------------------------------------------------

## 7. Odoo Color Combinations

Each Odoo color combination should explicitly control the following:

-   Background
-   Normal text
-   Heading text
-   `h2`
-   `h3`
-   `h4`
-   `h5`
-   `h6`
-   Links
-   Primary button
-   Primary button border
-   Secondary button
-   Secondary button border

Every assigned value must come from:

``` text
#724B66
#2E3141
#F3F2F2
#FFFFFF
#111826
```

No automatically generated framework color should be allowed to replace
these values.

------------------------------------------------------------------------

## 8. Interaction States

Interactive states must never introduce a sixth color.

This includes:

-   Hover
-   Focus
-   Active
-   Selected
-   Pressed
-   Visited
-   Disabled
-   Checked
-   Expanded
-   Collapsed
-   Dragged
-   Loading

States should be communicated using combinations of the existing
palette, such as:

-   Switching between approved colors
-   Changing background to another approved color
-   Changing text to another approved color
-   Adding/removing an approved-color border
-   Using opacity where appropriate
-   Changing typography weight
-   Using icons or visual indicators

Do not invent lighter or darker versions of the palette specifically for
interaction states.

------------------------------------------------------------------------

## 9. Status and Feedback Colors

Normal UI systems often use green for success, red for errors,
yellow/orange for warnings, and blue for information.

This product must **not** introduce those conventional status colors
because they would violate the five-color restriction.

All status states must remain within the defined palette.

Suggested mapping:

  Status        Color
  ------------- ----------------------------
  Success       `o-color-1`
  Warning       `o-color-2`
  Error         `o-color-5`
  Information   `o-color-2` or `o-color-4`

Because these colors do not inherently communicate success, warning, or
error, status meaning should also be communicated through: - Icons -
Labels - Typography - Borders - Component structure - Position and
context

Do not use red, green, orange, yellow, cyan, or default Bootstrap status
colors.

------------------------------------------------------------------------

## 10. Borders and Dividers

Borders and dividers are part of the same palette.

Do not use default framework values such as:

``` text
#000000
#CCCCCC
#DDDDDD
#E5E5E5
#F0F0F0
```

Use existing palette colors according to the surface:

-   Light subtle borders: `o-color-3` or `o-color-2`
-   Dark borders: `o-color-2` or `o-color-3`
-   Strong dark borders: `o-color-5`
-   Accent borders: `o-color-1`
-   White borders where necessary on dark surfaces: `o-color-4`

Borders should be subtle and should not visually overpower the content.

------------------------------------------------------------------------

## 11. Icons

Icons must use only the approved palette.

Recommended relationships:

-   Icons on light backgrounds: `o-color-2` or `o-color-5`
-   Icons on dark backgrounds: `o-color-3` or `o-color-4`
-   Brand/active icons: `o-color-1`

Do not allow default icon colors from Odoo, Bootstrap, Font Awesome, or
browser styles to introduce additional colors.

------------------------------------------------------------------------

## 12. Shadows

Do not introduce colored shadows.

Shadows should remain subtle and use the existing dark navy/blue-gray
visual language.

If an implementation requires an explicit shadow color, it must be based
on an approved dark palette color and must not introduce a new
hex/RGB/HSL value.

------------------------------------------------------------------------

## 13. Gradients

Prefer solid colors throughout the product.

Do not use gradients containing colors outside the five-color palette.

If a gradient is required by an Odoo component, every gradient endpoint
must come from the approved five-color palette.

For example, a gradient may transition between:

``` text
#724B66 → #111826
```

but must not introduce intermediate custom colors as independent theme
values.

------------------------------------------------------------------------

## 14. Odoo and Bootstrap Overrides

Odoo 18 uses Bootstrap and its own theme variables. Framework defaults
must not be allowed to introduce colors that conflict with this design
system.

Override the relevant Odoo and Bootstrap color variables so that:

-   Primary uses `o-color-1`
-   Secondary uses `o-color-2`
-   Light uses `o-color-3`
-   White uses `o-color-4`
-   Dark uses `o-color-5`

Do not hard-code unrelated colors inside individual components.

Components should reference centralized theme tokens wherever possible.

------------------------------------------------------------------------

## 15. Forbidden Colors and Color Sources

The following are prohibited unless they are literally one of the five
palette values:

-   Pure black `#000000`
-   Default Bootstrap colors
-   Default Tailwind colors
-   Default browser colors
-   Generic framework grays
-   Default link blue
-   Bright blue
-   Green
-   Red
-   Orange
-   Yellow
-   Cyan
-   Pink
-   Bright purple
-   Additional violet shades
-   Arbitrary RGB values
-   Arbitrary HSL values
-   Arbitrary HEX values
-   Automatically generated lighter shades
-   Automatically generated darker shades

The restriction applies to every component and state, not only the main
page.

------------------------------------------------------------------------

## 16. Visual Character

The overall product should communicate:

-   Elegant
-   Minimal
-   Modern
-   Sophisticated
-   Calm
-   Premium
-   Consistent

The visual identity is built around three relationships:

### Brand Identity

`#724B66`

Muted mauve provides the product's recognizable personality and primary
accent.

### Structure and Depth

`#2E3141` and `#111826`

The blue-gray and deep navy provide hierarchy, contrast, navigation
structure, and dark-mode depth.

### Clarity and Space

`#F3F2F2` and `#FFFFFF`

The off-white and pure white provide clean surfaces, readable layouts,
and visual breathing room.

------------------------------------------------------------------------

## 17. Reference UI Style

The intended visual relationships should resemble the supplied palette
reference:

-   Light previews use white/off-white backgrounds with dark navy text.
-   Dark previews use deep navy or blue-gray backgrounds with
    white/off-white text.
-   Mauve is used as the primary accent.
-   Primary buttons are mauve with white text.
-   Dark buttons are deep navy with white text.
-   Light buttons are white/off-white with dark navy text.
-   The palette should work consistently across both light and dark
    contexts.

The goal is not to reproduce individual preview cards as separate themes
with unrelated colors. Instead, use the same five colors systematically
throughout the product.

------------------------------------------------------------------------

## 18. Implementation Rules

1.  Define the five colors centrally.
2.  Map them to Odoo's `o-color-1` through `o-color-5`.
3.  Use the Odoo theme tokens rather than creating component-specific
    colors.
4.  Configure all Odoo color combinations explicitly.
5.  Override relevant Bootstrap defaults.
6.  Ensure headings, links, buttons, borders, icons, and states use
    approved colors.
7.  Prevent default framework colors from appearing.
8.  Do not create custom color variants for individual components.
9.  Keep light and dark themes within the same five-color system.
10. Test every interactive state for accidental framework colors.
11. Test forms, alerts, notifications, modals, navigation, cards,
    tables, dropdowns, and other reusable components.
12. Check status/feedback components separately because they commonly
    introduce red, green, yellow, or blue.
13. Avoid gradients unless they use only approved palette colors.
14. Keep shadows within the same dark visual language.
15. Do not use pure black.

------------------------------------------------------------------------

## 19. Final Non-Negotiable Requirement

The complete product has exactly **five source colors**:

``` text
o-color-1  #724B66  Muted Mauve / Primary
o-color-2  #2E3141  Deep Blue-Gray / Secondary
o-color-3  #F3F2F2  Soft Off-White / Extra Light
o-color-4  #FFFFFF  Pure White / Whitish
o-color-5  #111826  Deep Navy / Blackish
```

These five colors constitute the entire color vocabulary of the product.

No page, component, popup, modal, form, notification, navigation
element, card, button, icon, border, divider, heading, paragraph, label,
status indicator, hover state, focus state, loading state, empty state,
error state, or background may introduce a sixth color.

The result must look like **one coherent Odoo 18 design system**, with
muted mauve as the brand identity, deep navy and blue-gray providing
structure and depth, and white/off-white providing clarity and space.

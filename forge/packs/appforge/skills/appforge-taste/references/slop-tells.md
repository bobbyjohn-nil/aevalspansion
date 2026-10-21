# The slop tell table, retargeted to app surfaces

Contents: 1. How to use this. 2. Color. 3. Typography. 4. Layout and cards. 5. Effects and depth. 6. Motion.
7. Copy. 8. Imagery and icons. 9. Execution quality. 10. The systems this table assumes.

## 1. How to use this

Run it as an audit with locations, not as a vibe check. Every hit becomes a defect row:

```
LOCATION                  | DEFECT                                    | SEVERITY | CLASS
app/(tabs)/index.tsx hero | indigo-to-violet gradient header          | MAJOR    | slop-tell
```

A tell you cannot locate in a file is not a finding. Fix or log every hit; there is no third option.

## 2. Color

| Tell | Alternative move |
|---|---|
| Purple-to-blue or indigo-to-violet gradient, especially as a header or hero background | Build the palette from the subject matter or brand. If a gradient is used, the hue and direction are a decision tied to content. |
| Cyan-on-dark neon glow accents | A restrained, purposeful accent count |
| Default component-library gray plus default framework blue, untouched | Reskin the token values even when using library defaults as scaffolding |
| Gradient text | Solid color for text, always |
| Radial-gradient halo behind a hero element | A deliberate material or a plain field |
| Evenly weighted palette with no dominant color | Roughly 60 percent one dominant hue, 30 neutral, 10 accent. Asymmetric on purpose. |
| Cream or beige as the automatically tasteful background | Choose the background as part of the palette, not as a reflex |
| Gray text on a colored background | A darker shade of the same background hue, or near-white |
| Dark mode as a reflexive default | Dark mode is a decision with a reason |

Saturation bands by role: full brand saturation for the primary action only, 40 to 60 percent for secondary
elements, 15 to 25 for disabled, 5 to 10 for placeholder text. Large surfaces at full saturation read cheap.
Full saturation belongs in small, high-signal areas.

## 3. Typography

| Tell | Alternative move |
|---|---|
| A ubiquitous safe sans used because it is safe | Pick a typeface with a point of view. A distinctive display face with a neutral body face is fine; an entirely generic system is the problem. |
| One serif-italic word dropped into an all-sans screen | Commit to a real pairing, or drop the accent word |
| Oversized italic serif display headline | Set roman, use a non-serif display face, or size it down |
| A full sentence set at display size | A short headline at that size, or a longer one set smaller |
| A tracked uppercase eyebrow label above every heading | Delete it, or fold its words into the heading |
| All caps for body-length passages | Uppercase for short labels only |
| Flat hierarchy, sizes too close together | At least a 1.25 ratio between adjacent scale steps |
| Crushed negative letter-spacing | Tighten optically, and check small sizes for collision |
| One family for everything | Pair a display face with a body face |

Line height moves inversely with size: tighter as type grows. Body text sits at 14 to 16px minimum on a
phone, and functional text never below 11px.

## 4. Layout and cards

| Tell | Alternative move |
|---|---|
| A row of exactly three identical cards, icon plus heading plus two lines | Break the count, vary the treatment, or use content that resists a triptych |
| A small rounded-square icon tile centered above every card heading | Side-by-side icon and text, or the icon in the flow |
| A centered hero with a pill badge directly above the title | A focal point that is not the same three stacked elements every time |
| Numbered 1-2-3 step rows imitating structure | Let hierarchy and spatial rhythm carry the sequence |
| The stock skeleton: hero, three cards, logo strip, pricing, FAQ, footer | Vary section treatment down the screen |
| A bento grid applied to content with no size variety | Reserve bento for genuinely heterogeneous chunks |
| A colored 3 to 4px accent border down one side of a card | Remove it. Use whitespace or a background shift. |
| A flat 1px gray border on every container | Default to borderless. Separate by whitespace, then a 3 to 5 percent background shift, then soft elevation, and a border only if all three fail. |
| Cards nested inside cards | Flatten with spacing, typography, and dividers |
| One radius value across every element | Scale radius with element size: 2px badges, 4px tags, 6px controls, 8px cards, 12px modals, pill for avatars and status chips |
| 24px-plus radius on a small card | Cap small and medium containers at 12 to 16px |
| One spacing value used everywhere | Tight within a group, generous between sections |
| Content flush against the screen edge | At least 16px horizontal padding, 8 to 16px inside any bordered or filled container |

Proximity encodes relationship, so spacing has to be ordered: 4 to 8px between a label and its input, 16 to
24px between fields, 32 to 48px between groups, 64px and up between unrelated sections.

Nested radius: `inner_radius = outer_radius - padding`, then verify optically.

## 5. Effects and depth

| Tell | Alternative move |
|---|---|
| Glassmorphism as decoration rather than to solve a layering problem | Use it when it clarifies a real layering relationship. Check contrast against the worst-case patch behind the glass, not a sampled point. Use more blur on busy backgrounds. Offer a reduced-transparency path. |
| Glowing box-shadow accents on dark surfaces as the default cool look | Lighting tied to actual state: focus, selection |
| Repeating-gradient stripe textures as surface filler | Deliberate texture, or a plain surface |
| A decorative grid-line background with no grid, map, or canvas behind it | Real product structure, or a plain field |
| A hairline border stacked with a wide diffuse shadow on the same element | Commit to one depth cue, edge or elevation, never both |

Use a five-level elevation scale rather than hand-tuned one-off shadows: buttons, cards, dropdowns, modals,
high-emphasis overlays. In dark mode, elevation lightens the surface instead of deepening a shadow, because
shadows barely read on a dark background.

## 6. Motion

| Tell | Alternative move |
|---|---|
| Bounce or elastic easing on ordinary chrome | Reserve spring for things being dragged |
| Scaling an entrance from literal zero | Floor at 0.9 to 0.97 with opacity |
| A pulsing live dot on static data, a blinking fake cursor, an auto-scrolling marquee | Animate only when the underlying state changes. Anything auto-updating needs a pause control. |
| Animating width, height, padding, margin, top, or left | Animate transform and opacity only |
| Reflexive hover-zoom on every card image | Purposeful, or nothing |
| Entrances led with `ease-in` | Lead with deceleration |

## 7. Copy

| Surface | Tell | Fix |
|---|---|---|
| Buttons | "Get Started Now", "Unlock Your Potential", "Supercharge Your Workflow" | The literal action and object: "Create project", "Export CSV", "Connect GitHub" |
| Empty states | "Looks like it's a little quiet here!" | "No projects yet. Create one." |
| Errors | "Oops! Something went wrong on our end. Please try again!" | "Upload failed: file exceeds 25 MB." |
| Onboarding | "Whether you're a beginner or a pro, our seamless onboarding will empower you to..." | One sentence, the actual first step |
| Marketing | "Revolutionize the way you X", three adjectives in a row | One real number or named capability |
| Toasts | "Success! Your changes have been saved seamlessly." | "Saved." |

Banned in shipped copy: streamline, empower, supercharge, unlock, seamless, revolutionize, world-class,
elevate, robust. More than a couple of em dashes in any body copy. The "it's not X, it's Y" construction.

## 8. Imagery and icons

| Tell | Alternative move |
|---|---|
| Emoji as functional icons in product UI | An icon set matched to the brand's line weight and geometry. Emoji render differently per OS and read as unserious. |
| Hero art assembled from generic overlapping blob shapes | Real illustration, photography, or a purposeful custom graphic |
| Generic stock photography | Imagery matched to the actual subject. No unlabeled placeholders. |
| Floating 3D abstract blob renders, too-smooth plastic illustration | A style tied to the actual brand and content |
| One oversized rounded-square icon centered above every section heading | Vary the icon and heading relationship, or drop the tile pattern |

## 9. Execution quality

Functional slop counts as much as visual slop, and on app surfaces it counts more:

- Empty and error states that were never designed.
- Contrast failures against the 4.5:1 body and 3:1 large-text and UI-boundary thresholds. Measure, do not
  eyeball.
- An uncaught error breaking interactivity before the design is even judged.
- Content invisible at rest because a scroll-reveal left it at zero opacity with no fallback.
- Heading levels that skip, breaking screen-reader navigation.
- A screen that has never been opened on a small phone or at the largest accessibility text size.

## 10. The systems this table assumes

- Semantic tokens, two layers. Components consume `color-text-primary`, never `gray-900`. Hardcoded hex values
  inside component files are the tell that this layer is missing.
- A fixed spacing scale: 4, 8, 12, 16, 24, 32, 48, 64, 96, 128.
- A radius scale, not a radius constant.
- A five-level elevation scale.
- Contrast targets: 4.5:1 body text, 3:1 large text and UI component boundaries, focus indicators at 3:1
  against adjacent colors and at least a 2px perimeter.
- Dark mode as a hand-authored second scale, base near #121212, high-opacity near-white rather than pure white
  for primary text.

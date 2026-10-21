# The AI-slop tell table

Every row: the tell, and the concrete alternative move. Log each hit as a defect with a location and a
severity. A tell you cannot point at in a file is a mood; discard it.

## Contents
1. Color
2. Typography
3. Layout, cards, structure
4. Effects and depth
5. Motion
6. Copy
7. Imagery and icons
8. Execution quality
9. Why this happens

---

## 1. Color

| Tell | Alternative move |
|---|---|
| Purple-to-blue or indigo-to-violet gradient, especially as a hero background | Build the palette from the subject matter or the brand. If a gradient is used at all, the hue choice and direction is a stated decision tied to content |
| Cyan-on-dark, neon glow accents | Restrained, purposeful accent count: one accent, spent where it counts |
| Default shadcn gray plus Tailwind blue left untouched | Reskin the token values even when using a component library's defaults as scaffolding |
| Gradient text | Solid color for text, always. Gradient text is decoration standing in for a typographic decision |
| Radial-gradient halo or glow behind a hero | A deliberate material or a plain field. A generic spotlight is filler |
| Timid, evenly-weighted palette with no dominant color | Roughly 60 percent one dominant hue, 30 percent neutral, 10 percent accent. Asymmetric on purpose |
| Cream or beige as the automatically "tasteful" background | Choose the background as part of the palette decision, not as a reflexive warm neutral |
| Gray text on a colored background | A darker shade of the same background hue, or near-white |
| Dark mode as a reflexive default | Dark mode is a decision with a reason. When chosen, author a second scale: `#121212`-class base, elevation lightens rather than shadows, brand colors slightly desaturated, near-white text rather than pure white |

## 2. Typography

| Tell | Alternative move |
|---|---|
| Inter, Geist, Space Grotesk, or Poppins chosen because it is the safe ubiquitous default | Pick a face with a point of view for this project. A distinctive display face over a neutral body face is fine; an entirely generic system is the problem |
| One serif-italic word dropped into an all-sans page for "sophistication" | Commit to a real serif and sans pairing, or drop the accent word |
| Oversized italic serif display headline, the universal AI-startup hero | Set roman, use a non-serif display face, or size the headline down if it is a full sentence |
| Full-sentence headline at display size dominating the viewport | A punchy one or two word headline at that size, or a longer headline set smaller |
| Tracked uppercase eyebrow label above every heading | Delete it, or fold its words into the heading |
| All caps for body-length passages | Uppercase for short labels and headings only |
| Flat hierarchy, sizes too close together | Minimum 1.25x between adjacent steps in use |
| Crushed negative letter-spacing beyond what the letterforms support | Tighten optically; check it does not collide at small sizes |
| One family for literally everything | Two families, hard cap three, and the third needs a distinct job |

Pairing rules, in order of importance: contrast rather than matching (two similar geometric sans faces read as
an accident); two fonts, hard cap three; serif plus sans is the reliable default pairing because the category
difference does the contrast work; weight contrast reinforces hierarchy; match x-height so mixed inline text
stays balanced; never put a display face in body copy.

## 3. Layout, cards, and structure

| Tell | Alternative move |
|---|---|
| Row of exactly three identical feature cards (icon, heading, two lines) | Break the count, vary the card treatment, or replace with content that resists a neat triptych |
| Small rounded-square icon tile centered above every card heading | Side-by-side icon and text, or let the icon sit in the flow instead of a boxed badge |
| Centered hero with a pill badge directly above an H1 | A focal point that is not the same three-stacked-elements template |
| Numbered "1 - 2 - 3" step rows imitating structure | Let content hierarchy and spatial rhythm carry the sequence |
| Stock full-page skeleton: hero, 3 cards, logo strip, pricing, FAQ, footer, unmodified | Vary section treatment down the page. Not every section is a card grid |
| Bento grid applied regardless of whether the content has size variety | Reserve bento for genuinely heterogeneous chunk sizes |
| Colored 3-4px accent border down one side of a card | Remove it. Use whitespace or a background shift instead |
| Flat 1px gray border on every card and container | Default to borderless. Separate in this order: whitespace, then a 3-5 percent background-lightness shift, then soft elevation, then a border only if all three genuinely fail |
| Nested cards, cards inside cards | Flatten with spacing, typography, and dividers |
| Uniform border-radius at every element size | Scale radius with element size |
| 24px or more radius on a small card | Cap small and medium containers at 12-16px |
| Monotonous spacing, one gap value everywhere | Tight within groups, generous between sections |
| Hero-metric layout (big number, small label, three supporting stats, gradient accent) used reflexively | Treat the pattern as untrusted by default. Earn it with real content |
| Body text or images flush against the container edge | 16px minimum horizontal padding with `max-width` and auto margins; 8px minimum, ideally 12-16px, inside any bordered or colored container |
| Justified body text with no hyphenation, producing rivers | `text-align: left`, or `hyphens: auto` if justifying |
| Section forced to exactly `100vh` | `100dvh`, `100svh`, or `100lvh` chosen for the behavior wanted. Size sections to content with generous padding; reserve true full-bleed height for something that earns it |

Grid: 12 columns collapsing 12 to 8 to 4, rather than a new system per breakpoint. Starting tokens, tuned per
project rather than copied: 24px gutters, 24-64px desktop margins, 16px mobile margins.

Scanning: the F-pattern is real but it is the fallback users drop into when content gives them no stronger
cue. Override it. Front-load the important word in headings and links ("Pricing", not "Click here to learn
about pricing"), use real heading hierarchy, and give each screen one focal point. 80 percent of viewing time
is above the fold, but users scroll when the layout visibly continues past the fold and what is visible earns
the scroll.

## 4. Effects and depth

| Tell | Alternative move |
|---|---|
| Glassmorphism as decoration rather than to solve a layering problem | Use it only when it clarifies a real layering relationship. Verify contrast over the worst-case patch behind the glass, not a sampled point. More blur on busy backgrounds. Offer a reduced-transparency fallback |
| Glowing box-shadow accents on dark surfaces as the default cool look | Lighting tied to actual state: focus, selection. Not ambient decoration |
| Repeating-gradient stripe textures as surface decoration | A deliberate texture or a plain surface |
| Decorative grid-line background with no functional grid behind it | Real product structure, or a plain field |
| A 1px hairline border and a wide diffuse shadow on the same element | Commit to one depth cue per surface |

## 5. Motion

| Tell | Alternative move |
|---|---|
| Bounce or elastic easing on ordinary chrome (menus, cards entering) | Reserve elastic for things physically being dragged: drawer dismiss, swipe to delete. Keep spring bounce within 0.1-0.3 |
| Entrance scaling from literal `scale(0)` | Floor at `scale(0.9)` to `scale(0.97)` with `opacity: 0` |
| Decorative infinite loops: pulsing live dot on static data, fake blinking cursor, autoplay logo marquee | Animate only when the underlying state is actually changing. Any auto-updating content needs a pause control |
| Reflexive image hover-zoom on every card | Apply hover transforms purposefully, or not at all. Gate hover with `@media (hover: hover) and (pointer: fine)` so touch devices do not get sticky hover |
| Animating `width`, `height`, `padding`, `margin`, `top`, `left` | `transform` and `opacity` only. For a height change, animate `grid-template-rows` or use a measured-height transform |
| `ease-in` alone on an entrance, or a bare `ease` keyword | A custom cubic-bezier, deceleration-led |

## 6. Copy

| Tell | Alternative move |
|---|---|
| Generic SaaS buzzwords: streamline, empower, supercharge, unlock, seamless, revolutionize, world-class, elevate, robust | Name the specific verb and noun for what the product literally does |
| Weightless headline formula: "Build faster. Ship smarter." | Write a headline that would be false for a competitor. Specificity is the test |
| "It's not X, it's Y" closing every section | State the real claim and back it with a fact |
| The same label repeated verbatim across card slots | Write it once, where it matters |
| More than a couple of em dashes in body copy | Periods, colons, commas, parentheses |
| CTA as slogan: "Get Started Now!", "Unlock Your Potential" | Imperative verb plus object: "Create project", "Export CSV", "Connect GitHub" |
| Empty state with personality: "Looks like it's a little quiet here!" | "No projects yet. Create one." |
| Error message as apology theater: "Oops! Something went wrong on our end." | Name the failure and the fix: "Upload failed: file exceeds 25 MB." |
| Toast with adverbs: "Success! Your changes have been saved seamlessly." | "Saved." |

## 7. Imagery and icons

| Tell | Alternative move |
|---|---|
| Emoji used as functional icons in product UI | A real icon set matched to the brand's line weight and geometry. Emoji render inconsistently across platforms |
| Hero art from generic overlapping SVG blobs | Real illustration, photography, or a purposeful custom graphic |
| Generic stock photography, or unlabeled placeholder images | Imagery matched to the actual subject |
| Floating 3D abstract blob renders, too-smooth plastic illustration | Imagery style tied to the brand and content |
| One oversized rounded-square icon centered above a heading, in every section | Vary the icon-to-heading relationship section to section, or drop the pattern |

## 8. Execution quality

These fail as hard as the visual tells, and are cheaper to catch.

- Missing states. Every interactive component needs default, hover, focus, active, disabled, loading, empty,
  error, and success designed on purpose.
  - Loading is keyed to response time: under 0.1s no feedback; 0.1-1s no blocking; 1-10s a busy indicator;
    over 10s a determinate percent-done indicator plus a way to cancel. Use a skeleton mirroring the final
    layout when the shape is predictable; a spinner only for short waits of unpredictable shape.
  - Empty states: state the system status in plain language, teach what would appear here, and give a direct
    path to the fix as a real button.
  - Error states: inline next to the offending field, never hover-only, never color alone (pair with an icon
    left of the message), validate after the field is finished rather than on every keystroke, and name the
    fix ("Password needs 8+ characters", not "Invalid input"). Three repeated errors on the same field is a
    design bug, not a user error.
  - Disabled: prefer keeping submit actions enabled and validating on attempt, or hiding an action that is not
    yet valid, over a permanently dead control.
- Contrast failures against WCAG AA. Measure, do not eyeball.
- Uncaught script errors breaking interactivity before the design is even judged.
- Content invisible at rest because a scroll-reveal left it at `opacity: 0` with no fallback.
- Heading levels that skip, breaking screen-reader navigation.
- Body text under 14-16px, or any functional text under 11px.
- Optical alignment never done: mathematically centering an asymmetric shape (a play triangle, most icons)
  looks off-center. Shift the element opposite the direction of its visual weight until it looks centered.

## 9. Why this happens

Model output approximates the median of its training distribution: scraped tutorials, template marketplaces,
and component-library defaults left untouched. A framework's documentation accent color is massively
overrepresented in scraped data relative to how often shipped products actually use it, so the model learns it
as "what modern UI looks like." This is a plausible mechanism rather than a confirmed history, but the
implication holds either way: naming the fonts to avoid, stating a specific palette source, and citing
concrete references beats any adjective, because it overrides a statistical default with a specific
instruction.

# Landing page prompt: AlgoVerse, a glass page over a world of algorithms

A reusable prompt for AlgoVerse's front door (and for any later redesign of it): a glass page
floating over a 3D world of data structures, algorithms and systems, that the camera flies through
as you scroll.

The implementation it describes lives in this repo:

- `apps/web/src/features/landing/Landing.tsx`: the page, its sections and their `data-world-z` stops
- `apps/web/src/features/landing/AlgoWorld.tsx`: the fixed canvas, scroll-to-camera mapping and fallbacks
- `apps/web/src/features/landing/scene.ts`: the three.js scene, objects, lights, fog and labels
- `apps/web/src/features/landing/objects.ts`: the object list and camera maths, as plain data
- `apps/web/src/features/landing/landing.css`: the landing palette and `.glass` panels
- `apps/web/src/app/nav.ts`: the grouped menu the rest of the app uses

## The prompt

````text
Build a landing page for AlgoVerse with this look and behaviour, and regroup the app's menu to
match it.

## Product
- Name: AlgoVerse
- One-line promise (the hero headline, the last words in a gradient): "See algorithms come alive"
- Pitch under the headline: "Data structures are the shapes, algorithms the moves, systems the
  whole machine. Watch every one of them run step by step, change the input, write the code,
  then design real systems and get them marked. Free, open source, and built for learners."
- Main call to action: "Start learning" → /home (the learner's dashboard); when this browser has
  progress, "Continue learning". Secondary: "Fly through it" → scrolls to the first zone.
- Four zones the page flies through, each with a colour and five 3D objects:
  1. Data structures (violet #a78bfa, "the shapes"): array, linked list, binary tree, hash table,
     stack. Links to /structures.
  2. Algorithms (sky #38bdf8, "the moves"): sorting bars, binary search, breadth-first search,
     dynamic-programming grid, recursion tree. Links to /algorithms.
  3. System design (emerald #34d399, "the whole machine"): load balancer, replicated databases,
     message queue, consistent-hashing ring, CDN globe. Links to /systems and the Design Lab.
  4. AI and integration (amber #fbbf24, "the frontier"): neural network, vector space, agent loop,
     mainframe behind an API, LLM gateway. Links to the AI-systems and legacy modules.
- Extra sections after the zones: "How it works" (Watch it, Step it, Code it, Design it), "Practise
  and prove it" (problems, Python playground, projects, progress), and a final call to action.
- Live numbers for the hero (3 big stats): algorithms and data structures, system design lessons,
  case studies. Each zone card shows its own numbers (items, lessons, cases, lab problems).
- Footer: the creator's name linking to LinkedIn, plus source, discussions and contribute links.
  No other personal details, and no mention of any other site.

## The core idea: a glass page floating over a 3D world you fly through
- A full-screen three.js scene sits fixed behind the page (position: fixed, inset 0, z-index 0,
  pointer-events none, aria-hidden). All page content sits above it (relative, z-10).
- Scrolling moves the camera forward along the z-axis. Every section carries `data-world-z`: the
  camera reaches that depth when the section is centred on screen. Ease between stops
  (smoothstep), and let the camera glide towards its target each frame (exponential follow)
  instead of jumping.
- Each zone owns its own stretch of depth. Objects sit left and right of the path, alternating
  sides, at similar visual weight; on narrow screens they move in towards the centre.
- Every object moves gently and for ever, showing what it stands for: sorting bars swap, the
  binary-search window halves, BFS lights up in waves, packets flow through the load balancer,
  a dot runs round the agent loop. Never fast. Slight parallax from the pointer.
- A sparse field of small coloured points, tinted by the zone they sit in (PointsMaterial, size
  ~0.07, opacity 0.8).
- Fog in the background colour (near ~12, far ~38) so distant objects fade in out of the dark.
- Lighting: hemisphere light plus one directional "sun". MeshStandardMaterial in the zone colour
  with emissive in the same colour (intensity 0.2–0.75) so objects glow softly; thin lines for
  edges and links.
- Each object has a small floating glass label (zone, name, one-line caption) projected onto it,
  fading with distance.

## Theme
- The landing page is dark first and keeps its own palette, scoped to the page:
  background #070b17, surface #0e1528, text #e2e8f0, muted #94a3b8, border
  rgba(148,163,184,0.14), accent #818cf8; zone colours as above.
- Body background: the dark base plus soft radial glows in the zone colours, used alone when WebGL
  is unavailable and behind the canvas while it loads.
- Glass panels for the nav bar, hero card, zone cards, step cards and the final call to action:
  background rgba(17,24,48,0.42) (strong variant rgba(14,21,40,0.68)), 1px border
  rgba(255,255,255,0.12), inset top highlight rgba(255,255,255,0.08), backdrop-filter
  blur(18px) saturate(150%), shadow 0 20px 60px -20px rgba(0,0,0,0.55), radii 1.5–2rem, zone
  cards tint their border with the zone colour; solid rgba(14,21,40,0.92) without backdrop-filter.
- Type: the app's sans-serif, extra-bold for headlines with tight tracking and line-height ~1.05;
  small uppercase labels with wide letter-spacing (0.2em).
- Buttons: primary solid accent with dark text and a coloured glow; secondary glass. Both lift
  2px on hover. Visible focus rings everywhere.
- Motion respects prefers-reduced-motion: the world holds still, and the camera still follows the
  scroll without gliding.

## Page layout, top to bottom
1. A fixed glass nav bar 12px from the top: the AlgoVerse mark and name, anchor links to the four
   zones and "How it works", and "Open AlgoVerse" on the right.
2. Hero (full viewport height): eyebrow "Data structures · Algorithms · System design · AI", the
   headline, the pitch, two buttons, three big stats, and a "Scroll to fly in" hint.
3. One section per zone, alternating sides so the objects stay visible: the zone's name and
   colour, its one-line role, 3–4 bullets, its numbers, links, and the floating objects listed
   in words for screen readers.
4. "How it works" as four glass step cards; "Practise and prove it" as four link cards.
5. A strong-glass final call to action, then the footer.

## The app's menu, regrouped
The left rail becomes four labelled groups (labels show when the rail is wide; dividers when it
is narrow):
- Start: Dashboard (/home), Learning Universe, Curriculum
- Labs: Data Structure Lab, Algorithm Lab, System Design Lab, Design Lab (/systems/lab)
- Practise: Problem Solving, Python Playground, Real-World Projects
- You: My Progress, Knowledge Library
Settings stays under the avatar menu. "/" is the landing page, outside the app shell.

## Engineering requirements
- Vite + React + TypeScript + Tailwind v4 + react-router; three.js is imported dynamically, only
  on the landing page, so it never weighs on the rest of the app. The object list is plain data
  (kind, zone, title, caption, position, scale) so it can be tested without WebGL.
- Without WebGL, show the still gradient and the full page; the world is decoration only.
- Resize the renderer and re-measure the stops on resize and layout changes. Clamp the pixel
  ratio. Pause drawing while the tab is hidden. Dispose everything on unmount.
- Mobile first: works at 360px wide with no horizontal scroll and a 16px side gutter.
- Accessibility: one h1, sections with aria-labelledby, visible focus rings, AA contrast, the
  canvas and labels aria-hidden.
- Tests: objects sit beside the path and inside their zone, zones run in order, one stop per
  section with depth increasing down the page, camera maths, the page renders every section and
  link without WebGL, and the regrouped menu.
````

# Winter Craft Studio — Interactive Christmas Tree & Happy New Year Countdown

Handcrafted Scandinavian/editorial interactive Christmas tree, realistic botanical Norway spruce foliage, mechanical split-flap New Year countdown, procedural Web Audio chimes & fireworks built with **TypeScript + React 19 (Vite) + Tailwind CSS v4 + Motion (`motion/react`) + HTML5 2D Canvas**.

## Features

- **Realistic Botanical Christmas Tree & Winter Landscape (`WinterTreeScene`)**
  - 11 pre-baked organic Norway spruce/fir tiers with directional sunlight, multi-tone pine needles, woody branch cores, hanging pine cones, powdery bough snow, fissured conifer bark trunk, 3D terracotta planter pot, and braided wool/jute rug.
  - Pre-baked atmospheric winter world with golden-hour sunbeams, snow-capped alpine mountains, layered pine woods, 2.5D Nordic cottages with snow-spilled golden window light, drifting chimney smoke, warm window shimmer, and depth-sorted parallax snow.
  - Interactive ornaments: 3D glass baubles with window reflections & cast foliage shadows, faceted 3D brass star topper with lens-flare glint, and 5 wrapped 3D gift boxes that hop, glow, and launch celebratory fireworks when clicked.
  - Smooth cursor sparkle trail, orbiting star ring, and click ripples rendered directly on Canvas.
- **Tactile Editorial UI & Mechanical Split-Flap Countdown**
  - Stitched felt/linen bunting with blown-glass Edison bulbs, embossed 24K gold-foil year display, mechanical 3D split-flap countdown clock (`Days : Hours : Mins : Secs`), tactile 3D lacquer **จุดพลุ** button, and top-right **เปิดเสียง / ปิดเสียง** control.
  - **Automatic New Year's Day Mode (Jan 1, 00:00–23:59):** When Dec 31 crosses into Jan 1, the countdown automatically hides and continuous celebratory fireworks run all day (`?preview=newyear` to preview anytime).
- **Performance & Accessibility**
  - Zero `backdrop-filter: blur` over live canvas, pre-baked offscreen sprite caches (< 2ms/frame), automatic rAF pause when tab is hidden, DST-safe `Temporal` countdown (`@js-temporal/polyfill` + `Date` fallback), procedural Web Audio synthesizer (muted by default), and `prefers-reduced-motion` support.

## Development

```bash
npm install
npm run dev
npm run typecheck
npm run build
npm run preview
```

import { MAX_PARTICLES_NORMAL, MAX_PARTICLES_REDUCED } from '../data/constants';
import { GIFT_COLORS } from '../data/greetings';
import { THEME_PALETTES } from '../data/themes';
import type {
  LightPattern,
  SceneCallbacks,
  SceneInitialOptions,
  SnowLevel,
  ThemeId,
  ThemePalette,
  ViewMode,
} from '../types/studio';

const clamp01 = (v: number): number => Math.max(0, Math.min(1, v));
const easeOutCubic = (t: number): number => 1 - Math.pow(1 - clamp01(t), 3);
const easeOutBack = (t: number): number => {
  const c1 = 1.70158;
  const c3 = c1 + 1;
  const x = clamp01(t);
  return 1 + c3 * Math.pow(x - 1, 3) + c1 * Math.pow(x - 1, 2);
};

// Deterministic PRNG so resize produces stable alpine peaks & foliage
function mulberry32(seed: number): () => number {
  let a = seed >>> 0;
  return () => {
    a = (a + 0x6d2b79f5) | 0;
    let t = Math.imul(a ^ (a >>> 15), 1 | a);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

function hexToRgb(hex: string): [number, number, number] {
  const clean = hex.replace('#', '');
  const full = clean.length === 3 ? clean.replace(/(.)/g, '$1$1') : clean;
  const n = parseInt(full, 16);
  return [(n >> 16) & 255, (n >> 8) & 255, n & 255];
}

function mixColor(hexA: string, hexB: string, t: number, alpha = 1): string {
  const [r1, g1, b1] = hexToRgb(hexA);
  const [r2, g2, b2] = hexToRgb(hexB);
  const k = clamp01(t);
  const r = Math.round(r1 + (r2 - r1) * k);
  const g = Math.round(g1 + (g2 - g1) * k);
  const b = Math.round(b1 + (b2 - b1) * k);
  return alpha >= 1 ? `rgb(${r},${g},${b})` : `rgba(${r},${g},${b},${alpha.toFixed(3)})`;
}

function shadeColor(hex: string, delta: number, coolShift = 0.12, alpha = 1): string {
  const [r0, g0, b0] = hexToRgb(hex);
  let r = r0;
  let g = g0;
  let b = b0;
  if (delta < 0) {
    const f = 1 + delta;
    r = r0 * (f - coolShift * Math.abs(delta) * 0.45);
    g = g0 * (f - coolShift * Math.abs(delta) * 0.15);
    b = b0 * Math.min(1, f + coolShift * Math.abs(delta) * 0.45);
  } else {
    r = r0 + (255 - r0) * delta;
    g = g0 + (248 - g0) * delta;
    b = b0 + (232 - b0) * delta;
  }
  const rc = Math.max(0, Math.min(255, Math.round(r)));
  const gc = Math.max(0, Math.min(255, Math.round(g)));
  const bc = Math.max(0, Math.min(255, Math.round(b)));
  return alpha >= 1 ? `rgb(${rc},${gc},${bc})` : `rgba(${rc},${gc},${bc},${alpha.toFixed(3)})`;
}

interface SpriteAsset {
  canvas: HTMLCanvasElement;
  w: number;
  h: number;
  anchorX: number;
  anchorY: number;
}

interface Star {
  x: number;
  y: number;
  r: number;
  phase: number;
  speed: number;
}

interface Cloud {
  x: number;
  y: number;
  scale: number;
  speed: number;
  spriteIdx: number;
}

interface SmokePuff {
  baseX: number;
  baseY: number;
  scale: number;
  age: number;
  maxLife: number;
  phase: number;
}

interface CottageWindow {
  x: number;
  y: number;
  r: number;
  phase: number;
  speed: number;
}

interface Snowflake {
  x: number;
  y: number;
  r: number;
  depth: number;
  vy: number;
  vx: number;
  swayAmp: number;
  swayFreq: number;
  phase: number;
  alpha: number;
  blur: boolean;
}

interface TierCache {
  canvas: HTMLCanvasElement;
  w: number;
  h: number;
  tierY: number;
  yNorm: number;
}

interface Bulb {
  relX: number;
  relY: number;
  yNorm: number;
  color: string;
  phase: number;
  speed: number;
  size: number;
  index: number;
  litSpawned: boolean;
}

interface Bauble {
  relX: number;
  relY: number;
  yNorm: number;
  radius: number;
  color: string;
  patternType: number;
  spriteKey: string;
  angle: number;
  angularVel: number;
  placed: boolean;
}

interface GiftBox {
  relX: number;
  relY: number;
  w: number;
  h: number;
  colors: (typeof GIFT_COLORS)[number];
  bounce: number;
  glow: number;
  placed: boolean;
}

interface Particle {
  x: number;
  y: number;
  vx: number;
  vy: number;
  life: number;
  maxLife: number;
  size: number;
  color: string;
  isConfetti: boolean;
  rot: number;
  vRot: number;
}

interface FireworkRocket {
  x: number;
  y: number;
  targetX: number;
  targetY: number;
  vx: number;
  vy: number;
  color: string;
  trail: Array<{ x: number; y: number }>;
}

interface ShootingStar {
  x: number;
  y: number;
  vx: number;
  vy: number;
  life: number;
  maxLife: number;
}

interface CursorSparkle {
  x: number;
  y: number;
  vx: number;
  vy: number;
  life: number;
  maxLife: number;
  size: number;
  color: string;
  isStar: boolean;
  rot: number;
  vRot: number;
}

interface CursorRipple {
  x: number;
  y: number;
  life: number;
  maxLife: number;
  color: string;
}

interface TreeMetrics {
  cx: number;
  baseY: number;
  topY: number;
  treeHeight: number;
  treeWidth: number;
  mobile: boolean;
}

/**
 * Illustrated 3D Realism HTML5 Canvas Winter Studio & Christmas Tree Engine.
 * Pre-bakes photorealistic shading into offscreen sprite caches so steady-state
 * per-frame rendering runs under ~2ms with ZERO per-frame gradient allocations.
 */
export class WinterTreeScene {
  private readonly canvas: HTMLCanvasElement;
  private readonly ctx: CanvasRenderingContext2D;
  private readonly callbacks: SceneCallbacks;

  private themeName: ThemeId;
  private lightsOn: boolean;
  private lightBrightness: number;
  private pattern: LightPattern;
  private snowIntensity: SnowLevel;
  private celebrationMode = false;

  private readonly motionQuery: MediaQueryList;
  public reducedMotion: boolean;
  private dpr: number;
  private width: number;
  private height: number;

  private treeCenterX: number;
  private pointer = { x: 0, y: 0, active: false, vx: 0 };
  private parallaxX = 0;
  private cursorSmooth = { x: 0, y: 0, alpha: 0, ringScale: 1, overInteractive: false };
  private lastTrailPos = { x: -999, y: -999 };
  private cursorSparkles: CursorSparkle[] = [];
  private cursorRipples: CursorRipple[] = [];
  private hoveredGift = -1;

  private stars: Star[] = [];
  private clouds: Cloud[] = [];
  private smokePuffs: SmokePuff[] = [];
  private cottageWindows: CottageWindow[] = [];
  private bgSnow: Snowflake[] = [];
  private fgSnow: Snowflake[] = [];

  // Pre-baked offscreen sprite caches (zero per-frame gradient allocations)
  private backdropCanvas: HTMLCanvasElement | null = null;
  private cloudSprites: SpriteAsset[] = [];
  private tierCaches: TierCache[] = [];
  private treeBaseSprite: SpriteAsset | null = null;
  private baubleSprites = new Map<string, SpriteAsset>();
  private giftSprites: SpriteAsset[] = [];
  private bulbSprites = new Map<string, HTMLCanvasElement>();
  private starTopperSprite: SpriteAsset | null = null;
  private starHaloSprite: HTMLCanvasElement | null = null;
  private starGlintSprite: HTMLCanvasElement | null = null;
  private groundGlowSprite: HTMLCanvasElement | null = null;
  private softShadowSprite: HTMLCanvasElement | null = null;
  private snowBlurSprite: HTMLCanvasElement | null = null;
  private smokePuffSprite: HTMLCanvasElement | null = null;
  private windowGlowSprite: HTMLCanvasElement | null = null;

  private bulbs: Bulb[] = [];
  private baubles: Bauble[] = [];
  private gifts: GiftBox[] = [];
  private particles: Particle[] = [];
  private fireworks: FireworkRocket[] = [];
  private shootingStars: ShootingStar[] = [];

  private autoFireworkTimer = 0;
  private shootingStarTimer = 4.5;
  private resizeTimer: number | null = null;
  private pendingTimers = new Set<number>();

  private time = 0;
  private readonly introDuration = 5.6;
  private introTime: number;
  private starCrowned: boolean;
  private lastFrame = performance.now();
  private rafId: number | null = null;
  private disposed = false;

  constructor(
    canvas: HTMLCanvasElement,
    initial: SceneInitialOptions,
    callbacks: SceneCallbacks = {},
  ) {
    const context = canvas.getContext('2d', { alpha: false });
    if (!context) {
      throw new Error('Could not initialize 2D canvas context');
    }

    this.canvas = canvas;
    this.ctx = context;
    this.callbacks = callbacks;

    this.themeName = initial.theme;
    this.lightsOn = initial.lightsOn;
    this.lightBrightness = initial.lightsOn ? 1 : 0;
    this.pattern = initial.pattern;
    this.snowIntensity = initial.snow;
    this.celebrationMode = initial.view === 'newyear';

    this.motionQuery = window.matchMedia('(prefers-reduced-motion: reduce)');
    this.reducedMotion = this.motionQuery.matches;
    this.width = window.innerWidth;
    this.height = window.innerHeight;
    this.dpr = this.computeDpr(this.width, this.height);

    this.treeCenterX = this.targetTreeX();
    this.pointer = { x: this.width * 0.5, y: this.height * 0.5, active: false, vx: 0 };

    this.introTime = this.reducedMotion ? this.introDuration : 0;
    this.starCrowned = this.reducedMotion;

    this.buildSharedStaticSprites();
    this.bindEvents();
    this.resize(true);
    this.start();
  }

  private computeDpr(w: number, h: number): number {
    const raw = window.devicePixelRatio || 1;
    const area = w * h;
    if (area > 1_350_000) return Math.min(raw, 1.25);
    return Math.min(raw, 1.5);
  }

  public getCanvasElement(): HTMLCanvasElement {
    return this.canvas;
  }

  private releaseCanvas(c: HTMLCanvasElement | null): null {
    if (c) {
      c.width = 0;
      c.height = 0;
    }
    return null;
  }

  private releaseSprite(s: SpriteAsset | null): null {
    if (s) {
      s.canvas.width = 0;
      s.canvas.height = 0;
    }
    return null;
  }

  private schedule(fn: () => void, delayMs: number): void {
    if (this.disposed) return;
    const id = window.setTimeout(() => {
      this.pendingTimers.delete(id);
      if (!this.disposed) fn();
    }, delayMs);
    this.pendingTimers.add(id);
  }

  private buildSharedStaticSprites(): void {
    // 1. Bokeh snow sprite (24x24)
    {
      const size = 24;
      const off = document.createElement('canvas');
      off.width = size;
      off.height = size;
      const octx = off.getContext('2d');
      if (octx) {
        const half = size / 2;
        const g = octx.createRadialGradient(half, half, 0, half, half, half);
        g.addColorStop(0, 'rgba(255, 255, 255, 0.85)');
        g.addColorStop(0.5, 'rgba(255, 255, 255, 0.34)');
        g.addColorStop(1, 'rgba(255, 255, 255, 0)');
        octx.fillStyle = g;
        octx.fillRect(0, 0, size, size);
      }
      this.snowBlurSprite = off;
    }

    // 2. Soft AO shadow blob (64x64) for bauble foliage shadows & grounded gift contact shadows
    {
      const size = 64;
      const off = document.createElement('canvas');
      off.width = size;
      off.height = size;
      const octx = off.getContext('2d');
      if (octx) {
        const half = size / 2;
        const g = octx.createRadialGradient(half, half, 4, half, half, half);
        g.addColorStop(0, 'rgba(12, 22, 18, 0.62)');
        g.addColorStop(0.55, 'rgba(14, 24, 20, 0.28)');
        g.addColorStop(1, 'rgba(14, 24, 20, 0)');
        octx.fillStyle = g;
        octx.fillRect(0, 0, size, size);
      }
      this.softShadowSprite = off;
    }

    // 3. Soft chimney smoke puff sprite (32x32)
    {
      const size = 32;
      const off = document.createElement('canvas');
      off.width = size;
      off.height = size;
      const octx = off.getContext('2d');
      if (octx) {
        const half = size / 2;
        const g = octx.createRadialGradient(half - 2, half - 2, 1, half, half, half);
        g.addColorStop(0, 'rgba(255, 253, 248, 0.78)');
        g.addColorStop(0.55, 'rgba(244, 242, 236, 0.35)');
        g.addColorStop(1, 'rgba(244, 242, 236, 0)');
        octx.fillStyle = g;
        octx.fillRect(0, 0, size, size);
      }
      this.smokePuffSprite = off;
    }

    // 4. Warm cottage window fireplace glow sprite (32x32)
    {
      const size = 32;
      const off = document.createElement('canvas');
      off.width = size;
      off.height = size;
      const octx = off.getContext('2d');
      if (octx) {
        const half = size / 2;
        const g = octx.createRadialGradient(half, half, 1, half, half, half);
        g.addColorStop(0, 'rgba(255, 238, 168, 0.92)');
        g.addColorStop(0.42, 'rgba(255, 190, 72, 0.45)');
        g.addColorStop(1, 'rgba(255, 175, 56, 0)');
        octx.fillStyle = g;
        octx.fillRect(0, 0, size, size);
      }
      this.windowGlowSprite = off;
    }

    // 5. Optical 4-point brass star glint flare (64x64)
    {
      const size = 64;
      const off = document.createElement('canvas');
      off.width = size;
      off.height = size;
      const octx = off.getContext('2d');
      if (octx) {
        const c = size / 2;
        const core = octx.createRadialGradient(c, c, 0, c, c, 12);
        core.addColorStop(0, 'rgba(255, 255, 250, 0.95)');
        core.addColorStop(0.45, 'rgba(255, 238, 172, 0.55)');
        core.addColorStop(1, 'rgba(255, 238, 172, 0)');
        octx.fillStyle = core;
        octx.beginPath();
        octx.arc(c, c, 12, 0, Math.PI * 2);
        octx.fill();

        const drawRay = (angle: number, len: number, width: number) => {
          octx.save();
          octx.translate(c, c);
          octx.rotate(angle);
          const rg = octx.createLinearGradient(-len, 0, len, 0);
          rg.addColorStop(0, 'rgba(255, 248, 214, 0)');
          rg.addColorStop(0.5, 'rgba(255, 255, 248, 0.95)');
          rg.addColorStop(1, 'rgba(255, 248, 214, 0)');
          octx.fillStyle = rg;
          octx.beginPath();
          octx.moveTo(-len, 0);
          octx.quadraticCurveTo(0, -width, len, 0);
          octx.quadraticCurveTo(0, width, -len, 0);
          octx.closePath();
          octx.fill();
          octx.restore();
        };
        drawRay(0, 28, 2.2);
        drawRay(Math.PI / 2, 28, 2.2);
        drawRay(Math.PI / 4, 15, 1.3);
        drawRay(-Math.PI / 4, 15, 1.3);
      }
      this.starGlintSprite = off;
    }
  }

  private buildThemeGlowSprites(): void {
    const pal = this.palette();

    // Star halo sprite (96x96)
    const starSize = 96;
    const starCanvas = this.starHaloSprite ?? document.createElement('canvas');
    starCanvas.width = starSize;
    starCanvas.height = starSize;
    const sctx = starCanvas.getContext('2d');
    if (sctx) {
      sctx.clearRect(0, 0, starSize, starSize);
      const half = starSize / 2;
      const halo = sctx.createRadialGradient(half, half, 2, half, half, half);
      halo.addColorStop(0, pal.starGlow);
      halo.addColorStop(1, 'rgba(255, 255, 255, 0)');
      sctx.fillStyle = halo;
      sctx.fillRect(0, 0, starSize, starSize);
    }
    this.starHaloSprite = starCanvas;

    // Ground light pool sprite (256x64)
    const gw = 256;
    const gh = 64;
    const gCanvas = this.groundGlowSprite ?? document.createElement('canvas');
    gCanvas.width = gw;
    gCanvas.height = gh;
    const gctx = gCanvas.getContext('2d');
    if (gctx) {
      gctx.clearRect(0, 0, gw, gh);
      gctx.save();
      gctx.translate(gw / 2, gh / 2);
      gctx.scale(1, gh / gw);
      const pool = gctx.createRadialGradient(0, 0, 8, 0, 0, gw / 2);
      pool.addColorStop(0, `rgba(${pal.groundGlow}, ${pal.isLight ? 0.24 : 0.34})`);
      pool.addColorStop(1, `rgba(${pal.groundGlow}, 0)`);
      gctx.fillStyle = pool;
      gctx.beginPath();
      gctx.arc(0, 0, gw / 2, 0, Math.PI * 2);
      gctx.fill();
      gctx.restore();
    }
    this.groundGlowSprite = gCanvas;

    // Pre-baked beveled 3D metallic brass star topper sprite
    this.buildStarTopperSprite(pal);

    // Pre-baked 3 volumetric cumulus cloud sprites
    this.buildCloudSprites(pal);
  }

  private buildCloudSprites(pal: ThemePalette): void {
    for (const c of this.cloudSprites) this.releaseSprite(c);
    this.cloudSprites = [];

    const specs = [
      [
        { x: 56, y: 52, r: 22 },
        { x: 82, y: 40, r: 29 },
        { x: 114, y: 44, r: 25 },
        { x: 140, y: 54, r: 19 },
        { x: 98, y: 54, r: 24 },
      ],
      [
        { x: 52, y: 54, r: 19 },
        { x: 78, y: 44, r: 26 },
        { x: 108, y: 38, r: 28 },
        { x: 136, y: 50, r: 21 },
        { x: 96, y: 56, r: 22 },
      ],
      [
        { x: 64, y: 52, r: 20 },
        { x: 90, y: 42, r: 27 },
        { x: 120, y: 48, r: 22 },
        { x: 100, y: 56, r: 21 },
      ],
    ];

    const w = 196;
    const h = 90;
    for (const puffs of specs) {
      const off = document.createElement('canvas');
      off.width = Math.ceil(w * this.dpr);
      off.height = Math.ceil(h * this.dpr);
      const octx = off.getContext('2d');
      if (!octx) continue;
      octx.scale(this.dpr, this.dpr);

      octx.save();
      octx.beginPath();
      for (const p of puffs) {
        octx.moveTo(p.x + p.r, p.y);
        octx.arc(p.x, p.y, p.r, 0, Math.PI * 2);
      }
      octx.clip();

      const grad = octx.createLinearGradient(50, 14, 130, 78);
      grad.addColorStop(0, '#fffef9');
      grad.addColorStop(0.58, '#eff5f9');
      grad.addColorStop(1, mixColor(pal.skyMid, '#a9c2d6', 0.36));
      octx.fillStyle = grad;
      octx.fillRect(0, 0, w, h);

      // Soft warm top-left sunlight crown wash
      const sunHighlight = octx.createRadialGradient(78, 28, 4, 84, 34, 48);
      sunHighlight.addColorStop(0, 'rgba(255, 252, 240, 0.72)');
      sunHighlight.addColorStop(1, 'rgba(255, 252, 240, 0)');
      octx.fillStyle = sunHighlight;
      octx.fillRect(0, 0, w, h);
      octx.restore();

      this.cloudSprites.push({ canvas: off, w, h, anchorX: w / 2, anchorY: h / 2 });
    }
  }

  private buildStarTopperSprite(pal: ThemePalette): void {
    this.starTopperSprite = this.releaseSprite(this.starTopperSprite);
    const size = 96;
    const off = document.createElement('canvas');
    off.width = Math.ceil(size * this.dpr);
    off.height = Math.ceil(size * this.dpr);
    const octx = off.getContext('2d');
    if (!octx) return;
    octx.scale(this.dpr, this.dpr);

    const cx = size / 2;
    const cy = 44;
    octx.translate(cx, cy);

    // 1. Coiled brass mounting spring descending to treetop
    for (let k = 0; k < 3; k++) {
      const y = 10 + k * 3.8;
      const rx = 5.4 - k * 0.7;
      octx.strokeStyle = '#996a18';
      octx.lineWidth = 2.1;
      octx.beginPath();
      octx.ellipse(0, y, rx, 2.2, 0, 0, Math.PI * 2);
      octx.stroke();

      octx.strokeStyle = '#fff0b2';
      octx.lineWidth = 0.9;
      octx.beginPath();
      octx.ellipse(-0.8, y - 0.5, rx * 0.75, 1.5, 0, Math.PI * 0.9, Math.PI * 1.85);
      octx.stroke();
    }

    // 2. 10 Physically-Lit 3D Bevel Facets using 3D surface normals
    const outerR = 21;
    const innerR = 9.0;
    const apexZ = 10;
    const lx = -0.62;
    const ly = -0.58;
    const lz = 0.53;
    const lMag = Math.hypot(lx, ly, lz);
    const Lx = lx / lMag;
    const Ly = ly / lMag;
    const Lz = lz / lMag;

    for (let i = 0; i < 10; i++) {
      const a1 = (i * Math.PI) / 5 - Math.PI / 2;
      const a2 = ((i + 1) * Math.PI) / 5 - Math.PI / 2;
      const r1 = i % 2 === 0 ? outerR : innerR;
      const r2 = i % 2 === 0 ? innerR : outerR;
      const bx = Math.cos(a1) * r1;
      const by = Math.sin(a1) * r1;
      const cx2 = Math.cos(a2) * r2;
      const cy2 = Math.sin(a2) * r2;

      // Edge vectors from apex A=(0,0,apexZ) to B=(bx,by,0) and C=(cx2,cy2,0)
      const abx = bx;
      const aby = by;
      const abz = -apexZ;
      const acx = cx2;
      const acy = cy2;
      const acz = -apexZ;

      let nx = aby * acz - abz * acy;
      let ny = abz * acx - abx * acz;
      let nz = abx * acy - aby * acx;
      if (nz < 0) {
        nx = -nx;
        ny = -ny;
        nz = -nz;
      }
      const nMag = Math.hypot(nx, ny, nz) || 1;
      const ndotl = (nx / nMag) * Lx + (ny / nMag) * Ly + (nz / nMag) * Lz;

      const tipX = i % 2 === 0 ? bx : cx2;
      const tipY = i % 2 === 0 ? by : cy2;
      const fg = octx.createLinearGradient(0, 0, tipX, tipY);
      if (ndotl > 0.68) {
        fg.addColorStop(0, '#fff9da');
        fg.addColorStop(1, mixColor(pal.star, '#fff3b8', 0.45));
      } else if (ndotl > 0.38) {
        fg.addColorStop(0, mixColor(pal.star, '#fff2b8', 0.34));
        fg.addColorStop(1, pal.star);
      } else if (ndotl > 0.1) {
        fg.addColorStop(0, pal.star);
        fg.addColorStop(1, pal.starShade);
      } else if (ndotl > -0.15) {
        fg.addColorStop(0, pal.starShade);
        fg.addColorStop(1, shadeColor(pal.starShade, -0.28, 0.08));
      } else {
        fg.addColorStop(0, shadeColor(pal.starShade, -0.44, 0.08));
        fg.addColorStop(1, shadeColor(pal.starShade, -0.24, 0.04));
      }

      octx.beginPath();
      octx.moveTo(0, 0);
      octx.lineTo(bx, by);
      octx.lineTo(cx2, cy2);
      octx.closePath();
      octx.fillStyle = fg;
      octx.fill();
    }

    // 3. Crisp specular ridges & recessed valley creases
    octx.lineCap = 'round';
    for (let k = 0; k < 5; k++) {
      const aOut = (k * 2 * Math.PI) / 5 - Math.PI / 2;
      const aIn = ((k * 2 + 1) * Math.PI) / 5 - Math.PI / 2;

      if (k === 0 || k === 3 || k === 4) {
        octx.strokeStyle = 'rgba(255, 253, 236, 0.88)';
        octx.lineWidth = 1.0;
        octx.beginPath();
        octx.moveTo(0, 0);
        octx.lineTo(Math.cos(aOut) * outerR, Math.sin(aOut) * outerR);
        octx.stroke();
      }

      octx.strokeStyle = 'rgba(92, 50, 8, 0.38)';
      octx.lineWidth = 0.7;
      octx.beginPath();
      octx.moveTo(0, 0);
      octx.lineTo(Math.cos(aIn) * innerR, Math.sin(aIn) * innerR);
      octx.stroke();
    }

    // Radiant center boss jewel
    const boss = octx.createRadialGradient(-0.8, -0.8, 0.3, 0, 0, 4.4);
    boss.addColorStop(0, '#ffffff');
    boss.addColorStop(0.5, 'rgba(255, 240, 178, 0.78)');
    boss.addColorStop(1, 'rgba(255, 232, 148, 0)');
    octx.fillStyle = boss;
    octx.beginPath();
    octx.arc(0, 0, 4.4, 0, Math.PI * 2);
    octx.fill();

    this.starTopperSprite = { canvas: off, w: size, h: size, anchorX: cx, anchorY: cy };
  }

  /**
   * Pre-bakes the entire atmospheric winter landscape ONCE on resize/theme change:
   * golden-hour sky, sunbeams, snow-capped alpine peaks, valley mist, rolling snow hills,
   * layered pine woods, 2.5D Nordic timber cottages with snow-spilled golden window light,
   * snow sparkles, and tactile paper grain.
   */
  private buildStaticBackdrop(): void {
    const pal = this.palette();
    const rng = mulberry32(42071);
    const off = this.backdropCanvas ?? document.createElement('canvas');
    off.width = Math.max(1, Math.floor(this.width * this.dpr));
    off.height = Math.max(1, Math.floor(this.height * this.dpr));
    const bctx = off.getContext('2d', { alpha: false });
    if (!bctx) return;

    const chimneys: Array<{ x: number; y: number; scale: number }> = [];
    this.cottageWindows = [];

    bctx.save();
    bctx.scale(this.dpr, this.dpr);

    const { baseY, mobile } = this.treeMetrics();
    const groundY = mobile ? Math.min(this.height * 0.83, baseY - 12) : this.height * 0.82;

    // 1. Theme-aware Atmospheric Sky Gradient
    const sky = bctx.createLinearGradient(0, 0, 0, groundY + 30);
    if (pal.isLight) {
      sky.addColorStop(0, mixColor(pal.skyTop, '#9ec3df', 0.24));
      sky.addColorStop(0.4, pal.skyMid);
      sky.addColorStop(0.76, mixColor(pal.skyBot, '#f9ebd4', 0.56));
      sky.addColorStop(1, mixColor(pal.skyBot, '#f2d8b4', 0.66));
    } else {
      sky.addColorStop(0, '#0c1324');
      sky.addColorStop(0.42, '#182442');
      sky.addColorStop(0.78, '#273a61');
      sky.addColorStop(1, '#354b75');
    }
    bctx.fillStyle = sky;
    bctx.fillRect(0, 0, this.width, this.height);

    // 2. Top-Left Golden-Hour Sun / Moon + Volumetric Crepuscular Beams
    const sx = this.width * 0.16;
    const sy = this.height * 0.17;
    const scatterR = Math.max(this.width, this.height) * 0.52;
    const scatter = bctx.createRadialGradient(sx, sy, 12, sx, sy, scatterR);
    if (pal.isLight) {
      scatter.addColorStop(0, 'rgba(255, 244, 205, 0.46)');
      scatter.addColorStop(0.28, 'rgba(255, 220, 152, 0.17)');
      scatter.addColorStop(1, 'rgba(255, 220, 152, 0)');
    } else {
      scatter.addColorStop(0, 'rgba(225, 238, 255, 0.26)');
      scatter.addColorStop(0.3, 'rgba(145, 180, 235, 0.09)');
      scatter.addColorStop(1, 'rgba(145, 180, 235, 0)');
    }
    bctx.fillStyle = scatter;
    bctx.fillRect(0, 0, this.width, this.height);

    if (pal.isLight) {
      const rayAngles = [0.22, 0.39, 0.56, 0.72, 0.89, 1.04, 1.18];
      const rayLen = this.height * 0.82;
      for (let i = 0; i < rayAngles.length; i++) {
        const ang = rayAngles[i]!;
        const half = 0.042 + (i % 3) * 0.015;
        const rg = bctx.createLinearGradient(
          sx,
          sy,
          sx + Math.cos(ang) * rayLen,
          sy + Math.sin(ang) * rayLen,
        );
        rg.addColorStop(0, 'rgba(255, 240, 194, 0.09)');
        rg.addColorStop(0.55, 'rgba(255, 235, 180, 0.03)');
        rg.addColorStop(1, 'rgba(255, 235, 180, 0)');
        bctx.fillStyle = rg;
        bctx.beginPath();
        bctx.moveTo(sx, sy);
        bctx.lineTo(sx + Math.cos(ang - half) * rayLen, sy + Math.sin(ang - half) * rayLen);
        bctx.lineTo(sx + Math.cos(ang + half) * rayLen, sy + Math.sin(ang + half) * rayLen);
        bctx.closePath();
        bctx.fill();
      }
    }

    const corona = bctx.createRadialGradient(sx, sy, 6, sx, sy, 96);
    corona.addColorStop(0, pal.isLight ? '#fffcf0' : '#f4f6ff');
    corona.addColorStop(0.34, pal.sunGlow);
    corona.addColorStop(1, 'rgba(255, 255, 255, 0)');
    bctx.fillStyle = corona;
    bctx.beginPath();
    bctx.arc(sx, sy, 96, 0, Math.PI * 2);
    bctx.fill();

    bctx.fillStyle = pal.isLight ? '#fffcf0' : '#f7f4e6';
    bctx.beginPath();
    bctx.arc(sx, sy, 21, 0, Math.PI * 2);
    bctx.fill();

    // 3. Misty Snow-Capped Alpine Mountains (low saddle behind hero tree at cx=0.67w)
    const farPeaks = [
      { fx: 0.08, peakH: 0.25, baseW: 0.34, ridgeSkew: -0.06 },
      { fx: 0.26, peakH: 0.31, baseW: 0.38, ridgeSkew: 0.05 },
      { fx: 0.45, peakH: 0.22, baseW: 0.32, ridgeSkew: -0.04 },
      { fx: 0.64, peakH: 0.14, baseW: 0.3, ridgeSkew: 0.03 },
      { fx: 0.88, peakH: 0.27, baseW: 0.36, ridgeSkew: -0.05 },
    ];

    for (const pk of farPeaks) {
      const px = this.width * pk.fx;
      const py = groundY - this.height * pk.peakH * (mobile ? 0.68 : 1);
      const leftX = px - this.width * pk.baseW * 0.55;
      const rightX = px + this.width * pk.baseW * 0.55;
      const mBaseY = groundY + 14;

      const spine: Array<{ x: number; y: number }> = [{ x: px, y: py }];
      for (let s = 1; s <= 4; s++) {
        const frac = s / 4;
        const sx2 = px + this.width * pk.baseW * pk.ridgeSkew * frac + (rng() - 0.5) * this.width * 0.022;
        const sy2 = py + (mBaseY - py) * frac;
        spine.push({ x: sx2, y: sy2 });
      }

      // Left sunlit alpine face
      const litGrad = bctx.createLinearGradient(px - 40, py, px, mBaseY);
      if (pal.isLight) {
        litGrad.addColorStop(0, '#fffcf6');
        litGrad.addColorStop(0.55, mixColor(pal.hillMid, '#eef5fa', 0.65));
        litGrad.addColorStop(1, mixColor(pal.hillFar, '#f6efe4', 0.45));
      } else {
        litGrad.addColorStop(0, '#60789e');
        litGrad.addColorStop(0.6, '#394d73');
        litGrad.addColorStop(1, '#253658');
      }
      bctx.fillStyle = litGrad;
      bctx.beginPath();
      bctx.moveTo(leftX, mBaseY);
      bctx.lineTo(leftX + (px - leftX) * 0.42, py + (mBaseY - py) * 0.54);
      bctx.lineTo(leftX + (px - leftX) * 0.72, py + (mBaseY - py) * 0.28);
      for (const pt of spine) bctx.lineTo(pt.x, pt.y);
      bctx.closePath();
      bctx.fill();

      // Right shaded rock/snow face
      const shGrad = bctx.createLinearGradient(px, py, rightX, mBaseY);
      if (pal.isLight) {
        shGrad.addColorStop(0, '#7f9fb8');
        shGrad.addColorStop(0.55, '#99b6cc');
        shGrad.addColorStop(1, '#c5d6e3');
      } else {
        shGrad.addColorStop(0, '#1b2844');
        shGrad.addColorStop(1, '#283b61');
      }
      bctx.fillStyle = shGrad;
      bctx.beginPath();
      for (let idx = 0; idx < spine.length; idx++) {
        const pt = spine[idx]!;
        if (idx === 0) bctx.moveTo(pt.x, pt.y);
        else bctx.lineTo(pt.x, pt.y);
      }
      bctx.lineTo(rightX, mBaseY);
      bctx.lineTo(px + (rightX - px) * 0.66, py + (mBaseY - py) * 0.52);
      bctx.lineTo(px + (rightX - px) * 0.34, py + (mBaseY - py) * 0.25);
      bctx.closePath();
      bctx.fill();

      // Diagonal snow ribs on shaded face
      bctx.strokeStyle = pal.isLight ? 'rgba(244, 249, 255, 0.28)' : 'rgba(205, 224, 248, 0.12)';
      bctx.lineWidth = 1.4;
      for (let r = 1; r <= 3; r++) {
        const pt = spine[r]!;
        bctx.beginPath();
        bctx.moveTo(pt.x, pt.y);
        bctx.lineTo(pt.x + (rightX - pt.x) * 0.42, pt.y + (mBaseY - pt.y) * 0.45);
        bctx.stroke();
      }
    }

    // Valley Atmospheric Mist Veil
    const mistGrad = bctx.createLinearGradient(0, groundY - 78, 0, groundY + 12);
    if (pal.isLight) {
      mistGrad.addColorStop(0, 'rgba(247, 239, 226, 0)');
      mistGrad.addColorStop(1, 'rgba(247, 239, 226, 0.56)');
    } else {
      mistGrad.addColorStop(0, 'rgba(41, 59, 97, 0)');
      mistGrad.addColorStop(1, 'rgba(41, 59, 97, 0.46)');
    }
    bctx.fillStyle = mistGrad;
    bctx.fillRect(0, groundY - 78, this.width, 92);

    // 4. Rolling Shaded Snow Hills & Layered Pine Woods
    const farHillGrad = bctx.createLinearGradient(0, groundY - 48, 0, groundY + 60);
    farHillGrad.addColorStop(0, pal.isLight ? '#dce8f0' : '#2b3e66');
    farHillGrad.addColorStop(1, pal.isLight ? '#b4cadb' : '#1c2a48');
    bctx.fillStyle = farHillGrad;
    bctx.beginPath();
    bctx.moveTo(0, groundY + 12);
    bctx.quadraticCurveTo(this.width * 0.24, groundY - 48, this.width * 0.56, groundY - 4);
    bctx.quadraticCurveTo(this.width * 0.84, groundY + 26, this.width, groundY - 22);
    bctx.lineTo(this.width, this.height);
    bctx.lineTo(0, this.height);
    bctx.closePath();
    bctx.fill();

    const drawMiniPine = (px: number, py: number, h: number, layer: 'far' | 'mid') => {
      // Cast snow shadow
      bctx.fillStyle = pal.isLight ? 'rgba(96, 126, 152, 0.24)' : 'rgba(10, 16, 30, 0.42)';
      bctx.beginPath();
      bctx.ellipse(px + h * 0.22, py + 1.5, h * 0.34, h * 0.065, 0, 0, Math.PI * 2);
      bctx.fill();

      for (let k = 0; k < 4; k++) {
        const top = py - h * (1 - k * 0.21);
        const bot = py - h * (0.68 - k * 0.225);
        const hw = h * (0.14 + k * 0.085);
        const pg = bctx.createLinearGradient(px - hw, top, px + hw, bot);
        if (layer === 'far') {
          pg.addColorStop(0, pal.isLight ? '#8eb1c2' : '#2e4566');
          pg.addColorStop(1, pal.isLight ? '#6c8fa3' : '#1b2b45');
        } else {
          pg.addColorStop(0, pal.isLight ? '#3c7c5e' : '#255248');
          pg.addColorStop(1, pal.isLight ? '#184433' : '#102a26');
        }
        bctx.fillStyle = pg;
        bctx.beginPath();
        bctx.moveTo(px, top);
        bctx.lineTo(px + hw, bot);
        bctx.quadraticCurveTo(px + hw * 0.3, bot + 2, px, bot - 1);
        bctx.quadraticCurveTo(px - hw * 0.3, bot + 2, px - hw, bot);
        bctx.closePath();
        bctx.fill();

        if (k < 3) {
          bctx.fillStyle = pal.isLight ? 'rgba(255, 253, 248, 0.72)' : 'rgba(210, 228, 248, 0.42)';
          bctx.beginPath();
          bctx.moveTo(px, top);
          bctx.lineTo(px - hw * 0.75, top + (bot - top) * 0.74);
          bctx.quadraticCurveTo(px - hw * 0.2, top + (bot - top) * 0.48, px + hw * 0.2, top + (bot - top) * 0.35);
          bctx.closePath();
          bctx.fill();
        }
      }
    };

    const farPines = [
      { fx: 0.04, dy: 2, h: 28 },
      { fx: 0.08, dy: -8, h: 36 },
      { fx: 0.12, dy: -16, h: 30 },
      { fx: 0.16, dy: -22, h: 34 },
      { fx: 0.22, dy: -26, h: 26 },
      { fx: 0.34, dy: -22, h: 32 },
      { fx: 0.38, dy: -18, h: 25 },
      { fx: 0.43, dy: -13, h: 34 },
      { fx: 0.48, dy: -8, h: 28 },
      { fx: 0.85, dy: -2, h: 32 },
      { fx: 0.89, dy: -8, h: 38 },
      { fx: 0.93, dy: -14, h: 42 },
      { fx: 0.97, dy: -20, h: 30 },
    ];
    for (const p of farPines) {
      drawMiniPine(this.width * p.fx, groundY + p.dy, mobile ? p.h * 0.72 : p.h, 'far');
    }

    // Mid gentle hill layer
    const midHillGrad = bctx.createLinearGradient(0, groundY - 12, 0, groundY + 75);
    midHillGrad.addColorStop(0, pal.isLight ? '#f6f1e7' : '#3c5382');
    midHillGrad.addColorStop(1, pal.isLight ? '#cedde8' : '#233457');
    bctx.fillStyle = midHillGrad;
    bctx.beginPath();
    bctx.moveTo(0, groundY + 24);
    bctx.quadraticCurveTo(this.width * 0.34, groundY + 42, this.width * 0.72, groundY - 8);
    bctx.quadraticCurveTo(this.width * 0.9, groundY - 22, this.width, groundY + 4);
    bctx.lineTo(this.width, this.height);
    bctx.lineTo(0, this.height);
    bctx.closePath();
    bctx.fill();

    // 5. Detailed 2.5D Nordic Timber Cottages + Golden Light Pools Spilled on Snow
    const drawCottage = (
      cx: number,
      cy: number,
      scale: number,
      wallColor: string,
      roofColor: string,
      idx: number,
    ) => {
      const fw = 34 * scale;
      const sw = 18 * scale;
      const h = 22 * scale;
      const roofH = 19 * scale;
      const skewY = -5 * scale;

      bctx.save();
      bctx.translate(cx, cy);

      // Cabin cast shadow on snow
      bctx.fillStyle = pal.isLight ? 'rgba(92, 122, 152, 0.28)' : 'rgba(8, 14, 28, 0.52)';
      bctx.beginPath();
      bctx.moveTo(fw / 2, 0);
      bctx.lineTo(fw / 2 + sw, skewY);
      bctx.lineTo(fw / 2 + sw + 24 * scale, 6 * scale);
      bctx.lineTo(fw / 2 + 12 * scale, 9 * scale);
      bctx.lineTo(-fw / 2 + 4 * scale, 5 * scale);
      bctx.closePath();
      bctx.fill();

      // Front wall
      const frontGrad = bctx.createLinearGradient(0, -h, 0, 0);
      frontGrad.addColorStop(
        0,
        pal.isLight ? mixColor(wallColor, '#fff6e6', 0.14) : shadeColor(wallColor, -0.52, 0.25),
      );
      frontGrad.addColorStop(
        1,
        pal.isLight ? shadeColor(wallColor, -0.08) : shadeColor(wallColor, -0.62, 0.25),
      );
      bctx.fillStyle = frontGrad;
      bctx.fillRect(-fw / 2, -h, fw, h);

      // Gable triangle
      bctx.beginPath();
      bctx.moveTo(-fw / 2, -h);
      bctx.lineTo(0, -h - roofH);
      bctx.lineTo(fw / 2, -h);
      bctx.closePath();
      bctx.fill();

      // Shaded right side wall
      bctx.fillStyle = pal.isLight
        ? shadeColor(wallColor, -0.28, 0.16)
        : shadeColor(wallColor, -0.68, 0.25);
      bctx.beginPath();
      bctx.moveTo(fw / 2, -h);
      bctx.lineTo(fw / 2 + sw, -h + skewY);
      bctx.lineTo(fw / 2 + sw, skewY);
      bctx.lineTo(fw / 2, 0);
      bctx.closePath();
      bctx.fill();

      // Timber plank seams + stone plinth
      bctx.strokeStyle = 'rgba(54, 34, 22, 0.16)';
      bctx.lineWidth = 0.7 * scale;
      for (let p = 1; p <= 4; p++) {
        const py = -h + (h * p) / 5;
        bctx.beginPath();
        bctx.moveTo(-fw / 2, py);
        bctx.lineTo(fw / 2, py);
        bctx.lineTo(fw / 2 + sw, py + skewY);
        bctx.stroke();
      }
      bctx.fillStyle = pal.isLight ? '#7c838a' : '#434c5c';
      bctx.fillRect(-fw / 2, -3.5 * scale, fw, 3.5 * scale);
      bctx.fillStyle = pal.isLight ? '#596169' : '#2e3645';
      bctx.beginPath();
      bctx.moveTo(fw / 2, -3.5 * scale);
      bctx.lineTo(fw / 2 + sw, -3.5 * scale + skewY);
      bctx.lineTo(fw / 2 + sw, skewY);
      bctx.lineTo(fw / 2, 0);
      bctx.closePath();
      bctx.fill();

      // Under-eave AO shadow
      bctx.fillStyle = 'rgba(24, 32, 46, 0.32)';
      bctx.fillRect(-fw / 2, -h, fw, 3.8 * scale);

      // Brick chimney (animated smoke puffs anchor recorded here!)
      const chX = fw * 0.16 + sw * 0.35;
      const chY = -h - roofH * 0.72 + skewY * 0.35;
      bctx.fillStyle = '#7e4a3b';
      bctx.fillRect(chX - 3 * scale, chY - 11 * scale, 6 * scale, 13 * scale);
      bctx.fillStyle = '#573026';
      bctx.fillRect(chX + 0.5 * scale, chY - 11 * scale, 2.8 * scale, 13 * scale);
      bctx.fillStyle = '#fffdf8';
      bctx.fillRect(chX - 3.6 * scale, chY - 12.2 * scale, 7.2 * scale, 2.2 * scale);

      chimneys.push({ x: cx + chX, y: cy + chY - 13 * scale, scale });

      // Roof side plane
      bctx.fillStyle = pal.isLight
        ? shadeColor(roofColor, -0.22, 0.12)
        : shadeColor(roofColor, -0.5, 0.2);
      bctx.beginPath();
      bctx.moveTo(0, -h - roofH);
      bctx.lineTo(sw, -h - roofH + skewY);
      bctx.lineTo(fw / 2 + sw + 3 * scale, -h + 1 + skewY);
      bctx.lineTo(fw / 2 + 3 * scale, -h + 1);
      bctx.closePath();
      bctx.fill();

      // Front bargeboard trim
      bctx.strokeStyle = '#f4ead8';
      bctx.lineWidth = 2.1 * scale;
      bctx.lineJoin = 'round';
      bctx.beginPath();
      bctx.moveTo(-fw / 2 - 3.5 * scale, -h + 1);
      bctx.lineTo(0, -h - roofH);
      bctx.lineTo(fw / 2 + 3.5 * scale, -h + 1);
      bctx.stroke();

      // Thick 3D Snow Blanket on Roof (warm crest -> cool blue underside)
      const roofSnowGrad = bctx.createLinearGradient(0, -h - roofH - 4 * scale, 0, -h + 2);
      roofSnowGrad.addColorStop(0, pal.isLight ? '#fffef9' : '#dce8f6');
      roofSnowGrad.addColorStop(1, pal.isLight ? '#c8dceb' : '#7f98b8');
      bctx.fillStyle = roofSnowGrad;
      bctx.beginPath();
      bctx.moveTo(-fw / 2 - 4 * scale, -h + 0.5);
      bctx.quadraticCurveTo(-fw * 0.25, -h - roofH * 0.58 - 3 * scale, 0, -h - roofH - 2.5 * scale);
      bctx.lineTo(sw, -h - roofH + skewY - 2.2 * scale);
      bctx.quadraticCurveTo(
        fw * 0.3 + sw,
        -h - roofH * 0.45 + skewY,
        fw / 2 + sw + 3.5 * scale,
        -h + skewY + 1,
      );
      bctx.lineTo(fw / 2 + 3 * scale, -h + 2);
      bctx.lineTo(0, -h - roofH + 2.5 * scale);
      bctx.lineTo(-fw / 2 - 3 * scale, -h + 3);
      bctx.closePath();
      bctx.fill();

      // Tiny icicles along front eave
      bctx.fillStyle = 'rgba(225, 243, 255, 0.85)';
      for (let ic = 0; ic < 4; ic++) {
        const ix = -fw * 0.36 + ic * fw * 0.24;
        const ih = (2.2 + (ic % 2) * 1.4) * scale;
        bctx.beginPath();
        bctx.moveTo(ix - 0.9 * scale, -h + 1.5);
        bctx.lineTo(ix + 0.9 * scale, -h + 1.5);
        bctx.lineTo(ix, -h + 1.5 + ih);
        bctx.closePath();
        bctx.fill();
      }

      // Timber Door
      bctx.fillStyle = '#6a3c26';
      bctx.fillRect(-3.4 * scale, -11.5 * scale, 6.8 * scale, 11.5 * scale);
      bctx.fillStyle = '#ffe699';
      bctx.beginPath();
      bctx.arc(0, -13.2 * scale, 1.4 * scale, 0, Math.PI * 2);
      bctx.fill();

      // Multi-pane Glowing Amber Windows + Golden Snow-Spill Light Pools
      const drawGlowingWindow = (wx: number, wy: number, ww: number, wh: number, spill: boolean) => {
        const wg = bctx.createRadialGradient(
          wx + ww / 2,
          wy + wh / 2,
          0.5,
          wx + ww / 2,
          wy + wh / 2,
          Math.max(ww, wh),
        );
        wg.addColorStop(0, '#fffbe0');
        wg.addColorStop(0.55, '#ffbe42');
        wg.addColorStop(1, '#e57a1c');
        bctx.fillStyle = wg;
        bctx.fillRect(wx, wy, ww, wh);

        // Dark timber mullions (+)
        bctx.strokeStyle = '#462c1e';
        bctx.lineWidth = 0.95 * scale;
        bctx.strokeRect(wx, wy, ww, wh);
        bctx.beginPath();
        bctx.moveTo(wx + ww / 2, wy);
        bctx.lineTo(wx + ww / 2, wy + wh);
        bctx.moveTo(wx, wy + wh / 2);
        bctx.lineTo(wx + ww, wy + wh / 2);
        bctx.stroke();

        // Snowy window sill
        bctx.fillStyle = '#fffdf8';
        bctx.fillRect(wx - 0.8 * scale, wy + wh, ww + 1.6 * scale, 1.5 * scale);

        // Record animated fireplace flicker anchor
        this.cottageWindows.push({
          x: cx + wx + ww / 2,
          y: cy + wy + wh / 2,
          r: 14 * scale,
          phase: idx * 2.1 + wx * 0.3,
          speed: 2.1 + (idx % 3) * 0.45,
        });

        // Golden light pool spilled onto snowdrift outside
        if (spill) {
          const midX = wx + ww / 2;
          const spillGrad = bctx.createLinearGradient(midX, 0, midX, 15 * scale);
          spillGrad.addColorStop(0, `rgba(255, 206, 98, ${pal.isLight ? 0.44 : 0.76})`);
          spillGrad.addColorStop(0.5, `rgba(255, 186, 74, ${pal.isLight ? 0.2 : 0.38})`);
          spillGrad.addColorStop(1, 'rgba(255, 175, 65, 0)');
          bctx.fillStyle = spillGrad;
          bctx.beginPath();
          bctx.moveTo(midX - ww * 0.65, 0.5);
          bctx.lineTo(midX + ww * 0.65, 0.5);
          bctx.lineTo(midX + ww * 1.65, 15 * scale);
          bctx.lineTo(midX - ww * 1.45, 15 * scale);
          bctx.closePath();
          bctx.fill();
        }
      };

      drawGlowingWindow(-fw * 0.4, -h * 0.72, 7.4 * scale, 8.6 * scale, true);
      drawGlowingWindow(fw * 0.16, -h * 0.72, 7.4 * scale, 8.6 * scale, true);
      drawGlowingWindow(-2.5 * scale, -h - roofH * 0.56, 5 * scale, 5 * scale, false);
      drawGlowingWindow(fw / 2 + sw * 0.32, -h * 0.66 + skewY * 0.4, 5.6 * scale, 7.6 * scale, false);

      bctx.restore();
    };

    if (!mobile) {
      drawCottage(this.width * 0.43, groundY + 18, 0.96, '#ead8c0', '#c9543a', 0);
      drawCottage(this.width * 0.495, groundY + 14, 0.74, '#dac7af', '#245c45', 1);
      drawCottage(this.width * 0.89, groundY + 6, 0.88, '#ead8c0', '#c9543a', 2);
      drawMiniPine(this.width * 0.385, groundY + 19, 46, 'mid');
      drawMiniPine(this.width * 0.538, groundY + 15, 38, 'mid');
      drawMiniPine(this.width * 0.835, groundY + 11, 36, 'mid');
      drawMiniPine(this.width * 0.945, groundY + 8, 48, 'mid');
    } else {
      drawCottage(this.width * 0.17, groundY + 16, 0.72, '#ead8c0', '#c9543a', 0);
      drawCottage(this.width * 0.83, groundY + 12, 0.68, '#dac7af', '#245c45', 1);
      drawMiniPine(this.width * 0.06, groundY + 18, 36, 'mid');
      drawMiniPine(this.width * 0.93, groundY + 14, 36, 'mid');
    }

    // Populate zero-GC chimney smoke puff pool from recorded chimneys
    this.smokePuffs = [];
    for (let ci = 0; ci < chimneys.length; ci++) {
      const ch = chimneys[ci]!;
      const perChimney = 3;
      for (let k = 0; k < perChimney; k++) {
        const maxLife = 4.2 + ((ci + k) % 3) * 0.65;
        this.smokePuffs.push({
          baseX: ch.x,
          baseY: ch.y,
          scale: ch.scale,
          age: (k / perChimney) * maxLife,
          maxLife,
          phase: ci * 1.9 + k * 2.4,
        });
      }
    }

    // 6. Foreground Snow Field + Cool Horizon Trough + Sunlit Snow Sparkles
    const floorGrad = bctx.createLinearGradient(0, groundY, 0, this.height);
    floorGrad.addColorStop(0, pal.snowFloorTop);
    floorGrad.addColorStop(0.45, pal.snowFloorMid);
    floorGrad.addColorStop(1, pal.snowFloorBot);
    bctx.fillStyle = floorGrad;
    bctx.beginPath();
    bctx.moveTo(0, groundY + 26);
    bctx.bezierCurveTo(
      this.width * 0.3,
      groundY - 10,
      this.width * 0.68,
      groundY + 34,
      this.width,
      groundY + 6,
    );
    bctx.lineTo(this.width, this.height);
    bctx.lineTo(0, this.height);
    bctx.closePath();
    bctx.fill();

    // Crisp sunlit horizon snow crest highlight
    bctx.strokeStyle = pal.isLight ? 'rgba(255, 255, 255, 0.82)' : 'rgba(220, 236, 255, 0.35)';
    bctx.lineWidth = 2;
    bctx.beginPath();
    bctx.moveTo(0, groundY + 26);
    bctx.bezierCurveTo(
      this.width * 0.3,
      groundY - 10,
      this.width * 0.68,
      groundY + 34,
      this.width,
      groundY + 6,
    );
    bctx.stroke();

    // Tiny sunlit diamond snow sparkles on foreground snow
    bctx.fillStyle = '#ffffff';
    for (let sp = 0; sp < 28; sp++) {
      const fx = rng() * this.width;
      const fy = groundY + 24 + rng() * Math.max(20, this.height - groundY - 30);
      const r = 1.0 + rng() * 0.9;
      bctx.globalAlpha = 0.42 + rng() * 0.45;
      bctx.beginPath();
      bctx.moveTo(fx, fy - r);
      bctx.lineTo(fx + r, fy);
      bctx.lineTo(fx, fy + r);
      bctx.lineTo(fx - r, fy);
      bctx.closePath();
      bctx.fill();
    }
    bctx.globalAlpha = 1;

    // 7. Bake subtle tactile paper grain once into static backdrop
    const tile = document.createElement('canvas');
    tile.width = 128;
    tile.height = 128;
    const tctx = tile.getContext('2d');
    if (tctx) {
      for (let i = 0; i < 340; i++) {
        const x = rng() * 128;
        const y = rng() * 128;
        const dark = rng() > 0.45;
        tctx.fillStyle = dark ? 'rgba(40, 35, 25, 0.028)' : 'rgba(255, 255, 255, 0.038)';
        tctx.fillRect(x, y, 1.5, 1.5);
      }
      const pat = bctx.createPattern(tile, 'repeat');
      if (pat) {
        bctx.fillStyle = pat;
        bctx.fillRect(0, 0, this.width, this.height);
      }
      tile.width = 0;
      tile.height = 0;
    }

    bctx.restore();
    this.backdropCanvas = off;
  }

  private palette(): ThemePalette {
    return THEME_PALETTES[this.themeName] || THEME_PALETTES.nordic;
  }

  private targetTreeX(): number {
    if (this.width >= 900) {
      return this.width * 0.67;
    }
    return this.width * 0.5;
  }

  private treeMetrics(): TreeMetrics {
    const mobile = this.width < 900;
    const baseY = mobile
      ? Math.max(this.height * 0.44, Math.min(this.height * 0.56, this.height - 310))
      : this.height * 0.84;
    const treeHeight = mobile
      ? Math.max(185, Math.min(baseY - 82, this.width * 0.76))
      : Math.min(this.height * 0.7, 595);
    const treeWidth = treeHeight * 0.68;
    return {
      cx: this.treeCenterX,
      baseY,
      topY: baseY - treeHeight,
      treeHeight,
      treeWidth,
      mobile,
    };
  }

  private swayOffset(yNorm: number): number {
    if (this.reducedMotion) return 0;
    return Math.sin(this.time * 1.05 + yNorm * 3.4) * (1.2 + (1 - yNorm) * 3.2);
  }

  public setTheme(name: ThemeId): void {
    if (this.disposed || !THEME_PALETTES[name] || this.themeName === name) return;
    this.themeName = name;
    this.buildThemeGlowSprites();
    this.buildStaticBackdrop();
    this.buildTreeAssets();
  }

  public setLightsOn(on: boolean): void {
    this.lightsOn = Boolean(on);
  }

  public setPattern(pattern: LightPattern): void {
    this.pattern = pattern;
  }

  public setSnowIntensity(level: SnowLevel): void {
    if (this.snowIntensity === level) return;
    this.snowIntensity = level;
    this.initSnow();
  }

  public setViewMode(_mode: ViewMode): void {
    // Tree stays balanced on right on desktop & centered on mobile
  }

  public setCelebrationMode(active: boolean): void {
    const next = Boolean(active);
    if (this.celebrationMode === next) return;
    this.celebrationMode = next;
    if (next) {
      this.autoFireworkTimer = 0.2;
      this.launchCelebrationBurst();
    }
  }

  public replayDecorating(): void {
    if (this.disposed) return;
    this.introTime = this.reducedMotion ? this.introDuration : 0;
    this.starCrowned = this.reducedMotion;
    for (const b of this.bulbs) b.litSpawned = false;
    for (const b of this.baubles) {
      b.placed = false;
      b.angle = 0;
      b.angularVel = 0;
    }
    for (const g of this.gifts) {
      g.placed = false;
      g.bounce = 0;
      g.glow = 0;
    }
  }

  public launchFirework(
    x: number | null = null,
    y: number | null = null,
    originX: number | null = null,
    originY: number | null = null,
  ): void {
    if (this.disposed) return;
    const pal = this.palette();
    const targetX = x ?? this.width * (0.18 + Math.random() * 0.64);
    const targetY = y ?? this.height * (0.14 + Math.random() * 0.34);
    const startX = originX ?? targetX + (Math.random() - 0.5) * 90;
    const startY = originY ?? this.height * 0.92;
    const color = pal.confetti[Math.floor(Math.random() * pal.confetti.length)]!;

    this.fireworks.push({
      x: startX,
      y: startY,
      targetX,
      targetY,
      vx: (targetX - startX) * 1.35,
      vy: -Math.sqrt(2 * 420 * Math.max(120, startY - targetY)),
      color,
      trail: [],
    });
  }

  public launchCelebrationBurst(): void {
    if (this.disposed) return;
    const count = this.reducedMotion ? 2 : 4;
    for (let i = 0; i < count; i++) {
      this.schedule(() => {
        this.launchFirework(
          this.width * (0.16 + Math.random() * 0.68),
          this.height * (0.12 + Math.random() * 0.32),
        );
      }, i * 240);
    }
  }

  public triggerStarEffect(): void {
    if (this.disposed) return;
    const { cx, topY } = this.treeMetrics();
    const starX = cx + this.swayOffset(0);
    this.spawnBurst(starX, topY - 8, this.palette().star, 28, true);
    this.callbacks.onStarClick?.();
  }

  private celebrateGift(giftIndex: number): void {
    const g = this.gifts[giftIndex];
    if (!g) return;
    const { cx, baseY } = this.treeMetrics();
    const gx = cx + g.relX;
    const gy = baseY + g.relY - g.h * 0.55;

    g.bounce = 1;
    g.glow = 1;

    // 1. Expanding golden highlight ripples around the clicked gift box
    if (!this.reducedMotion) {
      if (this.cursorRipples.length >= 8) this.cursorRipples.shift();
      this.cursorRipples.push({
        x: gx,
        y: gy,
        life: 0,
        maxLife: 0.65,
        color: g.colors.ribbon,
      });
      this.schedule(() => {
        if (this.cursorRipples.length >= 8) this.cursorRipples.shift();
        this.cursorRipples.push({
          x: gx,
          y: gy,
          life: 0,
          maxLife: 0.72,
          color: this.palette().star,
        });
      }, 120);
    }

    // 2. Upward fountain of festive confetti & shimmering stars straight from the bow
    this.spawnBurst(gx, gy - g.h * 0.25, g.colors.ribbon, 32, true);
    for (let i = 0; i < 8; i++) {
      this.spawnCursorSparkle(gx, gy - g.h * 0.35, (Math.random() - 0.5) * 90, true);
    }

    // 3. Launch celebratory fireworks rising directly from the gift box into the sky
    const targetX1 = Math.max(
      this.width * 0.15,
      Math.min(this.width * 0.85, gx + (Math.random() - 0.5) * 180),
    );
    const targetY1 = this.height * (0.14 + Math.random() * 0.18);
    this.launchFirework(targetX1, targetY1, gx, gy - g.h * 0.4);

    if (!this.reducedMotion) {
      this.schedule(() => {
        const targetX2 = Math.max(
          this.width * 0.16,
          Math.min(this.width * 0.84, gx + (Math.random() - 0.5) * 260),
        );
        const targetY2 = this.height * (0.12 + Math.random() * 0.2);
        this.launchFirework(targetX2, targetY2, gx, gy - g.h * 0.4);
      }, 220);
    }

    // 4. Subtle celebratory ripple sway on tree baubles
    for (let i = 0; i < this.baubles.length; i++) {
      const b = this.baubles[i]!;
      b.angularVel += (i % 2 === 0 ? 1 : -1) * (0.14 + b.yNorm * 0.14);
    }

    this.callbacks.onGiftClick?.(giftIndex);
  }

  public triggerGiftEffect(index = 0): void {
    if (this.disposed || !this.gifts.length) return;
    const giftIndex = ((index % this.gifts.length) + this.gifts.length) % this.gifts.length;
    this.celebrateGift(giftIndex);
  }

  private readonly onResize = () => {
    if (this.resizeTimer !== null) clearTimeout(this.resizeTimer);
    this.resizeTimer = window.setTimeout(() => this.resize(), 180);
  };

  private readonly onMotionChange = (e: MediaQueryListEvent) => {
    this.reducedMotion = e.matches;
  };

  private readonly onVisibilityChange = () => {
    if (this.disposed) return;
    if (document.hidden) {
      if (this.rafId !== null) {
        cancelAnimationFrame(this.rafId);
        this.rafId = null;
      }
    } else {
      this.lastFrame = performance.now();
      this.start();
    }
  };

  private readonly onPointerMove = (e: PointerEvent) => {
    if (this.disposed || e.pointerType === 'touch') return;
    const nx = e.clientX;
    const ny = e.clientY;
    const wasInactive = !this.pointer.active;
    this.pointer.vx = nx - this.pointer.x;
    this.pointer.x = nx;
    this.pointer.y = ny;
    this.pointer.active = true;

    if (wasInactive) {
      this.cursorSmooth.x = nx;
      this.cursorSmooth.y = ny;
      this.lastTrailPos.x = nx;
      this.lastTrailPos.y = ny;
    }

    if (!this.reducedMotion) {
      const moved = Math.hypot(nx - this.lastTrailPos.x, ny - this.lastTrailPos.y);
      if (moved >= 13) {
        this.lastTrailPos.x = nx;
        this.lastTrailPos.y = ny;
        this.spawnCursorSparkle(nx, ny, this.pointer.vx);
      }
    }

    let overInteractive = false;
    const targetEl = e.target as HTMLElement | null;
    if (targetEl && targetEl !== this.canvas && targetEl.closest('button, a, input')) {
      overInteractive = true;
    }

    const { cx, topY } = this.treeMetrics();
    const starX = cx + this.swayOffset(0);
    if (Math.hypot(nx - starX, ny - (topY - 8)) < 36) {
      overInteractive = true;
    }

    for (const b of this.baubles) {
      const bx = cx + b.relX + this.swayOffset(b.yNorm);
      const by = topY + b.relY;
      const dist = Math.hypot(nx - bx, ny - by);
      if (dist < b.radius + 22) {
        const push = Math.max(-0.18, Math.min(0.18, this.pointer.vx * 0.015));
        b.angularVel += push || (nx < bx ? 0.09 : -0.09);
      }
      if (dist < b.radius + 14) {
        overInteractive = true;
      }
    }

    this.hoveredGift = this.hitTestGift(nx, ny);
    if (this.hoveredGift !== -1) overInteractive = true;
    this.cursorSmooth.overInteractive = overInteractive;

    const nextCursor = overInteractive
      ? 'pointer'
      : ny < this.height * 0.72
        ? 'crosshair'
        : 'default';
    if (this.canvas.style.cursor !== nextCursor) {
      this.canvas.style.cursor = nextCursor;
    }
  };

  private readonly onPointerDown = (e: PointerEvent) => {
    if (this.disposed || this.reducedMotion) return;
    const pal = this.palette();
    if (this.cursorRipples.length >= 8) this.cursorRipples.shift();
    this.cursorRipples.push({
      x: e.clientX,
      y: e.clientY,
      life: 0,
      maxLife: 0.45,
      color: pal.star,
    });
    for (let i = 0; i < 6; i++) {
      this.spawnCursorSparkle(e.clientX, e.clientY, (Math.random() - 0.5) * 40, true);
    }
  };

  private readonly onPointerLeave = () => {
    this.pointer.active = false;
    this.cursorSmooth.overInteractive = false;
    this.hoveredGift = -1;
    this.canvas.style.cursor = 'default';
  };

  private readonly onClick = (e: MouseEvent) => {
    if (this.disposed) return;
    this.handleCanvasClick(e.clientX, e.clientY);
  };

  private bindEvents(): void {
    window.addEventListener('resize', this.onResize);
    this.motionQuery.addEventListener('change', this.onMotionChange);
    document.addEventListener('visibilitychange', this.onVisibilityChange);
    window.addEventListener('pointermove', this.onPointerMove, { passive: true });
    window.addEventListener('pointerdown', this.onPointerDown, { passive: true });
    document.addEventListener('pointerleave', this.onPointerLeave);
    window.addEventListener('blur', this.onPointerLeave);
    this.canvas.addEventListener('click', this.onClick);
  }

  public destroy(): void {
    this.disposed = true;
    if (this.rafId !== null) {
      cancelAnimationFrame(this.rafId);
      this.rafId = null;
    }
    if (this.resizeTimer !== null) {
      clearTimeout(this.resizeTimer);
      this.resizeTimer = null;
    }
    for (const id of this.pendingTimers) {
      clearTimeout(id);
    }
    this.pendingTimers.clear();

    window.removeEventListener('resize', this.onResize);
    this.motionQuery.removeEventListener('change', this.onMotionChange);
    document.removeEventListener('visibilitychange', this.onVisibilityChange);
    window.removeEventListener('pointermove', this.onPointerMove);
    window.removeEventListener('pointerdown', this.onPointerDown);
    document.removeEventListener('pointerleave', this.onPointerLeave);
    window.removeEventListener('blur', this.onPointerLeave);
    this.canvas.removeEventListener('click', this.onClick);
    this.canvas.style.cursor = 'default';

    for (const tier of this.tierCaches) this.releaseCanvas(tier.canvas);
    this.tierCaches = [];
    for (const s of this.cloudSprites) this.releaseSprite(s);
    this.cloudSprites = [];
    for (const s of this.baubleSprites.values()) this.releaseSprite(s);
    this.baubleSprites.clear();
    for (const s of this.giftSprites) this.releaseSprite(s);
    this.giftSprites = [];
    for (const s of this.bulbSprites.values()) this.releaseCanvas(s);
    this.bulbSprites.clear();

    this.treeBaseSprite = this.releaseSprite(this.treeBaseSprite);
    this.starTopperSprite = this.releaseSprite(this.starTopperSprite);
    this.backdropCanvas = this.releaseCanvas(this.backdropCanvas);
    this.starHaloSprite = this.releaseCanvas(this.starHaloSprite);
    this.starGlintSprite = this.releaseCanvas(this.starGlintSprite);
    this.groundGlowSprite = this.releaseCanvas(this.groundGlowSprite);
    this.softShadowSprite = this.releaseCanvas(this.softShadowSprite);
    this.snowBlurSprite = this.releaseCanvas(this.snowBlurSprite);
    this.smokePuffSprite = this.releaseCanvas(this.smokePuffSprite);
    this.windowGlowSprite = this.releaseCanvas(this.windowGlowSprite);

    this.smokePuffs = [];
    this.cottageWindows = [];
  }

  private hitTestGift(x: number, y: number): number {
    const { cx, baseY } = this.treeMetrics();
    for (let i = this.gifts.length - 1; i >= 0; i--) {
      const g = this.gifts[i]!;
      const gx = cx + g.relX;
      const gy = baseY + g.relY;
      if (
        x >= gx - g.w * 0.6 &&
        x <= gx + g.w * 0.6 &&
        y >= gy - g.h * 1.15 &&
        y <= gy + g.h * 0.35
      ) {
        return i;
      }
    }
    return -1;
  }

  private handleCanvasClick(x: number, y: number): void {
    const { cx, topY } = this.treeMetrics();
    const starX = cx + this.swayOffset(0);

    if (Math.hypot(x - starX, y - (topY - 8)) < 36) {
      this.spawnBurst(starX, topY - 8, this.palette().star, 28, true);
      this.callbacks.onStarClick?.();
      return;
    }

    for (let i = 0; i < this.baubles.length; i++) {
      const b = this.baubles[i]!;
      const bx = cx + b.relX + this.swayOffset(b.yNorm);
      const by = topY + b.relY;
      if (Math.hypot(x - bx, y - by) < b.radius + 14) {
        b.angularVel += x < bx ? 0.38 : -0.38;
        this.spawnBurst(bx, by, b.color, 14, true);
        this.callbacks.onBaubleClick?.(i);
        return;
      }
    }

    const giftIndex = this.hitTestGift(x, y);
    if (giftIndex !== -1) {
      this.celebrateGift(giftIndex);
      return;
    }

    if (y < this.height * 0.72) {
      this.launchFirework(x, y);
      this.callbacks.onSkyFirework?.();
    } else {
      this.spawnBurst(x, y, this.palette().star, 12, true);
    }
  }

  private pushParticle(particle: Particle): void {
    const maxParticles = this.reducedMotion ? MAX_PARTICLES_REDUCED : MAX_PARTICLES_NORMAL;
    if (this.particles.length >= maxParticles) {
      this.particles.shift();
    }
    this.particles.push(particle);
  }

  private spawnCursorSparkle(x: number, y: number, vxHint = 0, burst = false): void {
    const MAX_CURSOR_SPARKLES = 48;
    if (this.cursorSparkles.length >= MAX_CURSOR_SPARKLES) {
      this.cursorSparkles.shift();
    }
    const pal = this.palette();
    const angle = Math.random() * Math.PI * 2;
    const speed = burst ? 35 + Math.random() * 75 : 8 + Math.random() * 24;
    const palettePool = [pal.star, pal.confetti[0]!, pal.confetti[2]!, pal.confetti[3]!];
    const color = palettePool[Math.floor(Math.random() * palettePool.length)]!;

    this.cursorSparkles.push({
      x: x + (Math.random() - 0.5) * 6,
      y: y + (Math.random() - 0.5) * 6,
      vx: Math.cos(angle) * speed + vxHint * 0.45,
      vy: Math.sin(angle) * speed + (burst ? -12 : 12),
      life: 0,
      maxLife: burst ? 0.5 + Math.random() * 0.25 : 0.45 + Math.random() * 0.35,
      size: burst ? 3.2 + Math.random() * 2.5 : 2.2 + Math.random() * 2.8,
      color,
      isStar: Math.random() > 0.38,
      rot: Math.random() * Math.PI,
      vRot: (Math.random() - 0.5) * 4.5,
    });
  }

  private spawnBurst(x: number, y: number, color: string, count = 18, confetti = false): void {
    const actualCount = this.reducedMotion ? Math.ceil(count * 0.4) : count;
    const pal = this.palette();
    for (let i = 0; i < actualCount; i++) {
      const angle = (Math.PI * 2 * i) / actualCount + (Math.random() - 0.5) * 0.45;
      const speed = 42 + Math.random() * 145;
      this.pushParticle({
        x,
        y,
        vx: Math.cos(angle) * speed,
        vy: Math.sin(angle) * speed - 26,
        life: 0,
        maxLife: 0.7 + Math.random() * 0.6,
        size: 2.2 + Math.random() * 3.0,
        color: confetti && i % 3 === 0 ? pal.confetti[i % pal.confetti.length]! : color,
        isConfetti: confetti && i % 2 === 0,
        rot: Math.random() * Math.PI * 2,
        vRot: (Math.random() - 0.5) * 8,
      });
    }
  }

  public resize(force = false): void {
    if (this.disposed) return;
    const nextW = window.innerWidth;
    const nextH = window.innerHeight;
    const nextDpr = this.computeDpr(nextW, nextH);
    if (
      !force &&
      Math.abs(nextW - this.width) < 2 &&
      Math.abs(nextH - this.height) < 2 &&
      nextDpr === this.dpr
    ) {
      return;
    }

    this.dpr = nextDpr;
    this.width = nextW;
    this.height = nextH;
    this.canvas.width = Math.floor(this.width * this.dpr);
    this.canvas.height = Math.floor(this.height * this.dpr);
    this.treeCenterX = this.targetTreeX();

    this.buildThemeGlowSprites();
    this.buildStaticBackdrop();
    this.initStarsAndClouds();
    this.initSnow();
    this.buildTreeAssets();
  }

  private initStarsAndClouds(): void {
    const count = Math.floor((this.width * this.height) / 18000);
    this.stars = Array.from({ length: Math.min(85, Math.max(32, count)) }, () => ({
      x: Math.random() * this.width,
      y: Math.random() * this.height * 0.65,
      r: 0.8 + Math.random() * 1.3,
      phase: Math.random() * Math.PI * 2,
      speed: 0.8 + Math.random() * 1.6,
    }));

    this.clouds = Array.from({ length: 4 }, (_, idx) => ({
      x: (this.width / 3.5) * idx + Math.random() * 90,
      y: this.height * (0.1 + (idx % 3) * 0.08),
      scale: 0.72 + Math.random() * 0.45,
      speed: 4.5 + Math.random() * 4.5,
      spriteIdx: idx % 3,
    }));
  }

  private initSnow(): void {
    const multiplier =
      this.snowIntensity === 'light' ? 0.5 : this.snowIntensity === 'blizzard' ? 1.65 : 1;
    const baseCount = Math.floor((this.width * this.height) / 18000);
    const count = Math.min(120, Math.max(24, Math.floor(baseCount * multiplier)));

    this.bgSnow = [];
    this.fgSnow = [];
    for (let i = 0; i < count; i++) {
      const depth = Math.random();
      const flake: Snowflake = {
        x: Math.random() * this.width,
        y: Math.random() * this.height,
        r: 1.2 + depth * 2.9,
        depth,
        vy: (18 + depth * 40) * (this.snowIntensity === 'blizzard' ? 1.35 : 1),
        vx: (Math.random() - 0.5) * 14,
        swayAmp: 7 + depth * 14,
        swayFreq: 0.6 + Math.random() * 0.9,
        phase: Math.random() * Math.PI * 2,
        alpha: 0.4 + depth * 0.52,
        blur: depth > 0.86,
      };
      if (depth < 0.36) this.bgSnow.push(flake);
      else this.fgSnow.push(flake);
    }
  }

  private buildTreeBaseSprite(pal: ThemePalette, treeWidth: number, treeHeight: number): void {
    this.treeBaseSprite = this.releaseSprite(this.treeBaseSprite);

    const rugRx = treeWidth * 0.46;
    const rugRy = 23;
    const potTopW = Math.max(48, treeWidth * 0.21);
    const potBotW = potTopW * 0.72;
    const potH = Math.max(30, treeHeight * 0.088);
    const trunkW = Math.max(18, treeWidth * 0.08);
    const trunkH = Math.max(26, treeHeight * 0.09);

    const w = Math.ceil(rugRx * 2 + 44);
    const topSpace = Math.ceil(trunkH + potH + 34);
    const botSpace = Math.ceil(rugRy + 32);
    const h = topSpace + botSpace;
    const cx = w / 2;
    const baseY = topSpace;

    const off = document.createElement('canvas');
    off.width = Math.ceil(w * this.dpr);
    off.height = Math.ceil(h * this.dpr);
    const octx = off.getContext('2d');
    if (!octx) return;
    octx.scale(this.dpr, this.dpr);
    octx.translate(cx, baseY);

    // 1. Braided Wool/Jute Rug
    octx.fillStyle = 'rgba(24, 34, 48, 0.22)';
    octx.beginPath();
    octx.ellipse(4, 19, rugRx + 5, rugRy + 3, 0, 0, Math.PI * 2);
    octx.fill();

    const rugGrad = octx.createRadialGradient(-rugRx * 0.25, 11, 8, 0, 16, rugRx);
    rugGrad.addColorStop(0, mixColor(pal.rugColor, '#fffaf0', 0.3));
    rugGrad.addColorStop(0.65, pal.rugColor);
    rugGrad.addColorStop(1, shadeColor(pal.rugColor, -0.26, 0.12));
    octx.fillStyle = rugGrad;
    octx.beginPath();
    octx.ellipse(0, 16, rugRx, rugRy, 0, 0, Math.PI * 2);
    octx.fill();

    // Concentric braided weave rings
    for (let ring = 0; ring < 6; ring++) {
      const f = 0.94 - ring * 0.13;
      octx.strokeStyle = 'rgba(62, 46, 32, 0.16)';
      octx.lineWidth = 2.4;
      octx.setLineDash([]);
      octx.beginPath();
      octx.ellipse(0, 16, rugRx * f, rugRy * f, 0, 0, Math.PI * 2);
      octx.stroke();

      octx.strokeStyle =
        ring % 2 === 0
          ? mixColor(pal.rugColor, '#fffdf7', 0.42)
          : shadeColor(pal.rugColor, -0.18);
      octx.lineWidth = 1.7;
      octx.setLineDash([6, 4]);
      octx.lineDashOffset = ring * 5;
      octx.beginPath();
      octx.ellipse(0, 16, rugRx * f, rugRy * f, 0, 0, Math.PI * 2);
      octx.stroke();
    }
    octx.setLineDash([]);

    // Nordic woven terracotta accent ring
    octx.strokeStyle = mixColor(pal.potColor, pal.rugColor, 0.45, 0.62);
    octx.lineWidth = 2.2;
    octx.beginPath();
    octx.ellipse(0, 16, rugRx * 0.84, rugRy * 0.84, 0, 0, Math.PI * 2);
    octx.stroke();

    // Soft tree canopy shadow on rug
    const canopySh = octx.createRadialGradient(14, 16, 4, 14, 16, treeWidth * 0.35);
    canopySh.addColorStop(0, 'rgba(14, 24, 22, 0.36)');
    canopySh.addColorStop(1, 'rgba(14, 24, 22, 0)');
    octx.fillStyle = canopySh;
    octx.beginPath();
    octx.ellipse(14, 16, treeWidth * 0.35, 14, 0, 0, Math.PI * 2);
    octx.fill();

    // 2. Realistic Tapering Conifer Trunk with Root Flare, Bark Plates & Knots
    const trunkTopY = -trunkH - 22;
    const baseHalfW = trunkW * 0.64;
    const topHalfW = trunkW * 0.44;
    const trunkBotY = -potH + 17;

    octx.save();
    octx.beginPath();
    octx.moveTo(-topHalfW, trunkTopY);
    octx.bezierCurveTo(
      -topHalfW * 1.02,
      trunkTopY + trunkH * 0.45,
      -baseHalfW * 0.92,
      trunkBotY - 8,
      -baseHalfW,
      trunkBotY,
    );
    octx.quadraticCurveTo(0, trunkBotY + 3.5, baseHalfW, trunkBotY);
    octx.bezierCurveTo(
      baseHalfW * 0.92,
      trunkBotY - 8,
      topHalfW * 1.04,
      trunkTopY + trunkH * 0.45,
      topHalfW,
      trunkTopY,
    );
    octx.closePath();

    // Rich cylindrical conifer bark shading (warm cinnamon-brown sunlit left -> cool umber shadow right)
    const trunkGrad = octx.createLinearGradient(-baseHalfW, 0, baseHalfW, 0);
    trunkGrad.addColorStop(0, '#3a2214');
    trunkGrad.addColorStop(0.24, '#7d5436');
    trunkGrad.addColorStop(0.45, '#5e3c24');
    trunkGrad.addColorStop(0.76, '#331e11');
    trunkGrad.addColorStop(0.92, '#1f120a');
    trunkGrad.addColorStop(1, '#3b2619'); // subtle snow rim bounce
    octx.fillStyle = trunkGrad;
    octx.fill();

    // Clip to trunk silhouette for realistic fissured bark plates, cracks & wood knots
    octx.clip();
    const barkRng = mulberry32(5519);

    // Overlapping bark scale plates (dark furrow shadow + sunlit warm left ridge)
    for (let p = 0; p < 18; p++) {
      const px = (barkRng() - 0.5) * trunkW * 1.15;
      const py = trunkTopY + barkRng() * (trunkBotY - trunkTopY);
      const pw = 2.4 + barkRng() * 3.4;
      const ph = 7 + barkRng() * 12;
      const litFactor = clamp01(0.72 - px / Math.max(1, baseHalfW));

      // Bark plate body
      octx.fillStyle = mixColor('#28160c', '#825a3c', litFactor * 0.72, 0.55);
      octx.beginPath();
      octx.roundRect(px - pw * 0.5, py, pw, ph, 1.4);
      octx.fill();

      // Deep dark bark fissure crack on right side of plate
      octx.strokeStyle = 'rgba(18, 9, 4, 0.62)';
      octx.lineWidth = 0.9;
      octx.beginPath();
      octx.moveTo(px + pw * 0.45, py + 1);
      octx.lineTo(px + pw * 0.38, py + ph - 1);
      octx.stroke();

      // Sunlit ochre/lichen ridge highlight on left-facing bark plates
      if (litFactor > 0.48) {
        octx.strokeStyle = `rgba(176, 134, 94, ${(0.28 + litFactor * 0.28).toFixed(2)})`;
        octx.lineWidth = 0.85;
        octx.beginPath();
        octx.moveTo(px - pw * 0.45, py + 1);
        octx.lineTo(px - pw * 0.4, py + ph - 1.5);
        octx.stroke();
      }
    }

    // 2 subtle wooden branch-stub knots
    for (const knot of [
      { x: -trunkW * 0.14, y: trunkTopY + trunkH * 0.58, r: 2.3 },
      { x: trunkW * 0.16, y: trunkTopY + trunkH * 0.78, r: 1.9 },
    ]) {
      octx.fillStyle = '#24130a';
      octx.beginPath();
      octx.ellipse(knot.x, knot.y, knot.r, knot.r * 1.35, 0.15, 0, Math.PI * 2);
      octx.fill();
      octx.strokeStyle = 'rgba(148, 108, 72, 0.45)';
      octx.lineWidth = 0.7;
      octx.beginPath();
      octx.ellipse(knot.x - 0.5, knot.y, knot.r * 1.15, knot.r * 1.5, 0.15, Math.PI * 0.7, Math.PI * 1.6);
      octx.stroke();
    }

    // Deep ambient occlusion cast by overhanging lowest spruce boughs
    const trunkAO = octx.createLinearGradient(0, trunkTopY, 0, trunkTopY + trunkH * 0.62);
    trunkAO.addColorStop(0, 'rgba(6, 18, 12, 0.84)');
    trunkAO.addColorStop(0.55, 'rgba(10, 22, 16, 0.35)');
    trunkAO.addColorStop(1, 'rgba(10, 22, 16, 0)');
    octx.fillStyle = trunkAO;
    octx.fillRect(-baseHalfW - 2, trunkTopY, baseHalfW * 2 + 4, trunkH * 0.64);
    octx.restore();

    // 3. 3D Cylindrical Terracotta Planter Pot
    const potTopY = -potH + 15;
    const potFootAO = octx.createRadialGradient(4, 16, 2, 4, 16, potBotW * 0.7);
    potFootAO.addColorStop(0, 'rgba(18, 12, 8, 0.56)');
    potFootAO.addColorStop(1, 'rgba(18, 12, 8, 0)');
    octx.fillStyle = potFootAO;
    octx.beginPath();
    octx.ellipse(4, 16, potBotW * 0.7, 7, 0, 0, Math.PI * 2);
    octx.fill();

    // Inner recessed soil, moss cushions & fallen pine needles around trunk base
    octx.fillStyle = '#24140d';
    octx.beginPath();
    octx.ellipse(0, potTopY - 2, potTopW * 0.49, 5.4, 0, 0, Math.PI * 2);
    octx.fill();
    octx.fillStyle = '#382519';
    octx.beginPath();
    octx.ellipse(0, potTopY - 1, potTopW * 0.45, 4.2, 0, 0, Math.PI * 2);
    octx.fill();
    for (let m = 0; m < 7; m++) {
      const mx = -potTopW * 0.34 + (m / 6) * potTopW * 0.68;
      octx.fillStyle = m % 2 === 0 ? '#2b4d34' : '#3a6242';
      octx.beginPath();
      octx.ellipse(mx, potTopY - 1.2 + (m % 3) * 0.6, 5.2, 2.1, 0, 0, Math.PI * 2);
      octx.fill();
    }

    // Curved cylindrical pot body
    const potGrad = octx.createLinearGradient(-potTopW / 2, 0, potTopW / 2, 0);
    potGrad.addColorStop(0, shadeColor(pal.potColor, -0.18));
    potGrad.addColorStop(0.24, mixColor(pal.potColor, '#ffebd4', 0.44));
    potGrad.addColorStop(0.5, pal.potColor);
    potGrad.addColorStop(0.82, shadeColor(pal.potColor, -0.46, 0.14));
    potGrad.addColorStop(1, shadeColor(pal.potColor, -0.22, -0.04));

    octx.save();
    octx.beginPath();
    octx.moveTo(-potTopW / 2, potTopY);
    octx.quadraticCurveTo(0, potTopY + 5, potTopW / 2, potTopY);
    octx.lineTo(potBotW / 2, potTopY + potH);
    octx.quadraticCurveTo(0, potTopY + potH + 5, -potBotW / 2, potTopY + potH);
    octx.closePath();
    octx.fillStyle = potGrad;
    octx.fill();

    // Porous clay mineral grain & under-rim overhang shadow
    octx.clip();
    const rng = mulberry32(7711);
    for (let s = 0; s < 80; s++) {
      octx.fillStyle = rng() > 0.5 ? 'rgba(255,244,228,0.08)' : 'rgba(48,20,10,0.08)';
      octx.fillRect((rng() - 0.5) * potTopW, potTopY + rng() * potH, 1.3, 1.3);
    }
    const rimAO = octx.createLinearGradient(0, potTopY, 0, potTopY + 8);
    rimAO.addColorStop(0, 'rgba(38, 14, 8, 0.5)');
    rimAO.addColorStop(1, 'rgba(38, 14, 8, 0)');
    octx.fillStyle = rimAO;
    octx.fillRect(-potTopW / 2, potTopY, potTopW, 8);
    octx.restore();

    // Rolled cylindrical rim collar
    const rimW = potTopW + 9;
    const rimH = 9.5;
    const rimGrad = octx.createLinearGradient(-rimW / 2, 0, rimW / 2, 0);
    rimGrad.addColorStop(0, shadeColor(pal.potRim, -0.15));
    rimGrad.addColorStop(0.24, mixColor(pal.potRim, '#fff2df', 0.5));
    rimGrad.addColorStop(0.5, pal.potRim);
    rimGrad.addColorStop(0.84, shadeColor(pal.potRim, -0.4, 0.12));
    rimGrad.addColorStop(1, shadeColor(pal.potRim, -0.2));

    octx.fillStyle = rimGrad;
    octx.beginPath();
    octx.roundRect(-rimW / 2, potTopY - rimH + 2, rimW, rimH, 4.5);
    octx.fill();

    // Crisp warm highlight along upper-left rim
    octx.strokeStyle = 'rgba(255, 246, 230, 0.65)';
    octx.lineWidth = 1.1;
    octx.beginPath();
    octx.moveTo(-rimW * 0.44, potTopY - rimH + 3.2);
    octx.lineTo(rimW * 0.14, potTopY - rimH + 3.2);
    octx.stroke();

    this.treeBaseSprite = { canvas: off, w, h, anchorX: cx, anchorY: baseY };
  }

  private buildBaubleSprite(color: string, patternType: number, r: number): SpriteAsset {
    const pad = 8;
    const w = Math.ceil(r * 2 + pad * 2);
    const h = Math.ceil(r * 3.2 + pad * 2);
    const anchorX = w / 2;
    const anchorY = pad;
    const cy = r * 1.55;

    const off = document.createElement('canvas');
    off.width = Math.ceil(w * this.dpr);
    off.height = Math.ceil(h * this.dpr);
    const octx = off.getContext('2d');
    if (!octx) return { canvas: off, w, h, anchorX, anchorY };

    octx.scale(this.dpr, this.dpr);
    octx.translate(anchorX, anchorY);

    // 1. Metallic hanging wire & top eyelet
    octx.strokeStyle = '#c89e46';
    octx.lineWidth = 1.05;
    octx.beginPath();
    octx.arc(0, 1.5, 1.6, 0, Math.PI * 2);
    octx.moveTo(0, 3);
    octx.lineTo(0, cy - r - 3.5);
    octx.stroke();

    // 2. Fluted metallic brass crown cap
    octx.strokeStyle = '#f2d27a';
    octx.lineWidth = 1.1;
    octx.beginPath();
    octx.arc(0, cy - r - 3.6, 2.1, 0, Math.PI * 2);
    octx.stroke();

    const capW = r * 0.56;
    const capH = Math.max(3.6, r * 0.34);
    const capY = cy - r - capH * 0.7;
    const capGrad = octx.createLinearGradient(-capW / 2, 0, capW / 2, 0);
    capGrad.addColorStop(0, '#755012');
    capGrad.addColorStop(0.26, '#fff0a8');
    capGrad.addColorStop(0.52, '#c99632');
    capGrad.addColorStop(0.82, '#593a0b');
    capGrad.addColorStop(1, '#a67824');
    octx.fillStyle = capGrad;
    octx.beginPath();
    octx.roundRect(-capW / 2, capY, capW, capH, 1.4);
    octx.fill();

    // 3. 3D Spherical Glass Body
    octx.save();
    octx.beginPath();
    octx.arc(0, cy, r, 0, Math.PI * 2);
    octx.clip();

    const sphereGrad = octx.createRadialGradient(-r * 0.34, cy - r * 0.34, r * 0.08, 0, cy, r * 1.12);
    sphereGrad.addColorStop(0, mixColor(color, '#fff6e0', 0.62));
    sphereGrad.addColorStop(0.26, mixColor(color, '#ffffff', 0.16));
    sphereGrad.addColorStop(0.62, color);
    sphereGrad.addColorStop(0.86, shadeColor(color, -0.52, 0.24));
    sphereGrad.addColorStop(1, shadeColor(color, -0.24, -0.06));
    octx.fillStyle = sphereGrad;
    octx.fillRect(-r - 1, cy - r - 1, r * 2 + 2, r * 2 + 2);

    // Subtle collar cast shadow under brass cap
    octx.fillStyle = 'rgba(15, 10, 5, 0.42)';
    octx.beginPath();
    octx.ellipse(0, cy - r + 1.2, capW * 0.62, 1.8, 0, 0, Math.PI * 2);
    octx.fill();

    // Painted artisan gold/frost 3D curved wrap patterns
    const goldBand = octx.createLinearGradient(-r, 0, r, 0);
    goldBand.addColorStop(0, '#8f681d');
    goldBand.addColorStop(0.35, '#fff2b5');
    goldBand.addColorStop(0.75, '#c28c29');
    goldBand.addColorStop(1, '#6d4810');

    if (patternType === 0) {
      octx.strokeStyle = 'rgba(255, 250, 240, 0.26)';
      octx.lineWidth = r * 0.36;
      octx.beginPath();
      octx.moveTo(-r, cy);
      octx.quadraticCurveTo(0, cy + r * 0.24, r, cy);
      octx.stroke();

      octx.strokeStyle = goldBand;
      octx.lineWidth = 0.85;
      octx.beginPath();
      octx.moveTo(-r, cy - r * 0.18);
      octx.quadraticCurveTo(0, cy + r * 0.06, r, cy - r * 0.18);
      octx.moveTo(-r, cy + r * 0.18);
      octx.quadraticCurveTo(0, cy + r * 0.42, r, cy + r * 0.18);
      octx.stroke();
    } else if (patternType === 1) {
      octx.strokeStyle = goldBand;
      octx.lineWidth = 1.2;
      octx.beginPath();
      octx.moveTo(-r, cy);
      octx.quadraticCurveTo(0, cy + r * 0.22, r, cy);
      octx.stroke();

      for (const ox of [-r * 0.45, 0, r * 0.45]) {
        const oy = cy + (1 - Math.abs(ox / r)) * r * 0.11;
        octx.fillStyle = ox <= 0 ? 'rgba(255, 244, 196, 0.84)' : 'rgba(242, 212, 134, 0.5)';
        this.drawFourPointStar(octx, ox, oy, 1.9, 0);
      }
    } else {
      octx.strokeStyle = 'rgba(255, 253, 248, 0.22)';
      octx.lineWidth = 1.1;
      for (const curve of [-0.45, 0, 0.45]) {
        octx.beginPath();
        octx.moveTo(0, cy - r);
        octx.quadraticCurveTo(curve * r * 1.15, cy, 0, cy + r);
        octx.stroke();
      }
    }

    // Crisp 4-pane reflected winter window crescent
    octx.save();
    octx.translate(-r * 0.34, cy - r * 0.34);
    octx.rotate(-0.58);
    const winGrad = octx.createLinearGradient(0, -r * 0.22, 0, r * 0.22);
    winGrad.addColorStop(0, 'rgba(255, 255, 250, 0.94)');
    winGrad.addColorStop(1, 'rgba(255, 252, 242, 0.38)');
    octx.fillStyle = winGrad;
    octx.beginPath();
    octx.ellipse(0, 0, r * 0.26, r * 0.17, 0, 0, Math.PI * 2);
    octx.fill();

    // Window pane cross-bar mullion
    octx.strokeStyle = mixColor(color, '#ffffff', 0.25, 0.48);
    octx.lineWidth = 0.8;
    octx.beginPath();
    octx.moveTo(-r * 0.26, 0);
    octx.lineTo(r * 0.26, 0);
    octx.moveTo(0, -r * 0.17);
    octx.lineTo(0, r * 0.17);
    octx.stroke();
    octx.restore();

    // Pinpoint secondary glint
    octx.fillStyle = 'rgba(255, 255, 255, 0.84)';
    octx.beginPath();
    octx.arc(-r * 0.52, cy - r * 0.1, Math.max(0.9, r * 0.085), 0, Math.PI * 2);
    octx.fill();

    // Warm bottom-right bounce rim light
    octx.strokeStyle = 'rgba(255, 242, 206, 0.3)';
    octx.lineWidth = Math.max(1.1, r * 0.14);
    octx.beginPath();
    octx.arc(0, cy, r * 0.88, 0.14 * Math.PI, 0.56 * Math.PI);
    octx.stroke();

    octx.restore();

    // Delicate Fresnel edge outline
    octx.strokeStyle = 'rgba(20, 26, 30, 0.24)';
    octx.lineWidth = 0.75;
    octx.beginPath();
    octx.arc(0, cy, r, 0, Math.PI * 2);
    octx.stroke();

    return { canvas: off, w, h, anchorX, anchorY };
  }

  private buildGiftSprite(w: number, h: number, colors: (typeof GIFT_COLORS)[number]): SpriteAsset {
    const fw = w * 0.78;
    const fh = h * 0.86;
    const dx = w * 0.28;
    const dy = -h * 0.24;
    const ov = 2.6;
    const lidH = Math.max(7, fh * 0.24);
    const rw = Math.max(6, fw * 0.18);

    const padX = 24;
    const padTop = 32;
    const padBot = 14;
    const cw = Math.ceil(fw + dx + padX * 2);
    const ch = Math.ceil(fh - dy + padTop + padBot);
    const originX = padX + fw / 2;
    const originY = ch - padBot;
    const anchorX = originX + dx * 0.35;
    const anchorY = originY;

    const off = document.createElement('canvas');
    off.width = Math.ceil(cw * this.dpr);
    off.height = Math.ceil(ch * this.dpr);
    const octx = off.getContext('2d');
    if (!octx) return { canvas: off, w: cw, h: ch, anchorX, anchorY };

    octx.scale(this.dpr, this.dpr);
    octx.translate(originX, originY);

    // 1. Lit Front Face
    const frontGrad = octx.createLinearGradient(-fw / 2, -fh, fw / 2, 0);
    frontGrad.addColorStop(0, mixColor(colors.box, '#fff8eb', 0.14));
    frontGrad.addColorStop(1, shadeColor(colors.box, -0.06));
    octx.fillStyle = frontGrad;
    octx.fillRect(-fw / 2, -fh, fw, fh);

    // 2. Shaded Right Side Face
    const sideGrad = octx.createLinearGradient(fw / 2, -fh, fw / 2 + dx, dy);
    sideGrad.addColorStop(0, colors.side);
    sideGrad.addColorStop(1, shadeColor(colors.side, -0.28, 0.16));
    octx.fillStyle = sideGrad;
    octx.beginPath();
    octx.moveTo(fw / 2, -fh);
    octx.lineTo(fw / 2 + dx, -fh + dy);
    octx.lineTo(fw / 2 + dx, dy);
    octx.lineTo(fw / 2, 0);
    octx.closePath();
    octx.fill();

    // 3. Under-Lid Overhang AO Shadow
    const lidAOY = -fh + lidH - 2;
    const frontAO = octx.createLinearGradient(0, lidAOY, 0, lidAOY + 5);
    frontAO.addColorStop(0, 'rgba(16, 18, 24, 0.34)');
    frontAO.addColorStop(1, 'rgba(16, 18, 24, 0)');
    octx.fillStyle = frontAO;
    octx.fillRect(-fw / 2, lidAOY, fw, 5);

    octx.fillStyle = 'rgba(14, 16, 22, 0.38)';
    octx.beginPath();
    octx.moveTo(fw / 2, lidAOY);
    octx.lineTo(fw / 2 + dx, lidAOY + dy);
    octx.lineTo(fw / 2 + dx, lidAOY + dy + 4.5);
    octx.lineTo(fw / 2, lidAOY + 4.5);
    octx.closePath();
    octx.fill();

    // 4. Silky 4-Stop Satin Ribbon Body Wraps
    const satinFront = octx.createLinearGradient(-rw / 2, 0, rw / 2, 0);
    satinFront.addColorStop(0, shadeColor(colors.ribbon, -0.18));
    satinFront.addColorStop(0.32, mixColor(colors.ribbon, '#ffffff', 0.46));
    satinFront.addColorStop(0.68, colors.ribbon);
    satinFront.addColorStop(1, shadeColor(colors.ribbon, -0.22));
    octx.fillStyle = satinFront;
    octx.fillRect(-rw / 2, -fh, rw, fh);

    const sideRibStart = 0.38;
    const sideRibEnd = 0.64;
    octx.fillStyle = shadeColor(colors.ribbon, -0.26, 0.12);
    octx.beginPath();
    octx.moveTo(fw / 2 + dx * sideRibStart, -fh + dy * sideRibStart);
    octx.lineTo(fw / 2 + dx * sideRibEnd, -fh + dy * sideRibEnd);
    octx.lineTo(fw / 2 + dx * sideRibEnd, dy * sideRibEnd);
    octx.lineTo(fw / 2 + dx * sideRibStart, dy * sideRibStart);
    octx.closePath();
    octx.fill();

    // 5. 3D Overhanging Box Lid
    const lidTopY = -fh - 2;
    octx.fillStyle = mixColor(colors.box, '#fff8eb', 0.2);
    octx.fillRect(-fw / 2 - ov, lidTopY, fw + ov * 2, lidH);

    octx.fillStyle = mixColor(colors.side, colors.box, 0.22);
    octx.beginPath();
    octx.moveTo(fw / 2 + ov, lidTopY);
    octx.lineTo(fw / 2 + ov + dx, lidTopY + dy);
    octx.lineTo(fw / 2 + ov + dx, lidTopY + dy + lidH);
    octx.lineTo(fw / 2 + ov, lidTopY + lidH);
    octx.closePath();
    octx.fill();

    // Sunlit Top Lid Parallelogram
    const topGrad = octx.createLinearGradient(-fw / 2 - ov, lidTopY, fw / 2 + dx, lidTopY + dy);
    topGrad.addColorStop(0, mixColor(colors.box, '#fffaf0', 0.4));
    topGrad.addColorStop(1, mixColor(colors.box, '#ffffff', 0.12));
    octx.fillStyle = topGrad;
    octx.beginPath();
    octx.moveTo(-fw / 2 - ov, lidTopY);
    octx.lineTo(fw / 2 + ov, lidTopY);
    octx.lineTo(fw / 2 + ov + dx, lidTopY + dy);
    octx.lineTo(-fw / 2 - ov + dx, lidTopY + dy);
    octx.closePath();
    octx.fill();

    // Lid Ribbon Cross-Straps
    octx.fillStyle = satinFront;
    octx.fillRect(-rw / 2, lidTopY, rw, lidH);

    // Top lid front-to-back ribbon
    octx.fillStyle = mixColor(colors.ribbon, '#ffffff', 0.34);
    octx.beginPath();
    octx.moveTo(-rw / 2, lidTopY);
    octx.lineTo(rw / 2, lidTopY);
    octx.lineTo(rw / 2 + dx, lidTopY + dy);
    octx.lineTo(-rw / 2 + dx, lidTopY + dy);
    octx.closePath();
    octx.fill();

    // Top lid left-to-right ribbon
    octx.fillStyle = mixColor(colors.ribbon, '#ffffff', 0.22);
    octx.beginPath();
    octx.moveTo(-fw / 2 - ov + dx * sideRibStart, lidTopY + dy * sideRibStart);
    octx.lineTo(fw / 2 + ov + dx * sideRibStart, lidTopY + dy * sideRibStart);
    octx.lineTo(fw / 2 + ov + dx * sideRibEnd, lidTopY + dy * sideRibEnd);
    octx.lineTo(-fw / 2 - ov + dx * sideRibEnd, lidTopY + dy * sideRibEnd);
    octx.closePath();
    octx.fill();

    // Lid side ribbon
    octx.fillStyle = shadeColor(colors.ribbon, -0.22, 0.1);
    octx.beginPath();
    octx.moveTo(fw / 2 + ov + dx * sideRibStart, lidTopY + dy * sideRibStart);
    octx.lineTo(fw / 2 + ov + dx * sideRibEnd, lidTopY + dy * sideRibEnd);
    octx.lineTo(fw / 2 + ov + dx * sideRibEnd, lidTopY + dy * sideRibEnd + lidH);
    octx.lineTo(fw / 2 + ov + dx * sideRibStart, lidTopY + dy * sideRibStart + lidH);
    octx.closePath();
    octx.fill();

    // Crisp top-edge specular lid highlight
    octx.strokeStyle = 'rgba(255, 253, 246, 0.62)';
    octx.lineWidth = 1;
    octx.beginPath();
    octx.moveTo(-fw / 2 - ov + dx, lidTopY + dy);
    octx.lineTo(-fw / 2 - ov, lidTopY);
    octx.lineTo(fw / 2 + ov, lidTopY);
    octx.stroke();

    // 6. Sculpted 3D 4-Loop Satin Bow + Curled Tails + Kraft Gift Tag
    const bowX = dx * 0.5;
    const bowY = lidTopY + dy * 0.5;

    // Bow AO on lid
    octx.fillStyle = 'rgba(18, 16, 22, 0.28)';
    octx.beginPath();
    octx.ellipse(bowX + 2, bowY + 2, rw * 1.45, rw * 0.55, 0, 0, Math.PI * 2);
    octx.fill();

    // 2 Curled tails draping forward
    octx.strokeStyle = shadeColor(colors.ribbon, -0.14);
    octx.lineWidth = 3.2;
    octx.lineCap = 'round';
    octx.beginPath();
    octx.moveTo(bowX - 1, bowY + 1);
    octx.bezierCurveTo(bowX - 9, bowY + 5, bowX - 10, bowY + 11, bowX - 14, bowY + 14);
    octx.moveTo(bowX + 1, bowY + 1);
    octx.bezierCurveTo(bowX + 8, bowY + 5, bowX + 10, bowY + 11, bowX + 13, bowY + 14);
    octx.stroke();

    const drawLoop = (dir: number, span: number, arch: number, rear: boolean) => {
      const grad = octx.createLinearGradient(bowX, bowY - arch, bowX + dir * span, bowY + 2);
      grad.addColorStop(0, mixColor(colors.ribbon, '#ffffff', rear ? 0.24 : 0.52));
      grad.addColorStop(0.55, rear ? shadeColor(colors.ribbon, -0.14) : colors.ribbon);
      grad.addColorStop(1, shadeColor(colors.ribbon, -0.34));
      octx.fillStyle = grad;
      octx.beginPath();
      octx.moveTo(bowX, bowY);
      octx.bezierCurveTo(
        bowX + dir * span * 0.35,
        bowY - arch * 1.25,
        bowX + dir * span * 1.15,
        bowY - arch * 0.65,
        bowX + dir * span,
        bowY + 1,
      );
      octx.bezierCurveTo(
        bowX + dir * span * 0.85,
        bowY + arch * 0.45,
        bowX + dir * span * 0.28,
        bowY + 2,
        bowX,
        bowY + 1,
      );
      octx.closePath();
      octx.fill();

      if (!rear) {
        // Inner dark fabric fold crescent for 3D depth
        octx.fillStyle = shadeColor(colors.ribbon, -0.46, 0.12);
        octx.beginPath();
        octx.ellipse(
          bowX + dir * span * 0.52,
          bowY - arch * 0.08,
          span * 0.24,
          arch * 0.16,
          dir * -0.22,
          0,
          Math.PI * 2,
        );
        octx.fill();
      }
    };

    drawLoop(-1, 10.5, 9, true);
    drawLoop(1, 10.5, 9, true);
    drawLoop(-1, 13.5, 7.5, false);
    drawLoop(1, 13.5, 7.5, false);

    // Central silk knot
    const knotGrad = octx.createRadialGradient(bowX - 1.5, bowY - 1.5, 0.5, bowX, bowY, rw * 0.6);
    knotGrad.addColorStop(0, mixColor(colors.ribbon, '#ffffff', 0.55));
    knotGrad.addColorStop(0.65, colors.ribbon);
    knotGrad.addColorStop(1, shadeColor(colors.ribbon, -0.32));
    octx.fillStyle = knotGrad;
    octx.beginPath();
    octx.ellipse(bowX, bowY, rw * 0.52, rw * 0.4, 0, 0, Math.PI * 2);
    octx.fill();

    // Notched paper gift tag
    octx.save();
    octx.translate(bowX + 6, bowY + 3);
    octx.rotate(0.28);
    octx.fillStyle = colors.tag;
    octx.fillRect(0, 0, 7.5, 10.5);
    octx.strokeStyle = 'rgba(28, 36, 32, 0.22)';
    octx.lineWidth = 0.7;
    octx.strokeRect(0, 0, 7.5, 10.5);
    octx.fillStyle = '#8b683e';
    octx.beginPath();
    octx.arc(3.75, 2.2, 0.9, 0, Math.PI * 2);
    octx.fill();
    octx.strokeStyle = 'rgba(84, 62, 42, 0.45)';
    octx.beginPath();
    octx.moveTo(1.8, 5.5);
    octx.lineTo(5.8, 5.5);
    octx.moveTo(1.8, 7.8);
    octx.lineTo(4.8, 7.8);
    octx.stroke();
    octx.restore();

    return { canvas: off, w: cw, h: ch, anchorX, anchorY };
  }

  /**
   * Draws a realistic botanical Norway Spruce / Nordmann Fir bough spray:
   * tapering woody cinnamon-brown twig spine, feathery forward-angled sub-shoots,
   * and radiating V-paired conifer needles with directional golden sunlight & blue-spruce shadow.
   */
  private drawBotanicalSpruceBranch(
    octx: CanvasRenderingContext2D,
    startX: number,
    startY: number,
    endX: number,
    endY: number,
    sag: number,
    depthLayer: 'back' | 'mid' | 'front',
    lit: number,
    pal: ThemePalette,
    rng: () => number,
  ): void {
    const dx = endX - startX;
    const dy = endY - startY;
    const len = Math.hypot(dx, dy);
    if (len < 6) return;

    const ctrlX = (startX + endX) * 0.5;
    const ctrlY = (startY + endY) * 0.5 + sag;

    const evalPt = (u: number) => {
      const inv = 1 - u;
      return {
        x: inv * inv * startX + 2 * inv * u * ctrlX + u * u * endX,
        y: inv * inv * startY + 2 * inv * u * ctrlY + u * u * endY,
        tx: 2 * inv * (ctrlX - startX) + 2 * u * (endX - ctrlX),
        ty: 2 * inv * (ctrlY - startY) + 2 * u * (endY - ctrlY),
      };
    };

    // Natural multi-tone botanical fir pigments (blue-spruce interior -> warm olive-fir outer tips)
    const darkVoid = shadeColor(pal.treeDark, -0.42, 0.28);
    const coolSpruce = mixColor(pal.treeDark, '#17483e', 0.42);
    const warmFir = mixColor(pal.treeMid, '#356c44', 0.36);
    const sunlitTip = pal.isLight
      ? mixColor(pal.treeLight, '#8cb86f', 0.44)
      : mixColor(pal.treeLight, '#69a68b', 0.28);

    const drawShootNeedles = (
      sx: number,
      sy: number,
      ang: number,
      shootLen: number,
      needleLen: number,
      layerLit: number,
      showTwig: boolean,
    ) => {
      const steps = Math.max(4, Math.floor(shootLen / 2.6));
      const ex = sx + Math.cos(ang) * shootLen;
      const ey = sy + Math.sin(ang) * shootLen;

      // Sub-pass 1: Deep underside shadow needles
      octx.strokeStyle = depthLayer === 'back' ? darkVoid : coolSpruce;
      octx.lineWidth = depthLayer === 'front' ? 1.5 : 1.7;
      octx.beginPath();
      for (let s = 0; s <= steps; s++) {
        const u = s / steps;
        const px = sx + (ex - sx) * u;
        const py = sy + (ey - sy) * u;
        const taper = 0.45 + 0.55 * Math.sin(u * Math.PI * 0.85 + 0.15);
        const nl = needleLen * taper;
        const spread = 0.52 + (1 - u) * 0.25;

        octx.moveTo(px, py);
        octx.lineTo(px + Math.cos(ang + spread) * nl, py + Math.sin(ang + spread) * nl);
        octx.moveTo(px, py);
        octx.lineTo(px + Math.cos(ang - spread) * nl, py + Math.sin(ang - spread) * nl);
      }
      octx.stroke();

      // Sub-pass 2: Subtle woody cinnamon-brown branchlet core peeking between needles
      if (showTwig && depthLayer !== 'back') {
        octx.strokeStyle = layerLit > 0.5 ? '#66432a' : '#3a2416';
        octx.lineWidth = Math.max(1.0, shootLen * 0.048);
        octx.beginPath();
        octx.moveTo(sx, sy);
        octx.lineTo(sx + (ex - sx) * 0.78, sy + (ey - sy) * 0.78);
        octx.stroke();
      }

      // Sub-pass 3: Main lush mid-fir needles (with slight organic hue variance per spray)
      const sprayColor =
        depthLayer === 'back'
          ? mixColor(darkVoid, coolSpruce, 0.45 + layerLit * 0.25)
          : mixColor(coolSpruce, warmFir, 0.28 + layerLit * 0.62);
      octx.strokeStyle = sprayColor;
      octx.lineWidth = depthLayer === 'front' ? 1.25 : 1.35;
      octx.beginPath();
      for (let s = 1; s <= steps; s++) {
        const u = s / steps;
        const px = sx + (ex - sx) * u;
        const py = sy + (ey - sy) * u;
        const taper = 0.42 + 0.58 * Math.sin(u * Math.PI * 0.88 + 0.12);
        const nl = needleLen * 0.92 * taper;
        const spread = 0.42 + (1 - u) * 0.22;

        octx.moveTo(px, py - 0.5);
        octx.lineTo(
          px + Math.cos(ang + spread * 0.85) * nl,
          py - 0.5 + Math.sin(ang + spread * 0.85) * nl,
        );
        octx.moveTo(px, py - 0.5);
        octx.lineTo(
          px + Math.cos(ang - spread * 0.85) * nl,
          py - 0.5 + Math.sin(ang - spread * 0.85) * nl,
        );
      }
      octx.stroke();

      // Sub-pass 4: Warm sunlit upper-edge needle highlights (on front & sunlit mid sprays)
      if (depthLayer !== 'back' && layerLit > 0.34) {
        const hlAlpha = clamp01((layerLit - 0.24) * 0.95);
        octx.strokeStyle = mixColor(pal.treeLight, sunlitTip, layerLit, hlAlpha);
        octx.lineWidth = 0.95;
        octx.beginPath();
        for (let s = Math.floor(steps * 0.25); s <= steps; s++) {
          const u = s / steps;
          const px = sx + (ex - sx) * u;
          const py = sy + (ey - sy) * u;
          const nl = needleLen * (0.55 + 0.4 * u);
          // Favor upper/left-facing needles catching key light
          const topAng = ang - 0.34;
          const fwdAng = ang + 0.14;
          octx.moveTo(px - 0.4, py - 0.8);
          octx.lineTo(px - 0.4 + Math.cos(topAng) * nl, py - 0.8 + Math.sin(topAng) * nl);
          if (u > 0.65) {
            octx.moveTo(px, py - 0.6);
            octx.lineTo(px + Math.cos(fwdAng) * (nl * 0.85), py - 0.6 + Math.sin(fwdAng) * (nl * 0.85));
          }
        }
        octx.stroke();
      }
    };

    // Main branchlet woody spine (visible near inner bough)
    if (depthLayer !== 'back') {
      octx.strokeStyle = lit > 0.5 ? '#5c3c26' : '#321f12';
      octx.lineWidth = Math.max(1.6, len * 0.045);
      octx.beginPath();
      octx.moveTo(startX, startY);
      octx.quadraticCurveTo(ctrlX, ctrlY, endX - dx * 0.12, endY - dy * 0.12);
      octx.stroke();
    }

    // Spawn feathery lateral sub-shoots along the curved bough
    const subPairs = Math.max(3, Math.floor(len / 13));
    for (let k = 1; k <= subPairs; k++) {
      const u = k / (subPairs + 0.4);
      const pt = evalPt(u);
      const tangent = Math.atan2(pt.ty, pt.tx);
      const subLen = len * (0.34 - u * 0.16) * (0.85 + rng() * 0.3);
      const needleLen = 5.5 + (1 - u * 0.35) * 4.5;
      const localLit = clamp01(lit + (u - 0.4) * 0.18 + (rng() - 0.5) * 0.1);

      drawShootNeedles(pt.x, pt.y, tangent + 0.58 + (rng() - 0.5) * 0.16, subLen, needleLen, localLit * 0.85, false);
      drawShootNeedles(pt.x, pt.y, tangent - 0.56 + (rng() - 0.5) * 0.16, subLen, needleLen, localLit, false);
    }

    // Lush terminal tip shoot (curling slightly upward like live Norway spruce)
    const tip = evalPt(0.55);
    const tipAng = Math.atan2(endY - tip.y, endX - tip.x) - 0.08;
    const tipLen = Math.hypot(endX - tip.x, endY - tip.y) * 1.15;
    drawShootNeedles(tip.x, tip.y, tipAng, tipLen, 7.5 + rng() * 2.5, clamp01(lit + 0.14), true);
  }

  private drawPineCone(
    octx: CanvasRenderingContext2D,
    x: number,
    y: number,
    scale: number,
    tilt: number,
    hasSnow: boolean,
  ): void {
    octx.save();
    octx.translate(x, y);
    octx.rotate(tilt);
    octx.scale(scale, scale);

    // Subtle shadow behind cone
    octx.fillStyle = 'rgba(10, 18, 12, 0.36)';
    octx.beginPath();
    octx.ellipse(1.5, 6.5, 4.4, 6.8, 0, 0, Math.PI * 2);
    octx.fill();

    // Base dark woody oval
    octx.fillStyle = '#3b2110';
    octx.beginPath();
    octx.ellipse(0, 6, 4.1, 6.5, 0, 0, Math.PI * 2);
    octx.fill();

    // Overlapping diamond pine-cone scales (top to bottom)
    for (let row = 0; row < 5; row++) {
      const ry = 1.6 + row * 2.3;
      const rowW = Math.sin(((row + 0.7) / 5.5) * Math.PI) * 3.8;
      const cols = row === 0 || row === 4 ? 2 : 3;
      for (let c = 0; c < cols; c++) {
        const cx = -rowW + (c / (cols - 1)) * rowW * 2;
        const isLit = cx <= 0.2;
        octx.fillStyle = isLit ? '#8a5933' : '#57331a';
        octx.beginPath();
        octx.ellipse(cx, ry, 1.55, 1.25, 0, 0, Math.PI * 2);
        octx.fill();
        if (isLit) {
          octx.fillStyle = '#b68356';
          octx.beginPath();
          octx.arc(cx - 0.35, ry - 0.35, 0.55, 0, Math.PI * 2);
          octx.fill();
        }
      }
    }

    // Tiny dusting of snow on upper-left crown of cone
    if (hasSnow) {
      octx.fillStyle = 'rgba(255, 253, 248, 0.88)';
      octx.beginPath();
      octx.ellipse(-1.2, 1.4, 2.3, 1.2, -0.3, 0, Math.PI * 2);
      octx.fill();
    }

    octx.restore();
  }

  private buildTreeAssets(): void {
    const pal = this.palette();
    const { treeHeight, treeWidth } = this.treeMetrics();
    const tierCount = 11;

    // 1. Pre-bake tree base (braided rug + fissured bark trunk + 3D terracotta pot)
    this.buildTreeBaseSprite(pal, treeWidth, treeHeight);

    // 2. Pre-bake 11 organic botanical conifer bough tiers (feathery radiating spruce sprays + pine cones + powdery snow)
    for (const prev of this.tierCaches) this.releaseCanvas(prev.canvas);
    this.tierCaches = [];

    for (let i = 0; i < tierCount; i++) {
      const rng = mulberry32(12041 + i * 419);
      const t = i / (tierCount - 1);
      // Natural slightly irregular conifer taper (slender feathered spire at top, lush wide skirt below)
      const taperCurve = Math.pow(t, 0.88);
      const w = treeWidth * (0.16 + taperCurve * 0.86) * (0.96 + rng() * 0.08);
      const h = (treeHeight / tierCount) * (1.85 + t * 0.45);
      const pad = 40;
      const cw = Math.ceil(w + pad * 2);
      const ch = Math.ceil(h + pad * 2);

      const off = document.createElement('canvas');
      off.width = Math.floor(cw * this.dpr);
      off.height = Math.floor(ch * this.dpr);
      const octx = off.getContext('2d');
      if (!octx) continue;
      octx.scale(this.dpr, this.dpr);
      octx.lineCap = 'round';
      octx.lineJoin = 'round';

      const cx = cw / 2;
      const topY = pad * 0.42;

      // Layer 0: Deep organic interior foliage shadow core (prevents see-through gaps, never a stiff triangle!)
      const coreGrad = octx.createRadialGradient(
        cx - w * 0.12,
        topY + h * 0.42,
        w * 0.05,
        cx,
        topY + h * 0.56,
        Math.max(w * 0.52, h * 0.65),
      );
      coreGrad.addColorStop(0, shadeColor(pal.treeDark, -0.35, 0.25));
      coreGrad.addColorStop(0.65, shadeColor(pal.treeDark, -0.52, 0.28, 0.94));
      coreGrad.addColorStop(1, 'rgba(6, 20, 14, 0)');
      octx.fillStyle = coreGrad;
      octx.beginPath();
      octx.ellipse(cx, topY + h * 0.62, w * 0.44, h * 0.46, 0, 0, Math.PI * 2);
      octx.fill();

      // Subtle inner dark woody trunk peek in center crevices (tiers 2..10)
      if (i >= 2) {
        const innerTrunkW = Math.max(4, treeWidth * 0.068 * (0.3 + t * 0.72));
        const itGrad = octx.createLinearGradient(cx - innerTrunkW / 2, 0, cx + innerTrunkW / 2, 0);
        itGrad.addColorStop(0, '#4f3320');
        itGrad.addColorStop(0.5, '#2b1a0f');
        itGrad.addColorStop(1, '#160d07');
        octx.fillStyle = itGrad;
        octx.fillRect(cx - innerTrunkW / 2, topY + h * 0.1, innerTrunkW, h * 0.72);
      }

      // Layer 1: Under-tier AO drop shadow onto the tier below
      const aoGrad = octx.createRadialGradient(cx + 3, topY + h * 0.88, 6, cx + 3, topY + h * 0.88, w * 0.5);
      aoGrad.addColorStop(0, `rgba(4, 16, 11, ${pal.isLight ? 0.42 : 0.6})`);
      aoGrad.addColorStop(1, 'rgba(4, 16, 11, 0)');
      octx.fillStyle = aoGrad;
      octx.beginPath();
      octx.ellipse(cx + 3, topY + h * 0.9, w * 0.46, h * 0.22, 0, 0, Math.PI * 2);
      octx.fill();

      // Layer 2: Back-depth dark outer boughs (creating organic feathery silhouette!)
      const backBranches = Math.max(4, Math.floor(4 + t * 7));
      for (let b = 0; b < backBranches; b++) {
        const frac = backBranches === 1 ? 0.5 : b / (backBranches - 1);
        const side = frac * 2 - 1; // -1 (left) to +1 (right)
        const reach = w * (0.48 + (1 - Math.abs(side)) * 0.06) * (0.88 + rng() * 0.2);
        const startX = cx + side * w * 0.06;
        const startY = topY + h * (0.28 + rng() * 0.24);
        const endX = cx + side * reach;
        const endY = topY + h * (0.72 + (1 - Math.abs(side)) * 0.22 + (rng() - 0.5) * 0.1);
        const lit = clamp01(0.52 - side * 0.35);
        this.drawBotanicalSpruceBranch(
          octx,
          startX,
          startY,
          endX,
          endY,
          h * (0.14 + rng() * 0.08),
          'back',
          lit,
          pal,
          rng,
        );
      }

      // Layer 3: Mid-canopy sweeping spruce boughs (rich natural fir & blue-spruce variation)
      const midBranches = Math.max(5, Math.floor(5 + t * 9));
      const snowAnchors: Array<{ x: number; y: number; size: number; side: number }> = [];
      for (let b = 0; b < midBranches; b++) {
        const frac = midBranches === 1 ? 0.5 : b / (midBranches - 1);
        const side = frac * 2 - 1;
        const reach = w * (0.44 + (1 - Math.abs(side)) * 0.04) * (0.86 + rng() * 0.24);
        const startX = cx + side * w * 0.04;
        const startY = topY + h * (0.22 + (1 - Math.abs(side)) * 0.14 + rng() * 0.12);
        const endX = cx + side * reach;
        const endY = topY + h * (0.68 + (1 - Math.abs(side)) * 0.25 + (rng() - 0.5) * 0.08);
        const lit = clamp01(0.66 - side * 0.44);
        this.drawBotanicalSpruceBranch(
          octx,
          startX,
          startY,
          endX,
          endY,
          h * (0.16 + rng() * 0.08),
          'mid',
          lit,
          pal,
          rng,
        );
        if (b % 2 === 0 || Math.abs(side) > 0.72) {
          snowAnchors.push({
            x: startX + (endX - startX) * (0.62 + rng() * 0.22),
            y: startY + (endY - startY) * (0.62 + rng() * 0.22) + 2,
            size: 0.75 + t * 0.45,
            side,
          });
        }
      }

      // Layer 4: Natural hanging brown pine cones nestled under mid boughs (tiers 2..9)
      if (i >= 2 && i <= 9) {
        const coneCount = i % 2 === 0 ? 2 : 1;
        for (let cc = 0; cc < coneCount; cc++) {
          const cSide = cc === 0 ? (i % 2 === 0 ? -0.58 : 0.42) : 0.62;
          const coneX = cx + cSide * w * 0.42 + (rng() - 0.5) * 8;
          const coneY = topY + h * (0.68 + rng() * 0.14);
          this.drawPineCone(
            octx,
            coneX,
            coneY,
            0.72 + t * 0.32,
            cSide * 0.18 + (rng() - 0.5) * 0.14,
            cSide < 0.2,
          );
        }
      }

      // Layer 5: Front cascading sunlit spruce sprays (gives lush 3D overlapping fullness!)
      const frontBranches = Math.max(4, Math.floor(4 + t * 7));
      for (let b = 0; b < frontBranches; b++) {
        const frac = frontBranches === 1 ? 0.5 : b / (frontBranches - 1);
        const side = (frac * 2 - 1) * 0.88;
        const reach = w * (0.36 + (1 - Math.abs(side)) * 0.12) * (0.86 + rng() * 0.2);
        const startX = cx + side * w * 0.08;
        const startY = topY + h * (0.32 + (1 - Math.abs(side)) * 0.12);
        const endX = cx + side * reach;
        const endY = topY + h * (0.76 + (1 - Math.abs(side)) * 0.22);
        const lit = clamp01(0.76 - side * 0.45);
        this.drawBotanicalSpruceBranch(
          octx,
          startX,
          startY,
          endX,
          endY,
          h * (0.14 + rng() * 0.08),
          'front',
          lit,
          pal,
          rng,
        );
      }

      // Leader spire shoot on very top tier (i === 0) so the treetop tapers naturally into the brass star!
      if (i === 0) {
        this.drawBotanicalSpruceBranch(
          octx,
          cx,
          topY + h * 0.48,
          cx,
          topY - 8,
          0,
          'front',
          0.82,
          pal,
          rng,
        );
      }

      // Layer 6: Organic Powdery Snow Drifts & Frosted Needle Dusting resting naturally on bough tips
      for (const anchor of snowAnchors) {
        const scw = (10 + rng() * 9) * anchor.size;
        const sch = (3.4 + rng() * 2.5) * anchor.size;
        const sx = anchor.x;
        const sy = anchor.y;

        // Soft feathered snow drift clinging to upper edge of bough
        const driftGrad = octx.createLinearGradient(sx, sy - sch, sx, sy + sch * 0.8);
        if (pal.isLight) {
          driftGrad.addColorStop(0, 'rgba(255, 254, 250, 0.94)');
          driftGrad.addColorStop(0.58, 'rgba(235, 243, 250, 0.88)');
          driftGrad.addColorStop(1, 'rgba(164, 194, 218, 0.72)');
        } else {
          driftGrad.addColorStop(0, 'rgba(230, 240, 252, 0.86)');
          driftGrad.addColorStop(0.6, 'rgba(155, 182, 212, 0.78)');
          driftGrad.addColorStop(1, 'rgba(84, 112, 150, 0.62)');
        }

        octx.fillStyle = driftGrad;
        octx.beginPath();
        octx.moveTo(sx - scw * 0.55, sy + 0.5);
        octx.quadraticCurveTo(sx - scw * 0.25, sy - sch * 1.1, sx, sy - sch * 0.65);
        octx.quadraticCurveTo(sx + scw * 0.28, sy - sch * 0.95, sx + scw * 0.55, sy + 1);
        octx.quadraticCurveTo(sx, sy + sch * 0.35, sx - scw * 0.55, sy + 0.5);
        octx.closePath();
        octx.fill();

        // Fine hoarfrost needle flecks dusting out below the snowdrift
        octx.strokeStyle = pal.isLight ? 'rgba(255, 254, 250, 0.62)' : 'rgba(218, 232, 248, 0.45)';
        octx.lineWidth = 0.85;
        octx.beginPath();
        for (let f = 0; f < 4; f++) {
          const fx = sx - scw * 0.38 + (f / 3) * scw * 0.76;
          const fang = Math.PI * 0.5 + anchor.side * 0.55 + (rng() - 0.5) * 0.4;
          octx.moveTo(fx, sy);
          octx.lineTo(fx + Math.cos(fang) * 4.5, sy + Math.sin(fang) * 4.5);
        }
        octx.stroke();
      }

      this.tierCaches.push({
        canvas: off,
        w: cw,
        h: ch,
        tierY: t * treeHeight * 0.79,
        yNorm: t,
      });
    }

    // 3. Pre-render warm glow sprites per fairy light color
    for (const prev of this.bulbSprites.values()) this.releaseCanvas(prev);
    this.bulbSprites.clear();
    for (const color of new Set(pal.lights)) {
      const spriteSize = 48;
      const sc = document.createElement('canvas');
      sc.width = spriteSize;
      sc.height = spriteSize;
      const sctx = sc.getContext('2d');
      if (!sctx) continue;
      const half = spriteSize / 2;
      const halo = sctx.createRadialGradient(half, half, 2, half, half, half);
      halo.addColorStop(0, pal.isLight ? color : '#ffffff');
      halo.addColorStop(0.35, color);
      halo.addColorStop(1, 'rgba(0, 0, 0, 0)');
      sctx.fillStyle = halo;
      sctx.fillRect(0, 0, spriteSize, spriteSize);
      this.bulbSprites.set(color, sc);
    }

    const alreadyDecorated = this.introTime >= this.introDuration;

    // 4. 78 Fairy Bulbs along catenary spiral
    this.bulbs = [];
    const totalBulbs = 78;
    for (let i = 0; i < totalBulbs; i++) {
      const progress = (i + 0.5) / totalBulbs;
      const yNorm = 0.08 + progress * 0.84;
      const coneHalfW = treeWidth * 0.43 * yNorm;
      const spiral = Math.sin(progress * Math.PI * 10.5);
      const relX = spiral * coneHalfW;
      const relY = yNorm * treeHeight + Math.abs(Math.cos(progress * Math.PI * 10.5)) * 11;

      this.bulbs.push({
        relX,
        relY,
        yNorm,
        color: pal.lights[i % pal.lights.length]!,
        phase: Math.random() * Math.PI * 2,
        speed: 1.5 + Math.random() * 2.0,
        size: 3.1 + Math.random() * 1.1,
        index: i,
        litSpawned: alreadyDecorated,
      });
    }

    // 5. 18 Realistic 3D Glass Baubles + Pre-baked Sprites
    for (const prev of this.baubleSprites.values()) this.releaseSprite(prev);
    this.baubleSprites.clear();

    this.baubles = [];
    const baubleCount = 18;
    for (let i = 0; i < baubleCount; i++) {
      const row = 0.16 + (i / (baubleCount - 1)) * 0.72;
      const halfW = treeWidth * 0.36 * row;
      const side = (i % 2 === 0 ? 1 : -1) * (0.28 + ((i * 37) % 62) / 100);
      const radius = 7.2 + (i % 3) * 2.2;
      const color = pal.baubles[i % pal.baubles.length]!;
      const patternType = i % 3;
      const spriteKey = `${color}|${patternType}|${Math.round(radius * 2)}`;
      if (!this.baubleSprites.has(spriteKey)) {
        this.baubleSprites.set(spriteKey, this.buildBaubleSprite(color, patternType, radius));
      }

      this.baubles.push({
        relX: side * halfW,
        relY: row * treeHeight,
        yNorm: row,
        radius,
        color,
        patternType,
        spriteKey,
        angle: 0,
        angularVel: 0,
        placed: alreadyDecorated,
      });
    }

    // 6. 5 Pre-baked 3D Wrapped Gift Box Sprites
    for (const prev of this.giftSprites) this.releaseSprite(prev);
    this.giftSprites = [];

    const scale = Math.min(1, treeWidth / 340);
    const giftSpecs = [
      { relX: -108, relY: 14, w: 48, h: 40 },
      { relX: -54, relY: 22, w: 40, h: 32 },
      { relX: 54, relY: 20, w: 52, h: 42 },
      { relX: 110, relY: 14, w: 38, h: 32 },
      { relX: 2, relY: 28, w: 38, h: 28 },
    ];
    this.gifts = giftSpecs.map((spec, idx) => {
      const w = spec.w * scale;
      const h = spec.h * scale;
      const colors = GIFT_COLORS[idx % GIFT_COLORS.length]!;
      this.giftSprites.push(this.buildGiftSprite(w, h, colors));
      return {
        relX: spec.relX * scale,
        relY: spec.relY * scale,
        w,
        h,
        colors,
        bounce: 0,
        glow: 0,
        placed: alreadyDecorated,
      };
    });
  }

  private start(): void {
    if (this.rafId !== null || this.disposed) return;
    const tick = (now: number) => {
      if (this.disposed) return;
      const dt = Math.min(0.05, Math.max(0, (now - this.lastFrame) / 1000));
      this.lastFrame = now;
      this.update(dt);
      this.draw();
      this.rafId = requestAnimationFrame(tick);
    };
    this.rafId = requestAnimationFrame(tick);
  }

  private update(dt: number): void {
    this.time += dt;

    if (this.introTime < this.introDuration) {
      this.introTime = Math.min(this.introDuration, this.introTime + dt);
    }

    const targetX = this.targetTreeX();
    this.treeCenterX += (targetX - this.treeCenterX) * Math.min(1, dt * 5.5);

    const targetLight = this.lightsOn ? 1 : 0;
    this.lightBrightness += (targetLight - this.lightBrightness) * Math.min(1, dt * 6);

    // Smooth damped pointer parallax for clouds, smoke & snow depth layers
    const targetParallax =
      this.pointer.active && !this.reducedMotion
        ? (this.pointer.x / Math.max(1, this.width) - 0.5) * 2
        : 0;
    this.parallaxX += (targetParallax - this.parallaxX) * Math.min(1, dt * 3.0);

    if (!this.reducedMotion) {
      for (const c of this.clouds) {
        c.x += c.speed * dt;
        if (c.x - 120 > this.width) c.x = -120;
      }
      // Advance zero-GC chimney smoke puff pool
      for (const puff of this.smokePuffs) {
        puff.age = (puff.age + dt) % puff.maxLife;
      }
    }

    // Continuous festive fireworks throughout New Year's Day (Jan 1)
    if (this.celebrationMode && !this.reducedMotion) {
      this.autoFireworkTimer -= dt;
      if (this.autoFireworkTimer <= 0) {
        this.launchFirework();
        if (Math.random() < 0.45) {
          this.schedule(() => this.launchFirework(), 260);
        }
        this.autoFireworkTimer = 0.85 + Math.random() * 0.9;
      }
    }

    if (!this.reducedMotion && !this.palette().isLight) {
      this.shootingStarTimer -= dt;
      if (this.shootingStarTimer <= 0) {
        this.shootingStars.push({
          x: this.width * (0.12 + Math.random() * 0.65),
          y: this.height * (0.06 + Math.random() * 0.24),
          vx: 340 + Math.random() * 200,
          vy: 100 + Math.random() * 80,
          life: 0,
          maxLife: 0.65 + Math.random() * 0.35,
        });
        this.shootingStarTimer = 6 + Math.random() * 7;
      }
    }

    for (let i = this.shootingStars.length - 1; i >= 0; i--) {
      const st = this.shootingStars[i]!;
      st.life += dt;
      st.x += st.vx * dt;
      st.y += st.vy * dt;
      if (st.life >= st.maxLife) this.shootingStars.splice(i, 1);
    }

    for (const b of this.baubles) {
      const spring = -18 * b.angle;
      const damping = -2.8 * b.angularVel;
      b.angularVel += (spring + damping) * dt;
      b.angle += b.angularVel * dt;
      b.angle = Math.max(-0.55, Math.min(0.55, b.angle));
    }

    for (const g of this.gifts) {
      if (g.bounce > 0) g.bounce = Math.max(0, g.bounce - dt * 1.9);
      if (g.glow > 0) g.glow = Math.max(0, g.glow - dt * 1.15);
    }

    const windOffset = this.pointer.active ? (this.pointer.x / Math.max(1, this.width) - 0.5) * 26 : 0;
    const speedFactor = this.reducedMotion ? 0.35 : 1;

    const stepSnow = (arr: Snowflake[]) => {
      for (const f of arr) {
        f.y += f.vy * speedFactor * dt;
        f.x +=
          (f.vx + windOffset + Math.sin(this.time * f.swayFreq + f.phase) * f.swayAmp) *
          speedFactor *
          dt;
        if (f.y > this.height + 10) {
          f.y = -10;
          f.x = Math.random() * this.width;
        }
        if (f.x > this.width + 12) f.x = -12;
        if (f.x < -12) f.x = this.width + 12;
      }
    };
    stepSnow(this.bgSnow);
    stepSnow(this.fgSnow);

    for (let i = this.particles.length - 1; i >= 0; i--) {
      const p = this.particles[i]!;
      p.life += dt;
      if (p.life >= p.maxLife) {
        this.particles.splice(i, 1);
        continue;
      }
      p.vy += (p.isConfetti ? 120 : 155) * dt;
      p.x += p.vx * dt;
      p.y += p.vy * dt;
      p.vx *= 0.985;
      p.rot += p.vRot * dt;
    }

    for (let i = this.fireworks.length - 1; i >= 0; i--) {
      const fw = this.fireworks[i]!;
      fw.trail.push({ x: fw.x, y: fw.y });
      if (fw.trail.length > 8) fw.trail.shift();

      fw.vy += 420 * dt;
      fw.x += fw.vx * dt;
      fw.y += fw.vy * dt;

      if (fw.vy >= -25 || fw.y <= fw.targetY) {
        this.explodeFirework(fw);
        this.fireworks.splice(i, 1);
      }
    }

    // Smooth cursor halo & sparkle trail
    const follow = Math.min(1, dt * 16);
    this.cursorSmooth.x += (this.pointer.x - this.cursorSmooth.x) * follow;
    this.cursorSmooth.y += (this.pointer.y - this.cursorSmooth.y) * follow;
    const targetAlpha = this.pointer.active && !this.reducedMotion ? 1 : 0;
    this.cursorSmooth.alpha += (targetAlpha - this.cursorSmooth.alpha) * Math.min(1, dt * 10);
    const targetScale = this.cursorSmooth.overInteractive ? 1.45 : 1;
    this.cursorSmooth.ringScale += (targetScale - this.cursorSmooth.ringScale) * Math.min(1, dt * 12);

    for (let i = this.cursorSparkles.length - 1; i >= 0; i--) {
      const sp = this.cursorSparkles[i]!;
      sp.life += dt;
      if (sp.life >= sp.maxLife) {
        this.cursorSparkles.splice(i, 1);
        continue;
      }
      sp.vy += 38 * dt;
      sp.x += sp.vx * dt;
      sp.y += sp.vy * dt;
      sp.vx *= 0.96;
      sp.rot += sp.vRot * dt;
    }

    for (let i = this.cursorRipples.length - 1; i >= 0; i--) {
      const rp = this.cursorRipples[i]!;
      rp.life += dt;
      if (rp.life >= rp.maxLife) {
        this.cursorRipples.splice(i, 1);
      }
    }
  }

  private explodeFirework(fw: FireworkRocket): void {
    const pal = this.palette();
    const count = this.reducedMotion ? 18 : 42;
    for (let i = 0; i < count; i++) {
      const angle = (Math.PI * 2 * i) / count + (Math.random() - 0.5) * 0.22;
      const speed = 55 + Math.random() * 190;
      const altColor = pal.confetti[i % pal.confetti.length]!;
      this.pushParticle({
        x: fw.x,
        y: fw.y,
        vx: Math.cos(angle) * speed,
        vy: Math.sin(angle) * speed,
        life: 0,
        maxLife: 0.9 + Math.random() * 0.65,
        size: 2.2 + Math.random() * 2.6,
        color: i % 2 === 0 ? altColor : fw.color,
        isConfetti: pal.isLight || i % 3 === 0,
        rot: Math.random() * Math.PI * 2,
        vRot: (Math.random() - 0.5) * 10,
      });
    }
    this.callbacks.onFireworkExplode?.();
  }

  private draw(): void {
    const ctx = this.ctx;
    const pal = this.palette();

    // 1. 1:1 Identity Blit for entire pre-baked atmospheric winter world (zero resampling!)
    if (this.backdropCanvas) {
      ctx.setTransform(1, 0, 0, 1, 0, 0);
      ctx.drawImage(this.backdropCanvas, 0, 0);
    }

    ctx.setTransform(this.dpr, 0, 0, this.dpr, 0, 0);

    // 2. Dynamic sky accents (volumetric clouds / stars) + living chimney smoke & window shimmer
    this.drawSkyAndVillageLife(ctx, pal);

    // 3. Background distant snow layer (behind tree for true 3D depth)
    this.drawSnowLayer(ctx, pal, this.bgSnow);

    // 4. Pre-baked braided rug, bark trunk, 3D terracotta pot & warm light pool
    this.drawTreeBase(ctx);

    // 5. Realistic spruce tiers, golden beaded garland, fairy lights, 3D baubles & brass star
    this.drawTree(ctx, pal);

    // 6. 3D wrapped gift boxes with anchored contact shadows
    this.drawGifts(ctx);

    // 7. Fireworks & confetti bursts
    if (this.fireworks.length > 0 || this.particles.length > 0) {
      this.drawFireworksAndParticles(ctx, pal);
    }

    // 8. Foreground parallax snow layer (in front of tree & gifts)
    this.drawSnowLayer(ctx, pal, this.fgSnow);

    // 9. Smooth cursor halo, click ripples & fairy-dust sparkle trail
    if (
      !this.reducedMotion &&
      (this.cursorSmooth.alpha > 0.02 ||
        this.cursorSparkles.length > 0 ||
        this.cursorRipples.length > 0)
    ) {
      this.drawCursorEffects(ctx, pal);
    }
  }

  private drawSkyAndVillageLife(ctx: CanvasRenderingContext2D, pal: ThemePalette): void {
    if (pal.isLight && this.cloudSprites.length > 0) {
      ctx.globalAlpha = 0.88;
      for (const c of this.clouds) {
        const sp = this.cloudSprites[c.spriteIdx % this.cloudSprites.length]!;
        const dw = sp.w * c.scale;
        const dh = sp.h * c.scale;
        const px = c.x + this.parallaxX * 10 * c.scale;
        ctx.drawImage(sp.canvas, px - dw / 2, c.y - dh / 2, dw, dh);
      }
      ctx.globalAlpha = 1;
    } else if (!pal.isLight) {
      ctx.fillStyle = '#fff8e6';
      for (const s of this.stars) {
        const twinkle = this.reducedMotion
          ? 0.75
          : 0.4 + 0.6 * (0.5 + 0.5 * Math.sin(this.time * s.speed + s.phase));
        ctx.globalAlpha = twinkle;
        ctx.beginPath();
        ctx.arc(s.x, s.y, s.r, 0, Math.PI * 2);
        ctx.fill();
      }
      ctx.globalAlpha = 1;

      if (this.shootingStars.length > 0) {
        ctx.save();
        ctx.globalCompositeOperation = 'lighter';
        ctx.lineWidth = 1.8;
        for (const st of this.shootingStars) {
          const alpha = Math.sin((st.life / st.maxLife) * Math.PI);
          const mag = Math.hypot(st.vx, st.vy) || 1;
          const tx = st.x - (st.vx / mag) * 56;
          const ty = st.y - (st.vy / mag) * 56;
          ctx.strokeStyle = `rgba(255, 246, 214, ${(alpha * 0.8).toFixed(2)})`;
          ctx.beginPath();
          ctx.moveTo(tx, ty);
          ctx.lineTo(st.x, st.y);
          ctx.stroke();
        }
        ctx.restore();
      }
    }

    // Living chimney smoke wisps
    if (this.smokePuffSprite && this.smokePuffs.length > 0) {
      const baseAlpha = pal.isLight ? 0.36 : 0.24;
      for (const puff of this.smokePuffs) {
        const t = puff.age / puff.maxLife;
        const px =
          puff.baseX +
          t * 18 * puff.scale +
          Math.sin(this.time * 1.15 + puff.phase + t * 3.2) * 4.5 * puff.scale +
          this.parallaxX * 3;
        const py = puff.baseY - t * 38 * puff.scale;
        const r = (3.8 + t * 9.5) * puff.scale;
        ctx.globalAlpha = Math.sin(t * Math.PI) * baseAlpha;
        ctx.drawImage(this.smokePuffSprite, px - r, py - r, r * 2, r * 2);
      }
      ctx.globalAlpha = 1;
    }

    // Subtle warm fireplace flicker over cottage windows
    if (this.windowGlowSprite && this.cottageWindows.length > 0) {
      const mul = pal.isLight ? 0.36 : 0.72;
      for (const w of this.cottageWindows) {
        const flicker = this.reducedMotion
          ? 0.8
          : 0.74 +
            0.16 * Math.sin(this.time * w.speed + w.phase) +
            0.1 * Math.sin(this.time * w.speed * 2.37 + w.phase * 1.7);
        ctx.globalAlpha = flicker * mul;
        ctx.drawImage(this.windowGlowSprite, w.x - w.r, w.y - w.r, w.r * 2, w.r * 2);
      }
      ctx.globalAlpha = 1;
    }
  }

  private drawTreeBase(ctx: CanvasRenderingContext2D): void {
    const { cx, baseY } = this.treeMetrics();
    const introBase = easeOutCubic(this.introTime / 0.45);
    if (introBase > 0.01 && this.treeBaseSprite) {
      if (introBase < 1) ctx.globalAlpha = introBase;
      ctx.drawImage(
        this.treeBaseSprite.canvas,
        cx - this.treeBaseSprite.anchorX,
        baseY - this.treeBaseSprite.anchorY,
        this.treeBaseSprite.w,
        this.treeBaseSprite.h,
      );
      if (introBase < 1) ctx.globalAlpha = 1;
    }

    const introGlow = clamp01((this.introTime - 1.25) / 3.9);
    const poolIntensity = this.lightBrightness * introGlow;
    if (poolIntensity > 0.02 && this.groundGlowSprite) {
      ctx.globalAlpha = poolIntensity;
      ctx.drawImage(this.groundGlowSprite, cx - 210, baseY - 34, 420, 92);
      ctx.globalAlpha = 1;
    }
  }

  private drawTree(ctx: CanvasRenderingContext2D, pal: ThemePalette): void {
    const { cx, topY, treeHeight, treeWidth } = this.treeMetrics();
    const intro = this.introTime;

    // 1. 9 Realistic Spruce Pine Tiers
    const tierCount = this.tierCaches.length;
    for (let i = tierCount - 1; i >= 0; i--) {
      const tier = this.tierCaches[i]!;
      const order = (tierCount - 1 - i) / Math.max(1, tierCount - 1);
      const tProg = clamp01((intro - (0.12 + order * 0.92)) / 0.52);
      if (tProg <= 0) continue;

      const scale = tProg < 1 ? 0.72 + 0.28 * easeOutBack(tProg) : 1;
      const swayX = this.swayOffset(tier.yNorm);
      const drawW = tier.w * scale;
      const drawH = tier.h * scale;
      const drawX = cx - drawW / 2 + swayX;
      const drawY = topY + tier.tierY - 12 + (tier.h - drawH) * 0.5;

      if (tProg < 1) ctx.globalAlpha = easeOutCubic(tProg);
      ctx.drawImage(tier.canvas, drawX, drawY, drawW, drawH);
      if (tProg < 1) ctx.globalAlpha = 1;
    }

    // 2. Draped Golden Beaded Garland with Foliage Cast Shadow
    ctx.save();
    ctx.lineCap = 'round';
    for (let row = 4; row >= 0; row--) {
      const rowOrder = 4 - row;
      const segP = easeOutCubic((intro - (1.1 + rowOrder * 0.26)) / 0.45);
      if (segP <= 0) continue;

      const yNorm = 0.2 + row * 0.16;
      const swayX = this.swayOffset(yNorm);
      const y = topY + yNorm * treeHeight;
      const hw = treeWidth * 0.37 * yNorm;
      const p0x = cx - hw + swayX;
      const p0y = y - 10;
      const p1x = cx + swayX;
      const p1y = y + 24 + row * 3;
      const p2x = cx + hw + swayX;
      const p2y = y + 4;

      const q0x = p0x + (p1x - p0x) * segP;
      const q0y = p0y + (p1y - p0y) * segP;
      const q1x = p1x + (p2x - p1x) * segP;
      const q1y = p1y + (p2y - p1y) * segP;
      const endX = q0x + (q1x - q0x) * segP;
      const endY = q0y + (q1y - q0y) * segP;

      // Cast shadow on pine needles
      ctx.strokeStyle = 'rgba(10, 26, 18, 0.34)';
      ctx.lineWidth = 2.8;
      ctx.setLineDash([]);
      ctx.beginPath();
      ctx.moveTo(p0x + 1.5, p0y + 3.5);
      ctx.quadraticCurveTo(q0x + 1.5, q0y + 3.5, endX + 1.5, endY + 3.5);
      ctx.stroke();

      // Fine golden cord
      ctx.strokeStyle = '#b07c28';
      ctx.lineWidth = 1.15;
      ctx.beginPath();
      ctx.moveTo(p0x, p0y);
      ctx.quadraticCurveTo(q0x, q0y, endX, endY);
      ctx.stroke();

      // Shimmering gold bead garland
      ctx.strokeStyle = '#f5cf6e';
      ctx.lineWidth = 3.2;
      ctx.setLineDash([1.2, 5.8]);
      ctx.beginPath();
      ctx.moveTo(p0x, p0y);
      ctx.quadraticCurveTo(q0x, q0y, endX, endY);
      ctx.stroke();
    }
    ctx.restore();

    // 3. Fairy Bulbs — Pass 1: Ambient Glow Halos
    const totalBulbs = this.bulbs.length;
    if (this.lightBrightness > 0.04) {
      ctx.save();
      if (!pal.isLight) ctx.globalCompositeOperation = 'lighter';
      const baseHaloAlpha = pal.isLight ? 0.42 : 0.84;
      for (const b of this.bulbs) {
        const bottomOrder = 1 - b.index / Math.max(1, totalBulbs - 1);
        const bProg = clamp01((intro - (1.25 + bottomOrder * 1.65)) / 0.26);
        if (bProg <= 0) continue;

        const popScale = bProg < 1 ? easeOutBack(bProg) : 1;
        const intensity = this.bulbIntensity(b) * this.lightBrightness * easeOutCubic(bProg);
        if (intensity <= 0.05) continue;

        const sprite = this.bulbSprites.get(b.color);
        if (!sprite) continue;

        const bx = cx + b.relX + this.swayOffset(b.yNorm);
        const by = topY + b.relY;
        const haloR = b.size * (3.6 + intensity * 2.4) * popScale;
        ctx.globalAlpha = baseHaloAlpha * intensity;
        ctx.drawImage(sprite, bx - haloR, by - haloR, haloR * 2, haloR * 2);
      }
      ctx.restore();
    }

    // Fairy Bulbs — Pass 2: Sockets, Glass Bulbs & Lit Filaments
    for (const b of this.bulbs) {
      const bottomOrder = 1 - b.index / Math.max(1, totalBulbs - 1);
      const bProg = clamp01((intro - (1.25 + bottomOrder * 1.65)) / 0.26);
      if (bProg <= 0) continue;

      const bx = cx + b.relX + this.swayOffset(b.yNorm);
      const by = topY + b.relY;

      if (!b.litSpawned && intro < this.introDuration) {
        b.litSpawned = true;
        this.spawnBurst(bx, by, b.color, 3, true);
      }

      const popScale = bProg < 1 ? easeOutBack(bProg) : 1;
      const intensity = this.bulbIntensity(b) * this.lightBrightness * easeOutCubic(bProg);
      const r = b.size * popScale;

      ctx.fillStyle = '#2b332f';
      ctx.fillRect(bx - 1.3, by - r - 2, 2.6, 2.5);

      ctx.fillStyle = b.color;
      ctx.beginPath();
      ctx.arc(bx, by, r, 0, Math.PI * 2);
      ctx.fill();

      if (intensity > 0.1) {
        ctx.fillStyle = '#fffce8';
        ctx.globalAlpha = Math.min(0.95, intensity);
        ctx.beginPath();
        ctx.arc(bx, by, r * 0.56, 0, Math.PI * 2);
        ctx.fill();
        ctx.globalAlpha = 1;
      }
    }

    // 4. Pre-baked 3D Glass Baubles + Cast Shadow on Foliage + Occasional Metallic Glint
    const baubleCount = this.baubles.length;
    for (let i = 0; i < baubleCount; i++) {
      const b = this.baubles[i]!;
      const bottomOrder = 1 - i / Math.max(1, baubleCount - 1);
      const bStart = 2.65 + bottomOrder * 1.45;
      const bProg = clamp01((intro - bStart) / 0.36);
      if (bProg <= 0) continue;

      const sprite = this.baubleSprites.get(b.spriteKey);
      if (!sprite) continue;

      const anchorX = cx + b.relX + this.swayOffset(b.yNorm);
      const dropY = bProg < 1 ? (1 - easeOutCubic(bProg)) * -20 : 0;
      const anchorY = topY + b.relY - b.radius * 1.4 + dropY;

      if (!b.placed && intro < this.introDuration) {
        b.placed = true;
        b.angularVel = (i % 2 === 0 ? 1 : -1) * 0.42;
        this.spawnBurst(anchorX, anchorY + b.radius * 1.4, b.color, 5, true);
      }

      const bScale = bProg < 1 ? easeOutBack(bProg) : 1;
      const alpha = bProg < 1 ? easeOutCubic(bProg) : 1;
      const pendLen = b.radius * 1.55 * bScale;
      const sphereX = anchorX + Math.sin(b.angle) * pendLen;
      const sphereY = anchorY + Math.cos(b.angle) * pendLen;

      // Cast shadow onto spruce needles behind bauble
      if (this.softShadowSprite) {
        const sr = b.radius * 1.28 * bScale;
        ctx.globalAlpha = 0.5 * alpha;
        ctx.drawImage(
          this.softShadowSprite,
          sphereX + b.radius * 0.38 - sr,
          sphereY + b.radius * 0.44 - sr,
          sr * 2,
          sr * 2,
        );
        ctx.globalAlpha = 1;
      }

      // Fast path when stationary post-intro
      if (Math.abs(b.angle) < 0.001 && bScale === 1 && alpha === 1) {
        ctx.drawImage(sprite.canvas, anchorX - sprite.anchorX, anchorY - sprite.anchorY, sprite.w, sprite.h);
      } else {
        ctx.save();
        if (alpha < 1) ctx.globalAlpha = alpha;
        ctx.translate(anchorX, anchorY);
        if (bScale !== 1) ctx.scale(bScale, bScale);
        if (b.angle !== 0) ctx.rotate(b.angle);
        ctx.drawImage(sprite.canvas, -sprite.anchorX, -sprite.anchorY, sprite.w, sprite.h);
        ctx.restore();
      }

      // Subtle optical glint shimmer on 4 featured baubles
      if (!this.reducedMotion && this.starGlintSprite && i % 4 === 1 && alpha > 0.9) {
        const sh = Math.max(0, Math.sin(this.time * 1.65 + i * 1.9) - 0.58) / 0.42;
        if (sh > 0.02) {
          const gr = (5 + sh * 4.5) * bScale;
          ctx.globalAlpha = sh * 0.72;
          ctx.drawImage(
            this.starGlintSprite,
            sphereX - b.radius * 0.34 - gr,
            sphereY - b.radius * 0.34 - gr,
            gr * 2,
            gr * 2,
          );
          ctx.globalAlpha = 1;
        }
      }
    }

    // 5. Beveled 3D Metallic Brass Star Topper
    const starP = clamp01((intro - 4.55) / 0.85);
    if (starP > 0) {
      const starX = cx + this.swayOffset(0);
      const starDrop = starP < 1 ? (1 - easeOutCubic(starP)) * -82 : 0;
      const starY = topY - 8 + starDrop;
      const starScale = starP < 1 ? 0.4 + 0.6 * easeOutBack(starP) : 1;
      const starSpin = starP < 1 ? (1 - easeOutCubic(starP)) * 0.85 : 0;
      if (starP >= 0.96 && !this.starCrowned) {
        this.starCrowned = true;
        this.spawnBurst(starX, topY - 8, pal.star, 28, true);
      }
      this.drawStarTopper(ctx, starX, starY, starScale, easeOutCubic(starP), starSpin);
    }
  }

  private bulbIntensity(bulb: Bulb): number {
    if (this.reducedMotion) return 0.78;
    switch (this.pattern) {
      case 'chase': {
        const wave = Math.sin(this.time * 4.2 - bulb.index * 0.55);
        return 0.3 + 0.7 * Math.max(0, wave);
      }
      case 'pulse': {
        const wave = 0.5 + 0.5 * Math.sin(this.time * 2.1 - bulb.yNorm * 5.0);
        return 0.28 + 0.72 * wave;
      }
      case 'warm':
        return 0.72 + 0.2 * Math.sin(this.time * 1.1 + bulb.phase);
      case 'twinkle':
      default:
        return 0.34 + 0.66 * (0.5 + 0.5 * Math.sin(this.time * bulb.speed + bulb.phase));
    }
  }

  private drawStarTopper(
    ctx: CanvasRenderingContext2D,
    x: number,
    y: number,
    scale = 1,
    alpha = 1,
    spin = 0,
  ): void {
    const pulse = this.reducedMotion ? 1 : 0.92 + 0.09 * Math.sin(this.time * 2.4);
    const glowScale = 0.45 + 0.55 * this.lightBrightness;

    ctx.save();
    ctx.globalAlpha = alpha;
    ctx.translate(x, y);
    if (scale !== 1) ctx.scale(scale, scale);
    if (spin) ctx.rotate(spin);

    if (this.starHaloSprite) {
      const haloR = 48 * pulse * glowScale;
      ctx.drawImage(this.starHaloSprite, -haloR, -haloR, haloR * 2, haloR * 2);
    }

    if (this.starTopperSprite) {
      ctx.drawImage(
        this.starTopperSprite.canvas,
        -this.starTopperSprite.anchorX,
        -this.starTopperSprite.anchorY,
        this.starTopperSprite.w,
        this.starTopperSprite.h,
      );
    }

    // Pulsing optical lens-flare glint on sunlit upper-left brass ridge
    if (this.starGlintSprite) {
      const shimmer = this.reducedMotion ? 0.7 : 0.5 + 0.5 * Math.sin(this.time * 2.9);
      const glintR = (13 + shimmer * 9) * glowScale;
      ctx.globalAlpha = alpha * (0.35 + 0.6 * shimmer);
      ctx.drawImage(this.starGlintSprite, -4 - glintR, -12 - glintR, glintR * 2, glintR * 2);
    }

    ctx.restore();
  }

  private drawGifts(ctx: CanvasRenderingContext2D): void {
    const { cx, baseY } = this.treeMetrics();

    this.gifts.forEach((g, idx) => {
      const gStart = 3.85 + idx * 0.16;
      const gProg = clamp01((this.introTime - gStart) / 0.42);
      if (gProg <= 0) return;

      const sprite = this.giftSprites[idx];
      if (!sprite) return;

      if (!g.placed && this.introTime < this.introDuration) {
        g.placed = true;
        this.spawnBurst(cx + g.relX, baseY + g.relY - g.h * 0.5, g.colors.ribbon, 6, true);
      }

      const isHovered = this.hoveredGift === idx;
      const lift = isHovered ? -5 : 0;
      const hopPhase = g.bounce;
      const bounceOffset = hopPhase > 0 ? -Math.sin(hopPhase * Math.PI) * 20 : 0;
      const dropIn = gProg < 1 ? (1 - easeOutBack(gProg)) * -18 : 0;
      const elevation = Math.max(0, -(lift + bounceOffset + dropIn));
      const gx = cx + g.relX;
      const gy = baseY + g.relY + lift + bounceOffset + dropIn;
      const gScale = gProg < 1 ? 0.65 + 0.35 * easeOutBack(gProg) : 1;
      const alpha = gProg < 1 ? easeOutCubic(gProg) : 1;

      // Playful squash-and-stretch + celebratory wiggle during click hop
      const stretch = hopPhase > 0 ? Math.sin(hopPhase * Math.PI * 2) * 0.1 * hopPhase : 0;
      const scaleX = gScale * (1 - stretch);
      const scaleY = gScale * (1 + stretch);
      const wiggleRot = hopPhase > 0 ? Math.sin(hopPhase * Math.PI * 3) * 0.13 * hopPhase : 0;

      // Grounded contact shadow stays ON the rug and softens/spreads as gift lifts!
      if (this.softShadowSprite) {
        const shadowW = g.w * (1.28 + elevation * 0.012) * gScale;
        const shadowH = Math.max(12, g.h * 0.36) * (1 + elevation * 0.014) * gScale;
        const shadowAlpha = Math.max(0.16, 0.62 - elevation * 0.022) * alpha;
        ctx.globalAlpha = shadowAlpha;
        ctx.drawImage(
          this.softShadowSprite,
          gx + 4 + elevation * 0.18 - shadowW * 0.5,
          baseY + g.relY + 3 - shadowH * 0.5,
          shadowW,
          shadowH,
        );
      }

      // Warm golden highlight aura behind gift when clicked or hovered
      const highlightAmt = Math.max(g.glow, isHovered ? 0.45 : 0);
      if (highlightAmt > 0.02 && this.starHaloSprite) {
        const haloR = Math.max(g.w, g.h) * (0.95 + g.glow * 0.55);
        ctx.globalAlpha = highlightAmt * 0.85 * alpha;
        ctx.drawImage(
          this.starHaloSprite,
          gx - haloR,
          gy - g.h * 0.5 - haloR,
          haloR * 2,
          haloR * 2,
        );
      }

      if (wiggleRot !== 0 || scaleX !== scaleY) {
        ctx.save();
        ctx.globalAlpha = alpha;
        ctx.translate(gx, gy);
        ctx.rotate(wiggleRot);
        ctx.scale(scaleX, scaleY);
        ctx.drawImage(sprite.canvas, -sprite.anchorX, -sprite.anchorY, sprite.w, sprite.h);
        ctx.restore();
      } else {
        ctx.globalAlpha = alpha;
        ctx.drawImage(
          sprite.canvas,
          gx - sprite.anchorX * gScale,
          gy - sprite.anchorY * gScale,
          sprite.w * gScale,
          sprite.h * gScale,
        );
      }

      // Shimmering star glint on the bow peak during click highlight
      if (g.glow > 0.08 && this.starGlintSprite) {
        const gr = (10 + g.glow * 14) * gScale;
        ctx.globalAlpha = g.glow * 0.9 * alpha;
        ctx.drawImage(
          this.starGlintSprite,
          gx - gr,
          gy - g.h * 1.15 - gr,
          gr * 2,
          gr * 2,
        );
      }

      ctx.globalAlpha = 1;
    });
  }

  private drawFireworksAndParticles(ctx: CanvasRenderingContext2D, pal: ThemePalette): void {
    ctx.save();
    if (!pal.isLight) ctx.globalCompositeOperation = 'lighter';

    for (const fw of this.fireworks) {
      ctx.fillStyle = fw.color;
      for (let i = 0; i < fw.trail.length; i++) {
        const pt = fw.trail[i]!;
        ctx.globalAlpha = ((i + 1) / fw.trail.length) * 0.65;
        ctx.beginPath();
        ctx.arc(pt.x, pt.y, 2.2, 0, Math.PI * 2);
        ctx.fill();
      }
      ctx.globalAlpha = 1;
      ctx.beginPath();
      ctx.arc(fw.x, fw.y, 3, 0, Math.PI * 2);
      ctx.fill();
    }

    for (const p of this.particles) {
      const alpha = Math.max(0, 1 - p.life / p.maxLife);
      ctx.globalAlpha = alpha;
      ctx.fillStyle = p.color;
      if (p.isConfetti) {
        ctx.save();
        ctx.translate(p.x, p.y);
        ctx.rotate(p.rot);
        ctx.fillRect(-p.size, -p.size * 0.45, p.size * 2, p.size * 0.9);
        ctx.restore();
      } else {
        ctx.beginPath();
        ctx.arc(p.x, p.y, p.size * (0.5 + alpha * 0.5), 0, Math.PI * 2);
        ctx.fill();
      }
    }

    ctx.restore();
  }

  private drawSnowLayer(ctx: CanvasRenderingContext2D, pal: ThemePalette, flakes: Snowflake[]): void {
    const blurSprite = this.snowBlurSprite;
    ctx.fillStyle = '#ffffff';
    if (pal.isLight) {
      ctx.strokeStyle = pal.flakeOutline;
      ctx.lineWidth = 0.7;
    }

    for (const f of flakes) {
      const px = f.x + this.parallaxX * (3 + f.depth * 14);
      if (f.blur && blurSprite) {
        const br = f.r * 2.1;
        ctx.globalAlpha = f.alpha * 0.85;
        ctx.drawImage(blurSprite, px - br, f.y - br, br * 2, br * 2);
      } else {
        ctx.globalAlpha = f.alpha;
        ctx.beginPath();
        ctx.arc(px, f.y, f.r, 0, Math.PI * 2);
        ctx.fill();
        if (pal.isLight && f.r > 2.4) {
          ctx.stroke();
        }
      }
    }
    ctx.globalAlpha = 1;
  }

  private drawFourPointStar(
    ctx: CanvasRenderingContext2D,
    x: number,
    y: number,
    radius: number,
    rot: number,
  ): void {
    const inner = radius * 0.34;
    ctx.save();
    ctx.translate(x, y);
    ctx.rotate(rot);
    ctx.beginPath();
    for (let i = 0; i < 8; i++) {
      const r = i % 2 === 0 ? radius : inner;
      const a = (i * Math.PI) / 4;
      const px = Math.cos(a) * r;
      const py = Math.sin(a) * r;
      if (i === 0) ctx.moveTo(px, py);
      else ctx.lineTo(px, py);
    }
    ctx.closePath();
    ctx.fill();
    ctx.restore();
  }

  private drawCursorEffects(ctx: CanvasRenderingContext2D, pal: ThemePalette): void {
    for (const rp of this.cursorRipples) {
      const p = rp.life / rp.maxLife;
      const ease = easeOutCubic(p);
      const r = 8 + ease * 28;
      ctx.save();
      ctx.globalAlpha = (1 - p) * 0.65;
      ctx.strokeStyle = rp.color;
      ctx.lineWidth = 1.6 * (1 - p * 0.5);
      ctx.beginPath();
      ctx.arc(rp.x, rp.y, r, 0, Math.PI * 2);
      ctx.stroke();
      ctx.restore();
    }

    for (const sp of this.cursorSparkles) {
      const p = sp.life / sp.maxLife;
      const alpha = Math.max(0, 1 - p);
      ctx.globalAlpha = alpha * 0.9;
      ctx.fillStyle = sp.color;
      if (sp.isStar) {
        this.drawFourPointStar(ctx, sp.x, sp.y, sp.size * (0.45 + alpha * 0.65), sp.rot);
      } else {
        ctx.beginPath();
        ctx.arc(sp.x, sp.y, sp.size * 0.45 * (0.5 + alpha * 0.5), 0, Math.PI * 2);
        ctx.fill();
      }
    }
    ctx.globalAlpha = 1;

    if (this.cursorSmooth.alpha > 0.02) {
      const { x, y, alpha, ringScale, overInteractive } = this.cursorSmooth;
      const radius = 13 * ringScale;
      ctx.save();
      ctx.translate(x, y);
      ctx.globalAlpha = alpha * (overInteractive ? 0.72 : 0.45);
      ctx.strokeStyle = overInteractive ? pal.confetti[0]! : pal.starShade;
      ctx.lineWidth = overInteractive ? 1.7 : 1.3;
      ctx.rotate(this.time * (overInteractive ? 1.8 : 0.8));
      ctx.setLineDash([5, 5]);
      ctx.beginPath();
      ctx.arc(0, 0, radius, 0, Math.PI * 2);
      ctx.stroke();
      ctx.setLineDash([]);

      ctx.globalAlpha = alpha * 0.85;
      ctx.fillStyle = pal.star;
      this.drawFourPointStar(ctx, radius, 0, overInteractive ? 4.2 : 3.2, -this.time * 2);
      ctx.restore();
    }
  }
}

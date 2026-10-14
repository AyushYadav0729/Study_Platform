import * as THREE from "three";
import { RoomEnvironment } from "three/addons/environments/RoomEnvironment.js";
import { CARDS, FILES, FAN_CARDS } from "./cards";
import { drawBack, drawFront, loadCardFonts } from "./cardTextures";

// One deck of study cards that stays on screen for the whole page and
// re-forms for each chapter:
//   HERO     floating around the headline (some in front of the text)
//   COLUMNS  one column per unit, built from the syllabus
//   PILES    tidy unit piles that new notes get filed onto
//   RING     a slow ring far behind the summary panel
//   FAN      a hand of flashcards you can lift and flip
//   FINAL    an even ring around the closing headline
// The page tells the deck which two formations it is between and how far
// along (scroll-linked); the deck blends with a per-card stagger.
// The same scene is drawn twice: everything behind the page, and the cards
// nearer than z = 0 again on a canvas above the page (clipped to the hero),
// so cards can pass in front of and behind the headline.

export const F = { HERO: 0, COLUMNS: 1, PILES: 2, RING: 3, FAN: 4, FINAL: 5 };

const CARD_W = 1.3;
const CARD_H = 0.8125;
const STAGGER = 0.4;
const CAM_DIST = 14;
const FOV = 35;

const clamp01 = (v) => Math.min(1, Math.max(0, v));
const easeInOut = (t) => (t < 0.5 ? 4 * t * t * t : 1 - Math.pow(-2 * t + 2, 3) / 2);
const easeOut = (t) => 1 - Math.pow(1 - t, 3);

function cardGeometry(w, h, r) {
  const s = new THREE.Shape();
  const x = -w / 2;
  const y = -h / 2;
  s.moveTo(x + r, y);
  s.lineTo(x + w - r, y);
  s.quadraticCurveTo(x + w, y, x + w, y + r);
  s.lineTo(x + w, y + h - r);
  s.quadraticCurveTo(x + w, y + h, x + w - r, y + h);
  s.lineTo(x + r, y + h);
  s.quadraticCurveTo(x, y + h, x, y + h - r);
  s.lineTo(x, y + r);
  s.quadraticCurveTo(x, y, x + r, y);
  const g = new THREE.ShapeGeometry(s, 6);
  const pos = g.attributes.position;
  const uv = g.attributes.uv;
  for (let i = 0; i < pos.count; i++) uv.setXY(i, (pos.getX(i) + w / 2) / w, (pos.getY(i) + h / 2) / h);
  uv.needsUpdate = true;
  return g;
}

const CAMS = [
  { pos: new THREE.Vector3(0, 0, 14), look: new THREE.Vector3(0, 0, 0) },
  { pos: new THREE.Vector3(1.0, 0.3, 13.4), look: new THREE.Vector3(0.7, 0.15, 0) },
  { pos: new THREE.Vector3(0.9, -0.5, 13.5), look: new THREE.Vector3(0.6, -0.2, 0) },
  { pos: new THREE.Vector3(0, 0, 14.4), look: new THREE.Vector3(0.4, 0, -2) },
  { pos: new THREE.Vector3(0.8, -0.4, 13.0), look: new THREE.Vector3(0.8, -0.5, 0) },
  { pos: new THREE.Vector3(0, 0, 14.6), look: new THREE.Vector3(0, 0, 0) },
];

export class CardDeck {
  constructor(backCanvas, frontCanvas, { mobile = false, reduced = false } = {}) {
    this.backCanvas = backCanvas;
    this.frontCanvas = frontCanvas;
    this.mobile = mobile;
    this.reduced = reduced;
    this.fa = F.HERO;
    this.fb = F.COLUMNS;
    this.t = 0;
    this.frontOn = !!frontCanvas;
    this.frontWasOn = false;
    this.pointer = new THREE.Vector2(9, 9);
    this.pointerActive = false;
    this.parallax = new THREE.Vector2();
    this.hovered = null;
    this.onHover = null;
    this.onFlip = null;
    this.intro = reduced ? 1 : 0;
    this.raycaster = new THREE.Raycaster();
    this._v = new THREE.Vector3();
    this._v2 = new THREE.Vector3();
    this._q = new THREE.Quaternion();
    this._q2 = new THREE.Quaternion();
    this._e = new THREE.Euler();
    this.axisY = new THREE.Vector3(0, 1, 0);
    this.axisZ = new THREE.Vector3(0, 0, 1);
  }

  async init() {
    await loadCardFonts();
    if (this.disposed) return;
    const dpr = Math.min(window.devicePixelRatio || 1, this.mobile ? 1.3 : 1.6);
    const make = (canvas) => {
      const r = new THREE.WebGLRenderer({ canvas, antialias: true, alpha: true, powerPreference: "high-performance" });
      r.setPixelRatio(dpr);
      r.setClearColor(0x000000, 0);
      r.outputColorSpace = THREE.SRGBColorSpace;
      r.toneMapping = THREE.NeutralToneMapping;
      r.toneMappingExposure = 1.0;
      r.localClippingEnabled = false;
      return r;
    };
    this.back = make(this.backCanvas);
    this.front = this.frontCanvas ? make(this.frontCanvas) : null;
    this.splitFront = new THREE.Plane(new THREE.Vector3(0, 0, 1), 0);
    // The back pass draws every card. The front pass draws only cards in
    // front of the text plane; the page clips that canvas to the hero, so
    // cards only cross in front of the headline, never other sections.
    if (this.front) this.front.clippingPlanes = [this.splitFront];

    const scene = (this.scene = new THREE.Scene());
    scene.fog = new THREE.Fog(0x0b0a09, 16, 34);
    this.camera = new THREE.PerspectiveCamera(FOV, 1, 0.1, 100);
    this.camera.position.set(0, 0, CAM_DIST);

    // Lighting: warm key, soft fill, cool rim; a studio environment gives the
    // laminated cards their gloss.
    scene.add(new THREE.HemisphereLight(0xfff4e2, 0x15120e, 0.9));
    const key = new THREE.DirectionalLight(0xfff1dd, 1.5);
    key.position.set(4, 6, 9);
    scene.add(key);
    const rim = new THREE.DirectionalLight(0x9fd6ff, 0.8);
    rim.position.set(-7, 3, -5);
    scene.add(rim);
    const room = new RoomEnvironment();
    const pmB = new THREE.PMREMGenerator(this.back);
    this.envBack = pmB.fromScene(room, 0.04).texture;
    pmB.dispose();
    if (this.front) {
      const pmF = new THREE.PMREMGenerator(this.front);
      this.envFront = pmF.fromScene(room, 0.04).texture;
      pmF.dispose();
    }
    scene.environmentIntensity = 0.2;

    this.geo = cardGeometry(CARD_W, CARD_H, 0.07);
    const maxAniso = this.back.capabilities.getMaxAnisotropy();
    const makeMaterial = (front, back) => {
      const ft = new THREE.CanvasTexture(front);
      const bt = new THREE.CanvasTexture(back);
      for (const t of [ft, bt]) {
        t.colorSpace = THREE.SRGBColorSpace;
        t.anisotropy = Math.min(8, maxAniso);
      }
      const glow = { value: 0 };
      const m = new THREE.MeshPhysicalMaterial({
        map: ft,
        roughness: 0.5,
        metalness: 0,
        clearcoat: 0.3,
        clearcoatRoughness: 0.35,
        side: THREE.DoubleSide,
      });
      m.onBeforeCompile = (shader) => {
        shader.uniforms.uBackMap = { value: bt };
        shader.uniforms.uGlow = glow;
        shader.fragmentShader = shader.fragmentShader
          .replace("#include <common>", "#include <common>\nuniform sampler2D uBackMap;\nuniform float uGlow;")
          .replace(
            "#include <map_fragment>",
            `#ifdef USE_MAP
  vec4 sampledDiffuseColor = gl_FrontFacing ? texture2D( map, vMapUv ) : texture2D( uBackMap, vec2( 1.0 - vMapUv.x, vMapUv.y ) );
  diffuseColor *= sampledDiffuseColor;
#endif`
          )
          .replace(
            "#include <emissivemap_fragment>",
            "#include <emissivemap_fragment>\ntotalEmissiveRadiance += diffuseColor.rgb * uGlow * 0.55;"
          );
      };
      this.disposables.push(ft, bt, m);
      return { m, glow };
    };

    this.disposables = [this.geo, this.envBack];
    if (this.envFront) this.disposables.push(this.envFront);
    this.group = new THREE.Group();
    scene.add(this.group);
    this.cards = CARDS.map((data, i) => {
      const { m, glow } = makeMaterial(drawFront(data, i), drawBack(data));
      const mesh = new THREE.Mesh(this.geo, m);
      mesh.frustumCulled = false;
      this.group.add(mesh);
      return this.makeState(mesh, data, i, glow);
    });
    this.files = FILES.map((f, k) => {
      const data = { kind: "file", title: f.name, peek: f.peek, unit: f.unit, back: `Filed under Unit ${f.unit + 1}.` };
      const { m, glow } = makeMaterial(drawFront(data, 100 + k), drawBack(data));
      const mesh = new THREE.Mesh(this.geo, m);
      mesh.frustumCulled = false;
      mesh.visible = false;
      this.group.add(mesh);
      const st = this.makeState(mesh, data, 100 + k, glow);
      st.mode = "hidden";
      st.flyT = 0;
      st.start = new THREE.Vector3();
      return st;
    });
    this.fanIndex = new Map(FAN_CARDS.map((ci, k) => [ci, k]));
    this.pickables = [...this.cards, ...this.files].map((c) => c.mesh);

    this.resize();
    this.update(0.016, 0);
    this.back.compile(scene, this.camera);
    this.ready = true;
  }

  makeState(mesh, data, i, glow) {
    const rnd = (a, b) => a + Math.random() * (b - a);
    return {
      mesh,
      data,
      i,
      glow,
      pos: new THREE.Vector3(rnd(-4, 4), rnd(-3, 3), -40),
      quat: new THREE.Quaternion(),
      scale: 0.001,
      tPos: new THREE.Vector3(),
      tQuat: new THREE.Quaternion(),
      tScale: 1,
      flip: 0,
      flipTarget: 0,
      hover: 0,
      phase: rnd(0, Math.PI * 2),
      seed: Math.random(),
      seed2: Math.random(),
      spin: Math.random() < 0.34 ? (Math.random() < 0.5 ? -1 : 1) * Math.PI : rnd(-0.6, 0.6),
      side: rnd(-0.9, 0.9),
      lift: rnd(1.8, 3.2),
      hero: null,
    };
  }

  // ------------------------------------------------------------------ layout

  resize() {
    if (!this.back) return;
    const w = window.innerWidth;
    const h = window.innerHeight;
    this.w = w;
    this.h = h;
    this.back.setSize(w, h, false);
    if (this.front) this.front.setSize(w, h, false);
    this.camera.aspect = w / h;
    this.camera.updateProjectionMatrix();
    this.halfH = Math.tan(THREE.MathUtils.degToRad(FOV / 2)) * CAM_DIST;
    this.halfW = this.halfH * this.camera.aspect;
    this.narrow = this.camera.aspect < 0.9;
    this.layoutHero();
  }

  // Screen-space boxes (client px) the hero cards must keep clear of:
  // { title, block, cue }. Measured by the page from the real DOM.
  setHeroZones(zones) {
    this.zones = zones;
    if (this.cards) this.layoutHero();
  }

  layoutHero() {
    if (this.zones && this.zones.block) {
      this.layoutHeroAround(this.zones);
      return;
    }
    const hw = this.halfW;
    const hh = this.halfH;
    // Two cards deliberately overlap the headline's edges.
    const overlap = this.narrow
      ? [
          [0.62, 0.2, 1.4],
          [-0.66, -0.12, 1.1],
        ]
      : [
          [-0.47, 0.17, 1.6],
          [0.49, -0.1, 1.3],
          [0.08, 0.36, -0.6],
        ];
    this.cards.forEach((c, i) => {
      let nx;
      let ny;
      let z;
      if (i < overlap.length) {
        [nx, ny, z] = overlap[i];
      } else {
        nx = Math.random() * 2 - 1;
        ny = Math.random() * 2 - 1;
        z = -5 + Math.random() * 7;
        const inText = Math.abs(nx) < 0.62 && ny > -0.42 && ny < 0.42;
        const inCta = Math.abs(nx) < 0.42 && ny < -0.45;
        if (z > -0.4 && (inText || inCta)) z = -3.6 - Math.random() * 2.4;
      }
      const depthScale = (CAM_DIST - z) / CAM_DIST;
      c.hero = {
        pos: new THREE.Vector3(nx * hw * 0.98 * depthScale, ny * hh * 0.95 * depthScale, z),
        rot: new THREE.Euler(
          (Math.random() - 0.5) * 0.9,
          (Math.random() - 0.5) * 1.1,
          (Math.random() - 0.5) * 0.8
        ),
        scale: this.narrow ? 0.72 : 0.92 + Math.random() * 0.2,
      };
    });
  }

  // Scatter the deck around the hero copy: nothing near the camera may sit on
  // the text or the scroll cue. Two cards deliberately clip the headline's
  // outer letters so the deck reads as passing in front of the type.
  layoutHeroAround(zones) {
    const W = this.w;
    const H = this.h;
    const pad = 14;
    // Seeded so re-measuring the page doesn't reshuffle the deck.
    const rnd = (n) => {
      const x = Math.sin(n * 12.9898 + 78.233) * 43758.5453;
      return x - Math.floor(x);
    };
    const hits = (r, cx, cy, hwPx, hhPx) =>
      r && cx + hwPx > r.left - pad && cx - hwPx < r.right + pad && cy + hhPx > r.top - pad && cy - hhPx < r.bottom + pad;
    const toWorld = (sx, sy, z) => {
      const k = (CAM_DIST - z) / CAM_DIST;
      return new THREE.Vector3((sx / W - 0.5) * 2 * this.halfW * k, -(sy / H - 0.5) * 2 * this.halfH * k, z);
    };
    const t = zones.title;
    const overlap = this.narrow || !t
      ? []
      : [
          [t.left - W * 0.012, t.top + t.height * 0.42, 1.5, 0.82],
          [t.right + W * 0.01, t.top + t.height * 0.16, 1.2, 0.82],
        ];
    this.cards.forEach((c, i) => {
      const r = (k) => rnd(i * 131 + k);
      const rot = new THREE.Euler((r(1) - 0.5) * 0.9, (r(2) - 0.5) * 1.1, (r(3) - 0.5) * 0.8);
      const scale = this.narrow ? 0.7 : 0.88 + r(4) * 0.22;
      if (i < overlap.length) {
        const [sx, sy, z, s] = overlap[i];
        rot.set(0.12, i === 0 ? 0.35 : -0.3, i === 0 ? -0.22 : 0.18);
        c.hero = { pos: toWorld(sx, sy, z), rot, scale: s };
        return;
      }
      let sx = 0;
      let sy = 0;
      let z = 0;
      let ok = false;
      for (let tries = 0; tries < 24 && !ok; tries++) {
        sx = r(10 + tries * 3) * W;
        sy = r(11 + tries * 3) * H;
        z = -6 + r(12 + tries * 3) * 8;
        const k = (CAM_DIST - z) / CAM_DIST;
        const hwPx = ((CARD_W * scale) / (2 * this.halfW * k)) * W * 0.5;
        const hhPx = ((CARD_H * scale) / (2 * this.halfH * k)) * H * 0.5;
        ok =
          !hits(zones.block, sx, sy, hwPx, hhPx) &&
          !hits(zones.cue, sx, sy, hwPx, hhPx) &&
          !(zones.extra || []).some((r) => hits(r, sx, sy, hwPx, hhPx));
      }
      if (!ok) z = -11 - r(99) * 3;
      c.hero = { pos: toWorld(sx, sy, z), rot, scale };
    });
  }

  // Pile top position for a unit (used by file cards too).
  pileCenter(u, out) {
    const hw = this.halfW;
    const hh = this.halfH;
    if (this.narrow) {
      const row = u < 3 ? 0 : 1;
      const col = u < 3 ? u : u - 3;
      const x = row === 0 ? (col - 1) * hw * 0.62 : (col - 0.5) * hw * 0.62;
      out.set(x, row === 0 ? hh * 0.22 : -hh * 0.24, -0.5);
    } else {
      const xs = [0.2, 0.5, 0.8, 0.35, 0.65];
      const ys = [0.26, 0.26, 0.26, -0.36, -0.36];
      out.set(hw * xs[u], hh * ys[u], -0.5);
    }
    return out;
  }

  delayFor(f, c) {
    const d = c.data;
    if (c.i >= 100) return 0;
    switch (f) {
      case F.HERO:
        return c.seed * 0.3;
      case F.COLUMNS:
        return Math.min(STAGGER, (d.row === 0 ? 0 : 0.1) + d.unit * 0.04 + d.row * 0.022);
      case F.PILES:
        return Math.min(STAGGER, d.unit * 0.05 + (7 - d.row) * 0.02);
      case F.RING:
        return (c.i / CARDS.length) * 0.3;
      case F.FAN:
        return this.fanIndex.has(c.i) ? this.fanIndex.get(c.i) * 0.045 : 0.08 + c.seed * 0.25;
      default:
        return (c.i / CARDS.length) * 0.35;
    }
  }

  // Writes the pose of card `c` in formation `f` into pos/quat, returns scale.
  pose(f, c, time, pos, quat) {
    const hw = this.halfW;
    const hh = this.halfH;
    const d = c.data;
    const e = this._e;
    const t = this.reduced ? 0 : time;
    let s;
    switch (f) {
      case F.HERO: {
        const h = c.hero;
        pos.copy(h.pos);
        pos.y += Math.sin(t * 0.7 + c.phase) * 0.14;
        pos.x += Math.sin(t * 0.45 + c.phase * 1.3) * 0.08;
        e.set(h.rot.x + Math.sin(t * 0.5 + c.phase) * 0.06, h.rot.y + Math.sin(t * 0.4 + c.phase) * 0.08, h.rot.z);
        quat.setFromEuler(e);
        s = h.scale;
        break;
      }
      case F.COLUMNS: {
        if (this.narrow) {
          const colW = (hw * 1.9) / 5;
          s = Math.min(0.66, (colW * 0.94) / CARD_W);
          const x = -hw * 0.95 + colW * (d.unit + 0.5);
          const top = hh * 0.42;
          const step = CARD_H * s * 0.5;
          pos.set(x, top - d.row * step - (d.row > 0 ? CARD_H * s * 0.2 : 0), -0.3 + d.row * 0.012);
        } else {
          const left = hw * 0.04;
          const colW = (hw * 0.93) / 5;
          s = Math.min(1.05, (colW * 0.93) / CARD_W);
          const x = left + colW * (d.unit + 0.5);
          const top = hh * 0.66;
          const step = CARD_H * s * 0.6;
          pos.set(x, top - d.row * step - (d.row > 0 ? CARD_H * s * 0.22 : 0), -0.3 + d.row * 0.012);
        }
        pos.y += Math.sin(t * 0.9 + d.unit) * 0.025;
        e.set(-0.05, -0.08, 0);
        quat.setFromEuler(e);
        break;
      }
      case F.PILES: {
        this.pileCenter(d.unit, pos);
        const level = 7 - d.row;
        s = this.narrow ? 0.62 : 1.18;
        pos.x += (c.seed - 0.5) * 0.08 * s;
        pos.y += (level * 0.016 - 0.05) * s;
        pos.z += level * 0.02;
        e.set(-0.04, 0, d.row === 0 ? 0 : (c.seed2 - 0.5) * 0.16);
        quat.setFromEuler(e);
        break;
      }
      case F.RING: {
        const n = CARDS.length;
        const a = (c.i / n) * Math.PI * 2 + t * 0.12;
        const cx = this.narrow ? 0 : hw * 0.35;
        const rx = this.narrow ? hw * 1.4 : hw * 1.05;
        const ry = this.narrow ? hh * 0.95 : hh * 1.15;
        pos.set(cx + Math.cos(a) * rx, Math.sin(a) * ry, -9);
        e.set(0, 0, a + Math.PI / 2);
        quat.setFromEuler(e);
        s = 1.25;
        break;
      }
      case F.FAN: {
        const k = this.fanIndex.get(c.i);
        const px = this.narrow ? 0 : hw * 0.5;
        const py = this.narrow ? -hh * 0.6 : -hh * 0.66;
        s = this.narrow ? 0.72 : 1.22;
        if (k !== undefined) {
          const breathe = 1 + Math.sin(t * 1.1) * 0.02;
          const spread = this.narrow ? 0.16 : 0.235;
          const th = (k - 3) * spread * breathe;
          const R = this.narrow ? hh * 0.78 : hh * 0.98;
          pos.set(px + Math.sin(th) * R, py + Math.cos(th) * R, 0.4 + k * 0.012);
          // lifted card slides out along its own axis; a flipped card comes
          // to the front so its answer isn't covered by its neighbours
          const lift = Math.max(c.hover, c.flipTarget ? 0.75 : 0);
          pos.x += Math.sin(th) * lift * 0.38;
          pos.y += Math.cos(th) * lift * 0.38;
          pos.z += lift * 0.45 + (c.flipTarget ? 0.2 : 0);
          e.set(0, 0, -th);
          quat.setFromEuler(e);
          s *= 1 + c.hover * 0.08;
        } else {
          const R = this.narrow ? hh * 0.78 : hh * 0.98;
          pos.set(px + (c.seed - 0.5) * 0.05, py + R * 0.42 + c.i * 0.002, -0.2 - c.i * 0.004);
          e.set(0, 0, (c.seed2 - 0.5) * 0.08);
          quat.setFromEuler(e);
        }
        break;
      }
      default: {
        const n = CARDS.length;
        const a = (c.i / n) * Math.PI * 2 + t * 0.08;
        const rx = this.narrow ? hw * 0.95 : hw * 0.8;
        const ry = this.narrow ? hh * 0.86 : hh * 0.8;
        pos.set(Math.cos(a) * rx, Math.sin(a) * ry, -1.4);
        e.set(0, 0, Math.sin(a) * 0.12);
        quat.setFromEuler(e);
        s = this.narrow ? 0.55 : 0.82;
      }
    }
    return s;
  }

  // ----------------------------------------------------------------- input

  setBlend(fa, fb, t) {
    this.fa = fa;
    this.fb = fb;
    this.t = clamp01(t);
  }

  setFront(on) {
    this.frontOn = !!this.front && on;
  }

  pointerMove(x, y) {
    this.pointer.set((x / this.w) * 2 - 1, -(y / this.h) * 2 + 1);
    this.pointerActive = true;
  }

  pointerLeave() {
    this.pointerActive = false;
    this.setHovered(null);
  }

  setHovered(c) {
    if (c === this.hovered) return;
    this.hovered = c;
    if (this.onHover) this.onHover(c);
  }

  // Returns true when a card was clicked (and flipped).
  click() {
    const c = this.hovered;
    if (!c) return false;
    c.flipTarget = c.flipTarget ? 0 : Math.PI;
    if (this.onFlip) this.onFlip(c, !!c.flipTarget);
    return true;
  }

  weight(f) {
    return (this.fa === f ? 1 - this.t : 0) + (this.fb === f ? this.t : 0);
  }

  // Fly upload `k` from a screen point into its unit's pile.
  fileTo(k, clientX, clientY) {
    const fc = this.files[k];
    if (!fc) return;
    const ndc = new THREE.Vector3((clientX / this.w) * 2 - 1, -(clientY / this.h) * 2 + 1, 0.5);
    ndc.unproject(this.camera);
    const dir = ndc.sub(this.camera.position).normalize();
    const dist = (1.5 - this.camera.position.z) / dir.z;
    fc.start.copy(this.camera.position).addScaledVector(dir, dist);
    fc.mode = "flying";
    fc.flyT = 0;
    fc.flip = 0;
    fc.flipTarget = 0;
    fc.pos.copy(fc.start);
    fc.scale = 0.6;
    fc.mesh.visible = true;
  }

  resetFiles() {
    for (const fc of this.files) {
      fc.mode = "hidden";
      fc.mesh.visible = false;
    }
  }

  // ----------------------------------------------------------------- frame

  update(dt, time) {
    if (!this.back) return;
    const k = 1 - Math.exp(-dt * 12);
    const kr = 1 - Math.exp(-dt * 10);
    if (this.intro < 1) this.intro = Math.min(1, this.intro + dt / 1.1);

    // camera
    const cb = easeInOut(this.t);
    const A = CAMS[this.fa];
    const B = CAMS[this.fb];
    this.parallax.x += ((this.pointerActive ? this.pointer.x : 0) - this.parallax.x) * Math.min(1, dt * 2.5);
    this.parallax.y += ((this.pointerActive ? this.pointer.y : 0) - this.parallax.y) * Math.min(1, dt * 2.5);
    this.camera.position.lerpVectors(A.pos, B.pos, cb);
    this._v.lerpVectors(A.look, B.look, cb);
    // Sideways framing is for wide screens; phones stay centred.
    if (this.narrow) {
      this.camera.position.x = 0;
      this._v.x = 0;
    }
    this.camera.position.x += this.parallax.x * 0.35;
    this.camera.position.y += this.parallax.y * 0.22;
    this.camera.lookAt(this._v);
    this.camera.updateMatrixWorld();

    // hover picking (not on the far-away ring)
    const canPick = this.weight(F.RING) < 0.5 && this.pointerActive && !this.reduced;
    const flipping = this.hovered && Math.abs(this.hovered.flip - this.hovered.flipTarget) > 0.15;
    if (canPick && !flipping) {
      this.raycaster.setFromCamera(this.pointer, this.camera);
      const hits = this.raycaster.intersectObjects(this.pickables, false);
      let hit = null;
      for (const h of hits) {
        const st = this.cards.find((c) => c.mesh === h.object) || this.files.find((c) => c.mesh === h.object);
        if (st && st.scale > 0.2 && (st.mesh.visible ?? true)) {
          hit = st;
          break;
        }
      }
      this.setHovered(hit);
    } else if (!canPick) {
      this.setHovered(null);
    }

    // pointer in world (hero cards turn towards it)
    const heroW = this.weight(F.HERO);
    let pwx = 0;
    let pwy = 0;
    if (this.pointerActive && heroW > 0.01) {
      this._v2.set(this.pointer.x, this.pointer.y, 0.5).unproject(this.camera).sub(this.camera.position).normalize();
      const dd = -this.camera.position.z / this._v2.z;
      pwx = this.camera.position.x + this._v2.x * dd;
      pwy = this.camera.position.y + this._v2.y * dd;
    }

    const pa = new THREE.Vector3();
    const pb = new THREE.Vector3();
    const qa = new THREE.Quaternion();
    const qb = new THREE.Quaternion();
    const ctrl = new THREE.Vector3();
    const extra = new THREE.Quaternion();

    for (const c of this.cards) {
      const sa = this.pose(this.fa, c, time, pa, qa);
      const sb = this.pose(this.fb, c, time, pb, qb);
      const local = clamp01((this.t - this.delayFor(this.fb, c)) / (1 - STAGGER));
      const e = easeInOut(local);
      if (e <= 0) {
        c.tPos.copy(pa);
        c.tQuat.copy(qa);
        c.tScale = sa;
      } else if (e >= 1) {
        c.tPos.copy(pb);
        c.tQuat.copy(qb);
        c.tScale = sb;
      } else {
        ctrl.addVectors(pa, pb).multiplyScalar(0.5);
        ctrl.z += c.lift;
        ctrl.x += c.side;
        const u = 1 - e;
        c.tPos.set(
          u * u * pa.x + 2 * u * e * ctrl.x + e * e * pb.x,
          u * u * pa.y + 2 * u * e * ctrl.y + e * e * pb.y,
          u * u * pa.z + 2 * u * e * ctrl.z + e * e * pb.z
        );
        c.tQuat.slerpQuaternions(qa, qb, e);
        extra.setFromAxisAngle(this.axisY, Math.sin(Math.PI * e) * c.spin);
        c.tQuat.multiply(extra);
        c.tScale = sa + (sb - sa) * e;
      }

      // hero: cards near the pointer turn to look at it
      if (heroW > 0.01 && this.pointerActive) {
        const dx = THREE.MathUtils.clamp((pwx - c.tPos.x) * 0.07, -0.35, 0.35);
        const dy = THREE.MathUtils.clamp((pwy - c.tPos.y) * 0.07, -0.35, 0.35);
        this._e.set(-dy * heroW, dx * heroW, 0);
        extra.setFromEuler(this._e);
        c.tQuat.premultiply(extra);
      }

      // intro: fly in from deep space
      if (this.intro < 1) {
        const li = easeOut(clamp01((this.intro - c.seed * 0.35) / 0.65));
        c.tPos.z = -34 + (c.tPos.z + 34) * li;
        c.tScale *= Math.max(0.001, li);
      }

      // hover (non-fan formations): lift towards the viewer a little
      const want = this.hovered === c ? 1 : 0;
      c.hover += (want - c.hover) * Math.min(1, dt * 9);
      if (this.weight(F.FAN) < 0.5) {
        c.tPos.z += c.hover * 0.35;
        c.tScale *= 1 + c.hover * 0.05;
      }
      c.glow.value = c.hover * 0.6;

      this.applySmoothed(c, k, kr);
    }

    // uploaded notes
    const pilesW = this.weight(F.PILES);
    for (const fc of this.files) {
      if (fc.mode === "hidden") continue;
      this.pileCenter(fc.data.unit, pb);
      const sp = this.narrow ? 0.62 : 1.18;
      pb.x += 0.62 * sp;
      pb.y -= 0.36 * sp;
      pb.z += 0.24;
      this._e.set(-0.04, 0, -0.2);
      qb.setFromEuler(this._e);
      if (fc.mode === "flying") {
        fc.flyT = Math.min(1, fc.flyT + dt / 0.8);
        const e = easeOut(fc.flyT);
        ctrl.addVectors(fc.start, pb).multiplyScalar(0.5);
        ctrl.z += 2.4;
        ctrl.y += 1.2;
        const u = 1 - e;
        fc.pos.set(
          u * u * fc.start.x + 2 * u * e * ctrl.x + e * e * pb.x,
          u * u * fc.start.y + 2 * u * e * ctrl.y + e * e * pb.y,
          u * u * fc.start.z + 2 * u * e * ctrl.z + e * e * pb.z
        );
        extra.setFromAxisAngle(this.axisZ, (1 - e) * 1.6);
        fc.quat.copy(qb).multiply(extra);
        fc.scale = (0.7 + 0.3 * e) * sp;
        if (fc.flyT >= 1) fc.mode = "filed";
      } else {
        fc.tPos.copy(pb);
        fc.tQuat.copy(qb);
        fc.tScale = sp * Math.max(0.001, pilesW);
        const want = this.hovered === fc ? 1 : 0;
        fc.hover += (want - fc.hover) * Math.min(1, dt * 9);
        fc.tPos.z += fc.hover * 0.35;
        fc.glow.value = fc.hover * 0.6;
        this.applySmoothed(fc, k, kr);
      }
      fc.mesh.visible = pilesW > 0.02 || fc.mode === "flying";
      fc.mesh.position.copy(fc.pos);
      fc.mesh.quaternion.copy(fc.quat);
      fc.mesh.scale.setScalar(fc.scale);
    }

    this.render();
  }

  applySmoothed(c, k, kr) {
    c.pos.lerp(c.tPos, k);
    c.quat.slerp(c.tQuat, kr);
    c.scale += (c.tScale - c.scale) * k;
    c.flip += (c.flipTarget - c.flip) * kr;
    this._q.setFromAxisAngle(this.axisY, c.flip);
    c.mesh.position.copy(c.pos);
    c.mesh.quaternion.copy(c.quat).multiply(this._q);
    c.mesh.scale.setScalar(Math.max(0.001, c.scale));
  }

  render() {
    this.scene.environment = this.envBack;
    this.back.render(this.scene, this.camera);
    if (!this.front) return;
    if (this.frontOn) {
      this.scene.environment = this.envFront;
      this.front.render(this.scene, this.camera);
      this.frontWasOn = true;
    } else if (this.frontWasOn) {
      this.front.clear();
      this.frontWasOn = false;
    }
  }

  dispose() {
    this.disposed = true;
    if (!this.back) return;
    for (const d of this.disposables) d.dispose();
    this.back.dispose();
    this.back.forceContextLoss();
    if (this.front) {
      this.front.dispose();
      this.front.forceContextLoss();
    }
  }
}

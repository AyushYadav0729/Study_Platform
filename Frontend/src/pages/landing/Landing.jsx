import { useCallback, useEffect, useRef, useState } from "react";
import "katex/dist/katex.min.css";
import "./landing.css";
import { createEngine, EngineContext, useEngine, useFrame } from "./engine";
import Cursor from "./Cursor";
import SummaryDemo from "./SummaryDemo";
import { CardDeck, F } from "./CardDeck";
import { v2 } from "./store";
import { Backword, Header, ProgressBar, SideIndex } from "./Hud";
import Hero from "./Hero";
import Marquee from "./Marquee";
import Chapter from "./Chapter";
import { FlashPanel, SortPanel, SyllabusScan } from "./panels";
import { Faq, Final, Footer } from "./End";

const hint = (detail) => window.dispatchEvent(new CustomEvent("cursor:hint", { detail }));

function LandingExperience() {
  const engine = useEngine();
  const backHolder = useRef(null);
  const frontHolder = useRef(null);
  const mainRef = useRef(null);
  const heroClip = useRef("");
  const anchors = useRef([]);
  const maxScroll = useRef(1);
  const activeRef = useRef(0);
  const [active, setActive] = useState(0);

  // The deck: one scene, two canvases (behind and in front of the page).
  useEffect(() => {
    const mobile = window.innerWidth < 760 || window.matchMedia("(pointer: coarse)").matches;
    const back = document.createElement("canvas");
    back.className = "v2-canvas";
    backHolder.current.appendChild(back);
    let front = null;
    if (!mobile) {
      front = document.createElement("canvas");
      front.className = "v2-canvas";
      frontHolder.current.appendChild(front);
    }
    const deck = new CardDeck(back, front, { mobile, reduced: engine.state.reduced });
    deck.onHover = (c) => hint(c ? (c.flipTarget ? "Flip back" : "Flip") : null);
    deck.onFlip = (c, flipped) => {
      window.dispatchEvent(new CustomEvent("v2:flip", { detail: { index: c.i, flipped } }));
      hint(flipped ? "Flip back" : "Flip");
    };
    let disposed = false;
    deck
      .init()
      .then(() => {
        if (disposed) return;
        v2.deck = deck;
        if (v2.heroZones) deck.setHeroZones(v2.heroZones);
      })
      .catch((err) => console.error("Card deck failed to start:", err));

    const onMove = (e) => deck.pointerMove(e.clientX, e.clientY);
    const onLeave = () => deck.pointerLeave();
    const onClick = (e) => {
      if (e.target.closest("a, button, input, textarea, select, label, .sm, [data-nocard]")) return;
      deck.click();
    };
    window.addEventListener("pointermove", onMove, { passive: true });
    document.addEventListener("pointerleave", onLeave);
    window.addEventListener("click", onClick);
    const offResize = engine.onResize(() => deck.resize());
    return () => {
      disposed = true;
      window.removeEventListener("pointermove", onMove);
      document.removeEventListener("pointerleave", onLeave);
      window.removeEventListener("click", onClick);
      offResize();
      if (v2.deck === deck) v2.deck = null;
      deck.dispose();
      back.remove();
      front?.remove();
    };
  }, [engine]);

  // Scroll position at which each formation is fully formed: when its
  // section's middle sits in the middle of the screen.
  const measure = useCallback(() => {
    const vh = window.innerHeight;
    const max = Math.max(1, document.documentElement.scrollHeight - vh);
    maxScroll.current = max;
    const els = [...document.querySelectorAll(".lv2 [data-formation]")].sort(
      (a, b) => Number(a.dataset.formation) - Number(b.dataset.formation)
    );
    const narrow = window.innerWidth <= 860;
    anchors.current = els.map((el, i) => {
      if (i === 0) return 0;
      // On narrow screens the copy stacks above an empty stage; the deck
      // should be fully formed when that stage, not the copy, is centred.
      const stage = narrow ? el.querySelector(".v2ch-stage") : null;
      const r = (stage || el).getBoundingClientRect();
      const mid = r.top + window.scrollY + r.height / 2 - vh / 2;
      return Math.max(0, Math.min(max, mid));
    });
    v2.anchors = anchors.current;

    // Where the hero copy sits (page coordinates at the top of the page), so
    // the floating cards can keep clear of it.
    const box = (sel) => {
      const el = document.querySelector(sel);
      if (!el) return null;
      const r = el.getBoundingClientRect();
      const top = r.top + window.scrollY;
      return { left: r.left, right: r.right, top, bottom: top + r.height, width: r.width, height: r.height };
    };
    const parts = [".v2-hero .v2-kicker", ".v2-hero-title", ".v2-hero-sub", ".v2-hero-cta"].map(box).filter(Boolean);
    if (parts.length) {
      const block = parts.reduce((u, r) => ({
        left: Math.min(u.left, r.left),
        right: Math.max(u.right, r.right),
        top: Math.min(u.top, r.top),
        bottom: Math.max(u.bottom, r.bottom),
      }));
      v2.heroZones = {
        block,
        title: box(".v2-hero-title"),
        cue: box(".v2-scrollcue"),
        extra: [box(".v2-corner--l"), box(".v2-corner--r")].filter(Boolean),
      };
      v2.deck?.setHeroZones(v2.heroZones);
    }
  }, []);

  useEffect(() => {
    measure();
    const ro = new ResizeObserver(measure);
    ro.observe(mainRef.current);
    const off = engine.onResize(measure);
    document.fonts?.ready.then(measure);
    return () => {
      ro.disconnect();
      off();
    };
  }, [engine, measure]);

  useFrame((s) => {
    const a = anchors.current;
    if (a.length < 2) return;
    const y = s.scrollY;
    let fa = 0;
    let fb = 1;
    let t = 0;
    if (y >= a[a.length - 1]) {
      fa = a.length - 2;
      fb = a.length - 1;
      t = 1;
    } else {
      for (let i = 0; i < a.length - 1; i++) {
        if (y < a[i + 1]) {
          fa = i;
          fb = i + 1;
          t = Math.max(0, (y - a[i]) / Math.max(1, a[i + 1] - a[i]));
          break;
        }
      }
    }
    v2.fa = fa;
    v2.fb = fb;
    v2.t = t;
    v2.progress = Math.min(1, y / maxScroll.current);
    // Front canvas only covers the part of the screen the hero occupies.
    const hero = document.getElementById("v2-top");
    let heroOn = false;
    if (hero && frontHolder.current) {
      const r = hero.getBoundingClientRect();
      heroOn = r.bottom > 0 && fa === F.HERO;
      const clip = `inset(${Math.max(0, r.top).toFixed(0)}px 0 ${Math.max(0, s.vh - r.bottom).toFixed(0)}px 0)`;
      if (clip !== heroClip.current) {
        heroClip.current = clip;
        frontHolder.current.style.clipPath = clip;
      }
    }
    const deck = v2.deck;
    if (deck) {
      deck.setBlend(fa, fb, t);
      deck.setFront(heroOn);
      deck.update(s.dt, s.time);
    }
    const now = t < 0.5 ? fa : fb;
    if (now !== activeRef.current) {
      activeRef.current = now;
      setActive(now);
    }
  }, 10);

  const jump = useCallback(
    (i) => {
      if (i === "faq") {
        const el = document.getElementById("v2-faq");
        if (el) engine.scrollTo(el.getBoundingClientRect().top + window.scrollY - 60, 1.2);
        return;
      }
      engine.scrollTo(i === 0 ? 0 : anchors.current[i] ?? 0, 1.2);
    },
    [engine]
  );

  return (
    <div className="lv2">
      <div className="v2-bg" aria-hidden="true">
        <span className="v2-cross v2-cross--tl" />
        <span className="v2-cross v2-cross--tr" />
        <span className="v2-cross v2-cross--bl" />
        <span className="v2-cross v2-cross--br" />
      </div>
      <Backword />
      <div ref={backHolder} className="v2-layer v2-layer--back" aria-hidden="true" />

      <main ref={mainRef} className="v2-main">
        <Hero onJump={jump} />
        <Marquee />
        <Chapter
          id="v2-syllabus"
          n={1}
          formation={1}
          kicker="Syllabus"
          titleA="Paste it once."
          titleB="Units build themselves."
          text="Upload the syllabus PDF or paste it from your course page. Study-Stop reads it top to bottom and builds every unit with its subtopics. Textbook lists and marking schemes get skipped."
          next="Sorting"
          onNext={() => jump(2)}
        >
          <SyllabusScan />
        </Chapter>
        <Chapter
          id="v2-sorting"
          n={2}
          formation={2}
          kicker="Sorting"
          titleA="Drop a file."
          titleB="It finds its unit."
          text="Upload notes without deciding where they go. Study-Stop reads each file, checks it against your syllabus and files it under the unit it fits best. You can always pick the unit yourself."
          next="Summaries"
          onNext={() => jump(3)}
        >
          <SortPanel />
        </Chapter>
        <Chapter
          id="v2-summaries"
          n={3}
          formation={3}
          kicker="Summaries"
          titleA="Summaries"
          titleB="with the maths intact."
          text="Every unit gets a quick exam summary and a fuller set of study notes, written only from the files you uploaded. Formulas come out as real LaTeX."
          next="Flashcards"
          onNext={() => jump(4)}
          stage={(inView) => <SummaryDemo active={inView} />}
        />
        <Chapter
          id="v2-flashcards"
          n={4}
          formation={4}
          kicker="Flashcards"
          titleA="Flip. Check."
          titleB="Repeat until it sticks."
          text="Fifteen to twenty-five cards for every unit, in the order your material covers them. The fan on the right is one unit's real deck."
          next="Get started"
          onNext={() => jump(5)}
        >
          <FlashPanel />
        </Chapter>
        <Faq />
        <Final />
      </main>
      <Footer />

      <div ref={frontHolder} className="v2-layer v2-layer--front" aria-hidden="true" />
      <Header onJump={jump} />
      <ProgressBar />
      <SideIndex active={active} onJump={jump} />
      <Cursor />
    </div>
  );
}

function Landing() {
  const [engine] = useState(createEngine);
  useEffect(() => {
    const restoration = history.scrollRestoration;
    history.scrollRestoration = "manual";
    window.scrollTo(0, 0);
    engine.start();
    document.documentElement.classList.add("lv2-root");
    return () => {
      engine.stop();
      history.scrollRestoration = restoration;
      document.documentElement.classList.remove("lv2-root");
    };
  }, [engine]);
  return (
    <EngineContext.Provider value={engine}>
      <LandingExperience />
    </EngineContext.Provider>
  );
}

export default Landing;

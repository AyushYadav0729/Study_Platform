import { useEffect, useRef, useState } from "react";

import ReactMarkdown from "react-markdown";

import {
  Sparkles,
  RefreshCw,
  ChevronLeft,
  ChevronRight,
} from "lucide-react";

import api from "../services/authService";

import Button from "./ui/Button";

import remarkMath from "remark-math";
import rehypeKatex from "rehype-katex";
import "katex/dist/katex.min.css";
import remarkGfm from "remark-gfm";

const normalizeMath = (text) =>
  text
    .replace(/\\\[([\s\S]*?)\\\]/g, (_, m) => `$$${m}$$`)
    .replace(/\\\(([\s\S]*?)\\\)/g, (_, m) => `$${m}$`);

function FlashcardsTab({ unitId, active }) {
  const [status, setStatus] = useState("idle");
  const [cards, setCards] = useState([]);
  const [error, setError] = useState("");
  const [index, setIndex] = useState(0);
  const [flipped, setFlipped] = useState(false);
  const [regenerating, setRegenerating] = useState(false);

  // null | "next" | "prev"
  const [animation, setAnimation] = useState(null);

  const startedRef = useRef(false);

  const load = async () => {
    startedRef.current = true;

    setStatus("loading");
    setError("");

    try {
      const res = await api.get(`/units/${unitId}/flashcards`);

      setCards(res.data.flashcards || []);
      setIndex(0);
      setFlipped(false);
      setAnimation(null);
      setStatus("done");
    } catch (err) {
      console.error("Flashcards failed:", err);

      const code = err.response?.status;
      const detail = err.response?.data?.detail;

      if (code === 502) {
        setError(
          "The AI is busy right now. Please try again in a moment."
        );
      } else if (code === 400 && detail) {
        setError(detail);
      } else {
        setError("Something went wrong. Please try again.");
      }

      setStatus("error");
    }
  };

  const regenerate = async () => {
    setRegenerating(true);

    try {
      const res = await api.get(
        `/units/${unitId}/flashcards?regenerate=true`
      );

      setCards(res.data.flashcards || []);
      setIndex(0);
      setFlipped(false);
      setAnimation(null);
    } catch (err) {
      console.error("Regenerate flashcards failed:", err);
    } finally {
      setRegenerating(false);
    }
  };

  // --------------------------------------------------
  // NEXT
  // --------------------------------------------------

  const goNext = () => {
    if (
      index === cards.length - 1 ||
      animation !== null
    ) {
      return;
    }

    setFlipped(false);
    setAnimation("next");

    setTimeout(() => {
      setIndex((i) => Math.min(cards.length - 1, i + 1));
      setAnimation(null);
    }, 450);
  };

  // --------------------------------------------------
  // PREVIOUS
  // --------------------------------------------------

  const goPrev = () => {
    if (
      index === 0 ||
      animation !== null
    ) {
      return;
    }

    setFlipped(false);
    setAnimation("prev");

    setTimeout(() => {
      setIndex((i) => Math.max(0, i - 1));
      setAnimation(null);
    }, 450);
  };

  // --------------------------------------------------
  // FETCH ONLY THE FIRST TIME TAB BECOMES ACTIVE
  // --------------------------------------------------

  useEffect(() => {
    if (active && !startedRef.current) {
      load();
    }
  }, [active]);

  // --------------------------------------------------
  // INACTIVE
  // --------------------------------------------------

  if (!active) return null;

  // --------------------------------------------------
  // LOADING
  // --------------------------------------------------

  if (status === "loading" || status === "idle") {
    return (
      <div className="flex items-center gap-3 rounded-xl border border-accent/30 bg-accent/5 px-4 py-3 text-[13px] text-ink-dim">
        <Sparkles className="h-4 w-4 text-accent" />

        Reading your materials and building flashcards…
      </div>
    );
  }

  // --------------------------------------------------
  // ERROR
  // --------------------------------------------------

  if (status === "error") {
    return (
      <div className="rounded-xl border border-danger/30 bg-danger-soft px-4 py-3">
        <p className="text-[13px] text-danger">
          {error}
        </p>

        <div className="mt-3">
          <Button
            type="button"
            variant="ghost"
            onClick={load}
          >
            <RefreshCw className="h-4 w-4" />

            Try again
          </Button>
        </div>
      </div>
    );
  }

  // --------------------------------------------------
  // NO CARDS
  // --------------------------------------------------

  if (cards.length === 0) {
    return (
      <p className="text-[13px] text-ink-faint">
        No flashcards were generated for this unit.
      </p>
    );
  }

  const card = cards[index];

  const nextCard =
    animation === "next"
      ? cards[index + 1]
      : null;

  const previousCard =
    animation === "prev"
      ? cards[index - 1]
      : null;

  /*
   * Number of cards still ahead of the current card.
   * Used only for the decorative stack.
   */
  const remaining = cards.length - 1 - index;

  const stackDepth = Math.min(2, remaining);

  // --------------------------------------------------
  // CARD CONTENT
  // --------------------------------------------------

  const renderCardContent = (cardData) => {
    if (!cardData) return null;

    return (
      <div
        className="
          relative
          h-full
          min-h-[220px]
          w-full
          [transform-style:preserve-3d]
        "
      >
        {/* FRONT — QUESTION */}

        <div
          className="
            absolute
            inset-0
            flex
            items-center
            justify-center
            overflow-y-auto
            rounded-xl
            border
            border-border
            bg-surface
            px-6
            py-8
            text-center
            shadow-sm
            [backface-visibility:hidden]
          "
        >
          <div className="text-[15px] leading-relaxed text-ink">
            <ReactMarkdown
              remarkPlugins={[
                remarkMath,
                remarkGfm,
              ]}
              rehypePlugins={[rehypeKatex]}
            >
              {normalizeMath(cardData.question)}
            </ReactMarkdown>
          </div>
        </div>

        {/* BACK — ANSWER */}

        <div
          className="
            absolute
            inset-0
            flex
            items-center
            justify-center
            overflow-y-auto
            rounded-xl
            border
            border-border
            bg-surface
            px-6
            py-8
            text-center
            shadow-sm
            [backface-visibility:hidden]
            [transform:rotateY(-180deg)]
          "
        >
          <div className="text-[15px] leading-relaxed text-ink">
            <ReactMarkdown
              remarkPlugins={[
                remarkMath,
                remarkGfm,
              ]}
              rehypePlugins={[rehypeKatex]}
            >
              {normalizeMath(cardData.answer)}
            </ReactMarkdown>
          </div>
        </div>
      </div>
    );
  };

  return (
    <div className="flex flex-col items-center">
      {/* -------------------------------------------- */}
      {/* ANIMATIONS */}
      {/* -------------------------------------------- */}

      <style>{`
        /*
         * NEXT — CURRENT CARD
         *
         * Current/top card:
         * - tilts clockwise
         * - moves right
         * - moves slightly down
         * - gets smaller
         * - fades out
         *
         * It visually travels toward the
         * bottom/back of the pile.
         */
        @keyframes flashcardNextOut {
          0% {
            transform:
              translateX(0)
              translateY(0)
              rotate(0deg)
              scale(1);
            opacity: 1;
          }

          25% {
            transform:
              translateX(12px)
              translateY(4px)
              rotate(2deg)
              scale(0.99);
            opacity: 1;
          }

          60% {
            transform:
              translateX(38px)
              translateY(20px)
              rotate(5deg)
              scale(0.94);
            opacity: 0.8;
          }

          100% {
            transform:
              translateX(70px)
              translateY(55px)
              rotate(8deg)
              scale(0.88);
            opacity: 0;
          }
        }

        /*
         * NEXT — NEW CARD
         *
         * New card:
         * - starts near the position of the
         *   underlying card
         * - starts slightly smaller
         * - starts transparent
         * - rises toward the top
         * - grows slightly
         * - fades in
         */
        @keyframes flashcardNextIn {
          0% {
            transform:
              translateY(10px)
              scale(0.96);
            opacity: 0;
          }

          45% {
            transform:
              translateY(5px)
              scale(0.98);
            opacity: 0.55;
          }

          100% {
            transform:
              translateY(0)
              scale(1);
            opacity: 1;
          }
        }

        /*
         * PREVIOUS — CURRENT CARD
         *
         * Current/top card:
         * - becomes slightly smaller
         * - moves downward
         * - fades out
         */
        @keyframes flashcardPrevOut {
          0% {
            transform:
              translateY(0)
              scale(1);
            opacity: 1;
          }

          45% {
            transform:
              translateY(12px)
              scale(0.97);
            opacity: 0.65;
          }

          100% {
            transform:
              translateY(48px)
              scale(0.91);
            opacity: 0;
          }
        }

        /*
         * PREVIOUS — PREVIOUS CARD
         *
         * This is the mirror/opposite of Next Out.
         *
         * The previous card:
         * - starts at the bottom-left
         * - starts smaller
         * - starts transparent
         * - is tilted counter-clockwise
         * - moves diagonally toward the center/top
         * - becomes straight
         * - grows to normal size
         * - fades in
         */
        @keyframes flashcardPrevIn {
          0% {
            transform:
              translateX(-70px)
              translateY(55px)
              rotate(-8deg)
              scale(0.88);
            opacity: 0;
          }

          35% {
            transform:
              translateX(-38px)
              translateY(20px)
              rotate(-5deg)
              scale(0.94);
            opacity: 0.55;
          }

          65% {
            transform:
              translateX(-12px)
              translateY(5px)
              rotate(-2deg)
              scale(0.98);
            opacity: 0.85;
          }

          100% {
            transform:
              translateX(0)
              translateY(0)
              rotate(0deg)
              scale(1);
            opacity: 1;
          }
        }
      `}</style>

      {/* -------------------------------------------- */}
      {/* CARD COUNTER */}
      {/* -------------------------------------------- */}

      <div className="mb-3 text-[12px] text-ink-faint">
        {index + 1} / {cards.length}
      </div>

      {/* -------------------------------------------- */}
      {/* TOPIC */}
      {/* -------------------------------------------- */}

      {card.topic && (
        <div className="mb-3 rounded-full border border-accent/30 bg-accent/5 px-3 py-1 text-[11px] font-medium text-accent">
          {card.topic}
        </div>
      )}

      {/* -------------------------------------------- */}
      {/* CARD AREA */}
      {/* -------------------------------------------- */}

      <div
        className="relative w-full max-w-xl"
        style={{
          minHeight: 240,
        }}
      >
        {/* ------------------------------------------ */}
        {/* DECORATIVE CARDS BEHIND */}
        {/* ------------------------------------------ */}

        {Array.from(
          { length: stackDepth },
          (_, i) => i + 1
        )
          .reverse()
          .map((depth) => (
            <div
              key={`stack-${depth}`}
              className="
                absolute
                inset-0
                rounded-xl
                border
                border-border
                bg-surface
              "
              style={{
                transform: `
                  translateY(${depth * 10}px)
                  scale(${1 - depth * 0.04})
                `,
                opacity: 1 - depth * 0.3,
                zIndex: 10 - depth,
              }}
            />
          ))}

        {/* ------------------------------------------ */}
        {/* NEXT ANIMATION */}
        {/* ------------------------------------------ */}

        {animation === "next" && nextCard && (
          <>
            {/* NEW CARD COMING UP */}

            <div
              className="
                absolute
                inset-0
                z-10
                [perspective:1200px]
              "
              style={{
                minHeight: 220,
                animation:
                  "flashcardNextIn 450ms ease-out forwards",
              }}
            >
              {renderCardContent(nextCard)}
            </div>

            {/* CURRENT CARD GOING TO BACK */}

            <div
              className="
                absolute
                inset-0
                z-30
                [perspective:1200px]
              "
              style={{
                minHeight: 220,
                animation:
                  "flashcardNextOut 450ms ease-in forwards",
              }}
            >
              {renderCardContent(card)}
            </div>
          </>
        )}

        {/* ------------------------------------------ */}
        {/* PREVIOUS ANIMATION */}
        {/* ------------------------------------------ */}

        {animation === "prev" && previousCard && (
          <>
            {/* PREVIOUS CARD COMING FROM
                BOTTOM-LEFT TO CENTER */}

            <div
              className="
                absolute
                inset-0
                z-10
                [perspective:1200px]
              "
              style={{
                minHeight: 220,
                animation:
                  "flashcardPrevIn 450ms ease-out forwards",
              }}
            >
              {renderCardContent(previousCard)}
            </div>

            {/* CURRENT CARD MOVING DOWN */}

            <div
              className="
                absolute
                inset-0
                z-30
                [perspective:1200px]
              "
              style={{
                minHeight: 220,
                animation:
                  "flashcardPrevOut 450ms ease-in forwards",
              }}
            >
              {renderCardContent(card)}
            </div>
          </>
        )}

        {/* ------------------------------------------ */}
        {/* NORMAL ACTIVE CARD */}
        {/* ------------------------------------------ */}

        {animation === null && (
          <div
            key={index}
            onClick={() => {
              if (animation === null) {
                setFlipped((f) => !f);
              }
            }}
            className="
              relative
              z-20
              cursor-pointer
              [perspective:1200px]
            "
            style={{
              minHeight: 220,
            }}
          >
            <div
              className={`
                relative
                h-full
                min-h-[220px]
                w-full
                transition-transform
                duration-500
                [transform-style:preserve-3d]

                ${
                  flipped
                    ? "[transform:rotateY(-180deg)]"
                    : ""
                }
              `}
            >
              {/* FRONT — QUESTION */}

              <div
                className="
                  absolute
                  inset-0
                  flex
                  items-center
                  justify-center
                  overflow-y-auto
                  rounded-xl
                  border
                  border-border
                  bg-surface
                  px-6
                  py-8
                  text-center
                  shadow-sm
                  transition-colors
                  hover:border-accent/40
                  [backface-visibility:hidden]
                "
              >
                <div className="text-[15px] leading-relaxed text-ink">
                  <ReactMarkdown
                    remarkPlugins={[
                      remarkMath,
                      remarkGfm,
                    ]}
                    rehypePlugins={[rehypeKatex]}
                  >
                    {normalizeMath(card.question)}
                  </ReactMarkdown>
                </div>
              </div>

              {/* BACK — ANSWER */}

              <div
                className="
                  absolute
                  inset-0
                  flex
                  items-center
                  justify-center
                  overflow-y-auto
                  rounded-xl
                  border
                  border-border
                  bg-surface
                  px-6
                  py-8
                  text-center
                  shadow-sm
                  [backface-visibility:hidden]
                  [transform:rotateY(-180deg)]
                "
              >
                <div className="text-[15px] leading-relaxed text-ink">
                  <ReactMarkdown
                    remarkPlugins={[
                      remarkMath,
                      remarkGfm,
                    ]}
                    rehypePlugins={[rehypeKatex]}
                  >
                    {normalizeMath(card.answer)}
                  </ReactMarkdown>
                </div>
              </div>
            </div>
          </div>
        )}
      </div>

      {/* -------------------------------------------- */}
      {/* FLIP HINT */}
      {/* -------------------------------------------- */}

      <p className="mt-2 text-[12px] text-ink-faint">
        {flipped
          ? "Click to see the question"
          : "Click to reveal the answer"}
      </p>

      {/* -------------------------------------------- */}
      {/* NAVIGATION */}
      {/* -------------------------------------------- */}

      <div className="mt-5 flex items-center gap-3">
        <Button
          type="button"
          variant="ghost"
          onClick={goPrev}
          disabled={
            index === 0 ||
            animation !== null
          }
        >
          <ChevronLeft className="h-4 w-4" />

          Prev
        </Button>

        <Button
          type="button"
          variant="ghost"
          onClick={goNext}
          disabled={
            index === cards.length - 1 ||
            animation !== null
          }
        >
          Next

          <ChevronRight className="h-4 w-4" />
        </Button>
      </div>
    </div>
  );
}

export default FlashcardsTab;
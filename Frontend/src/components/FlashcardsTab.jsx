import { useEffect, useRef, useState } from "react";
import ReactMarkdown from "react-markdown";
import {
  ChevronLeft,
  ChevronRight,
  RefreshCw,
  Sparkles,
} from "lucide-react";
import remarkMath from "remark-math";
import remarkGfm from "remark-gfm";
import rehypeKatex from "rehype-katex";
import "katex/dist/katex.min.css";

import api from "../services/authService";
import Button from "./ui/Button";

function normalizeMath(text = "") {
  return String(text)
    .replace(/\\\(/g, "$")
    .replace(/\\\)/g, "$")
    .replace(/\\\[/g, "$$")
    .replace(/\\\]/g, "$$");
}

function FlashcardsTab({ unitId, active = true }) {
  const [status, setStatus] = useState("idle");
  const [cards, setCards] = useState([]);
  const [error, setError] = useState("");
  const [index, setIndex] = useState(0);
  const [flipped, setFlipped] = useState(false);
  const [regenerating, setRegenerating] = useState(false);
  const [regenerateError, setRegenerateError] = useState("");

  const [animation, setAnimation] = useState(null);
  const [displayIndex, setDisplayIndex] = useState(0);

  const startedRef = useRef(false);
  const animationTimerRef = useRef(null);

  const currentCard = cards[displayIndex];
  const totalCards = cards.length;

  const clearAnimationTimer = () => {
    if (animationTimerRef.current) {
      clearTimeout(animationTimerRef.current);
      animationTimerRef.current = null;
    }
  };

  useEffect(() => {
    return () => {
      clearAnimationTimer();
    };
  }, []);

  const load = async (regenerate = false) => {
    if (!unitId) return;

    try {
      setError("");
      if (regenerate) setRegenerateError("");

      if (regenerate) {
        setRegenerating(true);
      } else {
        setStatus("loading");
      }

      const response = await api.get(
        `/units/${unitId}/flashcards`,
        regenerate ? { params: { regenerate: true } } : undefined
      );

      const nextCards = response.data?.flashcards || [];

      clearAnimationTimer();
      setAnimation(null);
      setCards(nextCards);
      setIndex(0);
      setDisplayIndex(0);
      setFlipped(false);

      if (regenerate) {
        setRegenerating(false);
      } else {
        setStatus("success");
      }
    } catch (err) {
      console.error("Failed to load flashcards:", err);

      if (regenerate) {
        setRegenerateError(
          err?.response?.data?.detail ||
            "Couldn't regenerate flashcards. Your existing cards are still available."
        );
      }

      setError(
        err?.response?.data?.detail ||
          "Unable to load flashcards. Please try again."
      );

      if (regenerate) {
        setRegenerating(false);
      } else {
        setStatus("error");
      }
    }
  };

  useEffect(() => {
    if (active && !startedRef.current) {
      startedRef.current = true;
      load();
    }
  }, [active, unitId]);

  if (!active) {
    return null;
  }

  const goNext = () => {
    if (
      animation ||
      cards.length <= 1 ||
      displayIndex >= cards.length - 1
    ) {
      return;
    }

    clearAnimationTimer();

    setFlipped(false);
    setAnimation("next-out");

    animationTimerRef.current = setTimeout(() => {
      setDisplayIndex((current) => current + 1);
      setIndex((current) => current + 1);
      setAnimation("next-in");

      animationTimerRef.current = setTimeout(() => {
        setAnimation(null);
        animationTimerRef.current = null;
      }, 420);
    }, 420);
  };

  const goPrev = () => {
    if (animation || cards.length <= 1 || displayIndex <= 0) {
      return;
    }

    clearAnimationTimer();

    setFlipped(false);
    setAnimation("prev-out");

    animationTimerRef.current = setTimeout(() => {
      setDisplayIndex((current) => current - 1);
      setIndex((current) => current - 1);
      setAnimation("prev-in");

      animationTimerRef.current = setTimeout(() => {
        setAnimation(null);
        animationTimerRef.current = null;
      }, 420);
    }, 420);
  };

  const regenerate = () => {
    if (regenerating || animation) return;
    load(true);
  };

  if (status === "loading") {
    return (
      <div className="flex min-h-[460px] items-center justify-center">
        <div className="text-center">
          <div className="mx-auto mb-4 flex h-12 w-12 items-center justify-center rounded-full border border-border bg-surface">
            <RefreshCw className="h-5 w-5 animate-spin text-accent" />
          </div>

          <p className="text-sm font-medium text-ink">
            Generating flashcards…
          </p>

          <p className="mt-1 text-xs text-ink-dim">
            Turning your material into active-recall questions.
          </p>
        </div>
      </div>
    );
  }

  if (status === "error") {
    return (
      <div className="flex min-h-[460px] items-center justify-center">
        <div className="max-w-md rounded-2xl border border-danger/30 bg-danger-soft p-6 text-center">
          <p className="text-sm font-medium text-ink">
            Couldn&apos;t load flashcards
          </p>

          <p className="mt-2 text-sm leading-6 text-ink-dim">
            {error}
          </p>

          <div className="mt-5">
            <Button type="button" onClick={() => load()}>
              Try again
            </Button>
          </div>
        </div>
      </div>
    );
  }

  if (!cards.length) {
    return (
      <div className="flex min-h-[460px] items-center justify-center">
        <div className="max-w-md rounded-2xl border border-border bg-surface p-8 text-center">
          <div className="mx-auto mb-4 flex h-12 w-12 items-center justify-center rounded-full border border-border bg-bg-alt">
            <Sparkles className="h-5 w-5 text-accent" />
          </div>

          <h3 className="text-lg font-semibold text-ink">
            No flashcards yet
          </h3>

          <p className="mt-2 text-sm leading-6 text-ink-dim">
            Add some study material to this unit and generate flashcards
            from it.
          </p>

          <div className="mt-5">
            <Button
              type="button"
              onClick={regenerate}
              disabled={regenerating}
            >
              <RefreshCw className="mr-2 h-4 w-4" />
              Generate flashcards
            </Button>
          </div>
        </div>
      </div>
    );
  }

  const progress =
    totalCards > 0 ? ((displayIndex + 1) / totalCards) * 100 : 0;

  const animationClass =
    animation === "next-out"
      ? "flashcard-next-out"
      : animation === "next-in"
        ? "flashcard-next-in"
        : animation === "prev-out"
          ? "flashcard-prev-out"
          : animation === "prev-in"
            ? "flashcard-prev-in"
            : "";

  return (
    <section className="mx-auto w-full max-w-[920px]">
      {regenerateError && (
        <div className="mb-4 flex items-start justify-between gap-3 rounded-xl border border-danger/30 bg-danger-soft px-4 py-3 text-[12px] text-danger">
          <p className="leading-relaxed">{regenerateError}</p>
          <button
            type="button"
            onClick={() => setRegenerateError("")}
            className="shrink-0 rounded-md px-1 text-current opacity-70 hover:opacity-100"
            aria-label="Dismiss flashcard regeneration error"
          >
            ×
          </button>
        </div>
      )}

      {/* Header */}
      <div className="mb-7 flex flex-col gap-4 border-b border-border pb-6 sm:flex-row sm:items-end sm:justify-between">
        <div>
          <div className="flex items-center gap-2">
            <Sparkles className="h-4 w-4 text-accent" />

            <span className="text-xs font-semibold uppercase tracking-[0.16em] text-accent">
              Active recall
            </span>
          </div>

          <h2
            className="mt-1 text-2xl text-ink sm:text-3xl"
            style={{ fontFamily: "var(--font-display)" }}
          >
            Flashcards
          </h2>

          <p className="mt-1 text-sm text-ink-dim">
            Test yourself before revealing the answer.
          </p>
        </div>

        <Button
          type="button"
          variant="secondary"
          onClick={regenerate}
          disabled={regenerating || Boolean(animation)}
        >
          <RefreshCw
            className={`mr-2 h-4 w-4 ${
              regenerating ? "animate-spin" : ""
            }`}
          />
          {regenerating ? "Regenerating…" : "Regenerate"}
        </Button>
      </div>

      {/* Progress */}
      <div className="mb-6 rounded-xl border border-border bg-bg-alt/40 px-4 py-3">
        <div className="mb-2 flex items-center justify-between text-xs text-ink-dim">
          <span>
            Card {displayIndex + 1} of {totalCards}
          </span>

          <span>{Math.round(progress)}%</span>
        </div>

        <div className="h-1.5 overflow-hidden rounded-full bg-border/70">
          <div
            className="h-full rounded-full bg-accent transition-all duration-300"
            style={{ width: `${progress}%` }}
          />
        </div>
      </div>

      {/* Topic */}
      {currentCard?.topic && (
        <div className="mb-5 flex justify-center">
          <span className="rounded-full border border-teal/20 bg-teal-soft px-3 py-1 text-xs font-medium text-teal">
            {currentCard.topic}
          </span>
        </div>
      )}

      {/* Card area */}
      <div className="relative mx-auto h-[380px] w-full max-w-[700px] sm:h-[420px]">
        {/* Decorative cards behind the active card */}
        <div className="absolute inset-x-4 top-3 bottom-0 rounded-3xl border border-border bg-surface opacity-60 sm:inset-x-7" />

        <div className="absolute inset-x-2 top-1 bottom-2 rounded-3xl border border-border bg-bg-alt opacity-80 sm:inset-x-4" />

        {/* Animated active card */}
        <div
          key={displayIndex}
          className={`flashcard-stage absolute inset-0 ${animationClass}`}
        >
          <button
            type="button"
            onClick={() => {
              if (!animation) {
                setFlipped((value) => !value);
              }
            }}
            disabled={Boolean(animation)}
            className="flashcard-perspective h-full w-full text-left"
            aria-label={
              flipped
                ? "Flashcard answer. Click to show question."
                : "Flashcard question. Click to reveal answer."
            }
          >
            <div
              className={`flashcard-inner relative h-full w-full ${
                flipped ? "is-flipped" : ""
              }`}
            >
              {/* Front */}
              <div className="flashcard-face flashcard-front absolute inset-0 overflow-hidden rounded-3xl border border-border bg-surface p-7 shadow-2xl sm:p-10">
                <div className="flex h-full flex-col">
                  <div className="flex items-center justify-between">
                    <span className="font-mono text-[11px] uppercase tracking-[0.18em] text-ink-faint">
                      Question
                    </span>

                    <span className="rounded-full bg-bg-alt px-2.5 py-1 text-[11px] text-ink-faint">
                      Click to flip
                    </span>
                  </div>

                  <div className="flex flex-1 items-center justify-center py-8">
                    <div className="w-full text-center text-xl leading-relaxed text-ink sm:text-2xl">
                      <ReactMarkdown
                        remarkPlugins={[remarkMath, remarkGfm]}
                        rehypePlugins={[rehypeKatex]}
                      >
                        {normalizeMath(currentCard?.question || "")}
                      </ReactMarkdown>
                    </div>
                  </div>

                  <div className="text-center text-xs text-ink-faint">
                    Think of the answer before revealing it.
                  </div>
                </div>
              </div>

              {/* Back */}
              <div className="flashcard-face flashcard-back absolute inset-0 overflow-hidden rounded-3xl border border-accent/30 bg-bg-alt p-7 shadow-2xl sm:p-10">
                <div className="flex h-full flex-col">
                  <div className="flex items-center justify-between">
                    <span className="font-mono text-[11px] uppercase tracking-[0.18em] text-accent">
                      Answer
                    </span>

                    <span className="rounded-full bg-surface px-2.5 py-1 text-[11px] text-ink-faint">
                      Click to flip back
                    </span>
                  </div>

                  <div className="flex flex-1 items-center justify-center py-8">
                    <div className="w-full text-center text-lg leading-relaxed text-ink sm:text-xl">
                      <ReactMarkdown
                        remarkPlugins={[remarkMath, remarkGfm]}
                        rehypePlugins={[rehypeKatex]}
                      >
                        {normalizeMath(currentCard?.answer || "")}
                      </ReactMarkdown>
                    </div>
                  </div>

                  <div className="text-center text-xs text-ink-faint">
                    Recall complete.
                  </div>
                </div>
              </div>
            </div>
          </button>
        </div>
      </div>

      {/* Navigation */}
      <div className="mt-7 flex items-center justify-between">
        <Button
          type="button"
          variant="secondary"
          onClick={goPrev}
          disabled={displayIndex === 0 || Boolean(animation)}
        >
          <ChevronLeft className="mr-1.5 h-4 w-4" />
          Previous
        </Button>

        <div className="text-xs text-ink-faint">
          {displayIndex === totalCards - 1
            ? "End of deck"
            : "Keep going"}
        </div>

        <Button
          type="button"
          onClick={goNext}
          disabled={
            displayIndex === totalCards - 1 || Boolean(animation)
          }
        >
          Next
          <ChevronRight className="ml-1.5 h-4 w-4" />
        </Button>
      </div>
    </section>
  );
}

export default FlashcardsTab;
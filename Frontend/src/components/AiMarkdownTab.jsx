import { useEffect, useRef, useState } from "react";
import ReactMarkdown from "react-markdown";
import { Sparkles, RefreshCw } from "lucide-react";
import api from "../services/authService";
import Button from "./ui/Button";
import remarkMath from "remark-math";
import rehypeKatex from "rehype-katex";
import "katex/dist/katex.min.css";
import remarkGfm from "remark-gfm";

// Styling for the Markdown Gemini returns (no typography plugin needed)
const mdComponents = {
  table: (p) => (
    <div className="my-4 overflow-x-auto rounded-lg border border-border">
      <table className="w-full border-collapse text-left text-[13.5px]" {...p} />
    </div>
  ),
  thead: (p) => <thead className="bg-bg-alt" {...p} />,
  th: (p) => <th className="border-b border-border px-3 py-2 font-semibold text-ink" {...p} />,
  td: (p) => <td className="border-t border-border px-3 py-2 align-top text-ink-dim" {...p} />,
  h1: (p) => <h2 className="mt-6 mb-2 text-[1.25rem] text-ink" style={{ fontFamily: "var(--font-display)" }} {...p} />,
  h2: (p) => <h3 className="mt-6 mb-2 text-[1.1rem] text-ink" style={{ fontFamily: "var(--font-display)" }} {...p} />,
  h3: (p) => <h4 className="mt-4 mb-1.5 text-[15px] font-semibold text-ink" {...p} />,
  p: (p) => <p className="my-2 text-[14px] leading-relaxed text-ink-dim" {...p} />,
  ul: (p) => <ul className="my-2 ml-5 list-disc space-y-1 text-[14px] text-ink-dim" {...p} />,
  ol: (p) => <ol className="my-2 ml-5 list-decimal space-y-1 text-[14px] text-ink-dim" {...p} />,
  li: (p) => <li className="leading-relaxed" {...p} />,
  strong: (p) => <strong className="font-semibold text-ink" {...p} />,
  code: (p) => <code className="rounded bg-bg-alt px-1.5 py-0.5 text-[13px] text-ink" {...p} />,
};
const normalizeMath = (text) =>
  text
    .replace(/\\\[([\s\S]*?)\\\]/g, (_, m) => `$$${m}$$`)
    .replace(/\\\(([\s\S]*?)\\\)/g, (_, m) => `$${m}$`);

function AiMarkdownTab({ endpoint, field, active, loadingText }) {
  const [status, setStatus] = useState("idle"); // idle | loading | done | error
  const [content, setContent] = useState("");
  const [skipped, setSkipped] = useState([]);
  const [error, setError] = useState("");
  const [regenerating, setRegenerating] = useState(false);
  const [regenerateError, setRegenerateError] = useState("");
  const startedRef = useRef(false); // stops the double-fetch in StrictMode

  const load = async () => {
    startedRef.current = true;
    setStatus("loading");
    setError("");
    try {
      const res = await api.get(endpoint);
      setContent(res.data[field]);
      setSkipped(res.data.files_skipped || []);
      setStatus("done");
    } catch (err) {
      console.error("AI content failed:", err);
      const code = err.response?.status;
      const detail = err.response?.data?.detail;
      if (code === 502) {
        setError("The AI is busy right now. Please try again in a moment.");
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
    setRegenerateError("");
    try {
      const res = await api.get(`${endpoint}?regenerate=true`);
      setContent(res.data[field]);
      setSkipped(res.data.files_skipped || []);
    } catch (err) {
      console.error("Regenerate failed:", err);
      setRegenerateError("Couldn't regenerate this content. Your existing content is still available.");
      // Keep showing the existing content; just don't update it.
    } finally {
      setRegenerating(false);
    }
  };

  // Fetch only the first time this tab becomes active
  useEffect(() => {
    if (active && !startedRef.current) load();
  }, [active]);

  if (!active) return null;

  if (status === "loading" || status === "idle") {
    return (
      <div className="flex min-h-[220px] items-center justify-center rounded-2xl border border-accent/20 bg-accent/5 px-6 py-8 text-center text-[13px] text-ink-dim">
        <Sparkles className="h-4 w-4 text-accent" />
        {loadingText}
      </div>
    );
  }

  if (status === "error") {
    return (
      <div className="rounded-xl border border-danger/30 bg-danger-soft px-4 py-3">
        <p className="text-[13px] text-danger">{error}</p>
        <div className="mt-3">
          <Button type="button" variant="ghost" onClick={load}>
            <RefreshCw className="h-4 w-4" />
            Try again
          </Button>
        </div>
      </div>
    );
  }

  return (
    <div>
      {regenerateError && (
        <div className="mb-3 rounded-xl border border-danger/30 bg-danger-soft px-4 py-3 text-[12px] text-danger">
          {regenerateError}
        </div>
      )}
      <div className="mb-2 flex justify-end">
        <Button type="button" variant="ghost" onClick={regenerate} disabled={regenerating}>
          <RefreshCw className={`h-4 w-4 ${regenerating ? "animate-spin" : ""}`} />
          {regenerating ? "Regenerating..." : "Regenerate"}
        </Button>
      </div>
      <div className="rounded-2xl border border-border bg-bg-alt/40 px-6 py-6 shadow-sm sm:px-8">
        <ReactMarkdown
            remarkPlugins={[remarkMath, remarkGfm]}
            rehypePlugins={[rehypeKatex]}
            components={mdComponents}
            >
            {normalizeMath(content)}
        </ReactMarkdown>
      </div>
      {skipped.length > 0 && (
        <div className="mt-4 rounded-xl border border-border bg-bg-alt/40 px-4 py-3 text-[12px] text-ink-faint">
          Not included (unsupported file type): {skipped.join(", ")}
        </div>
      )}
    </div>
  );
}

export default AiMarkdownTab;
import { useEffect, useLayoutEffect, useRef, useState } from "react";
import { Link, useParams } from "react-router-dom";
import {
  ArrowLeft,
  ArrowRight,
  BookOpen,
  FileText,
  Layers,
  Loader2,
  Sparkles,
  Upload,
  X,
} from "lucide-react";

import api from "../services/authService";
import Button from "../components/ui/Button";
import FeedbackToast from "../components/ui/FeedbackToast";
import Breadcrumbs from "../components/ui/Breadcrumbs";
import AiMarkdownTab from "../components/AiMarkdownTab";
import FlashcardsTab from "../components/FlashcardsTab";

const TABS = [
  { key: "materials", label: "Materials" },
  { key: "summary", label: "Summary" },
  { key: "notes", label: "Notes" },
  { key: "flashcards", label: "Flashcards" },
];

function Unit({ subjects }) {
  const { id, unitId } = useParams();

  const subject = subjects.find((s) => s.id === id);

  const [unit, setUnit] = useState(null);
  const [files, setFiles] = useState([]);

  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  const [activeTab, setActiveTab] = useState("materials");
  const tabRefs = useRef({});
  const [tabIndicator, setTabIndicator] = useState({ left: 0, width: 0 });

  const [file, setFile] = useState(null);
  const [uploading, setUploading] = useState(false);
  const [uploadError, setUploadError] = useState("");
  const [feedback, setFeedback] = useState("");
  const [feedbackVariant, setFeedbackVariant] = useState("success");

  const [previewFile, setPreviewFile] = useState(null);
  const [previewUrl, setPreviewUrl] = useState("");
  const [previewLoading, setPreviewLoading] = useState(false);
  const [previewError, setPreviewError] = useState("");

  const fetchFiles = async () => {
    const response = await api.get(
      `/units/${unitId}/notes`
    );

    setFiles(response.data);
  };

  useEffect(() => {
    let cancelled = false;

    const load = async () => {
      setLoading(true);
      setError("");

      try {
        const [unitsResponse, notesResponse] =
          await Promise.all([
            api.get(`/subjects/${id}/units`),
            api.get(`/units/${unitId}/notes`),
          ]);

        if (cancelled) return;

        const found = unitsResponse.data.find(
          (item) => item.id === unitId
        );

        if (!found) {
          setError("Unit not found.");
          return;
        }

        setUnit(found);
        setFiles(notesResponse.data);
      } catch (err) {
        console.error("Failed to load unit:", err);

        if (!cancelled) {
          setError("Couldn't load this unit.");
        }
      } finally {
        if (!cancelled) {
          setLoading(false);
        }
      }
    };

    load();

    return () => {
      cancelled = true;
    };
  }, [id, unitId]);

  const handlePreview = async (selectedFile) => {
    setPreviewFile(selectedFile);
    setPreviewUrl("");
    setPreviewError("");
    setPreviewLoading(true);

    try {
      const response = await api.get(
        `/notes/${selectedFile.id}/preview`
      );

      setPreviewUrl(response.data.url);
    } catch (err) {
      console.error(
        "Failed to load preview:",
        err
      );

      setPreviewError("Couldn't load this file.");
    } finally {
      setPreviewLoading(false);
    }
  };

  const handleDownload = async (selectedFile) => {
    try {
      const response = await api.get(
        `/notes/${selectedFile.id}/preview`
      );

      const link = document.createElement("a");

      link.href = response.data.url;
      link.target = "_blank";
      link.rel = "noopener noreferrer";

      link.click();
    } catch (err) {
      console.error(
        "Failed to download file:",
        err
      );

      setFeedbackVariant("error");
      setFeedback("Couldn't download this file.");
    }
  };

  const closePreview = () => {
    setPreviewFile(null);
    setPreviewUrl("");
    setPreviewError("");
  };

  const handleDeleteFile = async (fileId) => {
    try {
      await api.delete(`/notes/${fileId}`);

      setFiles((prev) =>
        prev.filter((item) => item.id !== fileId)
      );
    } catch (err) {
      console.error(
        "Failed to delete file:",
        err
      );

      setFeedbackVariant("error");
      setFeedback("Failed to delete file. Please try again.");
    }
  };

  const handleUpload = async (event) => {
    event.preventDefault();

    if (!file || uploading) return;

    setUploading(true);
    setUploadError("");

    try {
      const formData = new FormData();

      formData.append("file", file);

      await api.post(
        `/units/${unitId}/notes`,
        formData
      );

      await fetchFiles();

      setFeedbackVariant("success");
      setFeedback("File uploaded successfully.");
      setFile(null);
      event.target.reset();
    } catch (err) {
      console.error("Upload error:", err);

      setUploadError(
        "Couldn't upload this file. Try again."
      );
    } finally {
      setUploading(false);
    }
  };

  const handleTabChange = (tabKey) => {
    if (tabKey === activeTab) return;
    setActiveTab(tabKey);
  };

  const activeTabIndex = Math.max(
    0,
    TABS.findIndex((tab) => tab.key === activeTab)
  );

  useLayoutEffect(() => {
    const updateIndicator = () => {
      const tab = tabRefs.current[activeTab];

      if (!tab) return;

      setTabIndicator({
        left: tab.offsetLeft,
        width: tab.offsetWidth,
      });
    };

    updateIndicator();

    const handleResize = () => updateIndicator();
    window.addEventListener("resize", handleResize);

    const observer = new ResizeObserver(updateIndicator);
    const currentTabs = Object.values(tabRefs.current);
    currentTabs.forEach((tab) => tab && observer.observe(tab));

    return () => {
      window.removeEventListener("resize", handleResize);
      observer.disconnect();
    };
  }, [activeTab]);

  const backLink = (
    <Link
      to={`/subject/${id}`}
      className="inline-flex items-center gap-1.5 text-[12px] text-ink-faint transition-colors hover:text-ink"
    >
      <ArrowLeft className="h-3.5 w-3.5" />
      {subject?.name || "Back to subject"}
    </Link>
  );

  /* ============================================================
     Loading
     ============================================================ */

  if (loading) {
    return (
      <div>
        {backLink}

        <div className="mt-8 rounded-xl border border-border bg-surface p-8">
          <div className="flex items-center gap-3">
            <Loader2 className="h-4 w-4 animate-spin text-accent" />

            <p className="text-[13px] text-ink-faint">
              Loading module...
            </p>
          </div>
        </div>
      </div>
    );
  }

  /* ============================================================
     Error
     ============================================================ */

  if (error || !unit) {
    return (
      <div>
        {backLink}

        <div className="mt-8 rounded-xl border border-danger/30 bg-danger-soft p-5">
          <p className="text-[14px] text-danger">
            {error || "Unit not found."}
          </p>
        </div>
      </div>
    );
  }

  /* ============================================================
     Render
     ============================================================ */

  return (
    <>
      <FeedbackToast
        message={feedback}
        variant={feedbackVariant}
        onDismiss={() => setFeedback("")}
      />

      {/* ======================================================
          Breadcrumb / Header
         ====================================================== */}

      <section>
        <Breadcrumbs
          items={[
            { label: "Dashboard", to: "/dashboard" },
            { label: subject?.name || "Subject", to: `/subject/${id}` },
            { label: unit.name },
          ]}
        />

        <div className="mt-6 flex flex-col gap-6 lg:flex-row lg:items-end lg:justify-between">
          <div className="min-w-0">
            <div className="flex items-start gap-3">
              <span className="flex h-12 w-12 shrink-0 items-center justify-center rounded-2xl border border-teal/20 bg-teal-soft text-teal shadow-sm">
                <Layers className="h-5 w-5" />
              </span>

              <div className="min-w-0">
                <p className="text-[10px] font-semibold uppercase tracking-[0.15em] text-ink-faint">
                  Module workspace
                </p>

                <h1
                  className="mt-1 text-[2rem] leading-tight text-ink sm:text-[2.3rem]"
                  style={{
                    fontFamily:
                      "var(--font-display)",
                  }}
                >
                  {unit.name}
                </h1>
              </div>
            </div>

            <p className="mt-4 max-w-2xl text-[13px] leading-7 text-ink-dim">
              Study this module using your uploaded material,
              AI-generated summaries, notes, and flashcards.
            </p>
          </div>

          <div className="flex shrink-0 items-center gap-2">
            <Link
              to={`/subject/${id}`}
              className="inline-flex h-10 items-center gap-2 rounded-xl border border-border bg-surface px-3.5 text-[12px] font-medium text-ink-dim shadow-sm transition-all hover:-translate-y-0.5 hover:bg-surface-hover hover:text-ink hover:shadow-md"
            >
              <ArrowLeft className="h-3.5 w-3.5" />
              Subject
            </Link>
          </div>
        </div>
      </section>

      {/* ======================================================
          Module stats
         ====================================================== */}

      <section className="mt-8 grid grid-cols-2 gap-3 lg:grid-cols-3">
        <div className="rounded-2xl border border-border bg-surface px-5 py-4 shadow-sm transition-shadow hover:shadow-md">
          <div className="flex items-center gap-2">
            <FileText className="h-3.5 w-3.5 text-teal" />

            <p className="text-[10px] font-semibold uppercase tracking-[0.12em] text-ink-faint">
              Materials
            </p>
          </div>

          <p
            className="mt-2 text-[1.45rem] leading-none text-ink"
            style={{
              fontFamily:
                "var(--font-display)",
            }}
          >
            {files.length}
          </p>
        </div>

        <div className="rounded-2xl border border-border bg-surface px-5 py-4 shadow-sm transition-shadow hover:shadow-md">
          <div className="flex items-center gap-2">
            <BookOpen className="h-3.5 w-3.5 text-teal" />

            <p className="text-[10px] font-semibold uppercase tracking-[0.12em] text-ink-faint">
              Study tools
            </p>
          </div>

          <p
            className="mt-2 text-[1.45rem] leading-none text-ink"
            style={{
              fontFamily:
                "var(--font-display)",
            }}
          >
            3
          </p>
        </div>

        <div className="col-span-2 rounded-2xl border border-accent/20 bg-accent/5 px-5 py-4 shadow-sm lg:col-span-1">
          <p className="text-[10px] font-semibold uppercase tracking-[0.12em] text-ink-faint">
            Current view
          </p>

          <p className="mt-2 text-[13px] font-medium capitalize text-accent">
            {activeTab}
          </p>
        </div>
      </section>

      {/* ======================================================
          Tabs
         ====================================================== */}

      <div className="sticky top-0 z-20 -mx-8 mt-10 border-y border-border bg-bg/95 px-8 backdrop-blur lg:-mx-10 lg:px-10 xl:-mx-12 xl:px-12">
        <div
          aria-label="Module workspace tabs"
          className="relative mx-auto flex w-full gap-7 overflow-x-auto"
        >
          <span
            aria-hidden="true"
            className="unit-tab-indicator"
            style={{
              width: `${tabIndicator.width}px`,
              left: `${tabIndicator.left}px`,
            }}
          />

          {TABS.map((tab) => {
            const active = activeTab === tab.key;

            return (
              <button
                key={tab.key}
                ref={(element) => {
                  tabRefs.current[tab.key] = element;
                }}
                type="button"
                onClick={() => handleTabChange(tab.key)}
                aria-current={active ? "page" : undefined}
                className={`relative shrink-0 rounded-sm py-4 text-[12px] font-semibold transition-colors focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-accent ${
                  active
                    ? "text-ink"
                    : "text-ink-faint hover:text-ink-dim"
                }`}
              >
                {tab.label}

                {tab.key === "materials" && files.length > 0 && (
                  <span className="ml-1.5 rounded-full bg-surface px-1.5 py-0.5 text-[9px] text-ink-faint">
                    {files.length}
                  </span>
                )}
              </button>
            );
          })}
        </div>
      </div>

      {/* ======================================================
          Main workspace
         ====================================================== */}

      <section className="mt-8 overflow-hidden">
        <div
          className="unit-tab-track"
          style={{
            transform: `translate3d(-${activeTabIndex * 25}%, 0, 0)`,
          }}
        >
          <div className="unit-tab-slide">
          {/* ----------------------------------------------------
              Materials
             ---------------------------------------------------- */}

          <div className="unit-tab-content grid grid-cols-1 gap-6 lg:grid-cols-[minmax(0,1fr)_320px]">
            <div>
              <div className="mb-5 flex items-end justify-between gap-4">
                <div>
                  <p className="text-[10px] font-semibold uppercase tracking-[0.16em] text-ink-faint">
                    Study material
                  </p>

                  <h2
                    className="mt-1 text-[1.4rem] text-ink"
                    style={{
                      fontFamily:
                        "var(--font-display)",
                    }}
                  >
                    Module materials
                  </h2>
                </div>

                <span className="text-[11px] text-ink-faint">
                  {files.length}{" "}
                  {files.length === 1
                    ? "file"
                    : "files"}
                </span>
              </div>

              {/* Upload */}
              <form
                onSubmit={handleUpload}
                className="rounded-2xl border border-border bg-surface p-6 shadow-sm"
              >
                <div className="flex flex-col gap-4 sm:flex-row sm:items-end">
                  <div className="min-w-0 flex-1">
                    <label className="mb-1.5 block text-[12px] font-semibold text-ink">
                      Add material
                    </label>
                    <p className="mb-2 text-[11px] leading-relaxed text-ink-faint">
                      Upload a PDF, slide deck, notes, or other study material for this module.
                    </p>

                    <input
                      type="file"
                      onChange={(event) =>
                        setFile(
                          event.target.files?.[0] ||
                            null
                        )
                      }
                      disabled={uploading}
                      className="block w-full cursor-pointer rounded-xl border border-dashed border-border bg-bg-alt/60 px-3 py-2.5 text-[12px] text-ink-faint transition-colors hover:border-teal/40 hover:bg-surface-hover file:mr-3 file:rounded-lg file:border-0 file:bg-surface file:px-3 file:py-2 file:text-[12px] file:font-medium file:text-ink-dim hover:file:bg-surface-hover disabled:cursor-not-allowed disabled:opacity-50"
                    />
                  </div>

                  <Button
                    type="submit"
                    disabled={!file || uploading}
                    loading={uploading}
                  >
                    {!uploading && (
                      <Upload className="h-4 w-4" />
                    )}

                    {uploading
                      ? "Uploading..."
                      : "Upload"}
                  </Button>
                </div>

                {uploadError && (
                  <p className="mt-3 text-[12px] text-danger">
                    {uploadError}
                  </p>
                )}
              </form>

              {/* Files */}
              <div className="mt-5 overflow-hidden rounded-2xl border border-border bg-surface shadow-sm">
                {files.length === 0 ? (
                  <div className="px-6 py-12 text-center">
                    <span className="mx-auto flex h-10 w-10 items-center justify-center rounded-full bg-teal-soft text-teal">
                      <FileText className="h-4 w-4" />
                    </span>

                    <h3
                      className="mt-4 text-[1.05rem] text-ink"
                      style={{
                        fontFamily:
                          "var(--font-display)",
                      }}
                    >
                      No material yet
                    </h3>

                    <p className="mx-auto mt-1.5 max-w-xs text-[12px] leading-relaxed text-ink-faint">
                      Upload lecture notes, slides, PDFs, or
                      other study material to this module.
                    </p>
                  </div>
                ) : (
                  <div className="divide-y divide-border">
                    {files.map((item) => (
                      <div
                        key={item.id}
                        className="group flex items-center gap-3 px-5 py-4 transition-all hover:bg-surface-hover"
                      >
                        <button
                          type="button"
                          onClick={() =>
                            item.file_type ===
                            "application/pdf"
                              ? handlePreview(item)
                              : handleDownload(item)
                          }
                          className="flex min-w-0 flex-1 items-center gap-3 text-left"
                        >
                          <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-bg-alt text-teal ring-1 ring-inset ring-border">
                            <FileText className="h-4 w-4" />
                          </span>

                          <span className="min-w-0 flex-1">
                            <span className="block truncate text-[12px] font-medium text-ink">
                              {item.file_name}
                            </span>

                            <span className="mt-0.5 block text-[10px] text-ink-faint">
                              {item.file_type ===
                              "application/pdf"
                                ? "PDF · Preview available"
                                : "Study material"}
                            </span>
                          </span>

                          <ArrowRight className="h-3.5 w-3.5 shrink-0 text-ink-faint opacity-0 transition-opacity group-hover:opacity-100" />
                        </button>

                        <button
                          type="button"
                          title="Delete file"
                          onClick={() =>
                            handleDeleteFile(
                              item.id
                            )
                          }
                          className="flex h-7 w-7 shrink-0 items-center justify-center rounded-md text-ink-faint transition-colors hover:bg-danger-soft hover:text-danger"
                        >
                          <X className="h-3.5 w-3.5" />
                        </button>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            </div>

            {/* Coverage panel */}
            <aside className="h-fit rounded-2xl border border-border bg-bg-alt p-6 shadow-sm">
              <p className="text-[10px] font-semibold uppercase tracking-[0.14em] text-ink-faint">
                Module coverage
              </p>

              <div className="mt-5">
                <p
                  className="text-[2.5rem] leading-none text-ink"
                  style={{
                    fontFamily:
                      "var(--font-display)",
                  }}
                >
                  {files.length}
                </p>

                <p className="mt-2 text-[12px] text-ink-faint">
                  uploaded{" "}
                  {files.length === 1
                    ? "material"
                    : "materials"}
                </p>
              </div>

              <div className="mt-5 h-2 overflow-hidden rounded-full bg-border">
                <div
                  className="h-full rounded-full bg-teal transition-all"
                  style={{
                    width:
                      files.length > 0
                        ? "100%"
                        : "0%",
                  }}
                />
              </div>

              <p className="mt-4 text-[11px] leading-relaxed text-ink-faint">
                Your uploaded material powers the AI summary,
                notes, and flashcard tools for this module.
              </p>
            </aside>
          </div>
          </div>

        {/* ----------------------------------------------------
            Summary
           ---------------------------------------------------- */}

        <div className="unit-tab-slide">
          <div className="unit-tab-content">
          <div className="rounded-2xl border border-border bg-surface p-6 text-ink shadow-sm sm:p-9">
            <div className="mb-7 border-b border-border pb-6">
              <div className="flex items-center gap-2">
                <span className="flex h-7 w-7 items-center justify-center rounded-lg bg-accent/10 text-accent">
                  <Sparkles className="h-3.5 w-3.5" />
                </span>
                <p className="text-[10px] font-semibold uppercase tracking-[0.14em] text-ink-faint">
                  AI generated
                </p>
              </div>

              <h2
                className="mt-1 text-[1.5rem]"
                style={{
                  fontFamily:
                    "var(--font-display)",
                }}
              >
                Module summary
              </h2>

              <p className="mt-1 text-[11px] text-ink-faint">
                Generated from the material uploaded to this module.
              </p>
            </div>

            <AiMarkdownTab
              key={`summary-${unitId}`}
              endpoint={`/units/${unitId}/summary`}
              field="summary"
              active={activeTab === "summary"}
              loadingText="Reading your materials and writing a summary…"
            />
          </div>
          </div>
        </div>

        {/* ----------------------------------------------------
            Notes
           ---------------------------------------------------- */}

        <div className="unit-tab-slide">
          <div className="unit-tab-content">
          <div className="rounded-2xl border border-border bg-surface p-6 text-ink shadow-sm sm:p-9">
            <div className="mb-7 border-b border-border pb-6">
              <div className="flex items-center gap-2">
                <span className="flex h-7 w-7 items-center justify-center rounded-lg bg-accent/10 text-accent">
                  <Sparkles className="h-3.5 w-3.5" />
                </span>
                <p className="text-[10px] font-semibold uppercase tracking-[0.14em] text-ink-faint">
                  AI generated
                </p>
              </div>

              <h2
                className="mt-1 text-[1.5rem]"
                style={{
                  fontFamily:
                    "var(--font-display)",
                }}
              >
                Study notes
              </h2>

              <p className="mt-1 text-[11px] text-ink-faint">
                Structured notes generated from your module material.
              </p>
            </div>

            <AiMarkdownTab
              key={`notes-${unitId}`}
              endpoint={`/units/${unitId}/ai-notes`}
              field="notes"
              active={activeTab === "notes"}
              loadingText="Reading your materials and writing study notes…"
            />
          </div>
          </div>
        </div>

          <div className="unit-tab-slide">

        {/* ----------------------------------------------------
            Flashcards
           ---------------------------------------------------- */}

          <div className="unit-tab-content">
            <FlashcardsTab
              unitId={unitId}
              active={activeTab === "flashcards"}
            />
          </div>
          </div>
        </div>
      </section>

      {/* ======================================================
          Preview modal
         ====================================================== */}

      {previewFile && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 px-4"
          onClick={closePreview}
        >
          <div
            className="flex h-[88vh] w-full max-w-6xl flex-col overflow-hidden rounded-2xl border border-border bg-surface shadow-2xl"
            onClick={(event) =>
              event.stopPropagation()
            }
          >
            <div className="flex items-center justify-between border-b border-border px-4 py-3">
              <div className="flex min-w-0 items-center gap-2">
                <FileText className="h-4 w-4 shrink-0 text-teal" />

                <p className="truncate text-[14px] font-medium text-ink">
                  {previewFile.file_name}
                </p>
              </div>

              <button
                type="button"
                onClick={closePreview}
                className="ml-4 flex h-8 w-8 shrink-0 items-center justify-center rounded-md text-ink-faint transition-colors hover:bg-surface-hover hover:text-ink"
              >
                <X className="h-4 w-4" />
              </button>
            </div>

            <div className="min-h-0 flex-1 bg-bg">
              {previewLoading && (
                <div className="flex h-full items-center justify-center">
                  <div className="flex items-center gap-2 text-[13px] text-ink-faint">
                    <Loader2 className="h-4 w-4 animate-spin" />
                    Loading preview...
                  </div>
                </div>
              )}

              {previewError && (
                <div className="flex h-full items-center justify-center">
                  <p className="text-[13px] text-danger">
                    {previewError}
                  </p>
                </div>
              )}

              {previewUrl &&
                !previewLoading &&
                !previewError && (
                  <iframe
                    src={previewUrl}
                    title={previewFile.file_name}
                    className="h-full w-full border-0"
                  />
                )}
            </div>
          </div>
        </div>
      )}
    </>
  );
}

export default Unit;
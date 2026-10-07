import { useEffect, useState } from "react";
import { useParams, Link } from "react-router-dom";
import { ArrowLeft, FileText, Upload, X } from "lucide-react";
import api from "../services/authService";
import Button from "../components/ui/Button";
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

    const [file, setFile] = useState(null);
    const [uploading, setUploading] = useState(false);
    const [uploadError, setUploadError] = useState("");
    const [previewFile, setPreviewFile] = useState(null);
    const [previewUrl, setPreviewUrl] = useState("");
    const [previewLoading, setPreviewLoading] = useState(false);
    const [previewError, setPreviewError] = useState("");
    const fetchFiles = async () => {
        const res = await api.get(`/units/${unitId}/notes`);
        setFiles(res.data);
    };

    useEffect(() => {
        let cancelled = false;

        const load = async () => {
        setLoading(true);
        setError("");
        try {
            const [unitsRes, notesRes] = await Promise.all([
            api.get(`/subjects/${id}/units`),
            api.get(`/units/${unitId}/notes`),
            ]);
            if (cancelled) return;

            const found = unitsRes.data.find((u) => u.id === unitId);
            if (!found) {
            setError("Unit not found.");
            } else {
            setUnit(found);
            setFiles(notesRes.data);
            }
        } catch (err) {
            console.error("Failed to load unit:", err);
            if (!cancelled) setError("Couldn't load this unit.");
        } finally {
            if (!cancelled) setLoading(false);
        }
        };

        load();
        return () => {
        cancelled = true;
        };
    }, [id, unitId]);

    const handlePreview = async (f) => {
    setPreviewFile(f);
    setPreviewUrl("");
    setPreviewError("");
    setPreviewLoading(true);

    try {
        const res = await api.get(`/notes/${f.id}/preview`);
        setPreviewUrl(res.data.url);
    } catch (err) {
        console.error("Failed to load preview:", err);
        setPreviewError("Couldn't load this file.");
    } finally {
        setPreviewLoading(false);
    }
    };

    const handleDownload = async (f) => {
    try {
        const res = await api.get(`/notes/${f.id}/preview`);
        const link = document.createElement("a");
        link.href = res.data.url;
        link.target = "_blank";
        link.rel = "noopener noreferrer";
        link.click();
    } catch (err) {
        console.error("Failed to download file:", err);
        alert("Couldn't download this file.");
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
        setFiles((prev) => prev.filter((f) => f.id !== fileId));
        } catch (err) {
        console.error("Failed to delete file:", err);
        alert("Failed to delete file. Please try again.");
        }
    };

    const handleUpload = async (e) => {
        e.preventDefault();
        if (!file || uploading) return;

        setUploading(true);
        setUploadError("");
        try {
        const formData = new FormData();
        formData.append("file", file);
        await api.post(`/units/${unitId}/notes`, formData);
        await fetchFiles();
        setFile(null);
        e.target.reset();
        } catch (err) {
        console.error("Upload error:", err);
        setUploadError("Couldn't upload this file. Try again.");
        } finally {
        setUploading(false);
        }
    };

    const backLink = (
        <Link
        to={`/subject/${id}`}
        className="inline-flex items-center gap-1.5 text-[13px] text-ink-faint hover:text-ink"
        >
        <ArrowLeft className="h-3.5 w-3.5" />
        {subject?.name || "Back"}
        </Link>
    );

    if (loading) {
        return (
        <div className="min-h-screen bg-bg">
            <div className="mx-auto max-w-4xl px-6 py-10 md:px-10">
            {backLink}
            <p className="mt-6 text-[13px] text-ink-faint">Loading unit...</p>
            </div>
        </div>
        );
    }

    if (error || !unit) {
        return (
        <div className="min-h-screen bg-bg">
            <div className="mx-auto max-w-4xl px-6 py-10 md:px-10">
            {backLink}
            <p className="mt-6 text-[14px] text-danger">{error || "Unit not found."}</p>
            </div>
        </div>
        );
    }

    return (
        <div className="min-h-screen bg-bg">
        <div className="mx-auto max-w-4xl px-6 pt-10 md:px-10">
            {backLink}

            <h1
            className="mt-4 text-[1.8rem] text-ink"
            style={{ fontFamily: "var(--font-display)" }}
            >
            {unit.name}
            </h1>
            <p className="mt-1 text-[13px] text-ink-faint">
            {files.length} {files.length === 1 ? "file" : "files"}
            </p>
        </div>

        {/* Sticky tab bar */}
        <div className="sticky top-0 z-20 mt-6 border-b border-border bg-bg">
            <div className="mx-auto flex max-w-4xl gap-6 px-6 md:px-10">
            {TABS.map((tab) => {
                const active = activeTab === tab.key;
                return (
                <button
                    key={tab.key}
                    type="button"
                    onClick={() => setActiveTab(tab.key)}
                    className={`-mb-px border-b-2 py-3 text-[14px] font-medium transition-colors ${
                    active
                        ? "border-accent text-ink"
                        : "border-transparent text-ink-faint hover:text-ink-dim"
                    }`}
                >
                    {tab.label}
                </button>
                );
            })}
            </div>
        </div>

        <div className="mx-auto max-w-4xl px-6 py-8 md:px-10">
            {activeTab === "materials" && (
            <div>
                <form
                onSubmit={handleUpload}
                className="flex flex-col gap-3 rounded-xl border border-border bg-surface p-5 sm:flex-row sm:items-end"
                >
                <div className="flex-1">
                    <label className="mb-1.5 block text-[13px] font-medium text-ink-dim">
                    Upload material
                    </label>
                    <input
                    type="file"
                    onChange={(e) => setFile(e.target.files[0])}
                    className="block w-full text-[13px] text-ink-faint file:mr-3 file:rounded-lg file:border-0 file:bg-bg-alt file:px-3 file:py-2 file:text-[13px] file:font-medium file:text-ink-dim hover:file:bg-surface-hover"
                    />
                </div>
                <Button type="submit" disabled={!file || uploading}>
                    <Upload className="h-4 w-4" />
                    {uploading ? "Uploading..." : "Upload"}
                </Button>
                </form>

                {uploadError && (
                <p className="mt-2 text-[13px] text-danger">{uploadError}</p>
                )}

                <div className="mt-6 flex flex-col">
                {files.length === 0 ? (
                    <p className="text-[13px] text-ink-faint">No files uploaded yet.</p>
                ) : (
                    files.map((f) => (
                    <div
                        key={f.id}
                        onClick={() =>
                            f.file_type === "application/pdf" ? handlePreview(f) : handleDownload(f)
                        }
                        className="flex cursor-pointer items-center gap-2 rounded-lg px-2.5 py-2 text-[14px] text-ink-dim hover:bg-surface-hover"
                    >
                        <FileText className="h-3.5 w-3.5 shrink-0 text-teal" />
                        <span className="flex-1 truncate">{f.file_name}</span>
                        <button
                        type="button"
                        title="Delete file"
                        onClick={(e) => {
                            e.stopPropagation();
                            handleDeleteFile(f.id);
                        }}
                        className="ml-auto flex h-6 w-6 shrink-0 items-center justify-center rounded-md text-ink-faint hover:bg-danger/10 hover:text-danger"
                        >
                        <X className="h-3.5 w-3.5" />
                        </button>
                    </div>
                    ))
                )}
                </div>
            </div>
            )}

            <AiMarkdownTab
            key={`summary-${unitId}`}
            endpoint={`/units/${unitId}/summary`}
            field="summary"
            active={activeTab === "summary"}
            loadingText="Reading your materials and writing a summary…"
            />

            <AiMarkdownTab
            key={`notes-${unitId}`}
            endpoint={`/units/${unitId}/ai-notes`}
            field="notes"
            active={activeTab === "notes"}
            loadingText="Reading your materials and writing study notes…"
            />

            <FlashcardsTab
            key={`flashcards-${unitId}`}
            unitId={unitId}
            active={activeTab === "flashcards"}
            />
            {previewFile && (
            <div
                className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 px-4"
                onClick={closePreview}
            >
                <div
                className="flex h-[85vh] w-full max-w-5xl flex-col overflow-hidden rounded-xl border border-border bg-surface shadow-2xl"
                onClick={(e) => e.stopPropagation()}
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
                    className="ml-4 flex h-8 w-8 shrink-0 items-center justify-center rounded-md text-ink-faint hover:bg-surface-hover hover:text-ink"
                    >
                    <X className="h-4 w-4" />
                    </button>
                </div>

                <div className="min-h-0 flex-1 bg-bg">
                    {previewLoading && (
                    <div className="flex h-full items-center justify-center">
                        <p className="text-[13px] text-ink-faint">Loading preview...</p>
                    </div>
                    )}

                    {previewError && (
                    <div className="flex h-full items-center justify-center">
                        <p className="text-[13px] text-danger">{previewError}</p>
                    </div>
                    )}

                    {previewUrl && !previewLoading && !previewError && (
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
        </div>
        </div>
    );
}

export default Unit;
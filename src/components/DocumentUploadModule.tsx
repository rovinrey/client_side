import React, { useCallback, useEffect, useRef, useState } from 'react';
import documentsApi, { type UploadedDocument } from '../api/documents.api';

// ─── Requirement definition ──────────────────────────────────────────────────

export interface RequirementDef {
    /** Unique key for this document type, e.g. "government_id" */
    id: string;
    label: string;
    description: string;
    /** Allowed MIME types (comma separated for <input accept>) */
    accept?: string;
}

interface Props {
    programType: string;
    requirements: RequirementDef[];
    /** Called once every requirement has an uploaded document */
    onAllSubmitted?: () => void;
}

// ─── Constants ───────────────────────────────────────────────────────────────

const MAX_FILE_SIZE_MB = 5;
const MAX_FILE_SIZE_BYTES = MAX_FILE_SIZE_MB * 1024 * 1024;
const DEFAULT_ACCEPT = 'image/jpeg,image/png,image/webp,application/pdf';
import { API_BASE_URL } from '../api/config';

const BASE = API_BASE_URL;

// ─── Per-slot state ──────────────────────────────────────────────────────────

type UploadStatus = 'idle' | 'uploading' | 'success' | 'error';

interface SlotState {
    uploaded: UploadedDocument | null;
    status: UploadStatus;
    progress: number;
    error: string | null;
    /** Local preview data URL for images */
    previewUrl: string | null;
    /** Drag-over visual flag */
    dragOver: boolean;
}

function emptySlot(): SlotState {
    return { uploaded: null, status: 'idle', progress: 0, error: null, previewUrl: null, dragOver: false };
}

function formatBytes(bytes: number): string {
    if (bytes < 1024) return `${bytes} B`;
    if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
    return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
}

function isImage(mime: string): boolean {
    return mime.startsWith('image/');
}

// ─── Component ───────────────────────────────────────────────────────────────

const DocumentUploadModule: React.FC<Props> = ({ programType, requirements, onAllSubmitted }) => {
    const token = localStorage.getItem('token') ?? '';
    const fileInputRefs = useRef<Record<string, HTMLInputElement | null>>({});

    const [slots, setSlots] = useState<Record<string, SlotState>>(() => {
        const init: Record<string, SlotState> = {};
        requirements.forEach((r) => { init[r.id] = emptySlot(); });
        return init;
    });
    const [loading, setLoading] = useState(true);
    const [fetchError, setFetchError] = useState<string | null>(null);

    // ── Fetch existing documents ─────────────────────────────────────────────
    const fetchDocs = useCallback(async () => {
        setLoading(true);
        setFetchError(null);
        try {
            const docs = await documentsApi.getDocuments(token, programType);
            setSlots((prev) => {
                const next = { ...prev };
                // Reset all slots first
                requirements.forEach((r) => {
                    next[r.id] = emptySlot();
                });
                // Fill in uploaded ones
                docs.forEach((doc) => {
                    if (next[doc.document_type]) {
                        next[doc.document_type] = {
                            ...emptySlot(),
                            uploaded: doc,
                            previewUrl: isImage(doc.mime_type) ? `${BASE}${doc.url}` : null,
                        };
                    }
                });
                return next;
            });
        } catch {
            setFetchError('Failed to load your documents. Please refresh the page.');
        } finally {
            setLoading(false);
        }
    }, [token, programType, requirements]);

    useEffect(() => { fetchDocs(); }, [fetchDocs]);

    // ── onAllSubmitted callback ──────────────────────────────────────────────
    useEffect(() => {
        if (!onAllSubmitted) return;
        const all = requirements.every((r) => slots[r.id]?.uploaded !== null);
        if (all) onAllSubmitted();
    }, [slots, onAllSubmitted, requirements]);

    // ── Upload handler ───────────────────────────────────────────────────────
    const handleFile = async (reqId: string, file: File) => {
        if (file.size > MAX_FILE_SIZE_BYTES) {
            setSlots((prev) => ({
                ...prev,
                [reqId]: { ...prev[reqId], error: `File must be under ${MAX_FILE_SIZE_MB} MB.`, status: 'error' },
            }));
            return;
        }

        // Set local preview for images
        let previewUrl: string | null = null;
        if (isImage(file.type)) {
            previewUrl = URL.createObjectURL(file);
        }

        setSlots((prev) => ({
            ...prev,
            [reqId]: { ...prev[reqId], status: 'uploading', progress: 0, error: null, previewUrl },
        }));

        try {
            const doc = await documentsApi.uploadDocument(token, programType, reqId, file, (pct) => {
                setSlots((prev) => ({
                    ...prev,
                    [reqId]: { ...prev[reqId], progress: pct },
                }));
            });

            setSlots((prev) => ({
                ...prev,
                [reqId]: {
                    uploaded: doc,
                    status: 'success',
                    progress: 100,
                    error: null,
                    previewUrl: isImage(doc.mime_type) ? `${BASE}${doc.url}` : null,
                    dragOver: false,
                },
            }));
        } catch {
            setSlots((prev) => ({
                ...prev,
                [reqId]: { ...prev[reqId], status: 'error', error: 'Upload failed. Please try again.', previewUrl: null },
            }));
        }

        if (fileInputRefs.current[reqId]) {
            fileInputRefs.current[reqId]!.value = '';
        }
    };

    // ── Delete handler ───────────────────────────────────────────────────────
    const handleDelete = async (reqId: string) => {
        const doc = slots[reqId]?.uploaded;
        if (!doc) return;

        setSlots((prev) => ({
            ...prev,
            [reqId]: { ...prev[reqId], status: 'uploading', error: null },
        }));

        try {
            await documentsApi.deleteDocument(token, doc.document_id);
            setSlots((prev) => ({
                ...prev,
                [reqId]: emptySlot(),
            }));
        } catch {
            setSlots((prev) => ({
                ...prev,
                [reqId]: { ...prev[reqId], status: 'error', error: 'Could not remove. Try again.' },
            }));
        }
    };

    // ── Drag & Drop helpers ──────────────────────────────────────────────────
    const onDragOver = (e: React.DragEvent, reqId: string) => {
        e.preventDefault();
        e.stopPropagation();
        setSlots((prev) => ({ ...prev, [reqId]: { ...prev[reqId], dragOver: true } }));
    };
    const onDragLeave = (e: React.DragEvent, reqId: string) => {
        e.preventDefault();
        e.stopPropagation();
        setSlots((prev) => ({ ...prev, [reqId]: { ...prev[reqId], dragOver: false } }));
    };
    const onDrop = (e: React.DragEvent, reqId: string) => {
        e.preventDefault();
        e.stopPropagation();
        setSlots((prev) => ({ ...prev, [reqId]: { ...prev[reqId], dragOver: false } }));
        const file = e.dataTransfer.files?.[0];
        if (file) handleFile(reqId, file);
    };

    // ── Progress calc ────────────────────────────────────────────────────────
    const uploadedCount = requirements.filter((r) => slots[r.id]?.uploaded !== null).length;
    const totalCount = requirements.length;
    const progressPct = totalCount > 0 ? Math.round((uploadedCount / totalCount) * 100) : 0;
    const allComplete = uploadedCount === totalCount;

    // ── Loading / Error states ───────────────────────────────────────────────
    if (loading) {
        return (
            <div className="flex items-center justify-center py-16">
                <div className="h-8 w-8 animate-spin rounded-full border-4 border-teal-500 border-t-transparent" />
                <span className="ml-3 text-sm text-gray-500">Loading documents…</span>
            </div>
        );
    }

    if (fetchError) {
        return (
            <div className="rounded-xl border border-red-200 bg-red-50 p-4 text-sm text-red-700">
                {fetchError}
                <button onClick={fetchDocs} className="ml-3 font-semibold underline hover:text-red-900">Retry</button>
            </div>
        );
    }

    return (
        <div className="w-full space-y-6">
            {/* ── Header ── */}
            <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
                <div>
                    <h2 className="text-xl font-bold text-gray-900">Document Requirements</h2>
                    <p className="mt-1 text-sm text-gray-500">
                        Upload each required document below. Accepted: PDF, JPG, PNG, WEBP (max {MAX_FILE_SIZE_MB} MB each).
                    </p>
                </div>
            </div>

            {/* ── Progress bar ── */}
            <div className="rounded-2xl border border-gray-200 bg-gradient-to-r from-gray-50 to-white p-4">
                <div className="flex items-center justify-between mb-2.5">
                    <div className="flex items-center gap-2">
                        <div className={`flex h-8 w-8 items-center justify-center rounded-lg ${allComplete ? 'bg-emerald-100' : 'bg-teal-100'}`}>
                            <svg className={`h-4 w-4 ${allComplete ? 'text-emerald-600' : 'text-teal-600'}`} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2}>
                                <path strokeLinecap="round" strokeLinejoin="round" d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                            </svg>
                        </div>
                        <span className="text-sm font-semibold text-gray-700">Upload Progress</span>
                    </div>
                    <span className={`text-sm font-bold ${allComplete ? 'text-emerald-600' : 'text-gray-900'}`}>
                        {uploadedCount} / {totalCount}
                    </span>
                </div>
                <div className="w-full bg-gray-200 rounded-full h-3 overflow-hidden">
                    <div
                        className={`h-3 rounded-full transition-all duration-700 ease-out ${allComplete ? 'bg-emerald-500' : 'bg-teal-600'}`}
                        style={{ width: `${progressPct}%` }}
                    />
                </div>
                {allComplete && (
                    <div className="mt-3 flex items-center gap-2 text-sm font-semibold text-emerald-600">
                        <svg className="h-5 w-5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2}>
                            <path strokeLinecap="round" strokeLinejoin="round" d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
                        </svg>
                        All documents submitted — you're all set!
                    </div>
                )}
            </div>

            {/* ── Checklist grid ── */}
            <div className="rounded-2xl border border-gray-200 bg-white p-4">
                <h3 className="text-sm font-bold text-gray-800 mb-3">Requirements Checklist</h3>
                <ul className="grid gap-1.5 sm:grid-cols-2">
                    {requirements.map((req) => {
                        const done = slots[req.id]?.uploaded !== null;
                        return (
                            <li
                                key={`ck-${req.id}`}
                                className={`flex items-center gap-2.5 rounded-xl px-3 py-2 transition-colors duration-300 ${done ? 'bg-emerald-50' : 'bg-gray-50'}`}
                            >
                                <span className={`flex h-5 w-5 flex-shrink-0 items-center justify-center rounded-md transition-colors duration-300 ${
                                    done ? 'bg-emerald-500 text-white' : 'border-2 border-gray-300 bg-white'
                                }`}>
                                    {done && (
                                        <svg className="h-3 w-3" viewBox="0 0 20 20" fill="currentColor">
                                            <path fillRule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clipRule="evenodd" />
                                        </svg>
                                    )}
                                </span>
                                <span className={`text-xs font-medium transition-colors duration-300 ${done ? 'text-emerald-800' : 'text-gray-600'}`}>
                                    {req.label}
                                </span>
                            </li>
                        );
                    })}
                </ul>
            </div>

            {/* ── Document cards ── */}
            <ul className="space-y-4">
                {requirements.map((req, index) => {
                    const slot = slots[req.id] ?? emptySlot();
                    const isUploaded = slot.uploaded !== null;
                    const isBusy = slot.status === 'uploading';
                    const accept = req.accept || DEFAULT_ACCEPT;

                    return (
                        <li
                            key={req.id}
                            className={`group rounded-2xl border-2 transition-all duration-200 ${
                                isUploaded
                                    ? 'border-emerald-200 bg-emerald-50/40'
                                    : slot.dragOver
                                        ? 'border-teal-400 bg-teal-50 shadow-lg shadow-teal-100'
                                        : 'border-gray-200 bg-white hover:border-gray-300'
                            } ${isBusy ? 'opacity-80' : ''}`}
                        >
                            <div className="p-4 sm:p-5">
                                <div className="flex items-start gap-4">
                                    {/* ── Number / Check badge ── */}
                                    <span className={`mt-0.5 flex-shrink-0 flex h-9 w-9 items-center justify-center rounded-xl text-sm font-bold transition-all duration-300 ${
                                        isUploaded
                                            ? 'bg-emerald-500 text-white shadow-sm'
                                            : 'bg-gray-100 text-gray-500 group-hover:bg-gray-200'
                                    }`}>
                                        {isUploaded ? (
                                            <svg className="h-5 w-5" viewBox="0 0 20 20" fill="currentColor">
                                                <path fillRule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clipRule="evenodd" />
                                            </svg>
                                        ) : (
                                            index + 1
                                        )}
                                    </span>

                                    <div className="flex-1 min-w-0">
                                        {/* ── Title ── */}
                                        <div className="flex items-center gap-2 flex-wrap">
                                            <span className="text-sm font-semibold text-gray-800">{req.label}</span>
                                            <span className="inline-flex items-center rounded-full bg-red-50 px-2 py-0.5 text-[10px] font-semibold text-red-600 ring-1 ring-inset ring-red-200 uppercase tracking-wide">
                                                Required
                                            </span>
                                            {isUploaded && (
                                                <span className="inline-flex items-center gap-1 rounded-full bg-emerald-50 px-2 py-0.5 text-[10px] font-semibold text-emerald-600 ring-1 ring-inset ring-emerald-200 uppercase tracking-wide">
                                                    <svg className="h-3 w-3" viewBox="0 0 20 20" fill="currentColor">
                                                        <path fillRule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clipRule="evenodd" />
                                                    </svg>
                                                    Submitted
                                                </span>
                                            )}
                                        </div>
                                        <p className="mt-1 text-xs text-gray-400 leading-relaxed">{req.description}</p>

                                        {/* ── Upload zone / Submitted view ── */}
                                        <div className="mt-3">
                                            {isUploaded ? (
                                                <div className="space-y-3">
                                                    {/* Preview or file info */}
                                                    <div className="flex items-center gap-3 rounded-xl border border-emerald-200 bg-white p-3">
                                                        {slot.previewUrl ? (
                                                            <img
                                                                src={slot.previewUrl}
                                                                alt={req.label}
                                                                className="h-16 w-16 rounded-lg object-cover border border-gray-200 shadow-sm"
                                                            />
                                                        ) : (
                                                            <div className="flex h-16 w-16 items-center justify-center rounded-lg bg-red-50 border border-red-100">
                                                                <svg className="h-7 w-7 text-red-400" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={1.5}>
                                                                    <path strokeLinecap="round" strokeLinejoin="round" d="M19.5 14.25v-2.625a3.375 3.375 0 00-3.375-3.375h-1.5A1.125 1.125 0 0113.5 7.125v-1.5a3.375 3.375 0 00-3.375-3.375H8.25m2.25 0H5.625c-.621 0-1.125.504-1.125 1.125v17.25c0 .621.504 1.125 1.125 1.125h12.75c.621 0 1.125-.504 1.125-1.125V11.25a9 9 0 00-9-9z" />
                                                                </svg>
                                                            </div>
                                                        )}
                                                        <div className="flex-1 min-w-0">
                                                            <p className="text-sm font-medium text-gray-800 truncate">{slot.uploaded!.original_name}</p>
                                                            <p className="text-xs text-gray-400 mt-0.5">{formatBytes(slot.uploaded!.file_size)}</p>
                                                        </div>
                                                        <a
                                                            href={`${BASE}${slot.uploaded!.url}`}
                                                            target="_blank"
                                                            rel="noopener noreferrer"
                                                            className="inline-flex items-center gap-1.5 rounded-lg bg-teal-50 px-3 py-1.5 text-xs font-semibold text-teal-700 hover:bg-teal-100 transition-colors ring-1 ring-inset ring-teal-200"
                                                        >
                                                            <svg className="h-3.5 w-3.5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2}>
                                                                <path strokeLinecap="round" strokeLinejoin="round" d="M13.5 6H5.25A2.25 2.25 0 003 8.25v10.5A2.25 2.25 0 005.25 21h10.5A2.25 2.25 0 0018 18.75V10.5m-10.5 6L21 3m0 0h-5.25M21 3v5.25" />
                                                            </svg>
                                                            View
                                                        </a>
                                                    </div>

                                                    {/* Remove button */}
                                                    <button
                                                        type="button"
                                                        disabled={isBusy}
                                                        onClick={() => handleDelete(req.id)}
                                                        className="inline-flex items-center gap-1.5 text-xs text-red-500 hover:text-red-700 font-medium transition-colors disabled:opacity-50"
                                                    >
                                                        <svg className="h-3.5 w-3.5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2}>
                                                            <path strokeLinecap="round" strokeLinejoin="round" d="M14.74 9l-.346 9m-4.788 0L9.26 9m9.968-3.21c.342.052.682.107 1.022.166m-1.022-.165L18.16 19.673a2.25 2.25 0 01-2.244 2.077H8.084a2.25 2.25 0 01-2.244-2.077L4.772 5.79m14.456 0a48.108 48.108 0 00-3.478-.397m-12 .562c.34-.059.68-.114 1.022-.165m0 0a48.11 48.11 0 013.478-.397m7.5 0v-.916c0-1.18-.91-2.164-2.09-2.201a51.964 51.964 0 00-3.32 0c-1.18.037-2.09 1.022-2.09 2.201v.916m7.5 0a48.667 48.667 0 00-7.5 0" />
                                                        </svg>
                                                        Remove &amp; re-upload
                                                    </button>
                                                </div>
                                            ) : (
                                                <>
                                                    {/* Drag-and-drop zone */}
                                                    <label
                                                        htmlFor={`docfile-${req.id}`}
                                                        onDragOver={(e) => onDragOver(e, req.id)}
                                                        onDragLeave={(e) => onDragLeave(e, req.id)}
                                                        onDrop={(e) => onDrop(e, req.id)}
                                                        className={`flex flex-col items-center justify-center gap-2 rounded-xl border-2 border-dashed px-4 py-6 text-center cursor-pointer transition-all duration-200 ${
                                                            isBusy
                                                                ? 'border-teal-300 bg-teal-50/50 cursor-not-allowed'
                                                                : slot.dragOver
                                                                    ? 'border-teal-500 bg-teal-50 shadow-inner'
                                                                    : 'border-gray-300 hover:border-teal-400 hover:bg-teal-50/30'
                                                        }`}
                                                    >
                                                        {isBusy ? (
                                                            <div className="h-8 w-8 animate-spin rounded-full border-3 border-teal-500 border-t-transparent" />
                                                        ) : (
                                                            <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-teal-50 text-teal-500 group-hover:bg-teal-100 transition-colors">
                                                                <svg className="h-6 w-6" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={1.5}>
                                                                    <path strokeLinecap="round" strokeLinejoin="round" d="M3 16.5v2.25A2.25 2.25 0 005.25 21h13.5A2.25 2.25 0 0021 18.75V16.5m-13.5-9L12 3m0 0l4.5 4.5M12 3v13.5" />
                                                                </svg>
                                                            </div>
                                                        )}
                                                        <div>
                                                            <p className="text-sm font-medium text-gray-700">
                                                                {isBusy ? 'Uploading…' : (
                                                                    <>
                                                                        <span className="text-teal-600 font-semibold">Click to browse</span>
                                                                        {' '}or drag and drop
                                                                    </>
                                                                )}
                                                            </p>
                                                            <p className="mt-0.5 text-xs text-gray-400">PDF, JPG, PNG, WEBP — max {MAX_FILE_SIZE_MB} MB</p>
                                                        </div>

                                                        <input
                                                            ref={(el) => { fileInputRefs.current[req.id] = el; }}
                                                            id={`docfile-${req.id}`}
                                                            type="file"
                                                            accept={accept}
                                                            disabled={isBusy}
                                                            className="sr-only"
                                                            onChange={(e) => {
                                                                const file = e.target.files?.[0];
                                                                if (file) handleFile(req.id, file);
                                                            }}
                                                        />
                                                    </label>

                                                    {/* Upload progress */}
                                                    {isBusy && (
                                                        <div className="mt-2">
                                                            <div className="w-full bg-gray-100 rounded-full h-2 overflow-hidden">
                                                                <div
                                                                    className="h-2 rounded-full bg-teal-500 transition-all duration-300"
                                                                    style={{ width: `${slot.progress}%` }}
                                                                />
                                                            </div>
                                                            <p className="mt-1 text-xs text-teal-600 font-medium">{slot.progress}% uploaded</p>
                                                        </div>
                                                    )}
                                                </>
                                            )}

                                            {/* Error message */}
                                            {slot.error && (
                                                <div className="mt-2 flex items-center gap-2 rounded-lg bg-red-50 border border-red-200 px-3 py-2">
                                                    <svg className="h-4 w-4 flex-shrink-0 text-red-500" viewBox="0 0 20 20" fill="currentColor">
                                                        <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zM8.28 7.22a.75.75 0 00-1.06 1.06L8.94 10l-1.72 1.72a.75.75 0 101.06 1.06L10 11.06l1.72 1.72a.75.75 0 101.06-1.06L11.06 10l1.72-1.72a.75.75 0 00-1.06-1.06L10 8.94 8.28 7.22z" clipRule="evenodd" />
                                                    </svg>
                                                    <p className="text-xs text-red-600 font-medium">{slot.error}</p>
                                                </div>
                                            )}
                                        </div>
                                    </div>
                                </div>
                            </div>
                        </li>
                    );
                })}
            </ul>

            {/* ── All complete banner ── */}
            {allComplete && (
                <div className="rounded-2xl border border-emerald-200 bg-gradient-to-r from-emerald-50 to-teal-50 p-6 text-center">
                    <div className="mx-auto flex h-14 w-14 items-center justify-center rounded-2xl bg-emerald-100 mb-3">
                        <svg className="h-7 w-7 text-emerald-600" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2}>
                            <path strokeLinecap="round" strokeLinejoin="round" d="M9 12.75L11.25 15 15 9.75M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                        </svg>
                    </div>
                    <p className="text-base font-bold text-emerald-800">All documents submitted!</p>
                    <p className="mt-1 text-sm text-emerald-600">Your requirements are complete. You may proceed with your application.</p>
                </div>
            )}
        </div>
    );
};

export default DocumentUploadModule;

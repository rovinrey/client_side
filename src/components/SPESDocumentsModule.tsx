import React, { useCallback, useEffect, useRef, useState } from 'react';
import spesDocumentsApi, {
    type ApplicationStatus,
    type DocumentFieldId,
} from '../api/spesDocuments.api';
import { API_BASE_URL } from '../api/config';

// ─── Requirement definitions ─────────────────────────────────────────────────

interface RequirementDef {
    id: DocumentFieldId;
    label: string;
    description: string;
    accept: string;
}

const REQUIREMENTS: RequirementDef[] = [
    {
        id: 'passport_picture',
        label: 'Passport Size Picture',
        description: 'Recent 1×1 or 2×2 passport-sized photo with white background.',
        accept: 'image/jpeg,image/png,image/webp',
    },
    {
        id: 'birth_certificate',
        label: 'Birth Certificate',
        description: 'PSA-issued or LCR-certified photocopy of your birth certificate.',
        accept: 'image/jpeg,image/png,image/webp,application/pdf',
    },
    {
        id: 'certificate_of_indigency',
        label: 'Certificate of Indigency',
        description: 'Barangay-issued certificate of indigency.',
        accept: 'image/jpeg,image/png,image/webp,application/pdf',
    },
    {
        id: 'certificate_of_registration',
        label: 'Certificate of Registration',
        description: 'School-issued certificate confirming current enrollment for the semester.',
        accept: 'image/jpeg,image/png,image/webp,application/pdf',
    },
    {
        id: 'certificate_of_grades',
        label: 'Certificate of Grades',
        description: 'Official grade sheet or transcript from the previous semester.',
        accept: 'image/jpeg,image/png,image/webp,application/pdf',
    },
    {
        id: 'philjobnet_screenshot',
        label: 'PhilJobNet Registration Screenshot',
        description: 'Screenshot showing successful registration on the PhilJobNet portal.',
        accept: 'image/jpeg,image/png,image/webp,application/pdf',
    },
];

const MAX_FILE_SIZE_MB = 5;
const MAX_FILE_SIZE_BYTES = MAX_FILE_SIZE_MB * 1024 * 1024;

// ─── Types ────────────────────────────────────────────────────────────────────

type UploadState = 'idle' | 'uploading' | 'success' | 'error';

interface DocState {
    submittedUrl: string | null;
    uploadState: UploadState;
    uploadProgress: number;
    errorMessage: string | null;
}

// ─── Helpers ──────────────────────────────────────────────────────────────────

const statusBadge: Record<NonNullable<ApplicationStatus>, { label: string; className: string }> = {
    Draft: { label: 'Draft', className: 'bg-gray-100 text-gray-600 ring-gray-200' },
    Pending: { label: 'Pending Review', className: 'bg-amber-50 text-amber-700 ring-amber-200' },
    Approved: { label: 'Approved', className: 'bg-emerald-50 text-emerald-700 ring-emerald-200' },
};

// ─── Sub-components ───────────────────────────────────────────────────────────

function SubmittedBadge({ url }: { url: string }) {
    const BASE = API_BASE_URL;
    return (
        <div className="flex items-center gap-2 rounded-lg border border-emerald-200 bg-emerald-50 px-3 py-2">
            <svg className="h-4 w-4 flex-shrink-0 text-emerald-500" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
            </svg>
            <span className="flex-1 truncate text-xs font-medium text-emerald-700">Document submitted</span>
            <a
                href={`${BASE}${url}`}
                target="_blank"
                rel="noopener noreferrer"
                className="ml-auto text-xs font-semibold text-emerald-600 underline hover:text-emerald-800 transition-colors whitespace-nowrap"
            >
                View
            </a>
        </div>
    );
}

function ProgressBar({ pct }: { pct: number }) {
    return (
        <div className="mt-2">
            <div className="w-full bg-gray-100 rounded-full h-1.5 overflow-hidden">
                <div
                    className="h-1.5 rounded-full bg-teal-500 transition-all duration-300"
                    style={{ width: `${pct}%` }}
                />
            </div>
            <p className="mt-0.5 text-xs text-teal-600 font-medium">{pct}% uploaded…</p>
        </div>
    );
}

// ─── Main Component ───────────────────────────────────────────────────────────

interface SPESDocumentsModuleProps {
    /** Called once all 9 documents have been submitted. */
    onAllSubmitted?: () => void;
}

const SPESDocumentsModule: React.FC<SPESDocumentsModuleProps> = ({ onAllSubmitted }) => {
    const token = localStorage.getItem('token') ?? '';

    const [appStatus, setAppStatus] = useState<ApplicationStatus>(null);
    const [docStates, setDocStates] = useState<Record<DocumentFieldId, DocState>>(() => {
        const initial = {} as Record<DocumentFieldId, DocState>;
        REQUIREMENTS.forEach((r) => {
            initial[r.id] = { submittedUrl: null, uploadState: 'idle', uploadProgress: 0, errorMessage: null };
        });
        return initial;
    });
    const [loadingStatus, setLoadingStatus] = useState(true);
    const [statusError, setStatusError] = useState<string | null>(null);

    const fileInputRefs = useRef<Record<string, HTMLInputElement | null>>({});

    // ── Fetch current status ─────────────────────────────────────────────────
    const fetchStatus = useCallback(async () => {
        setLoadingStatus(true);
        setStatusError(null);
        try {
            const data = await spesDocumentsApi.getStatus(token);
            setAppStatus(data.application_status);
            setDocStates((prev) => {
                const next = { ...prev };
                REQUIREMENTS.forEach((r) => {
                    next[r.id] = {
                        ...next[r.id],
                        submittedUrl: data.documents[r.id] ?? null,
                        uploadState: 'idle',
                        uploadProgress: 0,
                        errorMessage: null,
                    };
                });
                return next;
            });
        } catch {
            setStatusError('Failed to load document status. Please refresh.');
        } finally {
            setLoadingStatus(false);
        }
    }, [token]);

    useEffect(() => {
        fetchStatus();
    }, [fetchStatus]);

    // ── onAllSubmitted callback ──────────────────────────────────────────────
    useEffect(() => {
        if (!onAllSubmitted) return;
        const allDone = REQUIREMENTS.every((r) => docStates[r.id].submittedUrl !== null);
        if (allDone) onAllSubmitted();
    }, [docStates, onAllSubmitted]);

    // ── Upload handler ───────────────────────────────────────────────────────
    const handleFileSelect = async (id: DocumentFieldId, file: File) => {
        if (file.size > MAX_FILE_SIZE_BYTES) {
            setDocStates((prev) => ({
                ...prev,
                [id]: { ...prev[id], errorMessage: `File must be under ${MAX_FILE_SIZE_MB} MB.` },
            }));
            return;
        }

        setDocStates((prev) => ({
            ...prev,
            [id]: { ...prev[id], uploadState: 'uploading', uploadProgress: 0, errorMessage: null },
        }));

        try {
            const result = await spesDocumentsApi.uploadDocument(token, id, file, (pct) => {
                setDocStates((prev) => ({
                    ...prev,
                    [id]: { ...prev[id], uploadProgress: pct },
                }));
            });

            setDocStates((prev) => ({
                ...prev,
                [id]: {
                    submittedUrl: result.url,
                    uploadState: 'success',
                    uploadProgress: 100,
                    errorMessage: null,
                },
            }));
        } catch {
            setDocStates((prev) => ({
                ...prev,
                [id]: { ...prev[id], uploadState: 'error', errorMessage: 'Upload failed. Please try again.' },
            }));
        }

        // Reset the file input so the same file can be re-uploaded
        if (fileInputRefs.current[id]) {
            fileInputRefs.current[id]!.value = '';
        }
    };

    const handleRemove = async (id: DocumentFieldId) => {
        setDocStates((prev) => ({
            ...prev,
            [id]: { ...prev[id], uploadState: 'uploading', errorMessage: null },
        }));
        try {
            await spesDocumentsApi.deleteDocument(token, id);
            setDocStates((prev) => ({
                ...prev,
                [id]: { submittedUrl: null, uploadState: 'idle', uploadProgress: 0, errorMessage: null },
            }));
        } catch {
            setDocStates((prev) => ({
                ...prev,
                [id]: { ...prev[id], uploadState: 'error', errorMessage: 'Could not remove document. Try again.' },
            }));
        }
    };

    // ── Progress calculation ─────────────────────────────────────────────────
    const submittedCount = REQUIREMENTS.filter((r) => docStates[r.id].submittedUrl !== null).length;
    const totalCount = REQUIREMENTS.length;
    const progressPct = Math.round((submittedCount / totalCount) * 100);
    const allComplete = submittedCount === totalCount;

    const isLocked = appStatus === 'Approved';

    // ── Render ───────────────────────────────────────────────────────────────
    if (loadingStatus) {
        return (
            <div className="flex items-center justify-center py-16">
                <div className="h-8 w-8 animate-spin rounded-full border-4 border-teal-500 border-t-transparent" />
                <span className="ml-3 text-sm text-gray-500">Loading requirements…</span>
            </div>
        );
    }

    if (statusError) {
        return (
            <div className="rounded-xl border border-red-200 bg-red-50 p-4 text-sm text-red-700">
                {statusError}
                <button onClick={fetchStatus} className="ml-3 font-semibold underline hover:text-red-900">
                    Retry
                </button>
            </div>
        );
    }

    return (
        <div className="w-full">
            {/* ── Header ── */}
            <div className="mb-6 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
                <div>
                    <h2 className="text-xl font-bold text-gray-900">SPES Requirements</h2>
                    <p className="mt-1 text-sm text-gray-500">
                        Upload each required document below. Accepted formats: PDF, JPG, PNG (max {MAX_FILE_SIZE_MB} MB each).
                    </p>
                </div>
                {appStatus && (
                    <span
                        className={`inline-flex items-center rounded-full px-3 py-1 text-xs font-semibold ring-1 ring-inset ${statusBadge[appStatus].className}`}
                    >
                        {statusBadge[appStatus].label}
                    </span>
                )}
            </div>

            {isLocked && (
                <div className="mb-5 rounded-xl border border-emerald-200 bg-emerald-50 px-4 py-3 text-sm text-emerald-800 font-medium">
                    Your application has been approved. Documents are locked and cannot be modified.
                </div>
            )}

            {/* ── Progress ── */}
            <div className="mb-6 rounded-2xl border border-gray-200 bg-gray-50 p-4">
                <div className="flex items-center justify-between mb-2">
                    <span className="text-sm font-semibold text-gray-700">Documents Submitted</span>
                    <span className={`text-sm font-bold ${allComplete ? 'text-emerald-600' : 'text-gray-900'}`}>
                        {submittedCount} / {totalCount}
                    </span>
                </div>
                <div className="w-full bg-gray-200 rounded-full h-3 overflow-hidden">
                    <div
                        className={`h-3 rounded-full transition-all duration-500 ${allComplete ? 'bg-emerald-500' : 'bg-teal-600'}`}
                        style={{ width: `${progressPct}%` }}
                    />
                </div>
                {allComplete && (
                    <p className="mt-2 text-sm font-semibold text-emerald-600">
                        All requirements submitted — your application is ready for review!
                    </p>
                )}
            </div>

            {/* ── Auto-Checklist ── */}
            <div className="mb-6 rounded-2xl border border-gray-200 bg-white p-4">
                <div className="flex items-center justify-between mb-3">
                    <h3 className="text-sm font-bold text-gray-800">Requirements Checklist</h3>
                    <span className={`text-xs font-semibold px-2.5 py-1 rounded-full ${
                        allComplete
                            ? 'bg-emerald-100 text-emerald-700'
                            : 'bg-gray-100 text-gray-600'
                    }`}>
                        {submittedCount} of {totalCount} complete
                    </span>
                </div>
                <ul className="grid gap-1.5 sm:grid-cols-2">
                    {REQUIREMENTS.map((req) => {
                        const is_submitted = docStates[req.id].submittedUrl !== null;
                        return (
                            <li
                                key={`checklist-${req.id}`}
                                className={`flex items-center gap-2.5 rounded-xl px-3 py-2 transition-colors duration-300 ${
                                    is_submitted ? 'bg-emerald-50' : 'bg-gray-50'
                                }`}
                            >
                                <span
                                    className={`flex h-5 w-5 flex-shrink-0 items-center justify-center rounded-md transition-colors duration-300 ${
                                        is_submitted
                                            ? 'bg-emerald-500 text-white'
                                            : 'border-2 border-gray-300 bg-white'
                                    }`}
                                >
                                    {is_submitted && (
                                        <svg className="h-3 w-3" viewBox="0 0 20 20" fill="currentColor">
                                            <path
                                                fillRule="evenodd"
                                                d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z"
                                                clipRule="evenodd"
                                            />
                                        </svg>
                                    )}
                                </span>
                                <span
                                    className={`text-xs font-medium transition-colors duration-300 ${
                                        is_submitted ? 'text-emerald-800' : 'text-gray-600'
                                    }`}
                                >
                                    {req.label}
                                </span>
                            </li>
                        );
                    })}
                </ul>
            </div>

            {/* ── Document list ── */}
            <ul className="space-y-3">
                {REQUIREMENTS.map((req, index) => {
                    const state = docStates[req.id];
                    const isSubmitted = state.submittedUrl !== null;
                    const isBusy = state.uploadState === 'uploading';

                    return (
                        <li
                            key={req.id}
                            className={`rounded-2xl border p-4 transition-all duration-200 ${
                                isSubmitted
                                    ? 'border-emerald-200 bg-emerald-50/50'
                                    : 'border-gray-200 bg-white'
                            } ${isBusy ? 'opacity-70' : ''}`}
                        >
                            <div className="flex items-start gap-3">
                                {/* ── Index / Check badge ── */}
                                <span
                                    className={`mt-0.5 flex-shrink-0 inline-flex h-7 w-7 items-center justify-center rounded-full text-xs font-bold transition-colors ${
                                        isSubmitted
                                            ? 'bg-emerald-500 text-white'
                                            : 'bg-gray-100 text-gray-500'
                                    }`}
                                >
                                    {isSubmitted ? (
                                        <svg className="h-4 w-4" viewBox="0 0 20 20" fill="currentColor">
                                            <path
                                                fillRule="evenodd"
                                                d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z"
                                                clipRule="evenodd"
                                            />
                                        </svg>
                                    ) : (
                                        index + 1
                                    )}
                                </span>

                                <div className="flex-1 min-w-0">
                                    {/* ── Title row ── */}
                                    <div className="flex items-center gap-2 flex-wrap">
                                        <span className="text-sm font-semibold text-gray-800">{req.label}</span>
                                        <span className="inline-flex items-center rounded-full bg-red-50 px-2 py-0.5 text-xs font-medium text-red-600 ring-1 ring-inset ring-red-200">
                                            Required
                                        </span>
                                        {isSubmitted && !isLocked && (
                                            <span className="inline-flex items-center rounded-full bg-emerald-50 px-2 py-0.5 text-xs font-medium text-emerald-600 ring-1 ring-inset ring-emerald-200">
                                                Submitted
                                            </span>
                                        )}
                                    </div>

                                    {/* ── Description ── */}
                                    <p className="mt-0.5 text-xs text-gray-400 leading-relaxed">{req.description}</p>

                                    {/* ── Upload / submitted area ── */}
                                    <div className="mt-3 space-y-2">
                                        {isSubmitted ? (
                                            <>
                                                <SubmittedBadge url={state.submittedUrl!} />
                                                {!isLocked && (
                                                    <button
                                                        type="button"
                                                        disabled={isBusy}
                                                        onClick={() => handleRemove(req.id)}
                                                        className="text-xs text-red-500 hover:text-red-700 font-medium transition-colors disabled:opacity-50"
                                                    >
                                                        Remove &amp; re-upload
                                                    </button>
                                                )}
                                            </>
                                        ) : (
                                            <>
                                                <label
                                                    htmlFor={`file-${req.id}`}
                                                    className={`flex cursor-pointer items-center gap-2 rounded-xl border border-dashed px-4 py-3 text-xs transition-colors ${
                                                        isBusy
                                                            ? 'border-teal-300 bg-teal-50 text-teal-500 cursor-not-allowed'
                                                            : 'border-gray-300 text-gray-500 hover:border-teal-400 hover:bg-teal-50 hover:text-teal-600'
                                                    }`}
                                                >
                                                    {isBusy ? (
                                                        <div className="h-4 w-4 animate-spin rounded-full border-2 border-teal-500 border-t-transparent flex-shrink-0" />
                                                    ) : (
                                                        <svg
                                                            className="h-4 w-4 flex-shrink-0"
                                                            viewBox="0 0 24 24"
                                                            fill="none"
                                                            stroke="currentColor"
                                                            strokeWidth={2}
                                                        >
                                                            <path
                                                                strokeLinecap="round"
                                                                strokeLinejoin="round"
                                                                d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-8l-4-4m0 0L8 8m4-4v12"
                                                            />
                                                        </svg>
                                                    )}
                                                    <span>
                                                        {isBusy ? 'Uploading…' : `Attach document (PDF, JPG, PNG — max ${MAX_FILE_SIZE_MB} MB)`}
                                                    </span>
                                                    <input
                                                        ref={(el) => { fileInputRefs.current[req.id] = el; }}
                                                        id={`file-${req.id}`}
                                                        type="file"
                                                        accept={req.accept}
                                                        disabled={isBusy || isLocked}
                                                        className="sr-only"
                                                        onChange={(e) => {
                                                            const file = e.target.files?.[0];
                                                            if (file) handleFileSelect(req.id, file);
                                                        }}
                                                    />
                                                </label>

                                                {isBusy && <ProgressBar pct={state.uploadProgress} />}
                                            </>
                                        )}

                                        {/* ── Error message ── */}
                                        {state.errorMessage && (
                                            <p className="text-xs text-red-500 font-medium">{state.errorMessage}</p>
                                        )}
                                    </div>
                                </div>
                            </div>
                        </li>
                    );
                })}
            </ul>

            {/* ── All done CTA ── */}
            {allComplete && !isLocked && (
                <div className="mt-6 rounded-2xl border border-emerald-200 bg-emerald-50 p-5 text-center">
                    <svg className="mx-auto h-10 w-10 text-emerald-500 mb-2" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={1.5}>
                        <path strokeLinecap="round" strokeLinejoin="round" d="M9 12.75L11.25 15 15 9.75M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                    </svg>
                    <p className="text-sm font-bold text-emerald-800">All documents submitted!</p>
                    <p className="mt-0.5 text-xs text-emerald-600">
                        Your documents are now under review by PESO staff. You will be notified once approved.
                    </p>
                </div>
            )}
        </div>
    );
};

export default SPESDocumentsModule;

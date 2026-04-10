import React, { useCallback, useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import {
    CheckCircle2,
    ChevronDown,
    ChevronRight,
    ClipboardList,
    FileText,
    FolderOpen,
    Loader2,
    Upload,
    XCircle,
} from 'lucide-react';

import documentsApi, { type ProgramDocumentStatus } from '../api/documents.api';
import spesDocumentsApi, { type DocumentFieldId } from '../api/spesDocuments.api';
import type { ProgramKey } from '../constants/beneficiaryPrograms';

// ─── Program metadata ────────────────────────────────────────────────────────
// huhu
interface ProgramMeta {
    key: ProgramKey;
    apiKey: string;
    label: string;
    shortLabel: string;
    color: string;
    bgColor: string;
    ringColor: string;
    badgeBg: string;
    badgeText: string;
}

const PROGRAMS: ProgramMeta[] = [
    { key: 'TUPAD', apiKey: 'tupad', label: 'TUPAD — Emergency Employment', shortLabel: 'TUPAD', color: 'text-orange-600', bgColor: 'bg-orange-50', ringColor: 'ring-orange-200', badgeBg: 'bg-orange-100', badgeText: 'text-orange-700' },
    { key: 'SPES', apiKey: 'spes', label: 'SPES — Student Employment', shortLabel: 'SPES', color: 'text-teal-600', bgColor: 'bg-teal-50', ringColor: 'ring-teal-200', badgeBg: 'bg-teal-100', badgeText: 'text-teal-700' },
    { key: 'DILP', apiKey: 'dilp', label: 'DILP — Livelihood Program', shortLabel: 'DILP', color: 'text-purple-600', bgColor: 'bg-purple-50', ringColor: 'ring-purple-200', badgeBg: 'bg-purple-100', badgeText: 'text-purple-700' },
    { key: 'GIP', apiKey: 'gip', label: 'GIP — Government Internship', shortLabel: 'GIP', color: 'text-teal-600', bgColor: 'bg-teal-50', ringColor: 'ring-teal-200', badgeBg: 'bg-teal-100', badgeText: 'text-teal-700' },
    { key: 'JOBSEEKERS', apiKey: 'job_seekers', label: 'Job Seekers Assistance', shortLabel: 'Job Seekers', color: 'text-indigo-600', bgColor: 'bg-indigo-50', ringColor: 'ring-indigo-200', badgeBg: 'bg-indigo-100', badgeText: 'text-indigo-700' },
];

// Requirement labels per program (for display purposes)
const REQUIREMENT_LABELS: Record<string, Record<string, string>> = {
    tupad: {
        government_id: 'Government Issued ID',
        barangay_certification: 'Barangay Certification',
        application_form: 'Application Form',
        birth_certificate: 'Birth Certificate',
    },
    dilp: {
        valid_government_id: 'Valid Government ID',
        project_proposal: 'Project Proposal',
        barangay_clearance: 'Barangay Clearance',
        business_registration: 'Business Registration',
    },
    gip: {
        government_id: 'Government ID',
        transcript_of_records: 'Transcript of Records',
        certificate_of_graduation: 'Certificate of Graduation',
        barangay_clearance: 'Barangay Clearance',
        nbi_police_clearance: 'NBI / Police Clearance',
    },
    job_seekers: {
        updated_resume: 'Updated Resume / CV',
        valid_government_id: 'Valid Government ID',
        proof_of_address: 'Proof of Address',
        certifications: 'Certifications (if any)',
    },
};

const SPES_REQUIREMENT_LABELS: Record<DocumentFieldId, string> = {
    spes_form2: 'SPES Form 2',
    spes_form2a: 'SPES Form 2A',
    spes_form4: 'SPES Form 4',
    passport_picture: 'Passport Size Picture',
    birth_certificate: 'Birth Certificate',
    certificate_of_indigency: 'Certificate of Indigency',
    certificate_of_registration: 'Certificate of Registration',
    certificate_of_grades: 'Certificate of Grades',
    philjobnet_screenshot: 'PhilJobNet Registration',
};
const SPES_FIELD_IDS = Object.keys(SPES_REQUIREMENT_LABELS) as DocumentFieldId[];

// ─── Types ───────────────────────────────────────────────────────────────────

interface ProgramStatus {
    totalRequired: number;
    submittedCount: number;
    isComplete: boolean;
    submittedTypes: string[];
    missingTypes: string[];
}

interface CombinedStatus {
    generic: Record<string, ProgramStatus>;
    spes: ProgramStatus;
}

// ─── Props ───────────────────────────────────────────────────────────────────

interface RequirementsSubmissionModuleProps {
    /** Compact mode for dashboard embedding — shows only progress summary */
    compact?: boolean;
}

// ─── Component ───────────────────────────────────────────────────────────────

const RequirementsSubmissionModule: React.FC<RequirementsSubmissionModuleProps> = ({ compact = false }) => {
    const navigate = useNavigate();
    const token = localStorage.getItem('token') ?? '';

    const [loading, setLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);
    const [status, setStatus] = useState<CombinedStatus | null>(null);
    const [expandedProgram, setExpandedProgram] = useState<string | null>(null);

    // ── Fetch all statuses in parallel ───────────────────────────────────────
    const fetchAllStatus = useCallback(async () => {
        setLoading(true);
        setError(null);

        try {
            const [genericRes, spesRes] = await Promise.allSettled([
                documentsApi.getAllProgramStatus(token),
                spesDocumentsApi.getStatus(token),
            ]);

            // Process generic programs
            const generic: Record<string, ProgramStatus> = {};
            if (genericRes.status === 'fulfilled') {
                const programs = genericRes.value.programs;
                Object.entries(programs).forEach(([key, data]: [string, ProgramDocumentStatus]) => {
                    generic[key] = {
                        totalRequired: data.total_required,
                        submittedCount: data.submitted_count,
                        isComplete: data.is_complete,
                        submittedTypes: data.documents.map((d) => d.document_type),
                        missingTypes: data.missing,
                    };
                });
            }

            // Process SPES
            let spes: ProgramStatus = {
                totalRequired: SPES_FIELD_IDS.length,
                submittedCount: 0,
                isComplete: false,
                submittedTypes: [],
                missingTypes: [...SPES_FIELD_IDS],
            };

            if (spesRes.status === 'fulfilled') {
                const submitted = SPES_FIELD_IDS.filter((id) => Boolean(spesRes.value.documents[id]));
                const missing = SPES_FIELD_IDS.filter((id) => !spesRes.value.documents[id]);
                spes = {
                    totalRequired: SPES_FIELD_IDS.length,
                    submittedCount: submitted.length,
                    isComplete: submitted.length === SPES_FIELD_IDS.length,
                    submittedTypes: submitted,
                    missingTypes: missing,
                };
            }

            setStatus({ generic, spes });
        } catch {
            setError('Failed to load requirements status.');
        } finally {
            setLoading(false);
        }
    }, [token]);

    useEffect(() => {
        fetchAllStatus();
    }, [fetchAllStatus]);

    // ── Helpers ──────────────────────────────────────────────────────────────

    const getProgramStatus = (program: ProgramMeta): ProgramStatus => {
        if (!status) {
            return { totalRequired: 0, submittedCount: 0, isComplete: false, submittedTypes: [], missingTypes: [] };
        }
        if (program.key === 'SPES') return status.spes;
        return status.generic[program.apiKey] ?? { totalRequired: 0, submittedCount: 0, isComplete: false, submittedTypes: [], missingTypes: [] };
    };

    const getOverallStats = () => {
        if (!status) return { total: 0, submitted: 0, completedPrograms: 0, totalPrograms: PROGRAMS.length };

        let total = 0;
        let submitted = 0;
        let completedPrograms = 0;

        PROGRAMS.forEach((p) => {
            const s = getProgramStatus(p);
            total += s.totalRequired;
            submitted += s.submittedCount;
            if (s.isComplete) completedPrograms++;
        });

        return { total, submitted, completedPrograms, totalPrograms: PROGRAMS.length };
    };

    const navigateToRequirements = (programKey: ProgramKey) => {
        navigate(`/beneficiary/requirements?program=${programKey}`);
    };

    // ── Loading state ────────────────────────────────────────────────────────

    if (loading) {
        return (
            <div className="flex items-center justify-center py-12">
                <Loader2 className="h-6 w-6 animate-spin text-teal-500" />
                <span className="ml-3 text-sm text-gray-500">Loading requirements…</span>
            </div>
        );
    }

    if (error) {
        return (
            <div className="rounded-xl border border-red-200 bg-red-50 p-4 text-sm text-red-700">
                {error}
                <button onClick={fetchAllStatus} className="ml-3 font-semibold underline hover:text-red-900">
                    Retry
                </button>
            </div>
        );
    }

    const overall = getOverallStats();
    const overallPct = overall.total > 0 ? Math.round((overall.submitted / overall.total) * 100) : 0;
    const allComplete = overall.completedPrograms === overall.totalPrograms;

    // ── Compact mode (for dashboard) ─────────────────────────────────────────

    if (compact) {
        return (
            <div className="space-y-4">
                {/* Overall progress summary */}
                <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2">
                        <div className={`flex h-8 w-8 items-center justify-center rounded-lg ${allComplete ? 'bg-emerald-100' : 'bg-teal-100'}`}>
                            <FolderOpen className={`h-4 w-4 ${allComplete ? 'text-emerald-600' : 'text-teal-600'}`} />
                        </div>
                        <div>
                            <p className="text-sm font-semibold text-gray-800">All Requirements</p>
                            <p className="text-xs text-gray-500">{overall.submitted} of {overall.total} documents submitted</p>
                        </div>
                    </div>
                    <span className={`text-lg font-bold ${allComplete ? 'text-emerald-600' : 'text-gray-900'}`}>
                        {overallPct}%
                    </span>
                </div>

                {/* Overall progress bar */}
                <div className="w-full bg-gray-200 rounded-full h-2.5 overflow-hidden">
                    <div
                        className={`h-2.5 rounded-full transition-all duration-700 ease-out ${allComplete ? 'bg-emerald-500' : 'bg-teal-600'}`}
                        style={{ width: `${overallPct}%` }}
                    />
                </div>

                {/* Per-program mini rows */}
                <div className="space-y-2">
                    {PROGRAMS.map((program) => {
                        const ps = getProgramStatus(program);
                        const pct = ps.totalRequired > 0 ? Math.round((ps.submittedCount / ps.totalRequired) * 100) : 0;

                        return (
                            <button
                                key={program.key}
                                type="button"
                                onClick={() => navigateToRequirements(program.key)}
                                className="w-full flex items-center gap-3 rounded-xl border border-gray-200 bg-white px-3 py-2.5 hover:border-gray-300 hover:shadow-sm transition-all text-left group"
                            >
                                <div className={`flex h-7 w-7 items-center justify-center rounded-lg ${program.bgColor}`}>
                                    {ps.isComplete ? (
                                        <CheckCircle2 className="h-3.5 w-3.5 text-emerald-600" />
                                    ) : (
                                        <ClipboardList className={`h-3.5 w-3.5 ${program.color}`} />
                                    )}
                                </div>
                                <div className="flex-1 min-w-0">
                                    <div className="flex items-center justify-between">
                                        <span className="text-xs font-semibold text-gray-800">{program.shortLabel}</span>
                                        <span className={`text-xs font-bold ${ps.isComplete ? 'text-emerald-600' : 'text-gray-500'}`}>
                                            {ps.submittedCount}/{ps.totalRequired}
                                        </span>
                                    </div>
                                    <div className="mt-1 w-full bg-gray-100 rounded-full h-1.5 overflow-hidden">
                                        <div
                                            className={`h-1.5 rounded-full transition-all duration-500 ${ps.isComplete ? 'bg-emerald-500' : 'bg-teal-500'}`}
                                            style={{ width: `${pct}%` }}
                                        />
                                    </div>
                                </div>
                                <ChevronRight className="h-3.5 w-3.5 text-gray-400 group-hover:text-gray-600 flex-shrink-0" />
                            </button>
                        );
                    })}
                </div>

                {allComplete && (
                    <div className="flex items-center gap-2 text-xs font-semibold text-emerald-600 bg-emerald-50 rounded-lg px-3 py-2 border border-emerald-200">
                        <CheckCircle2 className="h-4 w-4" />
                        All program requirements are complete!
                    </div>
                )}
            </div>
        );
    }

    // ── Full mode (standalone page) ──────────────────────────────────────────

    return (
        <div className="w-full space-y-5">
            {/* ── Overall Progress Header ── */}
            <div className="rounded-2xl border border-gray-200 bg-gradient-to-br from-white to-gray-50 p-5 shadow-sm">
                <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
                    <div>
                        <div className="inline-flex items-center gap-2 rounded-full bg-teal-50 px-3 py-1 text-xs font-semibold text-teal-700 ring-1 ring-inset ring-teal-200">
                            <Upload className="h-3 w-3" />
                            Requirements Submission
                        </div>
                        <h2 className="mt-2 text-xl font-bold text-gray-900">Submit Your Requirements</h2>
                        <p className="mt-1 text-sm text-gray-500">
                            Upload required documents for each program. Track your submission progress across all programs below.
                        </p>
                    </div>
                    <div className="text-center sm:text-right">
                        <p className={`text-3xl font-black ${allComplete ? 'text-emerald-600' : 'text-gray-900'}`}>{overallPct}%</p>
                        <p className="text-xs text-gray-500 mt-1">
                            {overall.submitted} of {overall.total} documents
                        </p>
                    </div>
                </div>

                <div className="mt-4 w-full bg-gray-200 rounded-full h-3 overflow-hidden">
                    <div
                        className={`h-3 rounded-full transition-all duration-700 ease-out ${allComplete ? 'bg-emerald-500' : 'bg-teal-600'}`}
                        style={{ width: `${overallPct}%` }}
                    />
                </div>

                {/* Programs completion badges */}
                <div className="mt-4 flex flex-wrap gap-2">
                    {PROGRAMS.map((program) => {
                        const ps = getProgramStatus(program);
                        return (
                            <span
                                key={`badge-${program.key}`}
                                className={`inline-flex items-center gap-1.5 rounded-full px-2.5 py-1 text-xs font-semibold ring-1 ring-inset ${
                                    ps.isComplete
                                        ? 'bg-emerald-50 text-emerald-700 ring-emerald-200'
                                        : ps.submittedCount > 0
                                            ? `${program.bgColor} ${program.badgeText} ${program.ringColor}`
                                            : 'bg-gray-50 text-gray-500 ring-gray-200'
                                }`}
                            >
                                {ps.isComplete ? <CheckCircle2 className="h-3 w-3" /> : <ClipboardList className="h-3 w-3" />}
                                {program.shortLabel} {ps.submittedCount}/{ps.totalRequired}
                            </span>
                        );
                    })}
                </div>
            </div>

            {/* ── Per-Program Accordion ── */}
            <div className="space-y-3">
                {PROGRAMS.map((program) => {
                    const ps = getProgramStatus(program);
                    const pct = ps.totalRequired > 0 ? Math.round((ps.submittedCount / ps.totalRequired) * 100) : 0;
                    const isExpanded = expandedProgram === program.key;

                    // Build checklist items
                    let checklistItems: { id: string; label: string; submitted: boolean }[] = [];
                    if (program.key === 'SPES') {
                        checklistItems = SPES_FIELD_IDS.map((id) => ({
                            id,
                            label: SPES_REQUIREMENT_LABELS[id],
                            submitted: ps.submittedTypes.includes(id),
                        }));
                    } else {
                        const labels = REQUIREMENT_LABELS[program.apiKey] ?? {};
                        const allTypes = [...ps.submittedTypes, ...ps.missingTypes];
                        // Deduplicate
                        const seen = new Set<string>();
                        checklistItems = allTypes
                            .filter((t) => {
                                if (seen.has(t)) return false;
                                seen.add(t);
                                return true;
                            })
                            .map((type) => ({
                                id: type,
                                label: labels[type] ?? type.replace(/_/g, ' ').replace(/\b\w/g, (c) => c.toUpperCase()),
                                submitted: ps.submittedTypes.includes(type),
                            }));
                    }

                    return (
                        <div
                            key={program.key}
                            className={`rounded-2xl border-2 transition-all duration-200 ${
                                ps.isComplete
                                    ? 'border-emerald-200 bg-emerald-50/30'
                                    : isExpanded
                                        ? 'border-teal-300 bg-white shadow-md'
                                        : 'border-gray-200 bg-white hover:border-gray-300'
                            }`}
                        >
                            {/* Accordion header */}
                            <button
                                type="button"
                                onClick={() => setExpandedProgram(isExpanded ? null : program.key)}
                                className="w-full flex items-center justify-between px-4 py-4 sm:px-5 text-left"
                            >
                                <div className="flex items-center gap-3">
                                    <div className={`flex h-10 w-10 items-center justify-center rounded-xl ${
                                        ps.isComplete ? 'bg-emerald-100' : program.bgColor
                                    }`}>
                                        {ps.isComplete ? (
                                            <CheckCircle2 className="h-5 w-5 text-emerald-600" />
                                        ) : (
                                            <FileText className={`h-5 w-5 ${program.color}`} />
                                        )}
                                    </div>
                                    <div>
                                        <div className="flex items-center gap-2 flex-wrap">
                                            <span className="text-sm font-bold text-gray-900">{program.shortLabel}</span>
                                            {ps.isComplete ? (
                                                <span className="inline-flex items-center gap-1 rounded-full bg-emerald-100 px-2 py-0.5 text-[10px] font-semibold text-emerald-700 uppercase tracking-wide">
                                                    <CheckCircle2 className="h-3 w-3" />
                                                    Complete
                                                </span>
                                            ) : ps.submittedCount > 0 ? (
                                                <span className={`inline-flex items-center rounded-full ${program.badgeBg} px-2 py-0.5 text-[10px] font-semibold ${program.badgeText} uppercase tracking-wide`}>
                                                    In Progress
                                                </span>
                                            ) : (
                                                <span className="inline-flex items-center rounded-full bg-gray-100 px-2 py-0.5 text-[10px] font-semibold text-gray-500 uppercase tracking-wide">
                                                    Not Started
                                                </span>
                                            )}
                                        </div>
                                        <p className="mt-0.5 text-xs text-gray-500">
                                            {ps.submittedCount} of {ps.totalRequired} documents submitted
                                        </p>
                                    </div>
                                </div>

                                <div className="flex items-center gap-3">
                                    {/* Mini progress bar */}
                                    <div className="hidden sm:block w-24">
                                        <div className="w-full bg-gray-200 rounded-full h-2 overflow-hidden">
                                            <div
                                                className={`h-2 rounded-full transition-all duration-500 ${ps.isComplete ? 'bg-emerald-500' : 'bg-teal-500'}`}
                                                style={{ width: `${pct}%` }}
                                            />
                                        </div>
                                    </div>
                                    <span className={`text-sm font-bold ${ps.isComplete ? 'text-emerald-600' : 'text-gray-700'}`}>
                                        {pct}%
                                    </span>
                                    <ChevronDown
                                        className={`h-4 w-4 text-gray-400 transition-transform duration-200 ${isExpanded ? 'rotate-180' : ''}`}
                                    />
                                </div>
                            </button>

                            {/* Expanded content */}
                            {isExpanded && (
                                <div className="border-t border-gray-200 px-4 py-4 sm:px-5 space-y-4">
                                    {/* Requirements checklist */}
                                    <div>
                                        <h4 className="text-xs font-semibold uppercase tracking-wider text-gray-500 mb-3">
                                            Requirements Checklist
                                        </h4>
                                        <ul className="space-y-1.5">
                                            {checklistItems.map((item) => (
                                                <li
                                                    key={item.id}
                                                    className={`flex items-center gap-2.5 rounded-lg px-3 py-2 transition-colors ${
                                                        item.submitted ? 'bg-emerald-50' : 'bg-gray-50'
                                                    }`}
                                                >
                                                    {item.submitted ? (
                                                        <CheckCircle2 className="h-4 w-4 text-emerald-500 flex-shrink-0" />
                                                    ) : (
                                                        <XCircle className="h-4 w-4 text-gray-300 flex-shrink-0" />
                                                    )}
                                                    <span className={`text-sm font-medium ${
                                                        item.submitted ? 'text-emerald-800' : 'text-gray-600'
                                                    }`}>
                                                        {item.label}
                                                    </span>
                                                    {item.submitted && (
                                                        <span className="ml-auto text-[10px] font-semibold uppercase tracking-wide text-emerald-600">
                                                            Submitted
                                                        </span>
                                                    )}
                                                    {!item.submitted && (
                                                        <span className="ml-auto text-[10px] font-semibold uppercase tracking-wide text-gray-400">
                                                            Missing
                                                        </span>
                                                    )}
                                                </li>
                                            ))}
                                        </ul>
                                    </div>

                                    {/* Action button — navigate to the upload page */}
                                    <button
                                        type="button"
                                        onClick={() => navigateToRequirements(program.key)}
                                        className={`w-full flex items-center justify-center gap-2 rounded-xl py-3 px-4 text-sm font-semibold transition-colors ${
                                            ps.isComplete
                                                ? 'bg-emerald-100 text-emerald-700 hover:bg-emerald-200'
                                                : 'bg-teal-600 text-white hover:bg-teal-700'
                                        }`}
                                    >
                                        <Upload className="h-4 w-4" />
                                        {ps.isComplete
                                            ? 'View Submitted Documents'
                                            : ps.submittedCount > 0
                                                ? `Continue Uploading (${ps.totalRequired - ps.submittedCount} remaining)`
                                                : 'Start Uploading Documents'
                                        }
                                    </button>
                                </div>
                            )}
                        </div>
                    );
                })}
            </div>

            {/* ── All complete banner ── */}
            {allComplete && (
                <div className="rounded-2xl border border-emerald-200 bg-gradient-to-r from-emerald-50 to-teal-50 p-6 text-center">
                    <div className="mx-auto flex h-14 w-14 items-center justify-center rounded-2xl bg-emerald-100 mb-3">
                        <CheckCircle2 className="h-7 w-7 text-emerald-600" />
                    </div>
                    <p className="text-base font-bold text-emerald-800">All Requirements Submitted!</p>
                    <p className="mt-1 text-sm text-emerald-600">
                        You have submitted all required documents for every program. Your applications are ready for review.
                    </p>
                </div>
            )}
        </div>
    );
};

export default RequirementsSubmissionModule;

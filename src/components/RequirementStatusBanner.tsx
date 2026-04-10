import React from 'react';
import { useNavigate } from 'react-router-dom';
import { CheckCircle2, AlertTriangle, Loader2, Upload, XCircle } from 'lucide-react';

import type { ProgramRequirementStatus } from '../hooks/useRequirementStatus';
import type { ProgramKey } from '../constants/beneficiaryPrograms';

// ─── Props ───────────────────────────────────────────────────────────────────

interface RequirementStatusBannerProps {
    programKey: ProgramKey;
    status: ProgramRequirementStatus | null;
    loading: boolean;
    error: string | null;
}

// ─── Component ───────────────────────────────────────────────────────────────

const RequirementStatusBanner: React.FC<RequirementStatusBannerProps> = ({
    programKey,
    status,
    loading,
    error,
}) => {
    const navigate = useNavigate();

    if (loading) {
        return (
            <div className="mb-5 rounded-xl border border-gray-200 bg-gray-50 px-4 py-3 flex items-center gap-3">
                <Loader2 className="h-4 w-4 animate-spin text-gray-400 flex-shrink-0" />
                <span className="text-sm text-gray-500">Checking requirement status…</span>
            </div>
        );
    }

    if (error || !status) {
        return (
            <div className="mb-5 rounded-xl border border-amber-200 bg-amber-50 px-4 py-3 flex items-start gap-3">
                <AlertTriangle className="h-5 w-5 flex-shrink-0 text-amber-500 mt-0.5" />
                <div>
                    <p className="text-sm font-semibold text-amber-800">Unable to verify requirements</p>
                    <p className="text-xs text-amber-600 mt-0.5">
                        We couldn't check your submission status. Please make sure your requirements are uploaded before submitting.
                    </p>
                </div>
            </div>
        );
    }

    // ── All requirements submitted ───────────────────────────────────────────
    if (status.isComplete) {
        return (
            <div className="mb-5 rounded-xl border border-emerald-200 bg-emerald-50 px-4 py-3 flex items-start gap-3">
                <CheckCircle2 className="h-5 w-5 flex-shrink-0 text-emerald-500 mt-0.5" />
                <div className="flex-1">
                    <p className="text-sm font-semibold text-emerald-800">
                        All requirements submitted
                    </p>
                    <p className="text-xs text-emerald-600 mt-0.5">
                        You have uploaded all {status.totalRequired} required documents. You may now submit your application form.
                    </p>
                </div>
            </div>
        );
    }

    // ── Partially or not submitted ───────────────────────────────────────────
    const hasPartial = status.submittedCount > 0;

    return (
        <div className="mb-5 rounded-xl border border-amber-200 bg-amber-50 px-4 py-4 space-y-3">
            <div className="flex items-start gap-3">
                <AlertTriangle className="h-5 w-5 flex-shrink-0 text-amber-500 mt-0.5" />
                <div className="flex-1">
                    <p className="text-sm font-semibold text-amber-800">
                        {hasPartial
                            ? `${status.submittedCount} of ${status.totalRequired} requirements uploaded`
                            : 'Upload your requirements first'}
                    </p>
                    <p className="text-xs text-amber-600 mt-0.5">
                        {hasPartial
                            ? `You still need to upload ${status.missingLabels.length} more document${status.missingLabels.length !== 1 ? 's' : ''} before submitting.`
                            : 'Go to the Requirements page and upload all documents before submitting your application form.'}
                    </p>
                </div>
            </div>

            {/* Missing documents list */}
            {status.missingLabels.length > 0 && (
                <ul className="ml-8 space-y-1">
                    {status.missingLabels.map((label) => (
                        <li key={label} className="flex items-center gap-2 text-xs text-amber-700">
                            <XCircle className="h-3.5 w-3.5 text-amber-400 flex-shrink-0" />
                            {label}
                        </li>
                    ))}
                </ul>
            )}

            {/* Navigate to requirements page */}
            <button
                type="button"
                onClick={() => navigate(`/beneficiary/requirements?program=${programKey}`)}
                className="ml-8 inline-flex items-center gap-1.5 rounded-lg bg-amber-600 px-3 py-1.5 text-xs font-semibold text-white hover:bg-amber-700 transition-colors"
            >
                <Upload className="h-3.5 w-3.5" />
                Upload Requirements
            </button>
        </div>
    );
};

export default RequirementStatusBanner;

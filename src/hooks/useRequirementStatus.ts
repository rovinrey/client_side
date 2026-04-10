import { useCallback, useEffect, useState } from 'react';

import documentsApi from '../api/documents.api';
import spesDocumentsApi, { type DocumentFieldId } from '../api/spesDocuments.api';
import type { ProgramKey } from '../constants/beneficiaryPrograms';

// ─── Types ───────────────────────────────────────────────────────────────────

export interface ProgramRequirementStatus {
    totalRequired: number;
    submittedCount: number;
    isComplete: boolean;
    missingLabels: string[];
    submittedLabels: string[];
    /** Raw document_type keys (e.g. 'government_id') or SPES field IDs (e.g. 'spes_form2') */
    submittedTypes: string[];
}

export interface UseRequirementStatusReturn {
    /** Status for a specific program (null while loading or on error) */
    getStatus: (programKey: ProgramKey) => ProgramRequirementStatus | null;
    /** Whether the given program's requirements are fully submitted */
    isComplete: (programKey: ProgramKey) => boolean;
    /** Whether the hook is still fetching data */
    loading: boolean;
    /** Error message if the fetch failed */
    error: string | null;
    /** Re-fetch all statuses from the backend */
    refresh: () => void;
}

// ─── Constants ───────────────────────────────────────────────────────────────

const PROGRAM_TO_API_KEY: Record<ProgramKey, string> = {
    TUPAD: 'tupad',
    SPES: 'spes',
    DILP: 'dilp',
    GIP: 'gip',
    JOBSEEKERS: 'job_seekers',
};

const GENERIC_REQUIREMENT_LABELS: Record<string, Record<string, string>> = {
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
    passport_picture: 'Passport Size Picture',
    birth_certificate: 'Birth Certificate',
    certificate_of_indigency: 'Certificate of Indigency',
    certificate_of_registration: 'Certificate of Registration',
    certificate_of_grades: 'Certificate of Grades',
    philjobnet_screenshot: 'PhilJobNet Registration',
};

const SPES_FIELD_IDS = Object.keys(SPES_REQUIREMENT_LABELS) as DocumentFieldId[];

// ─── Hook ────────────────────────────────────────────────────────────────────

export function useRequirementStatus(): UseRequirementStatusReturn {
    const token = localStorage.getItem('token') ?? '';

    const [loading, setLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);
    const [genericStatus, setGenericStatus] = useState<Record<string, ProgramRequirementStatus>>({});
    const [spesStatus, setSpesStatus] = useState<ProgramRequirementStatus | null>(null);

    const fetchAll = useCallback(async () => {
        if (!token) {
            setLoading(false);
            setError('No authentication token found.');
            return;
        }

        setLoading(true);
        setError(null);

        try {
            const [genericRes, spesRes] = await Promise.allSettled([
                documentsApi.getAllProgramStatus(token),
                spesDocumentsApi.getStatus(token),
            ]);

            // ── Process generic programs ─────────────────────────────────
            if (genericRes.status === 'fulfilled') {
                const programs = genericRes.value.programs;
                const mapped: Record<string, ProgramRequirementStatus> = {};

                Object.entries(programs).forEach(([apiKey, data]) => {
                    const labels = GENERIC_REQUIREMENT_LABELS[apiKey] ?? {};
                    const submittedTypes = data.documents.map((d) => d.document_type);
                    const missingTypes = data.missing;

                    mapped[apiKey] = {
                        totalRequired: data.total_required,
                        submittedCount: data.submitted_count,
                        isComplete: data.is_complete,
                        submittedLabels: submittedTypes.map(
                            (t) => labels[t] ?? t.replace(/_/g, ' ').replace(/\b\w/g, (c) => c.toUpperCase())
                        ),
                        missingLabels: missingTypes.map(
                            (t) => labels[t] ?? t.replace(/_/g, ' ').replace(/\b\w/g, (c) => c.toUpperCase())
                        ),
                        submittedTypes,
                    };
                });

                setGenericStatus(mapped);
            }

            // ── Process SPES ─────────────────────────────────────────────
            if (spesRes.status === 'fulfilled') {
                const docs = spesRes.value.documents;
                const submitted = SPES_FIELD_IDS.filter((id) => Boolean(docs[id]));
                const missing = SPES_FIELD_IDS.filter((id) => !docs[id]);

                setSpesStatus({
                    totalRequired: SPES_FIELD_IDS.length,
                    submittedCount: submitted.length,
                    isComplete: submitted.length === SPES_FIELD_IDS.length,
                    submittedLabels: submitted.map((id) => SPES_REQUIREMENT_LABELS[id]),
                    missingLabels: missing.map((id) => SPES_REQUIREMENT_LABELS[id]),
                    submittedTypes: submitted,
                });
            }
        } catch {
            setError('Failed to check requirement submission status.');
        } finally {
            setLoading(false);
        }
    }, [token]);

    useEffect(() => {
        fetchAll();
    }, [fetchAll]);

    const getStatus = useCallback(
        (programKey: ProgramKey): ProgramRequirementStatus | null => {
            if (programKey === 'SPES') return spesStatus;
            const apiKey = PROGRAM_TO_API_KEY[programKey];
            return genericStatus[apiKey] ?? null;
        },
        [genericStatus, spesStatus]
    );

    const isComplete = useCallback(
        (programKey: ProgramKey): boolean => {
            const s = getStatus(programKey);
            return s?.isComplete ?? false;
        },
        [getStatus]
    );

    return { getStatus, isComplete, loading, error, refresh: fetchAll };
}

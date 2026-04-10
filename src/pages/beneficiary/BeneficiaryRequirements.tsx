import { useCallback, useEffect, useMemo, useState } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { CheckCircle2, ChevronDown, ChevronUp, Edit3, ExternalLink, Upload } from 'lucide-react';

import DocumentUploadModule, { type RequirementDef } from '../../components/DocumentUploadModule';
import SPESDocumentsModule from '../../components/SPESDocumentsModule';
import { DRAFT_STORAGE_KEY, type SpesOfficialFormKey } from './forms/SpesOfficialForms';
import { useRequirementStatus } from '../../hooks/useRequirementStatus';
import applicationStatusAPI, { type ApplicationSubmission } from '../../api/applicationStatus.api';
import {
    BENEFICIARY_PROGRAMS,
    BENEFICIARY_SELECTED_PROGRAM_KEY,
    get_program_definition,
    is_program_key,
    type ProgramKey,
} from '../../constants/beneficiaryPrograms';

// ─── Requirements definitions per program ────────────────────────────────────

interface RequirementItem {
    label: string;
    description: string;
    /** If set, this requirement can be filled out via the SPES forms page */
    spes_form_key?: SpesOfficialFormKey;
    /** The document_type key used in the backend (for non-SPES programs) */
    document_type?: string;
    /** If set, this requirement is an online form submitted via the Application page */
    is_online_form?: boolean;
}

const PROGRAM_REQUIREMENTS: Record<ProgramKey, RequirementItem[]> = {
    SPES: [
        { label: 'SPES Form 2', description: 'Accomplished application form for the SPES program.', spes_form_key: 'form2' },
        { label: 'SPES Form 2a', description: 'Supplemental application form with family background and income details.', spes_form_key: 'form2a' },
        { label: 'SPES Form 4', description: 'Employer endorsement and work deployment form.', spes_form_key: 'form4' },
        { label: 'Passport Size Picture', description: 'Recent 1×1 or 2×2 passport-sized photo with white background.', document_type: 'passport_picture' },
        { label: 'Birth Certificate', description: 'PSA-issued or LCR-certified photocopy of your birth certificate.', document_type: 'birth_certificate' },
        { label: 'Certificate of Indigency', description: 'Barangay-issued certificate of indigency.', document_type: 'certificate_of_indigency' },
        { label: 'Certificate of Registration', description: 'School-issued certificate confirming current enrollment.', document_type: 'certificate_of_registration' },
        { label: 'Certificate of Grades', description: 'Official grade sheet or transcript from the previous semester.', document_type: 'certificate_of_grades' },
        { label: 'PhilJobNet Registration Screenshot', description: 'Screenshot showing successful registration on the PhilJobNet portal.', document_type: 'philjobnet_screenshot' },
    ],
    TUPAD: [
        { label: 'Application Form', description: 'Online profiling form submitted via the Application page.', is_online_form: true },
        { label: 'Government Issued ID', description: 'Valid government-issued ID with current address.', document_type: 'government_id' },
        { label: 'Barangay Certification', description: 'Certificate stating residency and displaced/disadvantaged worker status.', document_type: 'barangay_certification' },
        { label: 'Birth Certificate', description: 'PSA-issued copy of birth certificate (if required by local unit).', document_type: 'birth_certificate' },
    ],
    DILP: [
        { label: 'Application Form', description: 'Online DILP livelihood application submitted via the Application page.', is_online_form: true },
        { label: 'Valid Government ID', description: 'Government-issued identification with valid ID number.', document_type: 'valid_government_id' },
        { label: 'Project Proposal', description: 'Brief description of the proposed livelihood project.', document_type: 'project_proposal' },
        { label: 'Barangay Clearance', description: 'Clearance from the barangay where the business will operate.', document_type: 'barangay_clearance' },
        { label: 'Business Registration', description: 'DTI or SEC registration if the enterprise is already existing.', document_type: 'business_registration' },
    ],
    GIP: [
        { label: 'Application Form', description: 'Online GIP registration form submitted via the Application page.', is_online_form: true },
        { label: 'Government ID', description: 'Valid government-issued identification document.', document_type: 'government_id' },
        { label: 'Transcript of Records', description: 'Official transcript or certified true copy from the school.', document_type: 'transcript_of_records' },
        { label: 'Certificate of Graduation', description: 'Diploma or certificate of graduation from your institution.', document_type: 'certificate_of_graduation' },
        { label: 'Barangay Clearance', description: 'Clearance from your residential barangay.', document_type: 'barangay_clearance' },
        { label: 'NBI / Police Clearance', description: 'National Bureau of Investigation or police clearance certificate.', document_type: 'nbi_police_clearance' },
    ],
    JOBSEEKERS: [
        { label: 'Application Form', description: 'Online Job Seeker intake form submitted via the Application page.', is_online_form: true },
        { label: 'Updated Resume / CV', description: 'Current resume or curriculum vitae with contact details.', document_type: 'updated_resume' },
        { label: 'Valid Government ID', description: 'Any valid government-issued identification.', document_type: 'valid_government_id' },
        { label: 'Proof of Address', description: 'Barangay certificate or utility bill as proof of residence.', document_type: 'proof_of_address' },
        { label: 'Certifications (if any)', description: 'TESDA, NCII, or other relevant training certifications.', document_type: 'certifications' },
    ],
};

// ─── Upload requirement definitions per program (for DocumentUploadModule) ───

const UPLOAD_REQUIREMENTS: Record<string, RequirementDef[]> = {
    tupad: [
        { id: 'government_id', label: 'Government Issued ID', description: 'Valid government-issued ID with current address.' },
        { id: 'barangay_certification', label: 'Barangay Certification', description: 'Certificate stating residency and displaced/disadvantaged worker status.' },
        { id: 'birth_certificate', label: 'Birth Certificate', description: 'PSA-issued copy of birth certificate (if required by local unit).' },
    ],
    dilp: [
        { id: 'valid_government_id', label: 'Valid Government ID', description: 'Government-issued identification with valid ID number.' },
        { id: 'project_proposal', label: 'Project Proposal', description: 'Brief description of the proposed livelihood project.' },
        { id: 'barangay_clearance', label: 'Barangay Clearance', description: 'Clearance from the barangay where the business will operate.' },
        { id: 'business_registration', label: 'Business Registration', description: 'DTI or SEC registration if the enterprise is already existing.' },
    ],
    gip: [
        { id: 'government_id', label: 'Government ID', description: 'Valid government-issued identification document.' },
        { id: 'transcript_of_records', label: 'Transcript of Records', description: 'Official transcript or certified true copy from the school.' },
        { id: 'certificate_of_graduation', label: 'Certificate of Graduation', description: 'Diploma or certificate of graduation from your institution.' },
        { id: 'barangay_clearance', label: 'Barangay Clearance', description: 'Clearance from your residential barangay.' },
        { id: 'nbi_police_clearance', label: 'NBI / Police Clearance', description: 'National Bureau of Investigation or police clearance certificate.' },
    ],
    job_seekers: [
        { id: 'updated_resume', label: 'Updated Resume / CV', description: 'Current resume or curriculum vitae with contact details.' },
        { id: 'valid_government_id', label: 'Valid Government ID', description: 'Any valid government-issued identification.' },
        { id: 'proof_of_address', label: 'Proof of Address', description: 'Barangay certificate or utility bill as proof of residence.' },
        { id: 'certifications', label: 'Certifications (if any)', description: 'TESDA, NCII, or other relevant training certifications.' },
    ],
};

const PROGRAM_TO_API_KEY: Record<ProgramKey, string> = {
    TUPAD: 'tupad',
    SPES: 'spes',
    DILP: 'dilp',
    GIP: 'gip',
    JOBSEEKERS: 'job_seekers',
};

// ─── SPES form completion helpers ─────────────────────────────────────────────

interface SpesDraft {
    form_2?: Record<string, unknown>;
    form_2a?: Record<string, unknown>;
    form_4?: Record<string, unknown>;
}

const FORM_2_REQUIRED_FIELDS = ['first_name', 'last_name', 'birth_date', 'place_of_birth', 'sex', 'civil_status', 'contact_number', 'present_address', 'permanent_address'];
const FORM_2A_REQUIRED_FIELDS = ['father_name', 'mother_name', 'monthly_family_income', 'household_members'];
const FORM_4_REQUIRED_FIELDS = ['applicant_name', 'assigned_office', 'work_assignment', 'supervisor_name', 'supervisor_contact', 'start_date', 'end_date', 'daily_schedule'];

function has_any_education(data: Record<string, unknown> | undefined): boolean {
    if (!data) return false;
    const edu_keys = ['education_elementary', 'education_secondary', 'education_tertiary', 'education_tech_voc'];
    return edu_keys.some((k) => {
        const row = data[k] as Record<string, string> | undefined;
        return row && String(row.school_name ?? '').trim() !== '' && String(row.degree_or_course ?? '').trim() !== '';
    });
}

function is_section_complete(data: Record<string, unknown> | undefined, required_fields: string[]): boolean {
    if (!data) return false;
    return required_fields.every((field) => String(data[field] ?? '').trim() !== '');
}

function read_spes_draft(): SpesDraft | null {
    try {
        const raw = localStorage.getItem(DRAFT_STORAGE_KEY);
        return raw ? JSON.parse(raw) : null;
    } catch {
        return null;
    }
}

function get_spes_form_completion(draft: SpesDraft | null): Record<SpesOfficialFormKey, boolean> {
    return {
        form2: is_section_complete(draft?.form_2, FORM_2_REQUIRED_FIELDS) && has_any_education(draft?.form_2) && Boolean(draft?.form_2?.signature),
        form2a: is_section_complete(draft?.form_2a, FORM_2A_REQUIRED_FIELDS),
        form4: is_section_complete(draft?.form_4, FORM_4_REQUIRED_FIELDS),
    };
}

function has_spes_form_data(draft: SpesDraft | null, key: SpesOfficialFormKey): boolean {
    const map: Record<SpesOfficialFormKey, Record<string, unknown> | undefined> = {
        form2: draft?.form_2,
        form2a: draft?.form_2a,
        form4: draft?.form_4,
    };
    const data = map[key];
    if (!data) return false;
    return Object.values(data).some((v) => String(v ?? '').trim() !== '');
}

function BeneficiaryRequirements() {
    const navigate = useNavigate();
    const [search_params, set_search_params] = useSearchParams();
    const initial_program = useMemo(() => {
        const program_from_query = search_params.get('program');
        if (is_program_key(program_from_query)) {
            return program_from_query;
        }

        const saved_program = localStorage.getItem(BENEFICIARY_SELECTED_PROGRAM_KEY);
        if (is_program_key(saved_program)) {
            return saved_program;
        }

        return 'SPES' as ProgramKey;
    }, [search_params]);

    const [selected_program, set_selected_program] = useState<ProgramKey>(initial_program);
    const [checklist_open, set_checklist_open] = useState<ProgramKey | null>(null);

    // ── Application submission status (for online form items) ────────────────
    const [submissions, set_submissions] = useState<ApplicationSubmission[]>([]);

    useEffect(() => {
        const token = localStorage.getItem('token');
        const user_id = localStorage.getItem('user_id');
        if (!token || !user_id) return;
        applicationStatusAPI.getStatus(user_id, token)
            .then((data) => set_submissions(data.submissions ?? []))
            .catch(() => {});
    }, []);

    const PROGRAM_TYPE_MAP: Record<ProgramKey, string> = {
        TUPAD: 'tupad', SPES: 'spes', DILP: 'dilp', GIP: 'gip', JOBSEEKERS: 'job_seekers',
    };

    const has_submitted_application = (program_key: ProgramKey): boolean => {
        const db_value = PROGRAM_TYPE_MAP[program_key];
        return submissions.some(
            (s) => s.program_type === db_value && (s.status === 'Pending' || s.status === 'Approved')
        );
    };

    // ── Backend requirement status (TUPAD, DILP, GIP, JOBSEEKERS, SPES) ─────
    const { getStatus: get_requirement_status } = useRequirementStatus();

    // ── SPES form completion tracking ────────────────────────────────────────
    const [spes_completion, set_spes_completion] = useState<Record<SpesOfficialFormKey, boolean>>(() =>
        get_spes_form_completion(read_spes_draft())
    );

    const refresh_spes_completion = useCallback(() => {
        set_spes_completion(get_spes_form_completion(read_spes_draft()));
    }, []);

    // Re-check completion when the page regains focus (user comes back from form)
    useEffect(() => {
        window.addEventListener('focus', refresh_spes_completion);
        return () => window.removeEventListener('focus', refresh_spes_completion);
    }, [refresh_spes_completion]);

    // Also re-check when search_params change (navigated back)
    useEffect(() => {
        refresh_spes_completion();
    }, [search_params, refresh_spes_completion]);

    const navigate_to_spes_form = (form_key: SpesOfficialFormKey) => {
        navigate(`/beneficiary/spes-forms?form=${form_key}&from=requirements`);
    };

    useEffect(() => {
        const program_from_query = search_params.get('program');
        if (is_program_key(program_from_query) && program_from_query !== selected_program) {
            set_selected_program(program_from_query);
        }
    }, [search_params, selected_program]);

    useEffect(() => {
        localStorage.setItem(BENEFICIARY_SELECTED_PROGRAM_KEY, selected_program);
        set_search_params((previous_params) => {
            const next_params = new URLSearchParams(previous_params);
            next_params.set('program', selected_program);
            return next_params;
        }, { replace: true });
    }, [selected_program, set_search_params]);

    const selected_program_definition = get_program_definition(selected_program);
    const api_key = PROGRAM_TO_API_KEY[selected_program];
    const requirements = PROGRAM_REQUIREMENTS[selected_program];
    const upload_reqs = UPLOAD_REQUIREMENTS[api_key];

    // Compute completed count for each program (for tab badges)
    const get_completed_count = (program_key: ProgramKey) => {
        const reqs = PROGRAM_REQUIREMENTS[program_key];
        const status = get_requirement_status(program_key);
        const submitted = new Set(status?.submittedTypes ?? []);
        const app_done = has_submitted_application(program_key);
        return reqs.filter((r) => {
            if (r.is_online_form) return app_done;
            if (r.spes_form_key) return app_done || spes_completion[r.spes_form_key];
            return r.document_type ? submitted.has(r.document_type) : false;
        }).length;
    };

    return (
        <section className="w-full max-w-6xl mx-auto space-y-5">

            {/* ── Program Tabs ── */}
            <div className="rounded-2xl border border-gray-200 bg-white shadow-sm overflow-hidden">
                <div className="px-5 pt-5 pb-2 sm:px-6">
                    <h2 className="text-lg font-bold text-gray-900">Program Requirements</h2>
                    <p className="mt-1 text-sm text-gray-500">Select a program to view its checklist and upload documents.</p>
                </div>
                <div className="px-5 pb-4 sm:px-6">
                    <div className="flex flex-wrap gap-2">
                        {BENEFICIARY_PROGRAMS.map((program) => {
                            const is_active = selected_program === program.value;
                            const completed = get_completed_count(program.value);
                            const total = PROGRAM_REQUIREMENTS[program.value].length;
                            const all_done = completed === total;

                            return (
                                <button
                                    key={program.value}
                                    type="button"
                                    onClick={() => set_selected_program(program.value)}
                                    className={`inline-flex items-center gap-2 rounded-lg px-4 py-2.5 text-sm font-semibold transition-all ${
                                        is_active
                                            ? 'bg-teal-600 text-white shadow-md shadow-teal-200'
                                            : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
                                    }`}
                                >
                                    {program.short_label}
                                    <span className={`inline-flex items-center justify-center rounded-full px-2 py-0.5 text-xs font-bold ${
                                        is_active
                                            ? all_done ? 'bg-emerald-400 text-white' : 'bg-white/20 text-white'
                                            : all_done ? 'bg-emerald-100 text-emerald-700' : 'bg-gray-200 text-gray-500'
                                    }`}>
                                        {completed}/{total}
                                    </span>
                                </button>
                            );
                        })}
                    </div>
                </div>
            </div>

            {/* ── Selected Program: Checklist ── */}
            <div className="rounded-2xl border border-gray-200 bg-white shadow-sm overflow-hidden">
                <button
                    type="button"
                    onClick={() => set_checklist_open((prev) => (prev === selected_program ? null : selected_program))}
                    className="w-full flex items-center justify-between px-5 py-4 sm:px-6 text-left hover:bg-gray-50 transition-colors"
                >
                    <div>
                        <h3 className="text-base font-bold text-gray-900">
                            {selected_program_definition.short_label} — Requirements Checklist
                        </h3>
                        <p className="mt-0.5 text-sm text-gray-500">
                            {get_completed_count(selected_program)} of {requirements.length} requirements completed
                        </p>
                    </div>
                    {checklist_open === selected_program ? (
                        <ChevronUp size={18} className="text-gray-400 flex-shrink-0" />
                    ) : (
                        <ChevronDown size={18} className="text-gray-400 flex-shrink-0" />
                    )}
                </button>

                {checklist_open === selected_program && (
                    <div className="border-t border-gray-100 px-5 py-4 sm:px-6">
                        {/* Progress bar */}
                        <div className="mb-4">
                            <div className="h-2 w-full rounded-full bg-gray-100 overflow-hidden">
                                <div
                                    className="h-full rounded-full bg-emerald-500 transition-all duration-500"
                                    style={{ width: `${(get_completed_count(selected_program) / requirements.length) * 100}%` }}
                                />
                            </div>
                        </div>

                        <ul className="space-y-2">
                            {requirements.map((req, index) => {
                                const is_form_item = !!req.spes_form_key;
                                const is_online_form = !!req.is_online_form;
                                const form_key = req.spes_form_key;

                                const spes_form_complete = form_key ? spes_completion[form_key] : false;
                                const has_data = form_key ? has_spes_form_data(read_spes_draft(), form_key) : false;

                                const program_status = get_requirement_status(selected_program);
                                const submitted_set = new Set(program_status?.submittedTypes ?? []);
                                const doc_uploaded = req.document_type ? submitted_set.has(req.document_type) : false;

                                const app_submitted = is_online_form || is_form_item
                                    ? has_submitted_application(selected_program)
                                    : false;

                                const is_complete = is_online_form
                                    ? app_submitted
                                    : is_form_item
                                        ? (app_submitted || spes_form_complete)
                                        : doc_uploaded;
                                const is_clickable = is_form_item || is_online_form;

                                const handle_click = () => {
                                    if (is_form_item && form_key) navigate_to_spes_form(form_key);
                                    else if (is_online_form) navigate(`/beneficiary/application`);
                                };

                                return (
                                    <li
                                        key={index}
                                        className={`flex items-start gap-3 rounded-xl px-4 py-3 border transition-all ${
                                            is_complete
                                                ? 'bg-emerald-50 border-emerald-200'
                                                : is_clickable
                                                    ? 'bg-white border-gray-200 hover:border-teal-300 hover:shadow-sm cursor-pointer'
                                                    : 'bg-white border-gray-200'
                                        }`}
                                        onClick={is_clickable ? handle_click : undefined}
                                        role={is_clickable ? 'button' : undefined}
                                        tabIndex={is_clickable ? 0 : undefined}
                                        onKeyDown={is_clickable ? (e) => { if (e.key === 'Enter' || e.key === ' ') handle_click(); } : undefined}
                                    >
                                        {/* Status icon */}
                                        <span className={`mt-0.5 flex h-5 w-5 flex-shrink-0 items-center justify-center rounded-full ${
                                            is_complete ? 'bg-emerald-500 text-white' : 'border-2 border-gray-300'
                                        }`}>
                                            {is_complete && <CheckCircle2 size={12} />}
                                        </span>

                                        {/* Content */}
                                        <div className="flex-1 min-w-0">
                                            <div className="flex items-center gap-2 flex-wrap">
                                                <span className={`text-sm font-medium ${
                                                    is_complete ? 'text-emerald-800' : 'text-gray-800'
                                                }`}>{req.label}</span>

                                                {/* Online form badges */}
                                                {is_online_form && is_complete && (
                                                    <span className="inline-flex items-center gap-1 rounded-full bg-emerald-100 px-2 py-0.5 text-xs font-semibold text-emerald-700">
                                                        <CheckCircle2 size={10} /> Submitted
                                                    </span>
                                                )}
                                                {is_online_form && !is_complete && (
                                                    <span className="inline-flex items-center gap-1 rounded-full bg-teal-100 px-2 py-0.5 text-xs font-semibold text-teal-700">
                                                        <ExternalLink size={10} /> Go to Application
                                                    </span>
                                                )}

                                                {/* SPES form badges */}
                                                {is_form_item && is_complete && (
                                                    <span className="inline-flex items-center gap-1 rounded-full bg-emerald-100 px-2 py-0.5 text-xs font-semibold text-emerald-700">
                                                        <CheckCircle2 size={10} /> Complete
                                                    </span>
                                                )}
                                                {is_form_item && !is_complete && has_data && (
                                                    <span className="inline-flex items-center gap-1 rounded-full bg-amber-100 px-2 py-0.5 text-xs font-semibold text-amber-700">
                                                        <Edit3 size={10} /> In Progress
                                                    </span>
                                                )}
                                                {is_form_item && !is_complete && !has_data && (
                                                    <span className="inline-flex items-center gap-1 rounded-full bg-teal-100 px-2 py-0.5 text-xs font-semibold text-teal-700">
                                                        <ExternalLink size={10} /> Fill Out
                                                    </span>
                                                )}

                                                {/* Document upload badges */}
                                                {!is_form_item && !is_online_form && is_complete && (
                                                    <span className="inline-flex items-center gap-1 rounded-full bg-emerald-100 px-2 py-0.5 text-xs font-semibold text-emerald-700">
                                                        <CheckCircle2 size={10} /> Submitted
                                                    </span>
                                                )}
                                                {!is_form_item && !is_online_form && !is_complete && (
                                                    <span className="inline-flex items-center gap-1 rounded-full bg-gray-100 px-2 py-0.5 text-xs font-semibold text-gray-500">
                                                        Not Uploaded
                                                    </span>
                                                )}
                                            </div>
                                            <p className="mt-0.5 text-xs text-gray-500 leading-relaxed">{req.description}</p>
                                        </div>

                                        {is_clickable && (
                                            <span className={`mt-0.5 flex-shrink-0 text-xs font-medium ${
                                                is_complete ? 'text-emerald-600' : 'text-teal-600'
                                            }`}>
                                                {is_complete ? (is_online_form ? 'View' : 'Edit') : 'Open'} →
                                            </span>
                                        )}
                                    </li>
                                );
                            })}
                        </ul>
                    </div>
                )}
            </div>

            {/* ── Document Upload Section ── */}
            <div className="rounded-2xl border border-gray-200 bg-white shadow-sm overflow-hidden">
                <div className="px-5 py-4 sm:px-6 border-b border-gray-100">
                    <div className="flex items-center gap-3">
                        <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-teal-100 text-teal-600">
                            <Upload size={18} />
                        </div>
                        <div>
                            <h3 className="text-base font-bold text-gray-900">
                                Upload Documents — {selected_program_definition.short_label}
                            </h3>
                            <p className="text-sm text-gray-500">{selected_program_definition.description}</p>
                        </div>
                    </div>
                </div>
                <div className="p-5 sm:p-6">
                    {selected_program === 'SPES' ? (
                        <SPESDocumentsModule />
                    ) : upload_reqs ? (
                        <DocumentUploadModule
                            programType={api_key}
                            requirements={upload_reqs}
                        />
                    ) : (
                        <div className="rounded-xl border border-dashed border-gray-300 bg-gray-50 px-6 py-10 text-center">
                            <p className="text-sm font-medium text-gray-500">
                                Document uploader for {selected_program_definition.short_label} is not available yet.
                            </p>
                        </div>
                    )}
                </div>
            </div>
        </section>
    );
}

export default BeneficiaryRequirements;
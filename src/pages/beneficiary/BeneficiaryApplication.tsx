import { useEffect, useMemo, useState } from "react";
import { useNavigate, useLocation } from "react-router-dom";
import axios from "axios";
import { LayoutGrid, Clock, AlertCircle, CheckCircle2, Clock3 } from "lucide-react";
import { API_BASE_URL } from '../../api/config';

import TupadForm from "./forms/TUPADform";
import SpesForm from "./forms/SpesOfficialForms";
import DilpForm from "./forms/DILPform";
import GIPform from "./forms/GIPform";
import JobSeekerForm from "./forms/JobseekersForm";
import SPESDocumentsModule from "../../components/SPESDocumentsModule";
import DocumentUploadModule, { type RequirementDef } from "../../components/DocumentUploadModule";
import ApplicationStatusPanel from "../../components/ApplicationStatusPanel";
import RequirementStatusBanner from "../../components/RequirementStatusBanner";
import applicationStatusAPI, { type ApplicationSubmission } from "../../api/applicationStatus.api";
import { useRequirementStatus } from "../../hooks/useRequirementStatus";
import {
    BENEFICIARY_PROGRAMS,
    BENEFICIARY_SELECTED_PROGRAM_KEY,
    type ProgramKey,
} from '../../constants/beneficiaryPrograms';

type MainTab = 'apply' | 'status';
type SubTab = 'form' | 'requirements';

// ─── Upload requirement defs for non-SPES programs ───────────────────────────

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

const PROGRAM_API_KEY: Record<ProgramKey, string> = {
    TUPAD: 'tupad', SPES: 'spes', DILP: 'dilp', GIP: 'gip', JOBSEEKERS: 'job_seekers',
};

function BeneficiaryApplication() {
    const navigate = useNavigate();
    const location = useLocation();
    const [user, setUser] = useState<any>(null);
    const [error, setError] = useState<string | null>(null);
    const [loading, setLoading] = useState(true);

    const [mainTab, setMainTab] = useState<MainTab>('apply');
    const [activeProgram, setActiveProgram] = useState<ProgramKey>(() => {
        const stateProgram = (location.state as { program?: ProgramKey } | null)?.program;
        if (stateProgram && BENEFICIARY_PROGRAMS.some((p) => p.value === stateProgram)) {
            return stateProgram;
        }
        return 'TUPAD';
    });
    const [subTab, setSubTab] = useState<SubTab>('form');
    const [submissions, setSubmissions] = useState<ApplicationSubmission[]>([]);

    const { getStatus, isComplete, loading: reqLoading, error: reqError } = useRequirementStatus();
    const allDocsSubmitted = isComplete(activeProgram);

    // ── Check if user already submitted an application for the active program ──
    const existingApplication = useMemo(() => {
        // Map frontend ProgramKey to backend program_type stored in DB
        const PROGRAM_TYPE_MAP: Record<ProgramKey, string> = {
            TUPAD: 'tupad',
            SPES: 'spes',
            DILP: 'dilp',
            GIP: 'gip',
            JOBSEEKERS: 'job_seekers',
        };
        const dbProgramType = PROGRAM_TYPE_MAP[activeProgram];
        // Find the latest submission for this program that is Pending or Approved
        return submissions.find(
            (s) => s.program_type === dbProgramType && (s.status === 'Pending' || s.status === 'Approved')
        ) ?? null;
    }, [submissions, activeProgram]);

    useEffect(() => {
        localStorage.setItem(BENEFICIARY_SELECTED_PROGRAM_KEY, activeProgram);
    }, [activeProgram]);

    useEffect(() => {
        const fetchData = async () => {
            const token = localStorage.getItem('token');
            const user_name = localStorage.getItem('user_name');
            const role = localStorage.getItem('role');
            const userId = localStorage.getItem('user_id');

            if (!token || role !== 'beneficiary') {
                navigate('/login');
                return;
            }

            try {
                const [profileRes, statusRes] = await Promise.allSettled([
                    axios.get(
                        `${API_BASE_URL}/api/auth/getProfile`,
                        { headers: { Authorization: `Bearer ${token}` } }
                    ),
                    applicationStatusAPI.getStatus(userId || '', token),
                ]);

                if (profileRes.status === 'fulfilled') {
                    setUser(profileRes.value.data);
                } else {
                    const status = profileRes.reason?.response?.status;
                    if (status === 401 || status === 403) {
                        localStorage.removeItem('token');
                        navigate('/login');
                        return;
                    }
                    setError('Failed to load profile data.');
                }

                if (statusRes.status === 'fulfilled') {
                    setSubmissions(statusRes.value.submissions || []);
                }
            } catch {
                setError('An unexpected error occurred.');
            } finally {
                setLoading(false);
            }
        };

        fetchData();
    }, [navigate]);

    if (loading) {
        return (
            <div className="flex items-center justify-center py-24">
                <div className="flex flex-col items-center gap-3">
                    <div className="h-10 w-10 animate-spin rounded-full border-4 border-teal-600 border-t-transparent" />
                    <span className="text-sm text-gray-500 font-medium">Loading…</span>
                </div>
            </div>
        );
    }

    return (
        <section className="w-full max-w-5xl mx-auto space-y-5">
            {/* ── Page header ── */}
            <div className="rounded-2xl border border-gray-200 bg-white px-5 py-4 sm:px-6 shadow-sm flex flex-col sm:flex-row sm:items-center sm:justify-between gap-2">
                <div>
                    <h1 className="text-xl sm:text-2xl font-bold text-gray-900">Application Portal</h1>
                    <p className="text-sm text-gray-500 mt-0.5">Apply for a PESO program or check your submission status.</p>
                </div>
                {user && (
                    <span className="inline-flex items-center gap-1.5 rounded-full bg-teal-50 px-3 py-1 text-xs font-semibold text-teal-700 ring-1 ring-inset ring-teal-200 self-start sm:self-center">
                        <svg className="h-3.5 w-3.5" viewBox="0 0 20 20" fill="currentColor">
                            <path d="M10 9a3 3 0 100-6 3 3 0 000 6zm-7 9a7 7 0 1114 0H3z" />
                        </svg>
                        {user.first_name || user.user_name}
                    </span>
                )}
                {error && <p className="text-sm text-red-500">{error}</p>}
            </div>

            {/* ── Main tabs ── */}
            <div className="rounded-2xl border border-gray-200 bg-white shadow-sm overflow-hidden">
                {/* Tab bar */}
                <div className="flex border-b border-gray-200">
                    <button
                        type="button"
                        onClick={() => setMainTab('apply')}
                        className={`relative flex items-center gap-2 flex-1 justify-center py-3.5 text-sm font-semibold transition-colors focus:outline-none ${
                            mainTab === 'apply' ? 'text-teal-700 bg-teal-50' : 'text-gray-500 hover:text-gray-800 hover:bg-gray-50'
                        }`}
                    >
                        <LayoutGrid size={15} />
                        New Application
                        {mainTab === 'apply' && <span className="absolute bottom-0 left-0 right-0 h-0.5 bg-teal-600" />}
                    </button>
                    <button
                        type="button"
                        onClick={() => setMainTab('status')}
                        className={`relative flex items-center gap-2 flex-1 justify-center py-3.5 text-sm font-semibold transition-colors focus:outline-none ${
                            mainTab === 'status' ? 'text-teal-700 bg-teal-50' : 'text-gray-500 hover:text-gray-800 hover:bg-gray-50'
                        }`}
                    >
                        <Clock size={15} />
                        My Submissions
                        {submissions.length > 0 && (
                            <span className="inline-flex h-5 min-w-5 items-center justify-center rounded-full bg-teal-600 px-1.5 text-[10px] font-bold text-white">
                                {submissions.length}
                            </span>
                        )}
                        {mainTab === 'status' && <span className="absolute bottom-0 left-0 right-0 h-0.5 bg-teal-600" />}
                    </button>
                </div>

                {/* ── Apply panel ── */}
                {mainTab === 'apply' && (
                    <div className="p-4 sm:p-6">
                        {/* Program selector */}
                        <div className="mb-6">
                            <label className="block text-xs font-semibold text-gray-500 uppercase tracking-wider mb-2">
                                Select Program
                            </label>
                            <div className="relative w-full sm:max-w-sm">
                                <select
                                    value={activeProgram}
                                    onChange={(e) => { setActiveProgram(e.target.value as ProgramKey); setSubTab('form'); }}
                                    className="w-full appearance-none rounded-xl border border-gray-200 bg-gray-50 px-4 py-3 pr-10 text-sm font-semibold text-gray-700 focus:border-teal-500 focus:ring-2 focus:ring-teal-500/10 outline-none transition-all"
                                >
                                    {BENEFICIARY_PROGRAMS.map((p) => (
                                        <option key={p.value} value={p.value}>{p.label}</option>
                                    ))}
                                </select>
                                <div className="pointer-events-none absolute right-3 top-1/2 -translate-y-1/2 text-gray-400">
                                    <svg className="h-5 w-5" viewBox="0 0 20 20" fill="currentColor">
                                        <path d="M5.293 7.293a1 1 0 011.414 0L10 10.586l3.293-3.293a1 1 0 111.414 1.414l-4 4a1 1 0 01-1.414 0l-4-4a1 1 0 010-1.414z" />
                                    </svg>
                                </div>
                            </div>
                        </div>

                        {/* Sub-tabs: Form / Requirements */}
                        <div className="animate-in fade-in slide-in-from-bottom-2 duration-300">
                            <div className="flex gap-1 rounded-xl bg-gray-100 p-1 mb-6 w-full sm:w-auto sm:inline-flex">
                                <button
                                    type="button"
                                    onClick={() => setSubTab('form')}
                                    className={`flex-1 sm:flex-none rounded-lg px-4 py-2 text-xs font-semibold transition-all ${
                                        subTab === 'form'
                                            ? 'bg-white text-gray-900 shadow-sm'
                                            : 'text-gray-500 hover:text-gray-700'
                                    }`}
                                >
                                    Application Form
                                </button>
                                <button
                                    type="button"
                                    onClick={() => navigate(`/beneficiary/requirements?program=${activeProgram}`)}
                                    className={`flex-1 sm:flex-none rounded-lg px-4 py-2 text-xs font-semibold transition-all ${
                                        subTab === 'requirements'
                                            ? 'bg-white text-gray-900 shadow-sm'
                                            : 'text-gray-500 hover:text-gray-700'
                                    }`}
                                >
                                    Requirements
                                    {allDocsSubmitted && (
                                        <span className="ml-1.5 inline-flex h-2 w-2 rounded-full bg-emerald-500 align-middle" />
                                    )}
                                </button>
                            </div>

                            {subTab === 'form' && (
                                <div>
                                    {/* ── Already-submitted application banner ── */}
                                    {existingApplication && (
                                        <div className={`mb-5 rounded-xl border px-4 py-4 flex items-start gap-3 ${
                                            existingApplication.status === 'Approved'
                                                ? 'border-emerald-200 bg-emerald-50'
                                                : 'border-teal-200 bg-teal-50'
                                        }`}>
                                            {existingApplication.status === 'Approved' ? (
                                                <CheckCircle2 className="h-5 w-5 flex-shrink-0 text-emerald-500 mt-0.5" />
                                            ) : (
                                                <Clock3 className="h-5 w-5 flex-shrink-0 text-teal-500 mt-0.5" />
                                            )}
                                            <div>
                                                <p className={`text-sm font-semibold ${
                                                    existingApplication.status === 'Approved' ? 'text-emerald-800' : 'text-teal-800'
                                                }`}>
                                                    {existingApplication.status === 'Approved'
                                                        ? 'Your application has been approved'
                                                        : 'You already have a pending application'}
                                                </p>
                                                <p className={`text-xs mt-0.5 ${
                                                    existingApplication.status === 'Approved' ? 'text-emerald-600' : 'text-teal-600'
                                                }`}>
                                                    {existingApplication.status === 'Approved'
                                                        ? `Your ${activeProgram} application was approved. You cannot submit another application for this program.`
                                                        : `Your ${activeProgram} application (submitted ${new Date(existingApplication.applied_at).toLocaleDateString()}) is still being reviewed. Please wait for a decision before submitting again.`}
                                                </p>
                                                <button
                                                    type="button"
                                                    onClick={() => setMainTab('status')}
                                                    className={`mt-2 inline-flex items-center gap-1 text-xs font-semibold underline ${
                                                        existingApplication.status === 'Approved' ? 'text-emerald-700 hover:text-emerald-900' : 'text-teal-700 hover:text-teal-900'
                                                    }`}
                                                >
                                                    View My Submissions →
                                                </button>
                                            </div>
                                        </div>
                                    )}

                                    {/* ── Requirement status banner (only when no blocking application) ── */}
                                    {!existingApplication && (
                                        <RequirementStatusBanner
                                            programKey={activeProgram}
                                            status={getStatus(activeProgram)}
                                            loading={reqLoading}
                                            error={reqError}
                                        />
                                    )}

                                    {/* ── Application form (hidden when already applied) ── */}
                                    {existingApplication ? (
                                        <div className="rounded-xl border border-dashed border-gray-300 bg-gray-50 px-6 py-12 text-center">
                                            <AlertCircle className="mx-auto h-10 w-10 text-gray-300" />
                                            <p className="mt-3 text-sm font-semibold text-gray-500">
                                                Application form is disabled
                                            </p>
                                            <p className="mt-1 text-xs text-gray-400">
                                                You already have a {existingApplication.status.toLowerCase()} application for this program.
                                            </p>
                                        </div>
                                    ) : (
                                        <>
                                            {activeProgram === 'TUPAD'      && <TupadForm />}
                                            {activeProgram === 'SPES'       && <SpesForm />}
                                            {activeProgram === 'DILP'       && <DilpForm />}
                                            {activeProgram === 'GIP'        && <GIPform />}
                                            {activeProgram === 'JOBSEEKERS' && <JobSeekerForm />}
                                        </>
                                    )}
                                </div>
                            )}

                            {subTab === 'requirements' && activeProgram === 'SPES' && (
                                <SPESDocumentsModule />
                            )}

                            {subTab === 'requirements' && activeProgram !== 'SPES' && UPLOAD_REQUIREMENTS[PROGRAM_API_KEY[activeProgram]] && (
                                <DocumentUploadModule
                                    programType={PROGRAM_API_KEY[activeProgram]}
                                    requirements={UPLOAD_REQUIREMENTS[PROGRAM_API_KEY[activeProgram]]}
                                />
                            )}
                        </div>
                    </div>
                )}

                {/* ── Status panel ── */}
                {mainTab === 'status' && (
                    <div className="p-4 sm:p-6">
                        <ApplicationStatusPanel submissions={submissions} />
                    </div>
                )}
            </div>
        </section>
    );
}

export default BeneficiaryApplication;
import { useEffect, useMemo, useState } from "react";
import { useNavigate, useLocation } from "react-router-dom";
import axios from "axios";
import { LayoutGrid, Clock, AlertCircle, CheckCircle2, Clock3, User } from "lucide-react";
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
import { programsAPI, type ActiveProgram } from "../../api/programs.api";
import { useRequirementStatus } from "../../hooks/useRequirementStatus";
import {
    BENEFICIARY_PROGRAMS,
    BENEFICIARY_SELECTED_PROGRAM_KEY,
    type ProgramKey,
} from '../../constants/beneficiaryPrograms';

type MainTab = 'apply' | 'status';
type SubTab = 'form' | 'requirements';

// Defined outside to prevent re-creation on every render
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
    
    // Auth & Profile State
    const [user, setUser] = useState<any>(null);
    const [, setError] = useState<string | null>(null);
    const [loading, setLoading] = useState(true);

    // Tab & Navigation State
    const [mainTab, setMainTab] = useState<MainTab>('apply');
    const [subTab, setSubTab] = useState<SubTab>('form');
    const [activeProgram, setActiveProgram] = useState<ProgramKey>(() => {
        const stateProgram = (location.state as { program?: ProgramKey } | null)?.program;
        return (stateProgram && BENEFICIARY_PROGRAMS.some(p => p.value === stateProgram)) 
            ? stateProgram : 'TUPAD';
    });

    // Submissions & Batch Selection
    const [submissions, setSubmissions] = useState<ApplicationSubmission[]>([]);
    const [activePrograms, setActivePrograms] = useState<ActiveProgram[]>([]);
    const [selectedProgramId, setSelectedProgramId] = useState<number | null>(null);
    const [programsLoading, setProgramsLoading] = useState(false);

    const { getStatus, isComplete, loading: reqLoading, error: reqError } = useRequirementStatus();
    const allDocsSubmitted = isComplete(activeProgram);

    // Filter logic memoized for performance
    const existingApplication = useMemo(() => {
        const dbProgramType = PROGRAM_API_KEY[activeProgram];
        return submissions.find(s => 
            s.program_type === dbProgramType && 
            (selectedProgramId ? s.program_id === selectedProgramId : true) &&
            (s.status === 'Pending' || s.status === 'Approved')
        ) ?? null;
    }, [submissions, activeProgram, selectedProgramId]);

    // Side Effects
    useEffect(() => {
        localStorage.setItem(BENEFICIARY_SELECTED_PROGRAM_KEY, activeProgram);
    }, [activeProgram]);

    useEffect(() => {
        const apiKey = PROGRAM_API_KEY[activeProgram];
        const navProgramId = (location.state as { programId?: number } | null)?.programId;
        
        setProgramsLoading(true);
        programsAPI.getActiveByType(apiKey)
            .then((programs) => {
                setActivePrograms(programs);
                if (navProgramId && programs.some(p => p.program_id === navProgramId)) {
                    setSelectedProgramId(navProgramId);
                } else if (programs.length === 1) {
                    setSelectedProgramId(programs[0].program_id);
                } else {
                    setSelectedProgramId(null);
                }
            })
            .catch(() => setActivePrograms([]))
            .finally(() => setProgramsLoading(false));
    }, [activeProgram, location.state]);

    useEffect(() => {
        const fetchData = async () => {
            const token = localStorage.getItem('token');
            const role = localStorage.getItem('role');
            const userId = localStorage.getItem('user_id');

            if (!token || role !== 'beneficiary') {
                navigate('/login');
                return;
            }

            try {
                const [profileRes, statusRes] = await Promise.allSettled([
                    axios.get(`${API_BASE_URL}/api/auth/getProfile`, {
                        headers: { Authorization: `Bearer ${token}` }
                    }),
                    applicationStatusAPI.getStatus(userId || '', token),
                ]);

                if (profileRes.status === 'fulfilled') {
                    setUser(profileRes.value.data);
                } else if (profileRes.reason?.response?.status === 401) {
                    localStorage.clear();
                    navigate('/login');
                    return;
                }

                if (statusRes.status === 'fulfilled') {
                    setSubmissions(statusRes.value.submissions || []);
                }
            } catch (err) {
                setError('Failed to sync portal data.');
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
                    <span className="text-sm text-gray-400 font-medium">Initializing Portal...</span>
                </div>
            </div>
        );
    }

    return (
        <section className="w-full max-w-5xl mx-auto space-y-6 p-4">
            {/* Header */}
            <header className="rounded-2xl border border-gray-100 bg-white px-6 py-5 shadow-sm flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
                <div>
                    <h1 className="text-2xl font-bold text-gray-900 tracking-tight">Application Portal</h1>
                    <p className="text-sm text-gray-500">Manage your program applications and document status.</p>
                </div>
                {user && (
                    <div className="flex items-center gap-2 rounded-xl bg-teal-50 px-4 py-2 ring-1 ring-inset ring-teal-200">
                        <User className="h-4 w-4 text-teal-600" />
                        <span className="text-sm font-bold text-teal-800">
                            {user.first_name || user.user_name}
                        </span>
                    </div>
                )}
            </header>

            <main className="rounded-2xl border border-gray-100 bg-white shadow-md overflow-hidden">
                {/* Navigation */}
                <nav className="flex bg-gray-50/50 border-b border-gray-100">
                    {[
                        { id: 'apply', label: 'New Application', icon: LayoutGrid },
                        { id: 'status', label: 'My Submissions', icon: Clock, count: submissions.length }
                    ].map((tab) => (
                        <button
                            key={tab.id}
                            onClick={() => setMainTab(tab.id as MainTab)}
                            className={`relative flex items-center gap-3 flex-1 justify-center py-5 text-sm font-bold transition-all ${
                                mainTab === tab.id ? 'text-teal-700 bg-white' : 'text-gray-400 hover:text-gray-600 hover:bg-gray-50'
                            }`}
                        >
                            <tab.icon size={18} strokeWidth={2.5} />
                            {tab.label}
                            {tab.count ? (
                                <span className="absolute top-4 right-1/4 rounded-full bg-teal-600 px-1.5 py-0.5 text-[10px] text-white">
                                    {tab.count}
                                </span>
                            ) : null}
                            {mainTab === tab.id && <div className="absolute bottom-0 inset-x-0 h-1 bg-teal-600" />}
                        </button>
                    ))}
                </nav>

                {/* Body */}
                <div className="p-6 sm:p-10">
                    {mainTab === 'apply' && (
                        <div className="animate-in fade-in slide-in-from-bottom-2 duration-500">
                            <div className="grid grid-cols-1 md:grid-cols-2 gap-8 mb-10">
                                {/* Selectors */}
                                <div className="space-y-2">
                                    <label className="text-[11px] font-black text-gray-400 uppercase tracking-widest">Target Program</label>
                                    <select
                                        value={activeProgram}
                                        onChange={(e) => { setActiveProgram(e.target.value as ProgramKey); setSubTab('form'); }}
                                        className="w-full rounded-xl border-gray-200 bg-gray-50 p-3.5 text-sm font-bold focus:ring-4 focus:ring-teal-500/10 outline-none transition-all cursor-pointer"
                                    >
                                        {BENEFICIARY_PROGRAMS.map((p) => (
                                            <option key={p.value} value={p.value}>{p.label}</option>
                                        ))}
                                    </select>
                                </div>

                                {!programsLoading && activePrograms.length > 0 && (
                                    <div className="space-y-2">
                                        <label className="text-[11px] font-black text-gray-400 uppercase tracking-widest">Available Batch</label>
                                        <select
                                            value={selectedProgramId ?? ''}
                                            onChange={(e) => setSelectedProgramId(e.target.value ? Number(e.target.value) : null)}
                                            className="w-full rounded-xl border-gray-200 bg-gray-50 p-3.5 text-sm font-bold focus:ring-4 focus:ring-teal-500/10 outline-none transition-all cursor-pointer"
                                        >
                                            <option value="">— Select a Specific Batch —</option>
                                            {activePrograms.map((p) => (
                                                <option key={p.program_id} value={p.program_id}>
                                                    {p.program_name} ({p.filled}/{p.slots} slots)
                                                </option>
                                            ))}
                                        </select>
                                    </div>
                                )}
                            </div>

                            {/* Warnings */}
                            {!programsLoading && activePrograms.length === 0 && (
                                <div className="mb-8 rounded-2xl border border-amber-200 bg-amber-50/50 p-5 flex gap-4 items-start">
                                    <AlertCircle className="text-amber-500 flex-shrink-0" size={20} />
                                    <div>
                                        <h4 className="text-sm font-bold text-amber-900">Program Currently Unavailable</h4>
                                        <p className="text-xs text-amber-700 mt-1">We aren't accepting applications for {activeProgram} at this time. Please check back later.</p>
                                    </div>
                                </div>
                            )}

                            {/* Sub-Tabs */}
                            <div className="flex gap-2 mb-10 bg-gray-100/80 p-1.5 rounded-2xl w-fit">
                                <button
                                    onClick={() => setSubTab('form')}
                                    className={`px-8 py-2.5 rounded-xl text-xs font-black uppercase tracking-tight transition-all ${subTab === 'form' ? 'bg-white shadow-md text-gray-900' : 'text-gray-500 hover:text-gray-700'}`}
                                >
                                    Form
                                </button>
                                <button
                                    onClick={() => navigate(`/beneficiary/requirements?program=${activeProgram}`)}
                                    className="px-8 py-2.5 rounded-xl text-xs font-black uppercase tracking-tight text-gray-500 hover:text-gray-700 flex items-center gap-2"
                                >
                                    Requirements
                                    {allDocsSubmitted && <div className="h-2 w-2 rounded-full bg-emerald-500 shadow-sm" />}
                                </button>
                            </div>

                            {/* Dynamic Content */}
                            {subTab === 'form' && (
                                <section>
                                    {existingApplication ? (
                                        <div className={`p-10 rounded-3xl border-2 border-dashed flex flex-col items-center text-center ${
                                            existingApplication.status === 'Approved' ? 'bg-emerald-50 border-emerald-100' : 'bg-teal-50/50 border-teal-100'
                                        }`}>
                                            {existingApplication.status === 'Approved' ? <CheckCircle2 className="text-emerald-500 mb-4" size={40} /> : <Clock3 className="text-teal-500 mb-4" size={40} />}
                                            <h3 className="text-lg font-black text-gray-900">Application Under Review</h3>
                                            <p className="text-sm text-gray-500 max-w-sm mt-2">
                                                A submission for <strong>{activeProgram}</strong> is already being processed. Double applications for the same batch are restricted.
                                            </p>
                                            <button onClick={() => setMainTab('status')} className="mt-6 px-6 py-2 bg-white rounded-xl shadow-sm border border-gray-200 text-xs font-bold text-teal-700 hover:bg-gray-50 transition-colors">
                                                Check Progress
                                            </button>
                                        </div>
                                    ) : (
                                        <div className="space-y-8">
                                            <RequirementStatusBanner programKey={activeProgram} status={getStatus(activeProgram)} loading={reqLoading} error={reqError} />
                                            <div className="bg-white rounded-2xl">
                                                {activeProgram === 'TUPAD'      && <TupadForm programId={selectedProgramId} />}
                                                {activeProgram === 'SPES'       && <SpesForm programId={selectedProgramId} />}
                                                {activeProgram === 'DILP'       && <DilpForm programId={selectedProgramId} />}
                                                {activeProgram === 'GIP'        && <GIPform programId={selectedProgramId} />}
                                                {activeProgram === 'JOBSEEKERS' && <JobSeekerForm programId={selectedProgramId} />}
                                            </div>
                                        </div>
                                    )}
                                </section>
                            )}

                            {subTab === 'requirements' && (
                                <section className="animate-in slide-in-from-right-4 duration-300">
                                    {activeProgram === 'SPES' ? (
                                        <SPESDocumentsModule />
                                    ) : (
                                        <DocumentUploadModule
                                            programType={PROGRAM_API_KEY[activeProgram]}
                                            requirements={UPLOAD_REQUIREMENTS[PROGRAM_API_KEY[activeProgram]] || []}
                                        />
                                    )}
                                </section>
                            )}
                        </div>
                    )}

                    {mainTab === 'status' && (
                        <div className="animate-in fade-in duration-500">
                            <ApplicationStatusPanel submissions={submissions} />
                        </div>
                    )}
                </div>
            </main>
        </section>
    );
}

export default BeneficiaryApplication;
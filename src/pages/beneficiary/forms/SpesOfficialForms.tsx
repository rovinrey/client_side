import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { useSearchParams, useNavigate } from 'react-router-dom';
import { ArrowLeft, CheckCircle2, Plus, Trash2 } from 'lucide-react';
import { API_BASE_URL } from '../../../api/config';

export type SpesOfficialFormKey = 'form2' | 'form2a' | 'form4';

interface EducationRow {
    school_name: string;
    degree_or_course: string;
    year_level: string;
    school_year: string;
}

interface SpesAvailmentRow {
    year: string;
    spes_id: string;
}

// spes form 2 - personal info, family background, educational background
interface Form2Data {
    // personal info
    // passport size picture is required
    first_name: string;
    middle_name: string;
    last_name: string;
    birth_date: string;
    place_of_birth: string;
    citizenship: string;
    sex: string;
    civil_status: string;
    contact_number: string;
    email_address: string;
    present_address: string;
    permanent_address: string;
    gsis_beneficiary: string;
    social_media: string;
    type_of_student: string;
    parent_status: string;
    education_elementary: EducationRow;
    education_secondary: EducationRow;
    education_tertiary: EducationRow;
    education_tech_voc: EducationRow;
    spes_availment_history: SpesAvailmentRow[];
    signature: string;
}

interface Form2AData {
    applicant_full_name: string;
    parent_guardian_name: string;
    relationship: string;
    oath_agreed: boolean;
    oath_date: string;
}

interface Form4Data {
    applicant_name: string;
    assigned_office: string;
    work_assignment: string;
    supervisor_name: string;
    supervisor_contact: string;
    start_date: string;
    end_date: string;
    daily_schedule: string;
}

type SubmitState = 'idle' | 'submitting' | 'success' | 'error';

export const DRAFT_STORAGE_KEY = 'spes_official_forms_draft_v1';

const tab_styles = {
    active: 'bg-white text-slate-900 shadow-sm',
    idle: 'text-slate-500 hover:text-slate-700',
};

const input_style =
    'w-full px-4 py-2.5 bg-white border border-slate-300 rounded-xl focus:ring-2 focus:ring-teal-500 focus:border-teal-500 outline-none transition-all text-sm';
const label_style = 'block text-xs font-semibold text-slate-500 mb-1 uppercase tracking-wider';

function SpesOfficialForms() {
    const [search_params] = useSearchParams();
    const navigate = useNavigate();
    const from_requirements = search_params.get('from') === 'requirements';
    const initial_tab = (search_params.get('form') as SpesOfficialFormKey) || 'form2';

    const [active_form, set_active_form] = useState<SpesOfficialFormKey>(initial_tab);
    const [submit_state, set_submit_state] = useState<SubmitState>('idle');
    const [submit_message, set_submit_message] = useState('');

    const empty_edu_row: EducationRow = { school_name: '', degree_or_course: '', year_level: '', school_year: '' };

    const [form_2, set_form_2] = useState<Form2Data>({
        first_name: '',
        middle_name: '',
        last_name: '',
        birth_date: '',
        gsis_beneficiary: '',
        place_of_birth: '',
        sex: '',
        civil_status: '',
        contact_number: '',
        email_address: '',
        present_address: '',
        permanent_address: '',
        citizenship: 'Filipino',
        social_media: '',
        type_of_student: 'Student',
        parent_status: 'Living together',
        education_elementary: { ...empty_edu_row },
        education_secondary: { ...empty_edu_row },
        education_tertiary: { ...empty_edu_row },
        education_tech_voc: { ...empty_edu_row },
        spes_availment_history: [],
        signature: '',
    });

    const [form_2a, set_form_2a] = useState<Form2AData>({
        applicant_full_name: '',
        parent_guardian_name: '',
        relationship: '',
        oath_agreed: false,
        oath_date: new Date().toISOString().slice(0, 10),
    });

    const [form_4, set_form_4] = useState<Form4Data>({
        applicant_name: '',
        assigned_office: '',
        work_assignment: '',
        supervisor_name: '',
        supervisor_contact: '',
        start_date: '',
        end_date: '',
        daily_schedule: '',
    });

    const tabs = useMemo(
        () => [
            { key: 'form2' as SpesOfficialFormKey, label: 'SPES Form 2' },
            { key: 'form2a' as SpesOfficialFormKey, label: 'SPES Form 2-A' },
            { key: 'form4' as SpesOfficialFormKey, label: 'SPES Form 4' },
        ],
        []
    );

    useEffect(() => {
        const stored_draft = localStorage.getItem(DRAFT_STORAGE_KEY);
        if (!stored_draft) return;

        try {
            const parsed_draft = JSON.parse(stored_draft);
            if (parsed_draft.form_2) set_form_2((prev) => ({ ...prev, ...parsed_draft.form_2 }));
            if (parsed_draft.form_2a) set_form_2a((prev) => ({ ...prev, ...parsed_draft.form_2a }));
            if (parsed_draft.form_4) set_form_4((prev) => ({ ...prev, ...parsed_draft.form_4 }));
        } catch {
            localStorage.removeItem(DRAFT_STORAGE_KEY);
        }
    }, []);

    useEffect(() => {
        const draft = { form_2, form_2a, form_4 };
        localStorage.setItem(DRAFT_STORAGE_KEY, JSON.stringify(draft));
    }, [form_2, form_2a, form_4]);

    const is_edu_row_filled = (row: EducationRow) => Boolean(row.school_name.trim() && row.degree_or_course.trim());
    const has_any_education = is_edu_row_filled(form_2.education_elementary) || is_edu_row_filled(form_2.education_secondary) || is_edu_row_filled(form_2.education_tertiary) || is_edu_row_filled(form_2.education_tech_voc);

    const is_form_2_complete = Boolean(
        form_2.first_name.trim() &&
            form_2.last_name.trim() &&
            form_2.birth_date &&
            form_2.place_of_birth.trim() &&
            form_2.sex &&
            form_2.civil_status &&
            form_2.contact_number.trim() &&
            form_2.present_address.trim() &&
            form_2.permanent_address.trim() &&
            has_any_education &&
            form_2.signature
    );

    const is_form_2a_complete = Boolean(
        form_2a.applicant_full_name.trim() &&
            form_2a.parent_guardian_name.trim() &&
            form_2a.relationship.trim() &&
            form_2a.oath_agreed &&
            form_2a.oath_date
    );

    const is_form_4_complete = Boolean(
        form_4.applicant_name.trim() &&
            form_4.assigned_office.trim() &&
            form_4.work_assignment.trim() &&
            form_4.supervisor_name.trim() &&
            form_4.supervisor_contact.trim() &&
            form_4.start_date &&
            form_4.end_date &&
            form_4.daily_schedule.trim()
    );

    const completion_count = [is_form_2_complete, is_form_2a_complete, is_form_4_complete].filter(Boolean).length;
    const completion_pct = Math.round((completion_count / 3) * 100);

    // Shared helper – builds the full payload from current state and POSTs to backend.
    const submit_to_backend = async (success_msg: string) => {
        const token = localStorage.getItem('token');
        const user_id = localStorage.getItem('user_id');

        if (!token) {
            set_submit_state('error');
            set_submit_message('You are not logged in. Please log in again.');
            return false;
        }

        set_submit_state('submitting');
        set_submit_message('Submitting...');

        // Find the highest education level filled to send as primary
        const primary_edu = is_edu_row_filled(form_2.education_tech_voc) ? form_2.education_tech_voc
            : is_edu_row_filled(form_2.education_tertiary) ? form_2.education_tertiary
            : is_edu_row_filled(form_2.education_secondary) ? form_2.education_secondary
            : form_2.education_elementary;
        const primary_level = is_edu_row_filled(form_2.education_tech_voc) ? 'Tech-Voc'
            : is_edu_row_filled(form_2.education_tertiary) ? 'Tertiary'
            : is_edu_row_filled(form_2.education_secondary) ? 'Secondary'
            : 'Elementary';

        try {
            const submission_payload = {
                user_id: user_id ? Number(user_id) : undefined,
                // top-level beneficiary fields (from Form 2)
                first_name: form_2.first_name,
                middle_name: form_2.middle_name,
                last_name: form_2.last_name,
                birth_date: form_2.birth_date,
                contact_number: form_2.contact_number,
                // spes_details fields
                place_of_birth: form_2.place_of_birth,
                citizenship: form_2.citizenship,
                social_media_account: form_2.social_media,
                civil_status: form_2.civil_status,
                sex: form_2.sex,
                type_of_student: form_2.type_of_student,
                parent_status: form_2.parent_status,
                father_name: form_2a.parent_guardian_name,
                father_occupation: '',
                father_contact: '',
                mother_maiden_name: '',
                mother_occupation: '',
                mother_contact: '',
                education_level: primary_level,
                name_of_school: primary_edu.school_name,
                degree_earned_course: primary_edu.degree_or_course,
                year_level: primary_edu.year_level,
                present_address: form_2.present_address,
                permanent_address: form_2.permanent_address,
                form2_meta: {
                    first_name: form_2.first_name,
                    middle_name: form_2.middle_name,
                    last_name: form_2.last_name,
                    birth_date: form_2.birth_date,
                    contact_number: form_2.contact_number,
                    email_address: form_2.email_address,
                    education_elementary: form_2.education_elementary,
                    education_secondary: form_2.education_secondary,
                    education_tertiary: form_2.education_tertiary,
                    education_tech_voc: form_2.education_tech_voc,
                    spes_availment_history: form_2.spes_availment_history,
                    signature: form_2.signature,
                },
                form2a_meta: {
                    applicant_full_name: form_2a.applicant_full_name,
                    parent_guardian_name: form_2a.parent_guardian_name,
                    relationship: form_2a.relationship,
                    oath_agreed: form_2a.oath_agreed,
                    oath_date: form_2a.oath_date,
                },
                form4_meta: {
                    applicant_name: form_4.applicant_name,
                    assigned_office: form_4.assigned_office,
                    work_assignment: form_4.work_assignment,
                    supervisor_name: form_4.supervisor_name,
                    supervisor_contact: form_4.supervisor_contact,
                    start_date: form_4.start_date,
                    end_date: form_4.end_date,
                    daily_schedule: form_4.daily_schedule,
                },
            };

            const response = await fetch(`${API_BASE_URL}/api/forms/apply/spes`, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    Authorization: `Bearer ${token}`,
                },
                body: JSON.stringify(submission_payload),
            });

            if (!response.ok) throw new Error('Submission failed');

            set_submit_state('success');
            set_submit_message(success_msg);
            return true;
        } catch {
            set_submit_state('error');
            set_submit_message('Unable to submit right now. Please review your details and try again.');
            return false;
        }
    };

    const submit_form_2 = async (event: React.FormEvent) => {
        event.preventDefault();
        const ok = await submit_to_backend('SPES Form 2 submitted successfully. Continue to Form 2-A.');
        if (ok) set_active_form('form2a');
    };

    const submit_form_2a = async (event: React.FormEvent) => {
        event.preventDefault();
        if (!form_2a.oath_agreed) {
            set_submit_state('error');
            set_submit_message('You must agree to the Oath of Undertaking to proceed.');
            return;
        }
        const ok = await submit_to_backend('SPES Form 2-A submitted successfully. Continue to Form 4.');
        if (ok) set_active_form('form4');
    };

    const submit_form_4 = async (event: React.FormEvent) => {
        event.preventDefault();
        await submit_to_backend('SPES Form 4 submitted successfully. All SPES forms are now submitted.');
    };

    // ── Signature canvas logic ──
    const canvas_ref = useRef<HTMLCanvasElement>(null);
    const is_drawing = useRef(false);

    const get_pos = (e: React.MouseEvent<HTMLCanvasElement> | React.TouchEvent<HTMLCanvasElement>) => {
        const canvas = canvas_ref.current!;
        const rect = canvas.getBoundingClientRect();
        if ('touches' in e) {
            return { x: e.touches[0].clientX - rect.left, y: e.touches[0].clientY - rect.top };
        }
        return { x: e.clientX - rect.left, y: e.clientY - rect.top };
    };

    const start_draw = (e: React.MouseEvent<HTMLCanvasElement> | React.TouchEvent<HTMLCanvasElement>) => {
        is_drawing.current = true;
        const ctx = canvas_ref.current?.getContext('2d');
        if (!ctx) return;
        const pos = get_pos(e);
        ctx.beginPath();
        ctx.moveTo(pos.x, pos.y);
    };

    const draw = (e: React.MouseEvent<HTMLCanvasElement> | React.TouchEvent<HTMLCanvasElement>) => {
        if (!is_drawing.current) return;
        const ctx = canvas_ref.current?.getContext('2d');
        if (!ctx) return;
        const pos = get_pos(e);
        ctx.lineWidth = 2;
        ctx.lineCap = 'round';
        ctx.strokeStyle = '#1e293b';
        ctx.lineTo(pos.x, pos.y);
        ctx.stroke();
    };

    const stop_draw = useCallback(() => {
        is_drawing.current = false;
        const canvas = canvas_ref.current;
        if (!canvas) return;
        const data_url = canvas.toDataURL('image/png');
        set_form_2((prev) => ({ ...prev, signature: data_url }));
    }, []);

    const clear_signature = () => {
        const canvas = canvas_ref.current;
        if (!canvas) return;
        const ctx = canvas.getContext('2d');
        if (ctx) ctx.clearRect(0, 0, canvas.width, canvas.height);
        set_form_2((prev) => ({ ...prev, signature: '' }));
    };

    // Restore signature from draft on mount
    useEffect(() => {
        if (!form_2.signature || !canvas_ref.current) return;
        const img = new Image();
        img.onload = () => {
            const ctx = canvas_ref.current?.getContext('2d');
            if (ctx) ctx.drawImage(img, 0, 0);
        };
        img.src = form_2.signature;
        // Only run once on initial load
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, []);

    // ── Availment history helpers ──
    const add_availment_row = () => {
        set_form_2((prev) => ({
            ...prev,
            spes_availment_history: [...prev.spes_availment_history, { year: '', spes_id: '' }],
        }));
    };

    const remove_availment_row = (index: number) => {
        set_form_2((prev) => ({
            ...prev,
            spes_availment_history: prev.spes_availment_history.filter((_, i) => i !== index),
        }));
    };

    const update_availment_row = (index: number, field: keyof SpesAvailmentRow, value: string) => {
        set_form_2((prev) => ({
            ...prev,
            spes_availment_history: prev.spes_availment_history.map((row, i) =>
                i === index ? { ...row, [field]: value } : row
            ),
        }));
    };

    return (
        <div className="w-full p-3 sm:p-4 md:p-6">
            <div className="max-w-5xl w-full mx-auto bg-white rounded-2xl border border-slate-200 p-4 sm:p-6 md:p-8">
                {from_requirements && (
                    <button
                        type="button"
                        onClick={() => navigate('/beneficiary/requirements?program=SPES')}
                        className="mb-4 inline-flex items-center gap-1.5 rounded-lg px-3 py-1.5 text-sm font-medium text-teal-600 hover:bg-teal-50 transition-colors"
                    >
                        <ArrowLeft size={16} />
                        Back to Requirements
                    </button>
                )}
                <header className="mb-6">
                    <h1 className="text-2xl md:text-3xl font-black text-slate-900 tracking-tight">SPES Official Forms</h1>
                    <p className="text-slate-500 mt-1 text-sm">Complete SPES Form 2, Form 2A, and Form 4 below.</p>
                </header>

                <div className="mb-6 rounded-2xl border border-slate-200 bg-slate-50 p-4">
                    <div className="flex items-center justify-between mb-2">
                        <span className="text-xs font-semibold uppercase tracking-wider text-slate-600">Completion Progress</span>
                        <span className="text-xs font-bold text-slate-800">{completion_count}/3 forms</span>
                    </div>
                    <div className="h-2.5 w-full rounded-full bg-slate-200 overflow-hidden">
                        <div className="h-2.5 rounded-full bg-slate-900 transition-all duration-300" style={{ width: `${completion_pct}%` }} />
                    </div>
                    <p className="mt-2 text-xs text-slate-500">Draft is auto-saved while you type.</p>
                </div>

                {submit_message && (
                    <div
                        className={`mb-5 rounded-xl px-4 py-3 text-sm font-medium border ${
                            submit_state === 'error'
                                ? 'bg-red-50 border-red-200 text-red-700'
                                : submit_state === 'success'
                                    ? 'bg-emerald-50 border-emerald-200 text-emerald-700'
                                    : 'bg-teal-50 border-teal-200 text-teal-700'
                        }`}
                    >
                        {submit_message}
                    </div>
                )}

                <div className="flex gap-1 rounded-xl bg-slate-100 p-1 mb-6 w-full sm:w-auto sm:inline-flex">
                    {tabs.map((tab, idx) => {
                        const is_complete = idx === 0 ? is_form_2_complete : idx === 1 ? is_form_2a_complete : is_form_4_complete;
                        return (
                            <button
                                key={tab.key}
                                type="button"
                                onClick={() => set_active_form(tab.key)}
                                className={`flex-1 sm:flex-none rounded-lg px-4 py-2 text-xs font-semibold transition-all inline-flex items-center gap-1.5 ${
                                    active_form === tab.key ? tab_styles.active : tab_styles.idle
                                }`}
                            >
                                {is_complete && <CheckCircle2 size={13} className="text-emerald-500" />}
                                {tab.label}
                            </button>
                        );
                    })}
                </div>

                {active_form === 'form2' && (
                    <form className="space-y-6" onSubmit={submit_form_2}>
                        <section>
                            <h2 className="text-lg font-bold text-slate-900 mb-1">Form 2: Personal Information</h2>
                            <p className="text-xs text-slate-400 mb-5">Fields marked with * are required.</p>

                            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                                <div>
                                    <label className={label_style}>First Name *</label>
                                    <input required value={form_2.first_name} onChange={(e) => set_form_2((prev) => ({ ...prev, first_name: e.target.value }))} className={input_style} />
                                </div>
                                <div>
                                    <label className={label_style}>Middle Name</label>
                                    <input value={form_2.middle_name} onChange={(e) => set_form_2((prev) => ({ ...prev, middle_name: e.target.value }))} className={input_style} />
                                </div>
                                <div>
                                    <label className={label_style}>Last Name *</label>
                                    <input required value={form_2.last_name} onChange={(e) => set_form_2((prev) => ({ ...prev, last_name: e.target.value }))} className={input_style} />
                                </div>
                            </div>

                            <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mt-4">
                                <div>
                                    <label className={label_style}>Birth Date *</label>
                                    <input type="date" required value={form_2.birth_date} onChange={(e) => set_form_2((prev) => ({ ...prev, birth_date: e.target.value }))} className={input_style} />
                                </div>
                                <div>
                                    <label className={label_style}>Place of Birth *</label>
                                    <input required value={form_2.place_of_birth} onChange={(e) => set_form_2((prev) => ({ ...prev, place_of_birth: e.target.value }))} className={input_style} />
                                </div>
                                <div>
                                    <label className={label_style}>Citizenship</label>
                                    <input value={form_2.citizenship} onChange={(e) => set_form_2((prev) => ({ ...prev, citizenship: e.target.value }))} className={input_style} />
                                </div>
                            </div>

                            <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mt-4">
                                <div>
                                    <label className={label_style}>Sex *</label>
                                    <select required value={form_2.sex} onChange={(e) => set_form_2((prev) => ({ ...prev, sex: e.target.value }))} className={input_style}>
                                        <option value="">Select...</option>
                                        <option value="Male">Male</option>
                                        <option value="Female">Female</option>
                                    </select>
                                </div>
                                <div>
                                    <label className={label_style}>Civil Status *</label>
                                    <select required value={form_2.civil_status} onChange={(e) => set_form_2((prev) => ({ ...prev, civil_status: e.target.value }))} className={input_style}>
                                        <option value="">Select...</option>
                                        <option value="Single">Single</option>
                                        <option value="Married">Married</option>
                                        <option value="Separated">Separated</option>
                                        <option value="Widowed">Widowed</option>
                                    </select>
                                </div>
                                <div>
                                    <label className={label_style}>Contact Number *</label>
                                    <input required placeholder="09xxxxxxxxx" value={form_2.contact_number} onChange={(e) => set_form_2((prev) => ({ ...prev, contact_number: e.target.value }))} className={input_style} />
                                </div>
                            </div>

                            <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mt-4">
                                <div>
                                    <label className={label_style}>Email Address</label>
                                    <input type="email" placeholder="you@email.com" value={form_2.email_address} onChange={(e) => set_form_2((prev) => ({ ...prev, email_address: e.target.value }))} className={input_style} />
                                </div>
                                <div>
                                    <label className={label_style}>Social Media</label>
                                    <input placeholder="Facebook, etc." value={form_2.social_media} onChange={(e) => set_form_2((prev) => ({ ...prev, social_media: e.target.value }))} className={input_style} />
                                </div>
                                <div>
                                    <label className={label_style}>GSIS Beneficiary</label>
                                    <select value={form_2.gsis_beneficiary} onChange={(e) => set_form_2((prev) => ({ ...prev, gsis_beneficiary: e.target.value }))} className={input_style}>
                                        <option value="">Select...</option>
                                        <option value="Yes">Yes</option>
                                        <option value="No">No</option>
                                    </select>
                                </div>
                            </div>

                            <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mt-4">
                                <div>
                                    <label className={label_style}>Present Address *</label>
                                    <input required value={form_2.present_address} onChange={(e) => set_form_2((prev) => ({ ...prev, present_address: e.target.value }))} className={input_style} />
                                </div>
                                <div>
                                    <label className={label_style}>Permanent Address *</label>
                                    <input required value={form_2.permanent_address} onChange={(e) => set_form_2((prev) => ({ ...prev, permanent_address: e.target.value }))} className={input_style} />
                                </div>
                            </div>
                        </section>

                        <section>
                            <h2 className="text-lg font-bold text-slate-900 mb-1">Educational Background</h2>
                            <p className="text-xs text-slate-400 mb-5">Student classification and school details.</p>

                            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                                <div>
                                    <label className={label_style}>Type of Student *</label>
                                    <select value={form_2.type_of_student} onChange={(e) => set_form_2((prev) => ({ ...prev, type_of_student: e.target.value }))} className={input_style}>
                                        <option value="Student">Student</option>
                                        <option value="ALS student">ALS student</option>
                                        <option value="out-of-school (OSY)">Out-of-School (OSY)</option>
                                    </select>
                                </div>
                                <div>
                                    <label className={label_style}>Parent Status *</label>
                                    <select value={form_2.parent_status} onChange={(e) => set_form_2((prev) => ({ ...prev, parent_status: e.target.value }))} className={input_style}>
                                        <option value="Living together">Living together</option>
                                        <option value="Solo Parent">Solo Parent</option>
                                        <option value="Separated">Separated</option>
                                    </select>
                                </div>
                            </div>
                        </section>

                        <section>
                            <h2 className="text-lg font-bold text-slate-900 mb-1">Educational Background</h2>
                            <p className="text-xs text-slate-400 mb-5">Fill in at least one education level. Leave blank if not applicable.</p>

                            {([
                                { key: 'education_elementary' as const, label: 'Elementary' },
                                { key: 'education_secondary' as const, label: 'Secondary' },
                                { key: 'education_tertiary' as const, label: 'College / Tertiary' },
                                { key: 'education_tech_voc' as const, label: 'Tech-Voc' },
                            ] as const).map(({ key, label }) => (
                                <div key={key} className="mb-5 rounded-xl border border-slate-200 bg-slate-50/50 p-4">
                                    <h3 className="text-sm font-bold text-teal-700 mb-3">{label}</h3>
                                    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-3">
                                        <div>
                                            <label className={label_style}>Name of School</label>
                                            <input
                                                placeholder="School name"
                                                value={form_2[key].school_name}
                                                onChange={(e) => set_form_2((prev) => ({ ...prev, [key]: { ...prev[key], school_name: e.target.value } }))}
                                                className={input_style}
                                            />
                                        </div>
                                        <div>
                                            <label className={label_style}>Degree Earned / Course</label>
                                            <input
                                                placeholder="e.g. BSIT, STEM, etc."
                                                value={form_2[key].degree_or_course}
                                                onChange={(e) => set_form_2((prev) => ({ ...prev, [key]: { ...prev[key], degree_or_course: e.target.value } }))}
                                                className={input_style}
                                            />
                                        </div>
                                        <div>
                                            <label className={label_style}>Year Level</label>
                                            <input
                                                placeholder="e.g. 3rd Year"
                                                value={form_2[key].year_level}
                                                onChange={(e) => set_form_2((prev) => ({ ...prev, [key]: { ...prev[key], year_level: e.target.value } }))}
                                                className={input_style}
                                            />
                                        </div>
                                        <div>
                                            <label className={label_style}>Date of Attendance / S.Y.</label>
                                            <input
                                                placeholder="e.g. 2022-2026"
                                                value={form_2[key].school_year}
                                                onChange={(e) => set_form_2((prev) => ({ ...prev, [key]: { ...prev[key], school_year: e.target.value } }))}
                                                className={input_style}
                                            />
                                        </div>
                                    </div>
                                </div>
                            ))}
                        </section>

                        <section>
                            <h2 className="text-lg font-bold text-slate-900 mb-1">History of SPES Availment</h2>
                            <p className="text-xs text-slate-400 mb-4">If you have previously availed of the SPES program, add each availment below. Leave empty if first time.</p>

                            {form_2.spes_availment_history.length > 0 && (
                                <div className="space-y-3 mb-4">
                                    {form_2.spes_availment_history.map((row, idx) => (
                                        <div key={idx} className="flex items-end gap-3 rounded-xl border border-slate-200 bg-slate-50/50 p-4">
                                            <div className="flex-1">
                                                <label className={label_style}>Year</label>
                                                <input
                                                    placeholder="e.g. 2024"
                                                    value={row.year}
                                                    onChange={(e) => update_availment_row(idx, 'year', e.target.value)}
                                                    className={input_style}
                                                />
                                            </div>
                                            <div className="flex-1">
                                                <label className={label_style}>SPES ID</label>
                                                <input
                                                    placeholder="e.g. SPES-2024-0001"
                                                    value={row.spes_id}
                                                    onChange={(e) => update_availment_row(idx, 'spes_id', e.target.value)}
                                                    className={input_style}
                                                />
                                            </div>
                                            <button
                                                type="button"
                                                onClick={() => remove_availment_row(idx)}
                                                className="mb-0.5 rounded-lg p-2.5 text-red-500 hover:bg-red-50 transition-colors"
                                                title="Remove row"
                                            >
                                                <Trash2 size={16} />
                                            </button>
                                        </div>
                                    ))}
                                </div>
                            )}

                            <button
                                type="button"
                                onClick={add_availment_row}
                                className="inline-flex items-center gap-1.5 rounded-lg border border-dashed border-slate-300 px-4 py-2.5 text-xs font-semibold text-slate-600 hover:border-teal-400 hover:text-teal-700 hover:bg-teal-50/50 transition-all"
                            >
                                <Plus size={14} />
                                Add Previous Availment
                            </button>
                        </section>

                        <section>
                            <h2 className="text-lg font-bold text-slate-900 mb-1">Applicant's Signature</h2>
                            <p className="text-xs text-slate-400 mb-4">Draw your signature in the box below using your mouse or finger (on touch devices).</p>

                            <div className="rounded-xl border border-slate-200 bg-white p-1">
                                <canvas
                                    ref={canvas_ref}
                                    width={560}
                                    height={160}
                                    className="w-full rounded-lg bg-slate-50 cursor-crosshair touch-none"
                                    onMouseDown={start_draw}
                                    onMouseMove={draw}
                                    onMouseUp={stop_draw}
                                    onMouseLeave={stop_draw}
                                    onTouchStart={start_draw}
                                    onTouchMove={draw}
                                    onTouchEnd={stop_draw}
                                />
                            </div>
                            <div className="flex items-center justify-between mt-2">
                                <p className="text-xs text-slate-400">Sign above the line</p>
                                <button
                                    type="button"
                                    onClick={clear_signature}
                                    className="text-xs font-medium text-red-500 hover:text-red-700 transition-colors"
                                >
                                    Clear Signature
                                </button>
                            </div>
                        </section>

                        <div className="flex justify-end">
                            <button
                                type="submit"
                                disabled={submit_state === 'submitting'}
                                className="inline-flex items-center gap-2 rounded-xl bg-teal-600 px-6 py-3 text-sm font-bold text-white tracking-wide transition-all hover:bg-teal-700 active:scale-[0.99] disabled:opacity-50 disabled:cursor-not-allowed"
                            >
                                {submit_state === 'submitting' && active_form === 'form2' ? 'Submitting...' : 'Submit SPES Form 2'}
                            </button>
                        </div>
                    </form>
                )}

                {active_form === 'form2a' && (
                    <form className="space-y-6" onSubmit={submit_form_2a}>
                        <section>
                            <h2 className="text-lg font-bold text-slate-900 mb-1">Form 2-A: Oath of Undertaking</h2>
                            <p className="text-xs text-slate-400 mb-5">Read the oath carefully and provide the required information below.</p>

                            <div className="rounded-2xl border border-teal-200 bg-teal-50/50 p-5 md:p-6 mb-6">
                                <h3 className="text-sm font-bold text-teal-900 uppercase tracking-wide mb-3">Oath of Undertaking</h3>
                                <div className="space-y-3 text-sm leading-relaxed text-slate-700">
                                    <p>
                                        I, <strong className="text-slate-900 underline underline-offset-4 decoration-teal-300">{form_2a.applicant_full_name || '________________________'}</strong>, hereby apply for enrollment under the <strong>Special Program for the Employment of Students (SPES)</strong> pursuant to Republic Act No. 7323, as amended by Republic Act No. 10917.
                                    </p>
                                    <p>
                                        I understand that if accepted, I shall be employed for a period not exceeding twenty (20) working days during school vacation or any time school is not in session, at a wage rate not less than the prevailing minimum wage.
                                    </p>
                                    <p>
                                        I hereby certify that all information provided in my SPES application forms are true and correct to the best of my knowledge. I further understand that any misrepresentation shall be a ground for disqualification or termination from the program.
                                    </p>
                                    <p>
                                        I give my consent to the collection, use, and processing of my personal information as required under the <strong>Data Privacy Act of 2012 (R.A. 10173)</strong> for purposes related to the SPES program.
                                    </p>
                                </div>
                            </div>

                            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                <div>
                                    <label className={label_style}>Applicant Full Name *</label>
                                    <input
                                        required
                                        placeholder="Juan A. Dela Cruz"
                                        value={form_2a.applicant_full_name}
                                        onChange={(e) => set_form_2a((prev) => ({ ...prev, applicant_full_name: e.target.value }))}
                                        className={input_style}
                                    />
                                </div>
                                <div>
                                    <label className={label_style}>Date *</label>
                                    <input
                                        required
                                        type="date"
                                        value={form_2a.oath_date}
                                        onChange={(e) => set_form_2a((prev) => ({ ...prev, oath_date: e.target.value }))}
                                        className={input_style}
                                    />
                                </div>
                            </div>

                            <div className="rounded-2xl border border-slate-200 bg-slate-50 p-5 md:p-6 mt-6">
                                <h3 className="text-sm font-bold text-slate-800 uppercase tracking-wide mb-3">Parent / Guardian Conformity</h3>
                                <p className="text-sm text-slate-600 mb-4">
                                    I, the undersigned parent/guardian, give my full consent to the above-named applicant to participate in the SPES program.
                                </p>
                                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                    <div>
                                        <label className={label_style}>Parent / Guardian Full Name *</label>
                                        <input
                                            required
                                            placeholder="Maria B. Dela Cruz"
                                            value={form_2a.parent_guardian_name}
                                            onChange={(e) => set_form_2a((prev) => ({ ...prev, parent_guardian_name: e.target.value }))}
                                            className={input_style}
                                        />
                                    </div>
                                    <div>
                                        <label className={label_style}>Relationship to Applicant *</label>
                                        <select
                                            required
                                            value={form_2a.relationship}
                                            onChange={(e) => set_form_2a((prev) => ({ ...prev, relationship: e.target.value }))}
                                            className={input_style}
                                        >
                                            <option value="">Select...</option>
                                            <option value="Mother">Mother</option>
                                            <option value="Father">Father</option>
                                            <option value="Legal Guardian">Legal Guardian</option>
                                            <option value="Sibling">Sibling</option>
                                            <option value="Other">Other</option>
                                        </select>
                                    </div>
                                </div>
                            </div>

                            <div className="mt-6">
                                <label className="flex items-start gap-3 cursor-pointer select-none rounded-xl border border-slate-200 bg-white p-4 transition-colors hover:bg-slate-50">
                                    <input
                                        type="checkbox"
                                        checked={form_2a.oath_agreed}
                                        onChange={(e) => set_form_2a((prev) => ({ ...prev, oath_agreed: e.target.checked }))}
                                        className="mt-0.5 h-5 w-5 rounded border-slate-300 text-teal-600 focus:ring-teal-500 accent-teal-600"
                                    />
                                    <span className="text-sm text-slate-700">
                                        I have read and understood the above Oath of Undertaking. I certify that all the information I have provided is true and correct, and I agree to the terms and conditions of the SPES program. <span className="text-red-500 font-semibold">*</span>
                                    </span>
                                </label>
                            </div>
                        </section>
                        <div className="flex justify-end">
                            <button
                                type="submit"
                                disabled={!form_2a.oath_agreed || submit_state === 'submitting'}
                                className="inline-flex items-center gap-2 rounded-xl bg-teal-600 px-6 py-3 text-sm font-bold text-white tracking-wide transition-all hover:bg-teal-700 active:scale-[0.99] disabled:opacity-50 disabled:cursor-not-allowed"
                            >
                                {submit_state === 'submitting' && active_form === 'form2a' ? 'Submitting...' : 'Submit SPES Form 2-A'}
                            </button>
                        </div>
                    </form>
                )}

                {active_form === 'form4' && (
                    <form className="space-y-6" onSubmit={submit_form_4}>
                        <section>
                            <h2 className="text-lg font-bold text-slate-900 mb-1">Form 4: Work Assignment and Endorsement</h2>
                            <p className="text-xs text-slate-400 mb-5">Details of your assigned workplace and schedule.</p>
                            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                <div>
                                    <label className={label_style}>Applicant Name *</label>
                                    <input required value={form_4.applicant_name} onChange={(e) => set_form_4((prev) => ({ ...prev, applicant_name: e.target.value }))} className={input_style} />
                                </div>
                                <div>
                                    <label className={label_style}>Assigned Office/Establishment *</label>
                                    <input required value={form_4.assigned_office} onChange={(e) => set_form_4((prev) => ({ ...prev, assigned_office: e.target.value }))} className={input_style} />
                                </div>
                            </div>
                            <div className="mt-4">
                                <label className={label_style}>Work Assignment *</label>
                                <input required value={form_4.work_assignment} onChange={(e) => set_form_4((prev) => ({ ...prev, work_assignment: e.target.value }))} className={input_style} />
                            </div>
                            <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mt-4">
                                <div>
                                    <label className={label_style}>Supervisor Name *</label>
                                    <input required value={form_4.supervisor_name} onChange={(e) => set_form_4((prev) => ({ ...prev, supervisor_name: e.target.value }))} className={input_style} />
                                </div>
                                <div>
                                    <label className={label_style}>Supervisor Contact *</label>
                                    <input required value={form_4.supervisor_contact} onChange={(e) => set_form_4((prev) => ({ ...prev, supervisor_contact: e.target.value }))} className={input_style} />
                                </div>
                            </div>
                            <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mt-4">
                                <div>
                                    <label className={label_style}>Start Date *</label>
                                    <input required type="date" value={form_4.start_date} onChange={(e) => set_form_4((prev) => ({ ...prev, start_date: e.target.value }))} className={input_style} />
                                </div>
                                <div>
                                    <label className={label_style}>End Date *</label>
                                    <input required type="date" value={form_4.end_date} onChange={(e) => set_form_4((prev) => ({ ...prev, end_date: e.target.value }))} className={input_style} />
                                </div>
                                <div>
                                    <label className={label_style}>Daily Schedule *</label>
                                    <input required placeholder="e.g. 8:00 AM - 5:00 PM" value={form_4.daily_schedule} onChange={(e) => set_form_4((prev) => ({ ...prev, daily_schedule: e.target.value }))} className={input_style} />
                                </div>
                            </div>
                        </section>
                        <div className="flex justify-end">
                            <button
                                type="submit"
                                disabled={submit_state === 'submitting'}
                                className="inline-flex items-center gap-2 rounded-xl bg-teal-600 px-6 py-3 text-sm font-bold text-white tracking-wide transition-all hover:bg-teal-700 active:scale-[0.99] disabled:opacity-50 disabled:cursor-not-allowed"
                            >
                                {submit_state === 'submitting' && active_form === 'form4' ? 'Submitting...' : 'Submit SPES Form 4'}
                            </button>
                        </div>
                    </form>
                )}
            </div>
        </div>
    );
}

export default SpesOfficialForms;

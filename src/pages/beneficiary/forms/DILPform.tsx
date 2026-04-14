import React, { useState, useEffect } from "react";
import { dilpAPI } from "../../../api/dilp.api";
import { validateDilpForm } from '../../../utils/validation';

const DILP_DRAFT_KEY = 'dilp_form_draft_v1';

/**
 * Using 'type' instead of 'interface' to ensure compatibility 
 * with Record<string, unknown> in utility functions.
 */
export type DilpFormData = {
    // Location
    province: string;
    municipality: string;
    district: string;
    barangay: string;
    street: string;
    // Personal Info
    proponent_name: string;
    sex: string;
    civil_status: string;
    birthdate: string;
    email: string;
    // Project Details
    project_title: string;
    project_type: 'Individual' | 'Group';
    category: 'Formation' | 'Enhancement' | 'Restoration';
    proposed_amount: string;
    // Contact & Business
    contact_person: string;
    mobile_number: string;
    business_experience: string;
    skills_training: string;
    estimated_monthly_income: string;
    number_of_beneficiaries: string;
    valid_id_number: string;
    brief_description: string;
};

const INITIAL_STATE: DilpFormData = {
    province: '', municipality: '', district: '', barangay: '', street: '',
    proponent_name: '', sex: '', civil_status: '', birthdate: '', email: '',
    project_title: '', project_type: 'Individual', category: 'Formation',
    proposed_amount: '', contact_person: '', mobile_number: '',
    business_experience: '', skills_training: '', estimated_monthly_income: '',
    number_of_beneficiaries: '', valid_id_number: '', brief_description: '',
};

interface Props {
    programId?: number | null;
}

const DilpForm: React.FC<Props> = ({ programId }) => {
    // --- State ---
    const [formData, setFormData] = useState<DilpFormData>(() => {
        try {
            const saved = localStorage.getItem(DILP_DRAFT_KEY);
            return saved ? { ...INITIAL_STATE, ...JSON.parse(saved) } : INITIAL_STATE;
        } catch { return INITIAL_STATE; }
    });

    const [status, setStatus] = useState<{ loading: boolean; error: string | null; success: boolean }>({
        loading: false,
        error: null,
        success: false
    });

    // --- Side Effects ---
    useEffect(() => {
        localStorage.setItem(DILP_DRAFT_KEY, JSON.stringify(formData));
    }, [formData]);

    // --- Handlers ---
    const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement | HTMLTextAreaElement>) => {
        const { name, value } = e.target;
        setFormData(prev => ({ ...prev, [name]: value }));
    };

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        setStatus({ loading: true, error: null, success: false });

        try {
            // 1. Validation (The 'type' alias fix now allows this to pass)
            const validationErrors = validateDilpForm(formData);
            if (validationErrors.length > 0) {
                throw new Error(validationErrors.join(" | "));
            }

            // 2. Data Transformation (Mapping strings to required numeric types for MySQL)
            const payload = {
                ...formData,
                proposed_amount: parseFloat(formData.proposed_amount) || 0,
                estimated_monthly_income: parseFloat(formData.estimated_monthly_income) || 0,
                number_of_beneficiaries: parseInt(formData.number_of_beneficiaries, 10) || 0,
                program_id: programId || undefined,
            };

            await dilpAPI.submitDilpApplication(payload);

            // 3. Success Lifecycle
            setStatus({ loading: false, error: null, success: true });
            setFormData(INITIAL_STATE);
            localStorage.removeItem(DILP_DRAFT_KEY);
            
            window.scrollTo({ top: 0, behavior: 'smooth' });
            setTimeout(() => setStatus(prev => ({ ...prev, success: false })), 6000);

        } catch (err: any) {
            setStatus({ 
                loading: false, 
                error: err.message || "An error occurred during submission.", 
                success: false 
            });
        }
    };

    // --- Styling ---
    const sectionTitle = "text-sm font-bold text-green-700 uppercase tracking-wider mb-4 border-b pb-2";
    const inputStyle = "w-full mt-1 p-3 bg-white border border-gray-300 rounded-lg focus:ring-2 focus:ring-green-500 focus:border-transparent transition-all outline-none text-gray-800 shadow-sm";

    return (
        <div className="min-h-screen bg-gray-100 p-4 md:p-8">
            <form onSubmit={handleSubmit} className="max-w-4xl mx-auto bg-white rounded-2xl shadow-2xl overflow-hidden border border-gray-200">
                <div className="bg-green-600 p-6 text-white">
                    <h1 className="text-2xl font-bold">DILP Proposal Submission</h1>
                    <p className="text-green-100 text-sm">Please provide accurate information for the livelihood project proposal.</p>
                </div>

                <div className="p-6 md:p-10 space-y-10">
                    {status.success && <div className="p-4 bg-green-100 border-l-4 border-green-500 text-green-700 animate-pulse">✓ Application submitted successfully to the management system!</div>}
                    {status.error && <div className="p-4 bg-red-100 border-l-4 border-red-500 text-red-700">✗ {status.error}</div>}

                    {/* Section 1: Proponent Identity */}
                    <section>
                        <h2 className={sectionTitle}>Proponent Information</h2>
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                            <div>
                                <label className="text-xs font-semibold text-gray-600">Full Name</label>
                                <input name="proponent_name" value={formData.proponent_name} onChange={handleChange} className={inputStyle} placeholder="Full Legal Name" required />
                            </div>
                            <div>
                                <label className="text-xs font-semibold text-gray-600">Email Address</label>
                                <input type="email" name="email" value={formData.email} onChange={handleChange} className={inputStyle} placeholder="email@example.com" required />
                            </div>
                            <div className="grid grid-cols-2 gap-4">
                                <div>
                                    <label className="text-xs font-semibold text-gray-600">Sex</label>
                                    <select name="sex" value={formData.sex} onChange={handleChange} className={inputStyle} required>
                                        <option value="">--Select--</option>
                                        <option value="Male">Male</option>
                                        <option value="Female">Female</option>
                                    </select>
                                </div>
                                <div>
                                    <label className="text-xs font-semibold text-gray-600">Civil Status</label>
                                    <select name="civil_status" value={formData.civil_status} onChange={handleChange} className={inputStyle} required>
                                        <option value="">--Select--</option>
                                        <option value="Single">Single</option>
                                        <option value="Married">Married</option>
                                        <option value="Widowed">Widowed</option>
                                    </select>
                                </div>
                            </div>
                            <div>
                                <label className="text-xs font-semibold text-gray-600">Birthdate</label>
                                <input type="date" name="birthdate" value={formData.birthdate} onChange={handleChange} className={inputStyle} required />
                            </div>
                        </div>
                    </section>

                    {/* Section 2: Project Scope */}
                    <section>
                        <h2 className={sectionTitle}>Project Proposal Details</h2>
                        <div className="space-y-6">
                            <div>
                                <label className="text-xs font-semibold text-gray-600">Project Title</label>
                                <input name="project_title" value={formData.project_title} onChange={handleChange} className={inputStyle} placeholder="Enter a descriptive title" required />
                            </div>
                            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                                <div>
                                    <label className="text-xs font-semibold text-gray-600">Type</label>
                                    <select name="project_type" value={formData.project_type} onChange={handleChange} className={inputStyle}>
                                        <option value="Individual">Individual</option>
                                        <option value="Group">Group</option>
                                    </select>
                                </div>
                                <div>
                                    <label className="text-xs font-semibold text-gray-600">Category</label>
                                    <select name="category" value={formData.category} onChange={handleChange} className={inputStyle}>
                                        <option value="Formation">Formation</option>
                                        <option value="Enhancement">Enhancement</option>
                                        <option value="Restoration">Restoration</option>
                                    </select>
                                </div>
                                <div>
                                    <label className="text-xs font-semibold text-gray-600">Amount Requested (₱)</label>
                                    <input type="number" name="proposed_amount" value={formData.proposed_amount} onChange={handleChange} className={inputStyle} placeholder="0.00" required />
                                </div>
                            </div>
                        </div>
                    </section>

                    {/* Section 3: Contact & Business */}
                    <section>
                        <h2 className={sectionTitle}>Business Capacity</h2>
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-6">
                            <div>
                                <label className="text-xs font-semibold text-gray-600">Mobile Number</label>
                                <input type="tel" name="mobile_number" value={formData.mobile_number} onChange={handleChange} className={inputStyle} placeholder="09xxxxxxxxx" required />
                            </div>
                            <div>
                                <label className="text-xs font-semibold text-gray-600">Valid ID / SSS / TIN</label>
                                <input name="valid_id_number" value={formData.valid_id_number} onChange={handleChange} className={inputStyle} placeholder="Enter ID Number" required />
                            </div>
                        </div>
                        <div className="space-y-6">
                            <div>
                                <label className="text-xs font-semibold text-gray-600">Brief Project Description</label>
                                <textarea name="brief_description" value={formData.brief_description} onChange={handleChange} className={`${inputStyle} h-32 resize-none`} required />
                            </div>
                        </div>
                    </section>

                    <button
                        type="submit"
                        disabled={status.loading}
                        className="w-full bg-green-600 hover:bg-green-700 disabled:bg-gray-400 text-white font-bold py-4 rounded-xl shadow-lg transform transition active:scale-95 uppercase tracking-widest"
                    >
                        {status.loading ? "Processing Submission..." : "Submit DILP Proposal"}
                    </button>
                </div>
            </form>
        </div>
    );
};

export default DilpForm;
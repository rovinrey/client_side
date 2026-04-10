import { useState, useEffect } from "react";
import { dilpAPI } from "../../../api/dilp.api";

const DILP_DRAFT_KEY = 'dilp_form_draft_v1';

interface FormData {

    // project location
    province: string;
    municipality: string;
    district: string;
    barangay: string;
    street: string;

    // project details
    project_type: string; // group or individual
    





    proponent_name: string;
    sex: string;
    civil_status: string;
    birthdate: string;
    email: string;

    project_title: string;
   
    category: string;
    proposed_amount: string;

    
  

    contact_person: string;
    mobile_number: string;

    business_experience: string;
    estimated_monthly_income: string;
    number_of_beneficiaries: string;
    skills_training: string;

    valid_id_number: string;
    brief_description: string;
}

const DILP_INITIAL_STATE: FormData = {
    proponent_name: '',
    sex: '',
    civil_status: '',
    birthdate: '',
    email: '',
    project_title: '',
    project_type: 'Individual',
    category: 'Formation',
    proposed_amount: '',
    barangay: '',
    municipality: '',
    district: '',
    street: '',
    province: '',
    contact_person: '',
    mobile_number: '',
    business_experience: '',
    estimated_monthly_income: '',
    number_of_beneficiaries: '',
    skills_training: '',
    valid_id_number: '',
    brief_description: '',
};

function DilpForm() {
    const [formData, setFormData] = useState<FormData>(() => {
        try {
            const saved = localStorage.getItem(DILP_DRAFT_KEY);
            if (saved) {
                const parsed = JSON.parse(saved);
                return { ...DILP_INITIAL_STATE, ...parsed };
            }
        } catch { /* ignore corrupt data */ }
        return DILP_INITIAL_STATE;
    });

    const [loading, setLoading] = useState(false);
    const [error, setError] = useState<string | null>(null);
    const [success, setSuccess] = useState(false);

    // Auto-save draft on every change
    useEffect(() => {
        localStorage.setItem(DILP_DRAFT_KEY, JSON.stringify(formData));
    }, [formData]);

    const handleChange = (
        e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement | HTMLTextAreaElement>
    ) => {
        const { name, value } = e.target;
        setFormData({ ...formData, [name]: value });
    };

    const handleSubmit = async () => {
        setLoading(true);
        setError(null);
        setSuccess(false);

        try {
            // Basic Validation
            if (!formData.proponent_name.trim()) throw new Error("Proponent name is required");
            if (!formData.project_title.trim()) throw new Error("Project title is required");
            if (!formData.proposed_amount) throw new Error("Proposed amount is required");
            if (!formData.mobile_number.trim()) throw new Error("Mobile number is required");

            const response = await dilpAPI.submitDilpApplication({
                ...formData,
                proposed_amount: parseFloat(formData.proposed_amount),
                estimated_monthly_income: parseFloat(formData.estimated_monthly_income || "0"),
                number_of_beneficiaries: parseInt(formData.number_of_beneficiaries || "0"),
            });

            console.log("Submitted:", response);
            setSuccess(true);

            localStorage.removeItem(DILP_DRAFT_KEY);
            setFormData(DILP_INITIAL_STATE);

            setTimeout(() => setSuccess(false), 5000);

        } catch (err: any) {
            setError(err.message || "Submission failed");
            console.error("Submission error:", err);
        } finally {
            setLoading(false);
        }
    };

    const inputStyle =
        "w-full mt-1 p-3 bg-gray-50 border border-gray-300 rounded-lg focus:ring-2 focus:ring-green-500 outline-none";

    return (
        <div className="w-full bg-slate-50 py-4 sm:py-6 md:py-8 px-0 sm:px-1 md:px-2">
            <div className="max-w-5xl mx-auto bg-white border-t-8 border-green-600 shadow-xl rounded-xl p-4 sm:p-6 md:p-8 space-y-6">

                <h2 className="text-3xl font-extrabold text-gray-800">
                    DILP Application Form
                </h2>

                {success && (
                    <div className="p-4 bg-green-50 border border-green-200 rounded-lg text-green-700">
                        ✓ Application submitted successfully!
                    </div>
                )}

                {error && (
                    <div className="p-4 bg-red-50 border border-red-200 rounded-lg text-red-700">
                        ✗ {error}
                    </div>
                )}

               
                {/*PRoject location*/}
                <h4 className="text-base font-bold text-gray-700">Project Location</h4>
                <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-4 md:gap-6">
                    <input name="province" placeholder="Province" value={formData.province} onChange={handleChange} className={inputStyle} />
                    <input name="municipality" placeholder="Municipality" value={formData.municipality} onChange={handleChange} className={inputStyle} />
                    <input name="district" placeholder="District" value={formData.district} onChange={handleChange} className={inputStyle} />
                    <input name="barangay" placeholder="Barangay" value={formData.barangay} onChange={handleChange} className={inputStyle} />
                    <input name="street" placeholder="Street" value={formData.street} onChange={handleChange} className={inputStyle} />
                </div>
              

                 {/* Personal Info */}
                <div className="grid grid-cols-1 md:grid-cols-3 gap-4 md:gap-6">
                    <input name="proponent_name" placeholder="Proponent Name" value={formData.proponent_name} onChange={handleChange} className={inputStyle}/>
                    <input name="sex" placeholder="Sex" value={formData.sex} onChange={handleChange} className={inputStyle}/>
                    <input name="civil_status" placeholder="Civil Status" value={formData.civil_status} onChange={handleChange} className={inputStyle}/>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-4 md:gap-6">
                    <input type="date" name="birthdate" value={formData.birthdate} onChange={handleChange} className={inputStyle}/>
                    <input type="email" name="email" placeholder="Email" value={formData.email} onChange={handleChange} className={inputStyle}/>
                </div>

                {/* Project Info */}
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4 md:gap-6">
                    <input name="project_title" placeholder="Project Title" value={formData.project_title} onChange={handleChange} className={inputStyle}/>
                    <input type="number" name="proposed_amount" placeholder="Proposed Amount" value={formData.proposed_amount} onChange={handleChange} className={inputStyle}/>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-4 md:gap-6">
                    <select name="project_type" value={formData.project_type} onChange={handleChange} className={inputStyle}>
                        <option value="Individual">Individual</option>
                        <option value="Group">Group</option>
                    </select>

                    <select name="category" value={formData.category} onChange={handleChange} className={inputStyle}>
                        <option value="Formation">Formation</option>
                        <option value="Enhancement">Enhancement</option>
                        <option value="Restoration">Restoration</option>
                    </select>
                </div>

                {/* Address */}
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4 md:gap-6">
                    <input name="contact_person" placeholder="Contact Person" value={formData.contact_person} onChange={handleChange} className={inputStyle}/>
                    <input name="mobile_number" placeholder="Mobile Number" value={formData.mobile_number} onChange={handleChange} className={inputStyle}/>
                </div>

                {/* Business Info */}
                <textarea name="business_experience" placeholder="Business Experience" value={formData.business_experience} onChange={handleChange} className={inputStyle}/>
                <textarea name="skills_training" placeholder="Skills / Trainings" value={formData.skills_training} onChange={handleChange} className={inputStyle}/>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-4 md:gap-6">
                    <input type="number" name="estimated_monthly_income" placeholder="Estimated Monthly Income" value={formData.estimated_monthly_income} onChange={handleChange} className={inputStyle}/>
                    <input type="number" name="number_of_beneficiaries" placeholder="Number of Beneficiaries" value={formData.number_of_beneficiaries} onChange={handleChange} className={inputStyle}/>
                </div>

                <input name="valid_id_number" placeholder="Valid ID Number" value={formData.valid_id_number} onChange={handleChange} className={inputStyle}/>
                <textarea name="brief_description" placeholder="Project Description" value={formData.brief_description} onChange={handleChange} className={inputStyle}/>

                <button
                    type="button"
                    onClick={handleSubmit}
                    disabled={loading}
                    className="w-full bg-green-600 hover:bg-green-700 disabled:bg-gray-400 text-white font-black py-4 rounded-lg uppercase"
                >
                    {loading ? "Submitting..." : "Submit DILP Proposal"}
                </button>

            </div>
        </div>
    );
}

export default DilpForm;
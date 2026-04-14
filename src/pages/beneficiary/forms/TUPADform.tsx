import React, { useState, useEffect } from "react";
import axios from "axios";
import { API_BASE_URL } from '../../../api/config';
import { validateTupadForm, type ValidationError } from '../../../utils/validation';

const TUPAD_DRAFT_KEY = 'tupad_form_draft_v1';

// 1. DRY Principle: Extract initial state outside the component so it isn't recreated on every render 
// and doesn't need to be hardcoded twice.
const INITIAL_FORM_STATE = {
    first_name: "",
    middle_name: "",
    last_name: "",
    date_of_birth: "",
    valid_id_type: "",
    id_number: "",
    contact_number: "",
    occupation: "",
    monthly_income: "",
    gender: "",
    civil_status: "",
    age: "",
    training: "",
    educational_attainment: "",
    job_preference: "",
    name_of_beneficiary: "",
    address: "",
    program_type: "TUPAD",
};

function calculateAge(dateOfBirth: string): string {
    if (!dateOfBirth) return "";
    const birth = new Date(dateOfBirth);
    const today = new Date();
    let age = today.getFullYear() - birth.getFullYear();
    const monthDiff = today.getMonth() - birth.getMonth();
    if (monthDiff < 0 || (monthDiff === 0 && today.getDate() < birth.getDate())) {
        age--;
    }
    return age >= 0 ? String(age) : "";
}

function TupadForm({ programId }: { programId?: number | null }) {
    // programId is accepted for consistency and future use, but not used currently
    void programId;
    const [formData, setFormData] = useState(() => {
        try {
            const saved = localStorage.getItem(TUPAD_DRAFT_KEY);
            if (saved) {
                const parsed = JSON.parse(saved);
                return { ...INITIAL_FORM_STATE, ...parsed };
            }
        } catch { /* ignore corrupt data */ }
        return INITIAL_FORM_STATE;
    });
    const [loading, setLoading] = useState(false);
    const [errors, setErrors] = useState<ValidationError[]>([]);

    const fieldError = (field: string) => errors.find(e => e.field === field)?.message;

    // Auto-save draft on every change
    useEffect(() => {
        localStorage.setItem(TUPAD_DRAFT_KEY, JSON.stringify(formData));
    }, [formData]);

    const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
        const { name, value, type } = e.target;

        setFormData((prev: typeof INITIAL_FORM_STATE) => {
            const updated = {
                ...prev,
                [name]: type === "number" ? (value === "" ? "" : Number(value)) : value,
            };

            if (name === "date_of_birth") {
                updated.age = calculateAge(value);
            }

            return updated;
        });
    };

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        setErrors([]);

        // Validate form
        const validationErrors = validateTupadForm(formData);
        if (validationErrors.length > 0) {
            setErrors(validationErrors);
            return;
        }

        setLoading(true);

        try {
            // 2. Defensive Programming: Safely retrieve the user ID. 
            // Often, devs store the whole user object as JSON, not just the ID. We check for both.
            let userId = localStorage.getItem('user_id');
            
            if (!userId) {
                // Fallback: Check if they stored a user object instead
                const userObjStr = localStorage.getItem('user');
                if (userObjStr) {
                    try {
                        const parsedUser = JSON.parse(userObjStr);
                        userId = parsedUser?.id || parsedUser?.user_id;
                    } catch (parseError) {
                        console.error("Failed to parse user from local storage");
                    }
                }
            }

            if (!userId) {
                alert('Session expired or User ID not found. Please log in again.');
                // Optional: Redirect to login page here using React Router's useNavigate
                return; 
            }

            const token = localStorage.getItem('token');
            if (!token) {
                alert('Session expired. Please login again.');
                return;
            }

            const payload = {
                ...formData,
                user_id: Number(userId),
                program_type: 'TUPAD',
                // program_id removed
                work_category: formData.occupation || null,
            };

            const response = await axios.post(`${API_BASE_URL}/api/forms/apply/tupad`, payload, {
                headers: { Authorization: `Bearer ${token}` }
            });

            console.log("Response:", response.data);
            alert("Form submitted successfully!");

            // Reset form cleanly using our constant
            localStorage.removeItem(TUPAD_DRAFT_KEY);
            setFormData(INITIAL_FORM_STATE);
            
        } catch (err: any) {
            console.error("Submission error:", err);
            const errorMessage = err.response?.data?.message || err.message || "Internal Server Error";
            alert(`Submission failed: ${errorMessage}`);
        } finally {
            setLoading(false);
        }
    };

    const inputStyle = "w-full px-4 py-3 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-teal-500 transition";

    return (
        <div className="py-4 sm:py-6 md:py-8 px-0 sm:px-1 md:px-2 flex justify-center items-start">
            <div className="bg-white p-4 sm:p-6 md:p-8 rounded-xl shadow-lg w-full max-w-3xl border-t-4 border-teal-600">
                <h2 className="text-2xl font-bold text-gray-800 mb-2">
                    TUPAD Profiling
                </h2>
                <p className="text-sm text-gray-500 mb-6">
                    Please fill out the form accurately for the Pangkabuhayan program.
                </p>

                <form onSubmit={handleSubmit} className="grid grid-cols-1 gap-4">
                    {errors.length > 0 && (
                        <div className="bg-red-50 border border-red-300 text-red-700 px-4 py-3 rounded-md text-sm">
                            <p className="font-semibold mb-1">Please fix the following errors:</p>
                            <ul className="list-disc list-inside">
                                {errors.map((err, i) => <li key={i}>{err.message}</li>)}
                            </ul>
                        </div>
                    )}

                    {/* Name Section */}
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                        <div>
                            <input type="text" name="first_name" placeholder="First Name *" value={formData.first_name} onChange={handleChange} className={`${inputStyle} ${fieldError('first_name') ? 'border-red-500' : ''}`} required />
                            {fieldError('first_name') && <p className="text-red-500 text-xs mt-1">{fieldError('first_name')}</p>}
                        </div>
                        <input type="text" name="middle_name" placeholder="Middle Name" value={formData.middle_name} onChange={handleChange} className={inputStyle} />
                        <div>
                            <input type="text" name="last_name" placeholder="Last Name *" value={formData.last_name} onChange={handleChange} className={`${inputStyle} ${fieldError('last_name') ? 'border-red-500' : ''}`} required />
                            {fieldError('last_name') && <p className="text-red-500 text-xs mt-1">{fieldError('last_name')}</p>}
                        </div>
                    </div>

                    

                    {/* Personal Info */}
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                        <div>
                            <input type="date" name="date_of_birth" value={formData.date_of_birth} onChange={handleChange} className={`${inputStyle} ${fieldError('date_of_birth') ? 'border-red-500' : ''}`} required />
                            {fieldError('date_of_birth') && <p className="text-red-500 text-xs mt-1">{fieldError('date_of_birth')}</p>}
                        </div>
                        <input type="number" name="age" placeholder="Age" value={formData.age} readOnly className={`${inputStyle} bg-gray-100 cursor-not-allowed`} />
                    </div>

                    <div>
                        <input type="text" name="contact_number" placeholder="Contact Number" value={formData.contact_number} onChange={handleChange} className={`${inputStyle} ${fieldError('contact_number') ? 'border-red-500' : ''}`} />
                        {fieldError('contact_number') && <p className="text-red-500 text-xs mt-1">{fieldError('contact_number')}</p>}
                    </div>

                    {/* Address */}
                    <div>
                        <input type="text" name="address" placeholder="Complete Address *" value={formData.address} onChange={handleChange} className={`${inputStyle} ${fieldError('address') ? 'border-red-500' : ''}`} required />
                        {fieldError('address') && <p className="text-red-500 text-xs mt-1">{fieldError('address')}</p>}
                    </div>

                    {/* Employment */}
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                        <input type="text" name="occupation" placeholder="Occupation" value={formData.occupation} onChange={handleChange} className={inputStyle} />
                        <input type="number" name="monthly_income" placeholder="Monthly Income" value={formData.monthly_income} onChange={handleChange} className={inputStyle} />
                    </div>

                    {/* Identity */}
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                        <select name="gender" value={formData.gender} onChange={handleChange as any} className={inputStyle}>
                            <option value="">Select Gender</option>
                            <option value="Male">Male</option>
                            <option value="Female">Female</option>
                        </select>
                        <select name="civil_status" value={formData.civil_status} onChange={handleChange as any} className={inputStyle}>
                            <option value="">Civil Status</option>
                            <option value="Single">Single</option>
                            <option value="Married">Married</option>
                            <option value="Widowed">Widowed</option>
                        </select>
                    </div>

                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                        <div>
                            <input type="text" name="valid_id_type" placeholder="Type of ID *" value={formData.valid_id_type} onChange={handleChange} className={`${inputStyle} ${fieldError('valid_id_type') ? 'border-red-500' : ''}`} required />
                            {fieldError('valid_id_type') && <p className="text-red-500 text-xs mt-1">{fieldError('valid_id_type')}</p>}
                        </div>
                        <div>
                            <input type="text" name="id_number" placeholder="ID Number *" value={formData.id_number} onChange={handleChange} className={`${inputStyle} ${fieldError('id_number') ? 'border-red-500' : ''}`} required />
                            {fieldError('id_number') && <p className="text-red-500 text-xs mt-1">{fieldError('id_number')}</p>}
                        </div>
                    </div>

                    <input type="text" name="name_of_beneficiary" placeholder="Full Name of Beneficiary" value={formData.name_of_beneficiary} onChange={handleChange} className={inputStyle} />
                    <input type="text" name="training" placeholder="Training Attended" value={formData.training} onChange={handleChange} className={inputStyle} />
                    <input type="text" name="educational_attainment" placeholder="Educational Attainment" value={formData.educational_attainment} onChange={handleChange} className={inputStyle} />
                    <input type="text" name="job_preference" placeholder="Job Preference" value={formData.job_preference} onChange={handleChange} className={inputStyle} />
                    <input type="hidden" name="program_type" value={formData.program_type} />

                    <button
                        type="submit"
                        disabled={loading}
                        className={`mt-4 w-full font-bold py-3 rounded-md shadow-md transition-all active:scale-95 text-white ${
                            loading ? "bg-gray-400 cursor-not-allowed" : "bg-teal-600 hover:bg-teal-700"
                        }`}
                    >
                        {loading ? "SUBMITTING..." : "SUBMIT FORM"}
                    </button>
                </form>
            </div>
        </div>
    );
}

export default TupadForm;
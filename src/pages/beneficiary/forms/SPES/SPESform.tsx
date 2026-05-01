import React, { useState } from "react";
import axios from "axios";
import { API_BASE_URL } from '../../../../api/config';
import { getUserId, getAuthToken } from '../../../../utils/auth.utils';

interface FormData {
    first_name: string;
    middle_name: string;
    last_name: string;
    gender: string;
    age: string;
    birthday: string;
    contact_number: string;
    school_name: string;
    course_year: string;
    gwa: string;
}

const initialState: FormData = {
    first_name: "",
    middle_name: "",
    last_name: "",
    gender: "",
    age: "",
    birthday: "",
    contact_number: "",
    school_name: "",
    course_year: "",
    gwa: "",
};

const inputStyle = "w-full px-4 py-2.5 border border-slate-300 rounded-xl focus:ring-2 focus:ring-teal-500 focus:border-teal-500 outline-none transition-all text-sm";

const SPESApplication: React.FC = () => {
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState<string | null>(null);
    const [success, setSuccess] = useState(false);
    const [formData, setFormData] = useState<FormData>(initialState);

    const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
        const { name, value } = e.target;

        setFormData({
            ...formData,
            [name]: value,
        });

        // Auto calculate age if birthday changes
        if (name === "birthday") {
            const birthDate = new Date(value);
            const today = new Date();
            let age = today.getFullYear() - birthDate.getFullYear();
            const monthDiff = today.getMonth() - birthDate.getMonth();

            if (
                monthDiff < 0 ||
                (monthDiff === 0 && today.getDate() < birthDate.getDate())
            ) {
                age--;
            }

            setFormData((prev) => ({
                ...prev,
                birthday: value,
                age: age.toString(),
            }));
        }
    };

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        setLoading(true);
        setError(null);
        setSuccess(false);

        try {
            const userId = getUserId();
            const token = getAuthToken();
            if (!userId || !token) {
                throw new Error("Please login to submit application");
            }

            // Transform form data to match backend SPES validator/spes_details table
            const payload = {
                user_id: userId,
                date_of_birth: formData.birthday,
                sex: formData.gender === 'Male' ? 'Male' : 'Female',
                type_of_student: 'Student',
                parent_status: 'Living together',
                education_level: formData.course_year || 'College',
                place_of_birth: formData.school_name?.split(',')[0] || 'Sorsogon',
                citizenship: 'Filipino',
                name_of_school: formData.school_name,
                degree_earned_course: formData.course_year,
                student_average: parseFloat(formData.gwa || '80'),
                present_address: 'Juban, Sorsogon'
            };

            await axios.post(
                `${API_BASE_URL}/api/applications/apply/spes`,
                payload,
                { 
                    headers: { 
                        Authorization: `Bearer ${token}`,
                        'Content-Type': 'application/json'
                    } 
                }
            );

            setSuccess(true);
            setFormData(initialState);
            
            // Auto-redirect to requirements/documents after success
            setTimeout(() => {
                window.location.href = '/beneficiary/requirements';
            }, 3000);
            
        } catch (err: any) {
            console.error('SPES Submit Error:', err);
            setError(err.response?.data?.message || err.message || "Submission failed. Please check form and try again.");
        } finally {
            setLoading(false);
        }
    };

    return (
        <div className="p-4">
            <div className="max-w-2xl w-full mx-auto p-8">
                <div className="mb-8 text-center">
                    <h1 className="text-2xl font-bold text-gray-800">
                        SPES Application Form
                    </h1>
                    <p className="text-gray-500 text-sm">
                        Please provide accurate information for evaluation.
                    </p>
                </div>

                {error && (
                    <div className="bg-red-100 text-red-600 p-3 rounded mb-4 text-sm">
                        {error}
                    </div>
                )}

                {success && (
                    <div className="bg-green-100 text-green-600 p-3 rounded mb-4 text-sm">
                        ✅ SPES Application Submitted Successfully! Redirecting to documents...
                    </div>
                )}

                <form onSubmit={handleSubmit} className="space-y-4">
                    <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                        <input name="first_name" placeholder="First Name *" value={formData.first_name} onChange={handleChange} className={inputStyle} required />
                        <input name="middle_name" placeholder="Middle Name" value={formData.middle_name} onChange={handleChange} className={inputStyle} />
                        <input name="last_name" placeholder="Last Name *" value={formData.last_name} onChange={handleChange} className={inputStyle} required />
                    </div>

                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                        <select name="gender" value={formData.gender} onChange={(e) => handleChange({ target: e.target } as any)} className={inputStyle} required>
                            <option value="">Select Gender</option>
                            <option value="Male">Male</option>
                            <option value="Female">Female</option>
                        </select>
                        <input name="age" placeholder="Age (Auto-calculated)" value={formData.age} className={inputStyle} readOnly />
                        <input name="birthday" type="date" value={formData.birthday} onChange={handleChange} className={inputStyle} required max={new Date().toISOString().split('T')[0]} />
                        <input name="contact_number" placeholder="Contact Number (09xxxxxxxxx)" value={formData.contact_number} onChange={handleChange} className={inputStyle} required />
                    </div>

                    <div className="border-t pt-4 mt-4">
                        <h2 className="text-sm font-bold text-teal-600 mb-3 uppercase tracking-wide">
                            Academic Information
                        </h2>

                        <input name="school_name" placeholder="School Name *" value={formData.school_name} onChange={handleChange} className={inputStyle} required />

                        <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mt-4">
                            <input name="course_year" placeholder="Course & Year Level (e.g., BSIT 3rd Year)" value={formData.course_year} onChange={handleChange} className={inputStyle} required />
                            <input name="gwa" type="number" step="0.01" min="75" placeholder="GWA (min 75)" value={formData.gwa} onChange={handleChange} className={inputStyle} required />
                        </div>
                    </div>

                    <button
                        type="submit"
                        disabled={loading}
                        className="w-full bg-gradient-to-r from-teal-600 to-teal-700 hover:from-teal-700 hover:to-teal-800 text-white font-bold py-4 rounded-xl shadow-lg transition-all active:scale-[0.98] disabled:from-gray-400 disabled:to-gray-500 disabled:shadow-none"
                    >
                        {loading ? (
                            <>
                                <span className="animate-spin mr-2">⏳</span>
                                Submitting SPES Application...
                            </>
                        ) : (
                            '✅ Submit SPES Application'
                        )}
                    </button>
                </form>
            </div>
        </div>
    );
};

export default SPESApplication;

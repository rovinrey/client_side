import React, { useState, useEffect } from "react";
import axios from "axios";
import { API_BASE_URL } from '../../../api/config';
import { storageGet } from '../../../utils/storage';
import { type ValidationError, validateTupadForm } from '../../../utils/validation';
import PersonalInformation from "../../../components/PersonalInformation";

const TUPAD_DRAFT_KEY = 'tupad_form_draft_v1';

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

   

    useEffect(() => {
        localStorage.setItem(TUPAD_DRAFT_KEY, JSON.stringify(formData));
    }, [formData]);

    const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>) => {
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

        const validationErrors = validateTupadForm(formData as Record<string, unknown>);
        if (validationErrors.length > 0) {
            setErrors(validationErrors);
            return;
        }

        setLoading(true);

        try {
            let userId = storageGet('user_id');

            if (!userId) {
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
                return; 
            }

            const token = storageGet('token');
            if (!token) {
                alert('Session expired. Please login again.');
                return;
            }

            const payload = {
                ...formData,
                user_id: Number(userId),
                program_type: 'TUPAD',
                work_category: formData.occupation || null,
            };

            const response = await axios.post(`${API_BASE_URL}/api/applications/apply/tupad`, payload, {
                headers: { Authorization: `Bearer ${token}` }
            });

            console.log("Response:", response.data);
            alert("Form submitted successfully!");

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

                    {/* 
                        REUSABLE COMPONENT 
                        This replaces the manual Name, DOB, Age, Gender, Civil Status, and ID sections
                    */}
                    <PersonalInformation
                        mode="edit"
                        values={formData}
                        fieldMap={{
                            firstName: "first_name",
                            middleName: "middle_name",
                            lastName: "last_name",
                            extensionName: undefined,
                            birthDate: "date_of_birth",
                            gender: "gender",
                            civilStatus: "civil_status",
                            contactNumber: "contact_number",
                            streetZone: "address",
                            barangay: "barangay",
                            province: "province",
                            city: "city",
                            district: "district",
                            zipCode: "zipCode",
                        }}
                        onChange={(name, value) => {
                            setFormData((prev: typeof INITIAL_FORM_STATE) => ({
                                ...prev,
                                [name]: value,
                            }));
                        }}
                        errors={(() => {
                            const map: Record<string, string> = {};
                            for (const err of errors) map[err.field] = err.message;
                            return map;
                        })()}
                    />

                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                        <div>
                            <label className="block text-xs font-semibold text-gray-600 mb-1">Valid ID Type</label>
                            <select
                                name="valid_id_type"
                                value={formData.valid_id_type}
                                onChange={handleChange}
                                className={inputStyle}
                                required
                            >
                                <option value="">Select ID Type</option>
                                <option value="national ID">National ID</option>
                                <option value="passport">Passport</option>
                                <option value="GSIS/UMID">GSIS/UMID</option>
                                <option value="SSS">SSS</option>
                                <option value="TIN">TIN</option>
                                <option value="Driver's License">Driver's License</option>
                                <option value="Other">Other</option>
                            </select>
                        </div>
                        <div>
                            <label className="block text-xs font-semibold text-gray-600 mb-1">ID Number</label>
                            <input
                                type="text"
                                name="id_number"
                                placeholder="Enter ID Number"
                                value={formData.id_number}
                                onChange={handleChange}
                                className={inputStyle}
                                required
                            />
                        </div>
                    </div>

                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                        <input type="text" name="occupation" placeholder="Occupation" value={formData.occupation} onChange={handleChange} className={inputStyle} />
                        <input type="number" name="monthly_income" placeholder="Monthly Income" value={formData.monthly_income} onChange={handleChange} className={inputStyle} />
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
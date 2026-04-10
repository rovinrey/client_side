import React, { useState } from "react";
import axios from "axios";
import { API_BASE_URL } from '../api/config';

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

        try {
            await axios.post(`${API_BASE_URL}/api/forms/apply/spes`, formData);

            setSuccess(true);
            setFormData(initialState);
        } catch (err) {
            setError("Something went wrong. Please try again.");
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
                        Application sent successfully!
                    </div>
                )}

                <form onSubmit={handleSubmit} className="space-y-4">
                    <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                        <input name="first_name" placeholder="First Name" value={formData.first_name} onChange={handleChange} className={inputStyle} />
                        <input name="middle_name" placeholder="Middle Name" value={formData.middle_name} onChange={handleChange} className={inputStyle} />
                        <input name="last_name" placeholder="Last Name" value={formData.last_name} onChange={handleChange} className={inputStyle} />
                    </div>

                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                        <input name="gender" placeholder="Gender" value={formData.gender} onChange={handleChange} className={inputStyle} />
                        <input name="age" placeholder="Age (Auto-calculated)" value={formData.age} onChange={handleChange} className={inputStyle} />
                        <input name="birthday" type="date" value={formData.birthday} onChange={handleChange} className={inputStyle} />
                        <input name="contact_number" placeholder="Contact Number (09...)" value={formData.contact_number} onChange={handleChange} className={inputStyle} />
                    </div>

                    <div className="border-t pt-4 mt-4">
                        <h2 className="text-sm font-bold text-teal-600 mb-3 uppercase">
                            Academic Information
                        </h2>

                        <input name="school_name" placeholder="Full School Name" value={formData.school_name} onChange={handleChange} className={inputStyle} />

                        <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mt-4">
                            <input name="course_year" placeholder="Course & Year (e.g. BSIT 3)" value={formData.course_year} onChange={handleChange} className={inputStyle} />
                            <input name="gwa" type="number" step="0.01" placeholder="Current GWA" value={formData.gwa} onChange={handleChange} className={inputStyle} />
                        </div>
                    </div>

                    <button
                        type="submit"
                        disabled={loading}
                        className="w-full bg-teal-600 hover:bg-teal-700 text-white font-semibold py-3 rounded-md transition-all active:scale-95 disabled:bg-teal-300"
                    >
                        {loading ? "Submitting..." : "Submit SPES Application"}
                    </button>
                </form>
            </div>
        </div>
    );
};

export default SPESApplication;
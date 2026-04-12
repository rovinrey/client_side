import React, { useEffect, useMemo, useState } from 'react';
import FormStepButton from '../../../components/Buttons';
import { API_BASE_URL } from '../../../api/config';
import { isValidPhone, isValidEmail, isMinLength, isPastDate, calculateAge } from '../../../utils/validation';

interface SPESFormData {
    first_name: string;
    middle_name: string;
    last_name: string;
    date_of_birth: string;
    place_of_birth: string;
    age: number | string;
    gender: string;
    civil_status: string;
    citizenship: string;
    gsis_beneficiary: string;
    present_address: string;
    permanent_address: string;
    contact_number: string;
    email: string;
    social_media: string;
    type_of_student: string;
    is_pwd: boolean;
    is_senior_citizen: boolean;
    is_indigenous_people: boolean;
    is_displaced_worker: boolean;
    is_ofw_descendant: boolean;
    education_level: string;
    school: string;
    course: string;
    year_level: string;
    date_of_attendance: string;
    father_name: string;
    father_occupation: string;
    father_contact: string;
    mother_maiden_name: string;
    mother_occupation: string;
    mother_contact: string;
    parent_status: string;
}

type StepKey = 'personal' | 'contact' | 'categories' | 'family' | 'education';

const SPESApplication: React.FC = () => {
    const [formData, setFormData] = useState<SPESFormData>({
        first_name: '',
        middle_name: '',
        last_name: '',
        date_of_birth: '',
        place_of_birth: '',
        age: '',
        gender: '',
        civil_status: '',
        citizenship: 'Filipino',
        gsis_beneficiary: '',
        present_address: '',
        permanent_address: '',
        contact_number: '',
        email: '',
        social_media: '',
        type_of_student: 'Student',
        is_pwd: false,
        is_senior_citizen: false,
        is_indigenous_people: false,
        is_displaced_worker: false,
        is_ofw_descendant: false,
        education_level: 'Tertiary',
        school: '',
        course: '',
        year_level: '',
        date_of_attendance: '',
        father_name: '',
        father_occupation: '',
        father_contact: '',
        mother_maiden_name: '',
        mother_occupation: '',
        mother_contact: '',
        parent_status: 'Living together'
    });

    const [loading, setLoading] = useState(false);
    const [currentStepIndex, setCurrentStepIndex] = useState(0);
    const [stepErrors, setStepErrors] = useState<string[]>([]);
    const [submitError, setSubmitError] = useState<string | null>(null);
    const [submitSuccess, setSubmitSuccess] = useState(false);

    const steps = useMemo(
        () => [
            { key: 'personal' as StepKey, title: 'Personal Information' },
            { key: 'contact' as StepKey, title: 'Contact Details' },
            { key: 'categories' as StepKey, title: 'Applicant Categories' },
            { key: 'family' as StepKey, title: 'Family Background' },
            { key: 'education' as StepKey, title: 'Educational Details' }
        ],
        []
    );

    const currentStep = steps[currentStepIndex];
    const isLastStep = currentStepIndex === steps.length - 1;

    useEffect(() => {
        if (!formData.date_of_birth) {
            setFormData((prev) => ({ ...prev, age: '' }));
            return;
        }

        const birthDate = new Date(formData.date_of_birth);
        const today = new Date();
        let age = today.getFullYear() - birthDate.getFullYear();
        const monthDiff = today.getMonth() - birthDate.getMonth();

        if (monthDiff < 0 || (monthDiff === 0 && today.getDate() < birthDate.getDate())) {
            age -= 1;
        }

        setFormData((prev) => ({ ...prev, age }));
    }, [formData.date_of_birth]);

    const handleChange = (event: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>) => {
        const target = event.target as HTMLInputElement;
        const value = target.type === 'checkbox' ? target.checked : target.value;
        setFormData((prev) => ({ ...prev, [target.name]: value }));
    };

    const isCurrentStepValid = () => {
        const errs: string[] = [];
        switch (currentStep.key) {
            case 'personal':
                if (!isMinLength(formData.first_name, 2)) errs.push('First name is required (min 2 chars)');
                if (!isMinLength(formData.last_name, 2)) errs.push('Last name is required (min 2 chars)');
                if (!isPastDate(formData.date_of_birth)) errs.push('Valid birth date is required');
                else {
                    const age = calculateAge(formData.date_of_birth);
                    if (age !== null && age < 15) errs.push('SPES applicant must be at least 15 years old');
                    if (age !== null && age > 30) errs.push('SPES is for ages 30 and below');
                }
                if (!formData.place_of_birth.trim()) errs.push('Place of birth is required');
                if (!formData.gender) errs.push('Gender is required');
                if (!formData.civil_status) errs.push('Civil status is required');
                break;
            case 'contact':
                if (!formData.present_address.trim()) errs.push('Present address is required');
                if (!formData.permanent_address.trim()) errs.push('Permanent address is required');
                if (!formData.contact_number.trim()) errs.push('Contact number is required');
                else if (!isValidPhone(formData.contact_number)) errs.push('Invalid phone number format');
                if (formData.email && !isValidEmail(formData.email)) errs.push('Invalid email format');
                break;
            case 'categories':
                if (!formData.type_of_student) errs.push('Student type is required');
                break;
            case 'education':
                if (!formData.school.trim()) errs.push('School name is required');
                if (!formData.education_level) errs.push('Education level is required');
                break;
            default:
                break;
        }
        setStepErrors(errs);
        return errs.length === 0;
    };

    const goNext = () => {
        if (!isCurrentStepValid() || isLastStep) {
            return;
        }
        setCurrentStepIndex((prev) => prev + 1);
    };

    const goBack = () => {
        if (currentStepIndex === 0) {
            return;
        }
        setCurrentStepIndex((prev) => prev - 1);
    };

    const handleSubmit = async (event: React.FormEvent) => {
        event.preventDefault();
        setSubmitError(null);
        setSubmitSuccess(false);

        if (!isLastStep || !isCurrentStepValid()) {
            return;
        }

        setLoading(true);

        try {
            const token = localStorage.getItem('token');
            const response = await fetch(`${API_BASE_URL}/api/forms/apply/spes`, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    Authorization: `Bearer ${token}`
                },
                body: JSON.stringify(formData)
            });

            if (!response.ok) {
                const data = await response.json().catch(() => null);
                throw new Error(data?.message || 'Submission failed');
            }

            setSubmitSuccess(true);
        } catch (error: any) {
            console.error('Submission error:', error);
            setSubmitError(error.message || 'Error submitting. Please check your connection.');
        } finally {
            setLoading(false);
        }
    };

    const sectionTitle = 'text-lg font-bold text-slate-900 mb-4 border-b border-slate-200 pb-2';
    const inputStyle =
        'w-full px-4 py-2.5 bg-white border border-slate-300 rounded-xl focus:ring-2 focus:ring-teal-500 focus:border-teal-500 outline-none transition-all text-sm';
    const labelStyle = 'block text-xs font-semibold text-slate-500 mb-1 uppercase tracking-wider';

    return (
        <div className="w-full bg-[radial-gradient(circle_at_top_left,_#dbeafe,_#f8fafc_45%,_#e2e8f0)] p-3 sm:p-4 md:p-6 rounded-2xl">
            <div className="max-w-5xl w-full mx-auto bg-white rounded-3xl shadow-2xl p-4 sm:p-6 md:p-10 border border-slate-200">
                <header className="mb-8 text-center">
                    <h1 className="text-3xl md:text-4xl font-black text-slate-900 tracking-tight">SPES Application</h1>
                    <p className="text-slate-600 mt-2">Special Program for Employment of Students</p>
                </header>

                <div className="mb-8">
                    <div className="flex items-center justify-between text-xs font-semibold text-slate-500 mb-3">
                        <span>
                            Step {currentStepIndex + 1} of {steps.length}
                        </span>
                        <span>{currentStep.title}</span>
                    </div>
                    <div className="h-2 rounded-full bg-slate-200 overflow-hidden">
                        <div
                            className="h-full bg-slate-900 transition-all duration-300"
                            style={{ width: `${((currentStepIndex + 1) / steps.length) * 100}%` }}
                        />
                    </div>
                </div>

                {submitSuccess && (
                    <div className="p-4 bg-green-50 border border-green-200 rounded-lg text-green-700 mb-4">
                        ✓ SPES Application Submitted Successfully!
                    </div>
                )}

                {submitError && (
                    <div className="p-4 bg-red-50 border border-red-200 rounded-lg text-red-700 mb-4">
                        ✗ {submitError}
                    </div>
                )}

                {stepErrors.length > 0 && (
                    <div className="bg-red-50 border border-red-300 text-red-700 px-4 py-3 rounded-md text-sm mb-4">
                        <p className="font-semibold mb-1">Please fix the following:</p>
                        <ul className="list-disc list-inside">
                            {stepErrors.map((err, i) => <li key={i}>{err}</li>)}
                        </ul>
                    </div>
                )}

                <form onSubmit={handleSubmit} className="space-y-8">
                    {currentStep.key === 'personal' && (
                        <section>
                            <h2 className={sectionTitle}>1. Personal Information</h2>
                            <div className="grid grid-cols-1 md:grid-cols-3 gap-5">
                                <div>
                                    <label className={labelStyle}>First Name *</label>
                                    <input
                                        name="first_name"
                                        required
                                        value={formData.first_name}
                                        className={inputStyle}
                                        onChange={handleChange}
                                    />
                                </div>
                                <div>
                                    <label className={labelStyle}>Middle Name</label>
                                    <input
                                        name="middle_name"
                                        value={formData.middle_name}
                                        className={inputStyle}
                                        onChange={handleChange}
                                    />
                                </div>
                                <div>
                                    <label className={labelStyle}>Last Name *</label>
                                    <input
                                        name="last_name"
                                        required
                                        value={formData.last_name}
                                        className={inputStyle}
                                        onChange={handleChange}
                                    />
                                </div>
                            </div>

                            <div className="grid grid-cols-1 md:grid-cols-4 gap-5 mt-5">
                                <div>
                                    <label className={labelStyle}>Date of Birth *</label>
                                    <input
                                        type="date"
                                        name="date_of_birth"
                                        required
                                        value={formData.date_of_birth}
                                        className={inputStyle}
                                        onChange={handleChange}
                                    />
                                </div>
                                <div>
                                    <label className={labelStyle}>Age</label>
                                    <input
                                        name="age"
                                        value={formData.age}
                                        readOnly
                                        className={`${inputStyle} bg-slate-100 cursor-not-allowed`}
                                    />
                                </div>
                                <div>
                                    <label className={labelStyle}>Place of Birth *</label>
                                    <input
                                        name="place_of_birth"
                                        required
                                        value={formData.place_of_birth}
                                        className={inputStyle}
                                        onChange={handleChange}
                                    />
                                </div>
                                <div>
                                    <label className={labelStyle}>Citizenship</label>
                                    <input
                                        name="citizenship"
                                        value={formData.citizenship}
                                        className={inputStyle}
                                        onChange={handleChange}
                                    />
                                </div>
                            </div>

                            <div className="grid grid-cols-1 md:grid-cols-4 gap-5 mt-5">
                                <div>
                                    <label className={labelStyle}>Sex *</label>
                                    <select
                                        name="gender"
                                        required
                                        value={formData.gender}
                                        className={inputStyle}
                                        onChange={handleChange}
                                    >
                                        <option value="">Select...</option>
                                        <option value="Male">Male</option>
                                        <option value="Female">Female</option>
                                    </select>
                                </div>
                                <div>
                                    <label className={labelStyle}>Civil Status *</label>
                                    <select
                                        name="civil_status"
                                        required
                                        value={formData.civil_status}
                                        className={inputStyle}
                                        onChange={handleChange}
                                    >
                                        <option value="">Select...</option>
                                        <option value="Single">Single</option>
                                        <option value="Married">Married</option>
                                        <option value="Widowed">Widowed</option>
                                        <option value="Separated">Separated</option>
                                    </select>
                                </div>
                                <div className="md:col-span-2">
                                    <label className={labelStyle}>GSIS Beneficiary / Relationship</label>
                                    <input
                                        name="gsis_beneficiary"
                                        placeholder="e.g., Juan Dela Cruz / Father"
                                        value={formData.gsis_beneficiary}
                                        className={inputStyle}
                                        onChange={handleChange}
                                    />
                                </div>
                            </div>
                        </section>
                    )}

                    {currentStep.key === 'contact' && (
                        <section>
                            <h2 className={sectionTitle}>2. Contact Details</h2>
                            <div className="grid grid-cols-1 md:grid-cols-2 gap-5 mb-5">
                                <div>
                                    <label className={labelStyle}>Present Address *</label>
                                    <input
                                        name="present_address"
                                        required
                                        value={formData.present_address}
                                        className={inputStyle}
                                        onChange={handleChange}
                                    />
                                </div>
                                <div>
                                    <label className={labelStyle}>Permanent Address *</label>
                                    <input
                                        name="permanent_address"
                                        required
                                        value={formData.permanent_address}
                                        className={inputStyle}
                                        onChange={handleChange}
                                    />
                                </div>
                            </div>
                            <div className="grid grid-cols-1 md:grid-cols-3 gap-5">
                                <div>
                                    <label className={labelStyle}>Cellphone No. *</label>
                                    <input
                                        name="contact_number"
                                        required
                                        value={formData.contact_number}
                                        className={inputStyle}
                                        onChange={handleChange}
                                    />
                                </div>
                                <div>
                                    <label className={labelStyle}>Email Address</label>
                                    <input
                                        type="email"
                                        name="email"
                                        value={formData.email}
                                        className={inputStyle}
                                        onChange={handleChange}
                                    />
                                </div>
                                <div>
                                    <label className={labelStyle}>Social Media (Facebook/etc.)</label>
                                    <input
                                        name="social_media"
                                        value={formData.social_media}
                                        className={inputStyle}
                                        onChange={handleChange}
                                    />
                                </div>
                            </div>
                        </section>
                    )}

                    {currentStep.key === 'categories' && (
                        <section className="bg-slate-50 p-6 rounded-2xl border border-slate-200">
                            <h2 className={sectionTitle}>3. Applicant Categories</h2>
                            <div className="mb-5">
                                <label className={labelStyle}>Type of Applicant *</label>
                                <select
                                    name="type_of_student"
                                    required
                                    value={formData.type_of_student}
                                    className={inputStyle}
                                    onChange={handleChange}
                                >
                                    <option value="Student">Student</option>
                                    <option value="ALS student">ALS Student</option>
                                    <option value="out-of-school (OSY)">Out-of-School Youth (OSY)</option>
                                </select>
                            </div>
                            <label className={labelStyle}>Special Categories (Check all that apply)</label>
                            <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mt-2">
                                {[
                                    'is_pwd',
                                    'is_senior_citizen',
                                    'is_indigenous_people',
                                    'is_displaced_worker',
                                    'is_ofw_descendant'
                                ].map((field) => (
                                    <label
                                        key={field}
                                        className="flex items-center space-x-3 cursor-pointer rounded-lg border border-slate-200 bg-white px-3 py-2"
                                    >
                                        <input
                                            type="checkbox"
                                            name={field}
                                            checked={formData[field as keyof SPESFormData] as boolean}
                                            onChange={handleChange}
                                            className="w-5 h-5 rounded border-gray-300"
                                        />
                                        <span className="text-sm font-medium text-slate-700 capitalize">
                                            {field.replace('is_', '').replace(/_/g, ' ')}
                                        </span>
                                    </label>
                                ))}
                            </div>
                        </section>
                    )}

                    {currentStep.key === 'family' && (
                        <section>
                            <h2 className={sectionTitle}>4. Family Background</h2>
                            <div className="mb-5">
                                <label className={labelStyle}>Current Status of Parents *</label>
                                <select
                                    name="parent_status"
                                    value={formData.parent_status}
                                    className={inputStyle}
                                    onChange={handleChange}
                                >
                                    <option value="Living together">Living together</option>
                                    <option value="Solo Parent">Solo Parent</option>
                                    <option value="Separated">Separated</option>
                                </select>
                            </div>
                            <div className="grid grid-cols-1 md:grid-cols-3 gap-5 mb-5">
                                <div>
                                    <label className={labelStyle}>Father's Name</label>
                                    <input
                                        name="father_name"
                                        value={formData.father_name}
                                        className={inputStyle}
                                        onChange={handleChange}
                                    />
                                </div>
                                <div>
                                    <label className={labelStyle}>Occupation</label>
                                    <input
                                        name="father_occupation"
                                        value={formData.father_occupation}
                                        className={inputStyle}
                                        onChange={handleChange}
                                    />
                                </div>
                                <div>
                                    <label className={labelStyle}>Contact No.</label>
                                    <input
                                        name="father_contact"
                                        value={formData.father_contact}
                                        className={inputStyle}
                                        onChange={handleChange}
                                    />
                                </div>
                            </div>
                            <div className="grid grid-cols-1 md:grid-cols-3 gap-5">
                                <div>
                                    <label className={labelStyle}>Mother's Maiden Name</label>
                                    <input
                                        name="mother_maiden_name"
                                        value={formData.mother_maiden_name}
                                        className={inputStyle}
                                        onChange={handleChange}
                                    />
                                </div>
                                <div>
                                    <label className={labelStyle}>Occupation</label>
                                    <input
                                        name="mother_occupation"
                                        value={formData.mother_occupation}
                                        className={inputStyle}
                                        onChange={handleChange}
                                    />
                                </div>
                                <div>
                                    <label className={labelStyle}>Contact No.</label>
                                    <input
                                        name="mother_contact"
                                        value={formData.mother_contact}
                                        className={inputStyle}
                                        onChange={handleChange}
                                    />
                                </div>
                            </div>
                        </section>
                    )}

                    {currentStep.key === 'education' && (
                        <section>
                            <h2 className={sectionTitle}>5. Educational Details</h2>
                            <div className="grid grid-cols-1 md:grid-cols-3 gap-5">
                                <div className="md:col-span-2">
                                    <label className={labelStyle}>Name of School *</label>
                                    <input
                                        name="school"
                                        required
                                        value={formData.school}
                                        className={inputStyle}
                                        onChange={handleChange}
                                    />
                                </div>
                                <div>
                                    <label className={labelStyle}>Education Level *</label>
                                    <select
                                        name="education_level"
                                        value={formData.education_level}
                                        className={inputStyle}
                                        onChange={handleChange}
                                    >
                                        <option value="Secondary">Secondary</option>
                                        <option value="Tertiary">Tertiary</option>
                                        <option value="Tech-Voc">Tech-Voc</option>
                                    </select>
                                </div>
                            </div>
                            <div className="grid grid-cols-1 md:grid-cols-3 gap-5 mt-5">
                                <div>
                                    <label className={labelStyle}>Degree Earned / Course</label>
                                    <input
                                        name="course"
                                        value={formData.course}
                                        className={inputStyle}
                                        onChange={handleChange}
                                    />
                                </div>
                                <div>
                                    <label className={labelStyle}>Year / Level</label>
                                    <input
                                        name="year_level"
                                        placeholder="e.g. 3rd Year"
                                        value={formData.year_level}
                                        className={inputStyle}
                                        onChange={handleChange}
                                    />
                                </div>
                                <div>
                                    <label className={labelStyle}>Date of Attendance</label>
                                    <input
                                        name="date_of_attendance"
                                        placeholder="e.g. 2023-2024"
                                        value={formData.date_of_attendance}
                                        className={inputStyle}
                                        onChange={handleChange}
                                    />
                                </div>
                            </div>
                        </section>
                    )}

                    <div className="flex flex-col-reverse md:flex-row items-stretch md:items-center justify-between gap-3 border-t border-slate-200 pt-6">
                        <FormStepButton
                            variant="back"
                            onClick={goBack}
                            disabled={currentStepIndex === 0 || loading}
                            className="w-full md:w-auto"
                        >
                            Back
                        </FormStepButton>

                        {!isLastStep ? (
                            <FormStepButton
                                variant="next"
                                onClick={goNext}
                                disabled={!isCurrentStepValid() || loading}
                                className="w-full md:w-auto"
                            >
                                Next
                            </FormStepButton>
                        ) : (
                            <FormStepButton
                                type="submit"
                                variant="submit"
                                loading={loading}
                                disabled={!isCurrentStepValid() || loading}
                                className="w-full md:w-auto"
                            >
                                Submit SPES Application
                            </FormStepButton>
                        )}
                    </div>
                </form>
            </div>
        </div>
    );
};

export default SPESApplication;

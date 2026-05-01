import { useState } from 'react';
import { Upload, X, AlertCircle } from 'lucide-react';
import axios from 'axios';
import { API_BASE_URL } from '../api/config';

interface DILPFormData {
    // Personal Information
    first_name?: string;
    middle_name?: string;
    last_name?: string;
    birth_date?: string;
    gender?: string;

    // DILP Specific Fields
    civil_status?: string;
    educational_attainment?: string;
    work_experience?: string;
    skills?: string;
    business_name?: string;
    business_type?: string;
    business_description?: string;
    years_in_business?: string;
    number_of_employees?: string;
    business_revenue?: string;
    reason_for_training?: string;
    training_objectives?: string;
}

interface DocumentFile {
    type: string;
    file: File | null;
    name: string;
}

const REQUIRED_DILP_DOCUMENTS = [
    { type: 'valid_government_id', name: 'Valid Government-Issued ID' },
    { type: 'project_proposal', name: 'Project Proposal' },
    { type: 'barangay_clearance', name: 'Barangay Clearance' },
    { type: 'business_registration', name: 'Business Registration/DTI' },
];

const DILPApplicationForm = ({ onSuccess }: { onSuccess?: () => void }) => {
    const [formData, setFormData] = useState<DILPFormData>({});
    const [documents, setDocuments] = useState<DocumentFile[]>(
        REQUIRED_DILP_DOCUMENTS.map(doc => ({
            type: doc.type,
            file: null,
            name: doc.name
        }))
    );
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState<string | null>(null);
    const [success, setSuccess] = useState<string | null>(null);

    const token = localStorage.getItem('token');
    const authHeaders = token ? { Authorization: `Bearer ${token}` } : {};

    const handleInputChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement>) => {
        const { name, value } = e.target;
        setFormData(prev => ({ ...prev, [name]: value }));
    };

    const handleFileSelect = (e: React.ChangeEvent<HTMLInputElement>, docType: string) => {
        const file = e.target.files?.[0];
        if (file) {
            if (file.size > 5 * 1024 * 1024) {
                setError(`File size exceeds 5MB limit for ${docType}`);
                return;
            }
            setDocuments(prev =>
                prev.map(doc =>
                    doc.type === docType ? { ...doc, file } : doc
                )
            );
            setError(null);
        }
    };

    const removeFile = (docType: string) => {
        setDocuments(prev =>
            prev.map(doc =>
                doc.type === docType ? { ...doc, file: null } : doc
            )
        );
    };

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        setLoading(true);
        setError(null);
        setSuccess(null);

        try {
            const missingDocs = documents.filter(d => !d.file).map(d => d.name);
            if (missingDocs.length > 0) {
                setError(`Missing required documents: ${missingDocs.join(', ')}`);
                setLoading(false);
                return;
            }

            // Submit DILP application form data
            await axios.post(
                `${API_BASE_URL}/api/applications/apply/dilp/complete`,
                formData,
                { headers: authHeaders }
            );

            // Upload each document
            for (const doc of documents) {
                if (doc.file) {
                    const formDataWithFile = new FormData();
                    formDataWithFile.append('program_type', 'dilp');
                    formDataWithFile.append('document_type', doc.type);
                    formDataWithFile.append('document', doc.file);

                    await axios.post(
                        `${API_BASE_URL}/api/documents/upload`,
                        formDataWithFile,
                        {
                            headers: {
                                ...authHeaders,
                                'Content-Type': 'multipart/form-data'
                            }
                        }
                    );
                }
            }

            setSuccess('DILP application submitted successfully with all documents!');
            setFormData({});
            setDocuments(
                REQUIRED_DILP_DOCUMENTS.map(doc => ({
                    type: doc.type,
                    file: null,
                    name: doc.name
                }))
            );

            if (onSuccess) {
                setTimeout(onSuccess, 2000);
            }
        } catch (err: any) {
            setError(err?.response?.data?.message || 'Failed to submit application. Please try again.');
            console.error('Error submitting application:', err);
        } finally {
            setLoading(false);
        }
    };

    return (
        <div className="max-w-4xl mx-auto bg-white rounded-xl shadow-lg p-6 space-y-6">
            <div>
                <h1 className="text-3xl font-bold text-gray-900">DILP Application</h1>
                <p className="text-gray-600 mt-2">Complete this form to apply for the Development and Improvement of Labor Program (DILP)</p>
            </div>

            {error && (
                <div className="flex gap-3 p-4 bg-red-50 border border-red-200 rounded-lg">
                    <AlertCircle className="text-red-600 flex-shrink-0" size={20} />
                    <p className="text-red-700">{error}</p>
                </div>
            )}

            {success && (
                <div className="flex gap-3 p-4 bg-green-50 border border-green-200 rounded-lg">
                    <div className="text-green-600 flex-shrink-0">✓</div>
                    <p className="text-green-700">{success}</p>
                </div>
            )}

            <form onSubmit={handleSubmit} className="space-y-8">
                {/* Personal Information */}
                <section className="space-y-4">
                    <h2 className="text-xl font-bold text-gray-900 border-b-2 border-purple-500 pb-2">Personal Information</h2>
                    <div className="grid md:grid-cols-2 gap-4">
                        <input
                            type="text"
                            name="first_name"
                            placeholder="First Name"
                            value={formData.first_name || ''}
                            onChange={handleInputChange}
                            className="px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-purple-500 outline-none"
                        />
                        <input
                            type="text"
                            name="middle_name"
                            placeholder="Middle Name"
                            value={formData.middle_name || ''}
                            onChange={handleInputChange}
                            className="px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-purple-500 outline-none"
                        />
                        <input
                            type="text"
                            name="last_name"
                            placeholder="Last Name"
                            value={formData.last_name || ''}
                            onChange={handleInputChange}
                            className="px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-purple-500 outline-none"
                        />
                        <input
                            type="date"
                            name="birth_date"
                            value={formData.birth_date || ''}
                            onChange={handleInputChange}
                            className="px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-purple-500 outline-none"
                        />
                        <select
                            name="gender"
                            value={formData.gender || ''}
                            onChange={handleInputChange}
                            className="px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-purple-500 outline-none"
                        >
                            <option value="">Select Gender</option>
                            <option value="Male">Male</option>
                            <option value="Female">Female</option>
                            <option value="Other">Other</option>
                        </select>
                        <select
                            name="civil_status"
                            value={formData.civil_status || ''}
                            onChange={handleInputChange}
                            className="px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-purple-500 outline-none"
                        >
                            <option value="">Select Civil Status</option>
                            <option value="Single">Single</option>
                            <option value="Married">Married</option>
                            <option value="Divorced">Divorced</option>
                            <option value="Widowed">Widowed</option>
                        </select>
                    </div>
                </section>

                {/* Background Information */}
                <section className="space-y-4">
                    <h2 className="text-xl font-bold text-gray-900 border-b-2 border-purple-500 pb-2">Background Information</h2>
                    <div className="grid md:grid-cols-2 gap-4">
                        <select
                            name="educational_attainment"
                            value={formData.educational_attainment || ''}
                            onChange={handleInputChange}
                            className="px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-purple-500 outline-none"
                        >
                            <option value="">Select Educational Attainment</option>
                            <option value="Elementary">Elementary</option>
                            <option value="High School">High School</option>
                            <option value="Vocational">Vocational</option>
                            <option value="Bachelor's Degree">Bachelor's Degree</option>
                            <option value="Master's Degree">Master's Degree</option>
                        </select>
                        <input
                            type="text"
                            name="work_experience"
                            placeholder="Years of Work Experience"
                            value={formData.work_experience || ''}
                            onChange={handleInputChange}
                            className="px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-purple-500 outline-none"
                        />
                    </div>
                    <textarea
                        name="skills"
                        placeholder="Skills and Competencies"
                        value={formData.skills || ''}
                        onChange={handleInputChange}
                        rows={3}
                        className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-purple-500 outline-none"
                    />
                </section>

                {/* Business Information */}
                <section className="space-y-4">
                    <h2 className="text-xl font-bold text-gray-900 border-b-2 border-purple-500 pb-2">Business Information</h2>
                    <div className="grid md:grid-cols-2 gap-4">
                        <input
                            type="text"
                            name="business_name"
                            placeholder="Business Name"
                            value={formData.business_name || ''}
                            onChange={handleInputChange}
                            className="px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-purple-500 outline-none"
                        />
                        <input
                            type="text"
                            name="business_type"
                            placeholder="Type of Business"
                            value={formData.business_type || ''}
                            onChange={handleInputChange}
                            className="px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-purple-500 outline-none"
                        />
                        <input
                            type="text"
                            name="years_in_business"
                            placeholder="Years in Business"
                            value={formData.years_in_business || ''}
                            onChange={handleInputChange}
                            className="px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-purple-500 outline-none"
                        />
                        <input
                            type="text"
                            name="number_of_employees"
                            placeholder="Number of Employees"
                            value={formData.number_of_employees || ''}
                            onChange={handleInputChange}
                            className="px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-purple-500 outline-none"
                        />
                        <input
                            type="text"
                            name="business_revenue"
                            placeholder="Annual Business Revenue (optional)"
                            value={formData.business_revenue || ''}
                            onChange={handleInputChange}
                            className="px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-purple-500 outline-none"
                        />
                    </div>
                    <textarea
                        name="business_description"
                        placeholder="Describe your business operations"
                        value={formData.business_description || ''}
                        onChange={handleInputChange}
                        rows={4}
                        className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-purple-500 outline-none"
                    />
                </section>

                {/* Training Information */}
                <section className="space-y-4">
                    <h2 className="text-xl font-bold text-gray-900 border-b-2 border-purple-500 pb-2">Training Information</h2>
                    <textarea
                        name="reason_for_training"
                        placeholder="Reason for Applying to DILP Training"
                        value={formData.reason_for_training || ''}
                        onChange={handleInputChange}
                        rows={3}
                        className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-purple-500 outline-none"
                    />
                    <textarea
                        name="training_objectives"
                        placeholder="Training Objectives and Expected Outcomes"
                        value={formData.training_objectives || ''}
                        onChange={handleInputChange}
                        rows={3}
                        className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-purple-500 outline-none"
                    />
                </section>

                {/* Document Upload Section */}
                <section className="space-y-4">
                    <h2 className="text-xl font-bold text-gray-900 border-b-2 border-purple-500 pb-2">Required Documents</h2>
                    <p className="text-gray-600 text-sm">Please upload all required documents (PDF, JPG, PNG max 5MB each)</p>

                    <div className="space-y-3">
                        {documents.map(doc => (
                            <div key={doc.type} className="border-2 border-dashed border-gray-300 rounded-lg p-4 hover:border-purple-500 transition-colors">
                                <div className="flex items-center justify-between">
                                    <div className="flex-1">
                                        <p className="font-medium text-gray-900">{doc.name}</p>
                                        {doc.file && (
                                            <p className="text-sm text-green-600">✓ {doc.file.name}</p>
                                        )}
                                    </div>
                                    {doc.file ? (
                                        <button
                                            type="button"
                                            onClick={() => removeFile(doc.type)}
                                            className="p-2 text-red-600 hover:bg-red-50 rounded-lg transition-colors"
                                        >
                                            <X size={20} />
                                        </button>
                                    ) : (
                                        <label className="cursor-pointer">
                                            <Upload size={20} className="text-gray-400 hover:text-purple-600" />
                                            <input
                                                type="file"
                                                onChange={(e) => handleFileSelect(e, doc.type)}
                                                accept=".pdf,.jpg,.jpeg,.png"
                                                className="hidden"
                                            />
                                        </label>
                                    )}
                                </div>
                            </div>
                        ))}
                    </div>
                </section>

                {/* Submit Button */}
                <div className="flex gap-3 pt-4">
                    <button
                        type="submit"
                        disabled={loading}
                        className="flex-1 bg-purple-600 text-white py-3 rounded-lg font-bold hover:bg-purple-700 transition-colors disabled:opacity-50"
                    >
                        {loading ? 'Submitting...' : 'Submit DILP Application'}
                    </button>
                </div>
            </form>
        </div>
    );
};

export default DILPApplicationForm;

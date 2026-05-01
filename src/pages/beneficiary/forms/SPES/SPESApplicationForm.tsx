import { useState } from 'react';
import { useAutoSave } from '../../../../hooks/useAutoSave';
import { Upload, X, AlertCircle } from 'lucide-react';
import axios from 'axios';
import { API_BASE_URL } from '../../../../api/config';
import { getAuthToken, getUserId } from '../../../../utils/auth.utils';

interface SPESFormData {
    // Personal Information (already in beneficiary table)
    first_name?: string;
    middle_name?: string;
    last_name?: string;
    birth_date?: string;
    gender?: string;

    // SPES Specific Fields
    place_of_birth?: string;
    citizenship?: string;
    civil_status?: string;
    educational_attainment?: string;
    course_taken?: string;
    school_name?: string;
    year_graduated?: string;
    employment_status?: string;
    previous_employer?: string;
    years_work_experience?: string;
    skills?: string;
    reason_for_application?: string;
    other_information?: string;
}

interface DocumentFile {
    type: string;
    file: File | null;
    name: string;
}

const REQUIRED_SPES_DOCUMENTS = [
    { type: 'government_id', name: 'Government-Issued ID (Passport/Driver\'s License)' },
    { type: 'birth_certificate', name: 'Birth Certificate' },
    { type: 'certificate_of_good_moral', name: 'Certificate of Good Moral Character' },
    { type: 'proof_of_enrollment', name: 'Proof of Enrollment (if student)' },
];

const SPESApplicationForm = ({ onSuccess }: { onSuccess?: () => void }) => {
    // Auto-save setup
    const [formData, setFormData] = useState<SPESFormData>({});
    const [isDraftSaved, setIsDraftSaved] = useState(false);

    const { clearDraft } = useAutoSave(formData, {
      key: 'spes_application',
      onSave: () => setIsDraftSaved(true),
      onRestore: (savedData) => {
        if (savedData) {
          setFormData(savedData);
          setIsDraftSaved(true);
        }
      }
    });
    const [documents, setDocuments] = useState<DocumentFile[]>(
        REQUIRED_SPES_DOCUMENTS.map(doc => ({
            type: doc.type,
            file: null,
            name: doc.name
        }))
    );
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState<string | null>(null);
    const [success, setSuccess] = useState<string | null>(null);

    const token = getAuthToken();
    const authHeaders = token ? { Authorization: `Bearer ${token}` } : {};

    const handleInputChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement>) => {
        const { name, value } = e.target;
        setFormData(prev => ({ ...prev, [name]: value }));
    };

    const handleFileSelect = (e: React.ChangeEvent<HTMLInputElement>, docType: string) => {
        const file = e.target.files?.[0];
        if (file) {
            // Check file size (max 5MB)
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
            // Check if all required documents are uploaded
            const missingDocs = documents.filter(d => !d.file).map(d => d.name);
            if (missingDocs.length > 0) {
                setError(`Missing required documents: ${missingDocs.join(', ')}`);
                setLoading(false);
                return;
            }

            const userId = getUserId();
            if (!userId) {
                throw new Error('Authentication required. Please login.');
            }

            // First create SPES application to get application_id
            const initialPayload = { user_id: userId, ...formData };
            const spesResponse = await axios.post(
                `${API_BASE_URL}/api/applications/apply/spes`,
                initialPayload,
                { headers: authHeaders }
            );

            const applicationId = spesResponse.data.id || spesResponse.data.application_id;
            console.log('Created application ID:', applicationId);

            // Upload each document with application_id
            for (const doc of documents) {
                if (doc.file) {
                    const formDataWithFile = new FormData();
                    formDataWithFile.append('application_id', applicationId.toString());
                    formDataWithFile.append('program_type', 'spes');
                    formDataWithFile.append('document_type', doc.type);
                    formDataWithFile.append('document', doc.file);

                    const uploadResponse = await axios.post(
                        `${API_BASE_URL}/api/documents/upload`,
                        formDataWithFile,
                        {
                            headers: {
                                ...authHeaders,
                                'Content-Type': 'multipart/form-data'
                            }
                        }
                    );
                    console.log(`Uploaded ${doc.type}:`, uploadResponse.status);
                }
            }

            setSuccess(`✅ SPES Application #${applicationId} submitted with all 4 documents!`);
            clearDraft(); // Clear auto-save draft
            setFormData({});
            setDocuments(
                REQUIRED_SPES_DOCUMENTS.map(doc => ({
                    type: doc.type,
                    file: null,
                    name: doc.name
                }))
            );
            setIsDraftSaved(false);

            if (onSuccess) {
                setTimeout(onSuccess, 2000);
            }
        } catch (err: any) {
            console.error('SPES Complete Submit Error:', err);
            setError(err?.response?.data?.message || err.message || 'Failed to submit complete application. Please try again.');
        } finally {
            setLoading(false);
        }
    };

    return (
        <div className="max-w-4xl mx-auto bg-white rounded-xl shadow-lg p-6 space-y-6">
            <div>
                <h1 className="text-3xl font-bold text-gray-900">SPES Complete Application</h1>
                <p className="text-gray-600 mt-2">Submit detailed form + required documents</p>
                {isDraftSaved && (
                  <p className="text-sm text-teal-600 bg-teal-50 px-3 py-1 rounded-md mt-2 animate-pulse">
                    💾 Draft auto-saved
                  </p>
                )}
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
                    <h2 className="text-xl font-bold text-gray-900 border-b-2 border-teal-500 pb-2">Personal Information</h2>
                    <div className="grid md:grid-cols-2 gap-4">
                        <input
                            type="text"
                            name="first_name"
                            placeholder="First Name"
                            value={formData.first_name || ''}
                            onChange={handleInputChange}
                            className="px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-teal-500 outline-none"
                            required
                        />
                        <input
                            type="text"
                            name="middle_name"
                            placeholder="Middle Name"
                            value={formData.middle_name || ''}
                            onChange={handleInputChange}
                            className="px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-teal-500 outline-none"
                        />
                        <input
                            type="text"
                            name="last_name"
                            placeholder="Last Name"
                            value={formData.last_name || ''}
                            onChange={handleInputChange}
                            className="px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-teal-500 outline-none"
                            required
                        />
                        <input
                            type="date"
                            name="birth_date"
                            value={formData.birth_date || ''}
                            onChange={handleInputChange}
                            className="px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-teal-500 outline-none"
                            required
                        />
                        <select
                            name="gender"
                            value={formData.gender || ''}
                            onChange={handleInputChange}
                            className="px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-teal-500 outline-none"
                            required
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
                            className="px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-teal-500 outline-none"
                        >
                            <option value="">Select Civil Status</option>
                            <option value="Single">Single</option>
                            <option value="Married">Married</option>
                            <option value="Divorced">Divorced</option>
                            <option value="Widowed">Widowed</option>
                        </select>
                    </div>
                </section>

                {/* SPES Specific Information */}
                <section className="space-y-4">
                    <h2 className="text-xl font-bold text-gray-900 border-b-2 border-teal-500 pb-2">SPES Program Details</h2>
                    <div className="grid md:grid-cols-2 gap-4">
                        <input
                            type="text"
                            name="place_of_birth"
                            placeholder="Place of Birth"
                            value={formData.place_of_birth || ''}
                            onChange={handleInputChange}
                            className="px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-teal-500 outline-none"
                            required
                        />
                        <input
                            type="text"
                            name="citizenship"
                            placeholder="Citizenship"
                            value={formData.citizenship || ''}
                            onChange={handleInputChange}
                            className="px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-teal-500 outline-none"
                            required
                        />
                        <select
                            name="educational_attainment"
                            value={formData.educational_attainment || ''}
                            onChange={handleInputChange}
                            className="px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-teal-500 outline-none"
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
                            name="course_taken"
                            placeholder="Course/Program Taken"
                            value={formData.course_taken || ''}
                            onChange={handleInputChange}
                            className="px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-teal-500 outline-none"
                        />
                        <input
                            type="text"
                            name="school_name"
                            placeholder="School/University Name"
                            value={formData.school_name || ''}
                            onChange={handleInputChange}
                            className="px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-teal-500 outline-none"
                        />
                        <input
                            type="text"
                            name="year_graduated"
                            placeholder="Year Graduated"
                            value={formData.year_graduated || ''}
                            onChange={handleInputChange}
                            className="px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-teal-500 outline-none"
                        />
                        <select
                            name="employment_status"
                            value={formData.employment_status || ''}
                            onChange={handleInputChange}
                            className="px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-teal-500 outline-none"
                        >
                            <option value="">Select Employment Status</option>
                            <option value="Employed">Employed</option>
                            <option value="Unemployed">Unemployed</option>
                            <option value="Self-Employed">Self-Employed</option>
                            <option value="Student">Student</option>
                        </select>
                        <input
                            type="text"
                            name="previous_employer"
                            placeholder="Previous Employer (if applicable)"
                            value={formData.previous_employer || ''}
                            onChange={handleInputChange}
                            className="px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-teal-500 outline-none"
                        />
                        <input
                            type="text"
                            name="years_work_experience"
                            placeholder="Years of Work Experience"
                            value={formData.years_work_experience || ''}
                            onChange={handleInputChange}
                            className="px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-teal-500 outline-none"
                        />
                    </div>
                    <textarea
                        name="skills"
                        placeholder="Skills and Competencies"
                        value={formData.skills || ''}
                        onChange={handleInputChange}
                        rows={3}
                        className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-teal-500 outline-none"
                    />
                    <textarea
                        name="reason_for_application"
                        placeholder="Reason for Applying to SPES"
                        value={formData.reason_for_application || ''}
                        onChange={handleInputChange}
                        rows={3}
                        className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-teal-500 outline-none"
                    />
                    <textarea
                        name="other_information"
                        placeholder="Any Other Information (Optional)"
                        value={formData.other_information || ''}
                        onChange={handleInputChange}
                        rows={3}
                        className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-teal-500 outline-none"
                    />
                </section>

                {/* Document Upload Section */}
                <section className="space-y-4">
                    <h2 className="text-xl font-bold text-gray-900 border-b-2 border-teal-500 pb-2">Required Documents</h2>
                    <p className="text-gray-600 text-sm">Please upload all required documents (PDF, JPG, PNG max 5MB each)</p>

                    <div className="space-y-3">
                        {documents.map(doc => (
                            <div key={doc.type} className="border-2 border-dashed border-gray-300 rounded-lg p-4 hover:border-teal-500 transition-colors">
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
                                            <Upload size={20} className="text-gray-400 hover:text-teal-600" />
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
                        className="flex-1 bg-teal-600 text-white py-3 rounded-lg font-bold hover:bg-teal-700 transition-colors disabled:opacity-50"
                    >
                        {loading ? 'Submitting...' : 'Submit SPES Application'}
                    </button>
                </div>
            </form>
        </div>
    );
};

export default SPESApplicationForm;

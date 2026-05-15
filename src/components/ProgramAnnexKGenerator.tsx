import { useState } from 'react';
import axios from 'axios';
import { API_BASE_URL } from '../api/config';
import { storageGet } from '../utils/storage';
import { FileText, Download, Loader } from 'lucide-react';

interface AnnexKData {
    program_id: number;
    program_name: string;
    location: string;
    start_date: string;
    end_date: string;
    slots: number;
    filled: number;
    daily_wage: number;
    total_days: number;
    total_payout: number;
    beneficiaries: Array<{
        name: string;
        enrollment_date: string;
        status: string;
    }>;
}

interface ProgramAnnexKGeneratorProps {
    programId: number;
    programName: string;
}

function ProgramAnnexKGenerator({ programId, programName }: ProgramAnnexKGeneratorProps) {
    const [loading, setLoading] = useState(false);
    const [annexKData, setAnnexKData] = useState<AnnexKData | null>(null);
    const [showPreview, setShowPreview] = useState(false);
    const [error, setError] = useState<string>('');

    const getAuthHeaders = () => {
        const token = storageGet('token');
        return token ? { Authorization: `Bearer ${token}` } : {};
    };

    const generateAnnexK = async () => {
        setLoading(true);
        setError('');
        try {
            const tokenHeaders = getAuthHeaders();
            const response = await axios.get(
                `${API_BASE_URL}/api/reports/annex-k/${programId}`,
                { headers: tokenHeaders }
            );

            if (response.data.success) {
                setAnnexKData(response.data.data);
                setShowPreview(true);
            } else {
                setError('Failed to generate Annex K report');
            }
        } catch (err: any) {
            console.error('Failed to generate Annex K:', err);
            setError(err.response?.data?.message || 'Unable to generate Annex K report');
        } finally {
            setLoading(false);
        }
    };

    const downloadReport = () => {
        // For now, just log the data. Later we can integrate docxtemplater for .docx generation
        console.log('Annex K Data for download:', annexKData);
        alert('Download functionality will be implemented with docxtemplater for .docx generation');
    };

    return (
        <div className="bg-white rounded-2xl shadow-sm border border-gray-200 overflow-hidden">
            <div className="px-6 py-4 border-b border-gray-200">
                <h2 className="text-lg font-semibold text-slate-900">Annex K Report Generator</h2>
                <p className="text-sm text-gray-500">Generate the Monthly/Completion Accomplishment Report for {programName}</p>
            </div>

            <div className="p-6">
                <div className="flex items-center justify-between">
                    <div>
                        <h3 className="text-sm font-medium text-gray-900">Program: {programName}</h3>
                        <p className="text-xs text-gray-500">ID: {programId}</p>
                    </div>
                    <div className="flex gap-3">
                        <button
                            onClick={generateAnnexK}
                            disabled={loading}
                            className="inline-flex items-center gap-2 rounded-lg bg-teal-600 px-4 py-2 text-sm font-semibold text-white hover:bg-teal-700 disabled:opacity-50 disabled:cursor-not-allowed transition"
                        >
                            {loading ? (
                                <Loader size={16} className="animate-spin" />
                            ) : (
                                <FileText size={16} />
                            )}
                            Generate Report
                        </button>
                        {annexKData && (
                            <button
                                onClick={downloadReport}
                                className="inline-flex items-center gap-2 rounded-lg bg-slate-600 px-4 py-2 text-sm font-semibold text-white hover:bg-slate-700 transition"
                            >
                                <Download size={16} />
                                Download .docx
                            </button>
                        )}
                    </div>
                </div>

                {error && (
                    <div className="mt-4 p-3 bg-red-50 border border-red-200 rounded-lg">
                        <p className="text-sm text-red-700">{error}</p>
                    </div>
                )}

                {showPreview && annexKData && (
                    <div className="mt-6">
                        <div className="flex items-center justify-between mb-4">
                            <h3 className="text-md font-semibold text-gray-900">Report Preview</h3>
                            <button
                                onClick={() => setShowPreview(!showPreview)}
                                className="text-sm text-teal-600 hover:text-teal-700"
                            >
                                {showPreview ? 'Hide' : 'Show'} Preview
                            </button>
                        </div>

                        {showPreview && (
                            <div className="bg-gray-50 rounded-lg p-4 space-y-4">
                                {/* Program Summary */}
                                <div className="grid grid-cols-2 gap-4">
                                    <div>
                                        <h4 className="font-medium text-gray-900">Program Details</h4>
                                        <div className="mt-2 space-y-1 text-sm">
                                            <p><span className="font-medium">Name:</span> {annexKData.program_name}</p>
                                            <p><span className="font-medium">Location:</span> {annexKData.location}</p>
                                            <p><span className="font-medium">Period:</span> {new Date(annexKData.start_date).toLocaleDateString()} - {new Date(annexKData.end_date).toLocaleDateString()}</p>
                                        </div>
                                    </div>
                                    <div>
                                        <h4 className="font-medium text-gray-900">Enrollment Summary</h4>
                                        <div className="mt-2 space-y-1 text-sm">
                                            <p><span className="font-medium">Slots:</span> {annexKData.slots}</p>
                                            <p><span className="font-medium">Filled:</span> {annexKData.filled}</p>
                                            <p><span className="font-medium">Active Beneficiaries:</span> {annexKData.beneficiaries.length}</p>
                                        </div>
                                    </div>
                                </div>

                                {/* Payout Information */}
                                <div>
                                    <h4 className="font-medium text-gray-900">Payout Information</h4>
                                    <div className="mt-2 grid grid-cols-3 gap-4 text-sm">
                                        <p><span className="font-medium">Daily Wage:</span> ₱{annexKData.daily_wage.toLocaleString()}</p>
                                        <p><span className="font-medium">Work Days:</span> {annexKData.total_days}</p>
                                        <p><span className="font-medium">Total Payout:</span> ₱{annexKData.total_payout.toLocaleString()}</p>
                                    </div>
                                </div>

                                {/* Beneficiaries Table */}
                                <div>
                                    <h4 className="font-medium text-gray-900 mb-2">Active Beneficiaries</h4>
                                    <div className="overflow-x-auto">
                                        <table className="min-w-full divide-y divide-gray-200">
                                            <thead className="bg-gray-100">
                                                <tr>
                                                    <th className="px-4 py-2 text-left text-xs font-medium text-gray-500 uppercase">Name</th>
                                                    <th className="px-4 py-2 text-left text-xs font-medium text-gray-500 uppercase">Enrollment Date</th>
                                                    <th className="px-4 py-2 text-left text-xs font-medium text-gray-500 uppercase">Status</th>
                                                </tr>
                                            </thead>
                                            <tbody className="bg-white divide-y divide-gray-200">
                                                {annexKData.beneficiaries.map((beneficiary, index) => (
                                                    <tr key={index}>
                                                        <td className="px-4 py-2 text-sm text-gray-900">{beneficiary.name}</td>
                                                        <td className="px-4 py-2 text-sm text-gray-500">{new Date(beneficiary.enrollment_date).toLocaleDateString()}</td>
                                                        <td className="px-4 py-2 text-sm">
                                                            <span className="px-2 py-1 text-xs font-medium rounded-full bg-green-100 text-green-800">
                                                                {beneficiary.status}
                                                            </span>
                                                        </td>
                                                    </tr>
                                                ))}
                                            </tbody>
                                        </table>
                                    </div>
                                </div>
                            </div>
                        )}
                    </div>
                )}
            </div>
        </div>
    );
}

export default ProgramAnnexKGenerator;
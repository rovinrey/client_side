import { useEffect, useState } from 'react';
import axios from 'axios';
import { API_BASE_URL } from '../api/config';
import { storageGet } from '../utils/storage';
import { FileText, Download, Calendar } from 'lucide-react';

interface AnnexKReport {
    report_id: number;
    program_id: number;
    period_of_work: string;
    detail_of_work: string;
    created_at: string;
    program_name?: string;
}

interface ProgramAnnexKReportsProps {
    programId: number;
    programType: string;
    programName: string;
}

function ProgramAnnexKReports({ programId, programType, programName }: ProgramAnnexKReportsProps) {
    const [reports, setReports] = useState<AnnexKReport[]>([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState<string>('');

    useEffect(() => {
        fetchReports();
    }, [programId]);

    const getAuthHeaders = () => {
        const token = storageGet('token');
        return token ? { Authorization: `Bearer ${token}` } : {};
    };

    const fetchReports = async () => {
        setLoading(true);
        setError('');
        try {
            const tokenHeaders = getAuthHeaders();
            const response = await axios.get(
                `${API_BASE_URL}/api/applications/tupad-reports/program/${programId}`,
                { headers: tokenHeaders }
            );
            setReports(response.data || []);
        } catch (err) {
            console.error('Failed to fetch Annex K reports:', err);
            setError('Unable to load reports for this program.');
        } finally {
            setLoading(false);
        }
    };

    const handleDownloadReport = async (reportId: number) => {
        try {
            const tokenHeaders = getAuthHeaders();
            const response = await axios.get(`${API_BASE_URL}/api/applications/annex-k/export`, {
                headers: tokenHeaders,
                params: { report_id: reportId },
                responseType: 'blob',
            });

            const url = URL.createObjectURL(response.data);
            const anchor = document.createElement('a');
            anchor.href = url;
            anchor.download = `Annex_K_${programName.replace(/\s+/g, '_')}_${new Date().toISOString().slice(0, 10)}.docx`;
            anchor.click();
            URL.revokeObjectURL(url);
        } catch (err) {
            console.error('Export Annex K error:', err);
            setError('Unable to download the report.');
        }
    };

    if (programType.toLowerCase() !== 'tupad') {
        return null; // Only show for TUPAD programs
    }

    return (
        <div className="mt-8 bg-white rounded-2xl border border-slate-200 shadow-sm p-6">
            <div className="flex items-center gap-3 mb-6">
                <FileText size={20} className="text-slate-600" />
                <h3 className="text-lg font-semibold text-slate-900">Annex K Reports</h3>
            </div>

            {error && (
                <div className="mb-4 rounded-xl bg-rose-50 border border-rose-100 p-4 text-sm text-rose-800">
                    {error}
                </div>
            )}

            {loading ? (
                <div className="flex justify-center py-8">
                    <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-teal-600"></div>
                </div>
            ) : reports.length === 0 ? (
                <div className="text-center py-8 text-slate-500">
                    <FileText size={48} className="mx-auto mb-4 text-slate-300" />
                    <p>No Annex K reports found for this program.</p>
                    <p className="text-sm mt-2">Create a report from the Programs page.</p>
                </div>
            ) : (
                <div className="space-y-4">
                    {reports.map((report) => (
                        <div key={report.report_id} className="border border-slate-200 rounded-xl p-4 hover:bg-slate-50 transition-colors">
                            <div className="flex justify-between items-start">
                                <div className="flex-1">
                                    <div className="flex items-center gap-2 mb-2">
                                        <Calendar size={16} className="text-slate-500" />
                                        <span className="text-sm font-medium text-slate-700">
                                            {new Date(report.created_at).toLocaleDateString('en-US', {
                                                year: 'numeric',
                                                month: 'long',
                                                day: 'numeric'
                                            })}
                                        </span>
                                    </div>
                                    <p className="text-sm text-slate-600 mb-2">
                                        <strong>Period:</strong> {report.period_of_work}
                                    </p>
                                    <p className="text-sm text-slate-600 line-clamp-2">
                                        <strong>Details:</strong> {report.detail_of_work}
                                    </p>
                                </div>
                                <button
                                    onClick={() => handleDownloadReport(report.report_id)}
                                    className="inline-flex items-center gap-2 rounded-xl border border-slate-200 bg-white px-4 py-2 text-sm font-semibold text-slate-900 hover:border-slate-300 hover:bg-slate-100 transition"
                                >
                                    <Download size={16} />
                                    Download
                                </button>
                            </div>
                        </div>
                    ))}
                </div>
            )}
        </div>
    );
}

export default ProgramAnnexKReports;
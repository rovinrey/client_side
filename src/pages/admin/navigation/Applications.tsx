import { useState, useEffect } from "react";
import axios from "axios";
import { Download } from "lucide-react";
import { API_BASE_URL } from '../../../api/config';

interface Application {
    id: number;
    user_id?: number;
    first_name: string;
    middle_name?: string | null;
    last_name: string;
    program_type: string;
    contact_number?: string;
    address?: string | null;
    status: string;
    applied_at: string;
}

function Applications() {
    const [apps, setApps] = useState<Application[]>([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);
    const [filter, setFilter] = useState<string>("All");

    const programFilters = ["All", "TUPAD", "SPES", "DILP", "GIP", "Jobseeker"];

    useEffect(() => {
        fetchAllApplications();
    }, []);

    const fetchAllApplications = async () => {
        setLoading(true);
        setError(null);
        try {
            const response = await axios.get(`${API_BASE_URL}/api/applications/all`);
            setApps(response.data);
        } catch (err: any) {
            setError(err.message);
        } finally {
            setLoading(false);
        }
    };

    const filteredApps = filter === "All" ? apps : apps.filter(app => app.program_type === filter);

    const handleExport = async () => {
        try {
            const params = new URLSearchParams();
            if (filter !== 'All') {
                params.append('programType', filter);
            }

            const query = params.toString();
            const url = `${API_BASE_URL}/api/applications/export${query ? `?${query}` : ''}`;

            const response = await axios.get(url, { responseType: 'blob' });
            const blob = new Blob([response.data], {
                type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet'
            });

            const exportName = `applications_${filter.toLowerCase()}.xlsx`;
            const link = document.createElement('a');
            link.href = window.URL.createObjectURL(blob);
            link.download = exportName;
            document.body.appendChild(link);
            link.click();
            link.remove();
            window.URL.revokeObjectURL(link.href);
        } catch (err: any) {
            alert(err?.response?.data?.message || 'Failed to export applications');
        }
    };

    return (
        <div className="max-w-6xl mx-auto p-8">
            <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4 mb-6">
                <h1 className="text-2xl font-bold">All Applications</h1>
                <button
                    onClick={handleExport}
                    className="inline-flex items-center gap-2 px-4 py-2 rounded-lg bg-emerald-600 hover:bg-emerald-700 text-white font-semibold text-sm"
                >
                    <Download size={16} />
                    Export {filter === 'All' ? 'All' : filter} to Excel
                </button>
            </div>

            <div className="mb-5 flex flex-wrap gap-2">
                {programFilters.map((program) => (
                    <button
                        key={program}
                        onClick={() => setFilter(program)}
                        className={`px-3 py-2 rounded-lg text-sm font-semibold border transition-all ${
                            filter === program
                                ? 'bg-teal-600 border-teal-600 text-white'
                                : 'bg-white border-gray-300 text-gray-700 hover:bg-gray-50'
                        }`}
                    >
                        {program}
                    </button>
                ))}
            </div>
            {loading ? (
                <div>Loading...</div>
            ) : error ? (
                <div className="text-red-600">Error: {error}</div>
            ) : (
                <div className="bg-white rounded-xl border border-gray-200 overflow-x-auto">
                    <table className="w-full text-left">
                        <thead className="bg-gray-100">
                            <tr>
                                <th className="px-4 py-3">User ID</th>
                                <th className="px-4 py-3">Applicant Name</th>
                                <th className="px-4 py-3">Program</th>
                                <th className="px-4 py-3">Contact</th>
                                <th className="px-4 py-3">Address</th>
                                <th className="px-4 py-3">Date Applied</th>
                                <th className="px-4 py-3">Status</th>
                            </tr>
                        </thead>
                        <tbody>
                            {filteredApps.map(app => (
                                <tr key={`${app.program_type}-${app.id}`} className="border-t border-gray-100">
                                    <td className="px-4 py-3">{app.user_id ?? 'N/A'}</td>
                                    <td className="px-4 py-3">{app.first_name} {app.middle_name ? app.middle_name + ' ' : ''}{app.last_name}</td>
                                    <td className="px-4 py-3">{app.program_type}</td>
                                    <td className="px-4 py-3">{app.contact_number || '-'}</td>
                                    <td className="px-4 py-3">{app.address || '-'}</td>
                                    <td className="px-4 py-3">{new Date(app.applied_at).toLocaleDateString()}</td>
                                    <td className="px-4 py-3">{app.status}</td>
                                </tr>
                            ))}
                        </tbody>
                    </table>
                </div>
            )}
        </div>
    );
}

export default Applications;

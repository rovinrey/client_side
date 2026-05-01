import { useState, useEffect } from "react";
import axios from "axios";
import { Download, Search } from "lucide-react";
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
    const [searchQuery, setSearchQuery] = useState<string>("");

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

    const filteredApps = apps.filter(app => {
        const matchesProgram = filter === "All" || app.program_type === filter;
        const searchLower = searchQuery.toLowerCase();

        const matchesSearch =
            app.first_name.toLowerCase().includes(searchLower) ||
            app.last_name.toLowerCase().includes(searchLower) ||
            (app.user_id?.toString() || '').includes(searchLower);

        return matchesProgram && matchesSearch;
    });

    const handleExport = async () => {
        try {
            const params = new URLSearchParams();
            if (filter !== 'All') params.append('programType', filter);

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
                    Export {filter === 'All' ? 'All' : filter}
                </button>
            </div>

            {/* Filter + Search Row */}
            <div className="mb-5 flex flex-col sm:flex-row sm:items-center gap-3">
                {/* Filter Buttons */}
                <div className="flex flex-wrap gap-2">
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

                {/* Search Bar */}
                <div className="relative sm:ml-auto">
                    <Search className="absolute left-3 top-2.5 text-gray-400" size={18} />
                    <input
                        type="text"
                        placeholder="Search by name or User ID..."
                        value={searchQuery}
                        onChange={(e) => setSearchQuery(e.target.value)}
                        className="w-full sm:w-64 pl-10 pr-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-teal-500 focus:outline-none text-sm"
                    />
                </div>
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
                            {filteredApps.length > 0 ? (
                                filteredApps.map(app => (
                                    <tr key={`${app.program_type}-${app.id}`} className="border-t border-gray-100">
                                        <td className="px-4 py-3">{app.user_id ?? 'N/A'}</td>
                                        <td className="px-4 py-3">{app.first_name} {app.middle_name ? app.middle_name + ' ' : ''}{app.last_name}</td>
                                        <td className="px-4 py-3">{app.program_type}</td>
                                        <td className="px-4 py-3">{app.contact_number || '-'}</td>
                                        <td className="px-4 py-3">{app.address || '-'}</td>
                                        <td className="px-4 py-3">{new Date(app.applied_at).toLocaleDateString()}</td>
                                        <td className="px-4 py-3">{app.status}</td>
                                    </tr>
                                ))
                            ) : (
                                <tr>
                                    <td colSpan={7} className="px-4 py-8 text-center text-gray-500">
                                        No applications found matching your criteria.
                                    </td>
                                </tr>
                            )}
                        </tbody>
                    </table>
                </div>
            )}
        </div>
    );
}

export default Applications;
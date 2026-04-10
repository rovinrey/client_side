import { useState, useEffect } from "react";
import { Loader, CheckCircle, XCircle } from "lucide-react";
import StatCard from "../../../components/Card";
import axios from "axios";
import { useNavigate } from "react-router-dom";
import { API_BASE_URL } from '../../../api/config';

interface Application {
    id: number;
    user_id?: number;
    first_name: string;
    middle_name: string | null;
    last_name: string;
    program_type: string;
    contact_number: string;
    address?: string | null;
    status: string;
    applied_at: string;
}

function AdminDashboard() {
    const navigate = useNavigate();
    const token = localStorage.getItem("token");
    const authHeaders = token ? { Authorization: `Bearer ${token}` } : undefined;

    // cards
    const [stats, setStats] = useState({
        total_beneficiaries: 0, 
        active_programs: 0,
        total_distributed: 0,
        employment_rate: 0
    });
    
    const [recentApps, setRecentApps] = useState<Application[]>([]); 
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);
    const [processingId, setProcessingId] = useState<number | null>(null);

    useEffect(() => {
        fetchRecentApplications();
        fetchBeneficiaryCount();
        fetchActivePrograms();
    }, []);
    
    // fetch the active programs
    const fetchActivePrograms = async () => {
        try {
            const res = await axios.get(`${API_BASE_URL}/api/programs/allPrograms`, {
                headers: authHeaders,
            });
            setStats(prev => ({ ...prev, active_programs: res.data.length }));
        } catch (err) {
            console.error("Error fetching active programs", err);
        }
    };

    const fetchRecentApplications = async () => {
        setLoading(true);
        setError(null);
        try {
            const response = await axios.get(`${API_BASE_URL}/api/forms/recent?limit=10`, {
                headers: authHeaders,
            });
            setRecentApps(response.data || []);
        } catch (err: any) {
            console.error("Error fetching recent applications:", err);
            setError(err.message);
        } finally {
            setLoading(false);
        }
    };

    const fetchBeneficiaryCount = async () => {
        try {
            const res = await axios.get(`${API_BASE_URL}/api/beneficiaries/count`, {
                headers: authHeaders,
            });
            setStats(prev => ({ ...prev, total_beneficiaries: res.data.count }));
        } catch (err) {
            console.error("Error fetching beneficiary count", err);
        }
    };

    const formatDate = (dateString: string) => {
        const date = new Date(dateString);
        return date.toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' });
    };
    // application status
    const getStatusColor = (status: string) => {
        switch (status) {
            case 'Approved':
                return 'bg-green-100 text-green-700';
            case 'Pending':
                return 'bg-yellow-100 text-yellow-700';
            case 'Rejected':
                return 'bg-red-100 text-red-700';
            default:
                return 'bg-gray-100 text-gray-700';
        }
    };
    
    const handleApprove = async (id: number) => {
        setProcessingId(id);
        try {
            const res = await axios.put(
                `${API_BASE_URL}/api/forms/applications/${id}/approve`,
                {},
                { headers: authHeaders }
            );
            if (res.status === 200) {
                setRecentApps(recentApps.filter(app => app.id !== id));
                alert("Application approved successfully");
                fetchRecentApplications();
            }
        } catch (err) {
            console.error(err);
            alert("Failed to approve application");
        } finally {
            setProcessingId(null);
        }
    };

    const handleReject = async (id: number) => {
        const reason = prompt("Rejection reason (optional):");
        setProcessingId(id);
        try {
            const res = await axios.put(
                `${API_BASE_URL}/api/forms/applications/${id}/reject`,
                { reason: reason || null },
                { headers: authHeaders }
            );
            if (res.status === 200) {
                setRecentApps(recentApps.filter(app => app.id !== id));
                alert("Application rejected");
                fetchRecentApplications();
            }
        } catch (err) {
            console.error(err);
            alert("Failed to reject application");
        } finally {
            setProcessingId(null);
        }
    };

    const handleOpenApplicationDetails = (applicationId: number) => {
        navigate(`/applications/${applicationId}`);
    };

    return (
        <>
            {/* Header section */}
            <div className="mb-8">
                <h1 className="text-2xl font-bold text-gray-900">Admin Dashboard</h1>
                <p className="text-gray-500">System overview and application monitoring</p>
            </div>

            {/* Stats Grid */}
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-10">
                <StatCard title="Total Beneficiaries" value={(stats.total_beneficiaries ?? 0).toLocaleString()} trend="0%" trendLabel="this week" />
                <StatCard title="Active Programs" value={(stats.active_programs ?? 0).toString()} trend="Active" trendLabel="Programs" />
                <StatCard title="Total Distributed" value={`₱${(stats.total_distributed ?? 0).toLocaleString()}`} trend="0%" trendLabel="vs last month" />
                <StatCard title="Employment Rate" value={`${stats.employment_rate ?? 0}%`} trend="0%" trendLabel="growth" />
            </div>

            {/* Recent Applications Table */}
            <div className="bg-white rounded-xl shadow-sm border border-gray-200 overflow-hidden">
                <div className="p-6 border-b border-gray-100 flex justify-between items-center">
                    <h2 className="text-xl font-semibold text-gray-800">Recent Applications</h2>
                    <button
                        onClick={() => navigate('/applications')}
                        className="text-teal-600 hover:text-teal-700 text-sm font-medium"
                    >
                        View All
                    </button>
                </div>

                {loading ? (
                    <div className="p-6 flex justify-center items-center">
                        <Loader className="animate-spin text-teal-600" size={32} />
                    </div>
                ) : error ? (
                    <div className="p-6 text-center text-red-600">
                        <p>Error loading applications: {error}</p>
                    </div>
                ) : recentApps.length === 0 ? (
                    <div className="p-6 text-center text-gray-500">
                        <p>No applications yet</p>
                    </div>
                ) : (
                    <div className="overflow-x-auto">
                        <table className="w-full text-left">
                            <thead className="bg-gray-50 text-gray-600 text-xs uppercase font-semibold">
                                <tr>
                                    <th className="px-6 py-4">User ID</th>
                                    <th className="px-6 py-4">Applicant Name</th>
                                    <th className="px-6 py-4">Program</th>
                                    <th className="px-6 py-4">Contact</th>
                                    <th className="px-6 py-4">Address</th>
                                    <th className="px-6 py-4">Applied On</th>
                                    <th className="px-6 py-4">Status</th>
                                    <th className="px-6 py-4 text-center">Action</th>
                                </tr>
                            </thead>
                            <tbody className="divide-y divide-gray-100">
                                {recentApps.map((app, idx) => (
                                    <tr
                                        key={app.id || idx}
                                        onClick={() => app.id && handleOpenApplicationDetails(app.id)}
                                        onKeyDown={(event) => {
                                            if ((event.key === 'Enter' || event.key === ' ') && app.id) {
                                                event.preventDefault();
                                                handleOpenApplicationDetails(app.id);
                                            }
                                        }}
                                        tabIndex={app.id ? 0 : -1}
                                        className="cursor-pointer hover:bg-gray-50 transition-colors focus:outline-none focus:ring-2 focus:ring-inset focus:ring-teal-500"
                                    >
                                        <td className="px-6 py-4 text-sm text-gray-700">{app.user_id ?? 'N/A'}</td>
                                        <td className="px-6 py-4 font-medium text-gray-900">
                                            {app.first_name} {app.middle_name ? app.middle_name + ' ' : ''}{app.last_name}
                                        </td>
                                        <td className="px-6 py-4">
                                            <span className="px-2 py-1 bg-teal-50 text-teal-700 text-xs rounded-md font-semibold">
                                                {app.program_type}
                                            </span>
                                        </td>
                                        <td className="px-6 py-4 text-sm text-gray-600">
                                            {app.contact_number || '-'}
                                        </td>
                                        <td className="px-6 py-4 text-sm text-gray-600">
                                            {app.address ?? '-'}
                                        </td>
                                        <td className="px-6 py-4 text-sm text-gray-500">
                                            {formatDate(app.applied_at)}
                                        </td>
                                        <td className="px-6 py-4">
                                            <span className={`px-2 py-1 rounded-full text-xs font-medium ${getStatusColor(app.status)}`}>
                                                {app.status}
                                            </span>
                                        </td>
                                        <td className="px-6 py-4 text-center">
                                            {app.status === 'Pending' && app.id ? (
                                                <div className="flex justify-center gap-2">
                                                    <button
                                                        onClick={(event) => {
                                                            event.stopPropagation();
                                                            handleApprove(app.id);
                                                        }}
                                                        disabled={processingId === app.id}
                                                        className="text-green-600 hover:text-green-700 hover:bg-green-50 p-2 rounded-lg transition-colors disabled:opacity-50"
                                                        title="Approve"
                                                    >
                                                        {processingId === app.id ? (
                                                            <Loader size={18} className="animate-spin" />
                                                        ) : (
                                                            <CheckCircle size={18} />
                                                        )}
                                                    </button>
                                                    <button
                                                        onClick={(event) => {
                                                            event.stopPropagation();
                                                            handleReject(app.id);
                                                        }}
                                                        disabled={processingId === app.id}
                                                        className="text-red-600 hover:text-red-700 hover:bg-red-50 p-2 rounded-lg transition-colors disabled:opacity-50"
                                                        title="Reject"
                                                    >
                                                        {processingId === app.id ? (
                                                            <Loader size={18} className="animate-spin" />
                                                        ) : (
                                                            <XCircle size={18} />
                                                        )}
                                                    </button>
                                                </div>
                                            ) : (
                                                <span className="text-gray-400">—</span>
                                            )}
                                        </td>
                                    </tr>
                                ))}
                            </tbody>
                        </table>
                    </div>
                )}
            </div>
        </>
    );
}

export default AdminDashboard;
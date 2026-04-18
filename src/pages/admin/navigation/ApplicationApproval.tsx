import { useState, useEffect } from "react";
import { CheckCircle, XCircle, Loader } from "lucide-react";
import axios from "axios";
import { useNavigate } from "react-router-dom";
import { API_BASE_URL } from '../../../api/config';

interface Application {
    id: number;
    first_name: string;
    middle_name: string | null;
    last_name: string;
    program_type: string;
    contact_number: string;
    address: string | null;
    status: string;
    applied_at: string;
}

const ApplicationApproval = () => {
    const navigate = useNavigate();
    const token = localStorage.getItem('token');
    const authHeaders = token ? { Authorization: `Bearer ${token}` } : undefined;
    const [applications, setApplications] = useState<Application[]>([]);
    const [loading, setLoading] = useState(false);
    const [exporting, setExporting] = useState(false);
    const [processingId, setProcessingId] = useState<number | null>(null);
    const [selectedFilter, setSelectedFilter] = useState("Pending");
    const [selectedProgram, setSelectedProgram] = useState("all");

    const programOptions = [
        { label: "All", value: "all" },
        { label: "TUPAD", value: "tupad" },
        { label: "SPES", value: "spes" },
        { label: "DILP", value: "dilp" },
        { label: "GIP", value: "gip" },
        { label: "Jobseeker", value: "jobseeker" },
    ];

    // Fetch applications on component mount
    useEffect(() => {
        fetchApplications();
    }, [selectedFilter, selectedProgram]);

    const role = localStorage.getItem('role');

    const handleUnauthorized = () => {
        localStorage.removeItem('token');
        localStorage.removeItem('role');
        localStorage.removeItem('user_name');
        localStorage.removeItem('user_id');
        navigate('/login');
    };

    const fetchApplications = async () => {
        setLoading(true);
        try {
            const endpoint =
                selectedFilter === "Pending"
                    ? `${API_BASE_URL}/api/applications/applications/pending`
                    : `${API_BASE_URL}/api/applications/applications`;

            const params: Record<string, string> = {};
            if (selectedFilter !== "Pending") {
                params.status = selectedFilter;
            }
            if (selectedProgram !== "all") {
                params.programType = selectedProgram;
            }

            const response = await axios.get(endpoint, {
                headers: authHeaders,
                params,
            });
            setApplications(response.data);
        } catch (error: any) {
            console.error("Error fetching applications:", error);
            if (error.response?.status === 401 || error.response?.status === 403) {
                handleUnauthorized();
                return;
            }
            alert("Failed to fetch applications");
        } finally {
            setLoading(false);
        }
    };

    const handleExport = async () => {
        if (!['Pending', 'Approved'].includes(selectedFilter)) {
            alert('Export is only available for Pending and Approved applications.');
            return;
        }

        setExporting(true);
        try {
            const params: Record<string, string> = {
                status: selectedFilter,
            };

            if (selectedProgram !== 'all') {
                params.programType = selectedProgram;
            }

            const response = await axios.get(`${API_BASE_URL}/api/applications/export`, {
                headers: authHeaders,
                params,
                responseType: 'blob',
            });

            const blob = new Blob([response.data], {
                type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
            });

            const statusSlug = selectedFilter.toLowerCase();
            const programSlug = selectedProgram;
            const fileName = `applications_${statusSlug}_${programSlug}.xlsx`;

            const downloadUrl = window.URL.createObjectURL(blob);
            const anchor = document.createElement('a');
            anchor.href = downloadUrl;
            anchor.download = fileName;
            document.body.appendChild(anchor);
            anchor.click();
            anchor.remove();
            window.URL.revokeObjectURL(downloadUrl);
        } catch (error: any) {
            console.error('Error exporting applications:', error);
            if (error.response?.status === 401 || error.response?.status === 403) {
                handleUnauthorized();
                return;
            }
            alert('Failed to export applications');
        } finally {
            setExporting(false);
        }
    };

    const handleApprove = async (applicationId: number) => {
        setProcessingId(applicationId);
        try {
            const response = await axios.put(
                `${API_BASE_URL}/api/applications/applications/${applicationId}/approve`,
                {},
                { headers: authHeaders }
            );
            
            if (response.status === 200) {
                const programType = response.data?.programType?.toUpperCase()?.replace('_', ' ') || 'program';
                setApplications(applications.filter(app => app.id !== applicationId));
                alert(`Application approved! Beneficiary has been enrolled in ${programType}.`);
                fetchApplications();
            }
        } catch (error: any) {
            console.error("Error approving application:", error);
            if (error.response?.status === 401 || error.response?.status === 403) {
                handleUnauthorized();
                return;
            }
            alert("Failed to approve application");
        } finally {
            setProcessingId(null);
        }
    };

    const handleReject = async (applicationId: number) => {
        const reason = prompt("Enter rejection reason (optional):");
        setProcessingId(applicationId);
        
        try {
            const response = await axios.put(
                `${API_BASE_URL}/api/applications/applications/${applicationId}/reject`,
                { reason: reason || null },
                { headers: authHeaders }
            );
            
            if (response.status === 200) {
                setApplications(applications.filter(app => app.id !== applicationId));
                alert("Application rejected. The applicant has been notified.");
                fetchApplications();
            }
        } catch (error: any) {
            console.error("Error rejecting application:", error);
            if (error.response?.status === 401 || error.response?.status === 403) {
                handleUnauthorized();
                return;
            }
            alert("Failed to reject application");
        } finally {
            setProcessingId(null);
        }
    };

    const handleOpenApplicationDetails = (applicationId: number) => {
        navigate(`/applications/${applicationId}`);
    };

    return (
        <div className="space-y-6">
            {/* Header */}
            <div>
                <h1 className="text-2xl font-bold text-gray-900">Application Reviews</h1>
                <p className="text-gray-500 text-sm">Review and approve beneficiary applications</p>
            </div>

            <div className="flex flex-col gap-3 sm:flex-row sm:items-end sm:justify-between">
                <div>
                    <label className="block text-xs font-semibold uppercase tracking-wide text-gray-500 mb-1">
                        Program Filter
                    </label>
                    <select
                        value={selectedProgram}
                        onChange={(event) => setSelectedProgram(event.target.value)}
                        className="rounded-lg border border-gray-300 bg-white px-3 py-2 text-sm text-gray-700 outline-none focus:border-teal-500"
                    >
                        {programOptions.map((program) => (
                            <option key={program.value} value={program.value}>
                                {program.label}
                            </option>
                        ))}
                    </select>
                </div>

                <button
                    onClick={handleExport}
                    disabled={exporting}
                    className="rounded-lg bg-emerald-600 px-4 py-2 text-sm font-semibold text-white transition-colors hover:bg-emerald-700 disabled:cursor-not-allowed disabled:opacity-60"
                >
                    {exporting ? 'Exporting...' : `Export ${selectedFilter} to Excel`}
                </button>
            </div>

            {/* Filter Tabs */}
            <div className="flex gap-3 border-b border-gray-200">
                {["Pending", "Approved", "Rejected"].map((status) => (
                    <button
                        key={status}
                        onClick={() => setSelectedFilter(status)}
                        className={`px-4 py-3 font-medium border-b-2 transition-colors ${
                            selectedFilter === status
                                ? "border-teal-600 text-teal-600"
                                : "border-transparent text-gray-600 hover:text-gray-900"
                        }`}
                    >
                        {status}
                    </button>
                ))}
            </div>

            {/* Loading State */}
            {loading && (
                <div className="flex justify-center py-12">
                    <Loader className="animate-spin text-teal-600" size={32} />
                </div>
            )}

            {/* Applications Table */}
            {!loading && applications.length > 0 && (
                <div className="bg-white rounded-2xl shadow-sm overflow-hidden">
                    <div className="overflow-x-auto">
                        <table className="w-full">
                            <thead>
                                <tr className="bg-gray-50 border-b border-gray-200">
                                    <th className="px-6 py-4 text-left text-sm font-semibold text-gray-700">
                                        Applicant Name
                                    </th>
                                    <th className="px-6 py-4 text-left text-sm font-semibold text-gray-700">
                                        Program
                                    </th>
                                    <th className="px-6 py-4 text-left text-sm font-semibold text-gray-700">
                                        Contact
                                    </th>
                                    <th className="px-6 py-4 text-left text-sm font-semibold text-gray-700">
                                        Address
                                    </th>
                                    <th className="px-6 py-4 text-left text-sm font-semibold text-gray-700">
                                        Status
                                    </th>
                                    <th className="px-6 py-4 text-center text-sm font-semibold text-gray-700">
                                        Actions
                                    </th>
                                </tr>
                            </thead>
                            <tbody>
                                {applications.map((app) => (
                                    <tr
                                        key={app.id}
                                        onClick={() => handleOpenApplicationDetails(app.id)}
                                        onKeyDown={(event) => {
                                            if (event.key === "Enter" || event.key === " ") {
                                                event.preventDefault();
                                                handleOpenApplicationDetails(app.id);
                                            }
                                        }}
                                        tabIndex={0}
                                        className="cursor-pointer border-b border-gray-200 hover:bg-gray-50 transition-colors focus:outline-none focus:ring-2 focus:ring-inset focus:ring-teal-500"
                                    >
                                        <td className="px-6 py-4 text-sm text-gray-900 font-medium">
                                            {app.first_name} {app.middle_name} {app.last_name}
                                        </td>
                                        <td className="px-6 py-4 text-sm text-gray-600">
                                            {app.program_type}
                                        </td>
                                        <td className="px-6 py-4 text-sm text-gray-600">
                                            {app.contact_number}
                                        </td>
                                        <td className="px-6 py-4 text-sm text-gray-600">
                                            {app.address || '-'}
                                        </td>
                                        <td className="px-6 py-4 text-sm">
                                            <span
                                                className={`px-3 py-1 rounded-full text-[10px] font-bold uppercase tracking-wider ${
                                                    app.status === "Pending"
                                                        ? "bg-yellow-100 text-yellow-700"
                                                        : app.status === "Approved"
                                                        ? "bg-green-100 text-green-700"
                                                        : "bg-red-100 text-red-700"
                                                }`}
                                            >
                                                {app.status}
                                            </span>
                                        </td>
                                        <td className="px-6 py-4">
                                            <div className="flex justify-center gap-2">
                                                {app.status === "Pending" && role === 'admin' && (
                                                    <>
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
                                                    </>
                                                )}
                                            </div>
                                        </td>
                                    </tr>
                                ))}
                            </tbody>
                        </table>
                    </div>
                </div>
            )}

            {/* Empty State */}
            {!loading && applications.length === 0 && (
                <div className="bg-white rounded-2xl shadow-sm p-12 text-center">
                    <p className="text-gray-500 text-lg">No {selectedFilter.toLowerCase()} applications</p>
                </div>
            )}
        </div>
    );
};

export default ApplicationApproval;

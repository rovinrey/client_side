import { useState, useEffect } from "react";
import { Loader } from "lucide-react";
import axios from "axios";
import { useNavigate } from "react-router-dom";
import { API_BASE_URL } from '../../api/config';

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

const StaffApplications = () => {
    const navigate = useNavigate();
    const token = localStorage.getItem("token");
    const authHeaders = token ? { Authorization: `Bearer ${token}` } : undefined;

    const [applications, setApplications] = useState<Application[]>([]);
    const [loading, setLoading] = useState(false);
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

    useEffect(() => {
        fetchApplications();
    }, [selectedFilter, selectedProgram]);

    const handleUnauthorized = () => {
        localStorage.removeItem("token");
        localStorage.removeItem("role");
        localStorage.removeItem("user_name");
        localStorage.removeItem("user_id");
        navigate("/login");
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

    const handleOpenApplicationDetails = (applicationId: number) => {
        navigate(`/staff/applications/${applicationId}`);
    };

    return (
        <div className="space-y-6">
            {/* Header */}
            <div>
                <h1 className="text-2xl font-bold text-gray-900">Application Reviews</h1>
                <p className="text-gray-500 text-sm">View beneficiary applications</p>
            </div>

            <div className="flex flex-col gap-3 sm:flex-row sm:items-end sm:justify-between">
                <div>
                    <label className="block text-xs font-semibold uppercase tracking-wide text-gray-500 mb-1">
                        Program Filter
                    </label>
                    <select
                        value={selectedProgram}
                        onChange={(e) => setSelectedProgram(e.target.value)}
                        className="rounded-lg border border-gray-300 bg-white px-3 py-2 text-sm text-gray-700 outline-none focus:border-teal-500"
                    >
                        {programOptions.map((program) => (
                            <option key={program.value} value={program.value}>
                                {program.label}
                            </option>
                        ))}
                    </select>
                </div>
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
                                </tr>
                            </thead>
                            <tbody>
                                {applications.map((app) => (
                                    <tr
                                        key={app.id}
                                        onClick={() => handleOpenApplicationDetails(app.id)}
                                        onKeyDown={(e) => {
                                            if (e.key === "Enter" || e.key === " ") {
                                                e.preventDefault();
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
                                            {app.address || "-"}
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

export default StaffApplications;

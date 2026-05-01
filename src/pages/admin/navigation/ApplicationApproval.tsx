import { useState, useEffect } from "react";
import { CheckCircle, XCircle, Loader, Search, UserCheck } from "lucide-react";
import axios from "axios";
import { useNavigate } from "react-router-dom";
import { API_BASE_URL } from '../../../api/config';
import EnrollmentModal from '../../../components/EnrollmentModal';

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
    is_enrolled?: boolean; // NEW: Track enrollment status
    enrollment_program_id?: number; // NEW: Track which program they're enrolled in
}

const ApplicationApproval = () => {
    const navigate = useNavigate();
const token = sessionStorage.getItem('token');
    const authHeaders = token ? { Authorization: `Bearer ${token}` } : undefined;
    const [applications, setApplications] = useState<Application[]>([]);
    const [loading, setLoading] = useState(false);
    const [exporting, setExporting] = useState(false);
    const [processingId, setProcessingId] = useState<number | null>(null);
    const [enrollingId, setEnrollingId] = useState<number | null>(null); // NEW: Track enrolling state
    const [selectedFilter, setSelectedFilter] = useState("Pending");
    const [selectedProgram, setSelectedProgram] = useState("all");
    const [searchQuery, setSearchQuery] = useState("");
    const [enrollmentModalOpen, setEnrollmentModalOpen] = useState(false);
    const [selectedApplicationForEnrollment, setSelectedApplicationForEnrollment] = useState<Application | null>(null);

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

const role = sessionStorage.getItem('role');

    const handleUnauthorized = () => {
        sessionStorage.removeItem('token');
        sessionStorage.removeItem('role');
        sessionStorage.removeItem('user_name');
        sessionStorage.removeItem('user_id');
        navigate('/login');
    };

    const fetchApplications = async () => {      
        setLoading(true);
        try {
            const endpoint =
                selectedFilter === "Pending"
                    ? `${API_BASE_URL}/api/applications/pending`
                    : `${API_BASE_URL}/api/applications`;

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

    // Approve application
    const handleApprove = async (applicationId: number) => {
        setProcessingId(applicationId);
        try {
            const response = await axios.put(
                `${API_BASE_URL}/api/applications/${applicationId}/approve`,
                {},
                { headers: authHeaders }
            );

            if (response.status === 200) {
                const app = applications.find(a => a.id === applicationId);
                if (app) {
                    setSelectedApplicationForEnrollment(app);
                    setEnrollmentModalOpen(true);
                }
                fetchApplications(); // Refresh the list
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

    // FIXED: Handle enrollment completion with better state management
    const handleEnrollmentComplete = async (programId: number) => {
        if (!selectedApplicationForEnrollment) return;
        
        setEnrollingId(selectedApplicationForEnrollment.id);
        
        try {
            // Call API to confirm enrollment
            const response = await axios.post(
                `${API_BASE_URL}/api/beneficiaries/enroll`,
                { applicationId: selectedApplicationForEnrollment.id, programId },
                { headers: authHeaders }
            );
            
            if (response.status === 200) {
                // Update local state to show "Enrolled" button
                setApplications(prev => prev.map(app => 
                    app.id === selectedApplicationForEnrollment.id 
                        ? { 
                            ...app, 
                            is_enrolled: true, 
                            enrollment_program_id: programId 
                          }
                        : app
                ));
                
                // Show success message
                alert(`✅ Successfully enrolled ${selectedApplicationForEnrollment.first_name} ${selectedApplicationForEnrollment.last_name} in the program!`);
                
                // Close modal
                setEnrollmentModalOpen(false);
                setSelectedApplicationForEnrollment(null);
                
                // Optional: Refresh the list after a short delay
                setTimeout(() => {
                    fetchApplications();
                }, 1000);
            }
        } catch (error: any) {
            console.error("Error completing enrollment:", error);
            alert(error.response?.data?.message || "Failed to enroll beneficiary. Please try again.");
        } finally {
            setEnrollingId(null);
        }
    };

    const handleReject = async (applicationId: number) => {
        const reason = prompt("Enter rejection reason (optional):");
        setProcessingId(applicationId);

        try {
        const response = await axios.put(
            `${API_BASE_URL}/api/applications/${applicationId}/reject`,
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

    // Filter applications by search query
    const filteredApplications = applications.filter(app => {
        const searchLower = searchQuery.toLowerCase();
        const fullName = `${app.first_name} ${app.middle_name ?? ''} ${app.last_name}`.toLowerCase();
        return (
            fullName.includes(searchLower) ||
            app.contact_number.toLowerCase().includes(searchLower) ||
            (app.address ?? '').toLowerCase().includes(searchLower)
        );
    });

    return (
        <div className="space-y-6">
            {/* Header */}
            <div>
                <h1 className="text-2xl font-bold text-gray-900">Application Reviews</h1>
                <p className="text-gray-500 text-sm">Review and approve beneficiary applications</p>
            </div>

            {/* Program Filter + Search + Export */}
            <div className="flex flex-col gap-3 sm:flex-row sm:items-end sm:justify-between">
                <div className="flex flex-col sm:flex-row gap-3 sm:items-end">
                    {/* Program Filter */}
                    <div>
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

                    {/* Search Bar */}
                    <div>
                        <div className="relative">
                            <Search className="absolute left-3 top-2.5 text-gray-400" size={16} />
                            <input
                                type="text"
                                placeholder="Search beneficiary name..."
                                value={searchQuery}
                                onChange={(e) => setSearchQuery(e.target.value)}
                                className="pl-9 pr-4 py-2 border border-gray-300 rounded-lg text-sm text-gray-700 outline-none focus:border-teal-500 w-64"
                            />
                        </div>
                    </div>
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
            {!loading && filteredApplications.length > 0 && (
                <div className="bg-white rounded-2xl shadow-sm overflow-hidden">
                    <div className="overflow-x-auto">
                        <table className="w-full">
                            <thead>
                                <tr className="bg-gray-50 border-b border-gray-200">
                                    <th className="px-6 py-4 text-left text-sm font-semibold text-gray-700">Applicant Name</th>
                                    <th className="px-6 py-4 text-left text-sm font-semibold text-gray-700">Program</th>
                                    <th className="px-6 py-4 text-left text-sm font-semibold text-gray-700">Contact</th>
                                    <th className="px-6 py-4 text-left text-sm font-semibold text-gray-700">Address</th>
                                    <th className="px-6 py-4 text-left text-sm font-semibold text-gray-700">Status</th>
                                    <th className="px-6 py-4 text-center text-sm font-semibold text-gray-700">Actions</th>
                                </tr>
                            </thead>
                            <tbody>
                                {filteredApplications.map((app) => (
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
                                            <span className="px-2 py-1 bg-teal-50 text-teal-700 rounded-md text-xs font-medium">
                                                {app.program_type.toUpperCase()}
                                            </span>
                                        </td>
                                        <td className="px-6 py-4 text-sm text-gray-600">{app.contact_number}</td>
                                        <td className="px-6 py-4 text-sm text-gray-600">{app.address || '-'}</td>
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
                                            {/* Backend now filters enrolled, so all Approved here are enrollable */}
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
                                                
                                                {/* FIXED: Enroll button with proper states */}
                                                {app.status === "Approved" && role === 'admin' && (
                                                    // Backend filters out enrolled, so show active Enroll button
                                                    <button
                                                        onClick={(event) => {
                                                            event.stopPropagation();
                                                            setSelectedApplicationForEnrollment(app);
                                                            setEnrollmentModalOpen(true);
                                                        }}
                                                        disabled={enrollingId === app.id}
                                                        className="px-3 py-2 bg-teal-600 text-white rounded-lg hover:bg-teal-700 transition-all hover:scale-105 disabled:opacity-50 text-xs font-medium flex items-center gap-1"
                                                        title="Enroll Beneficiary in Program"
                                                    >
                                                        {enrollingId === app.id ? (
                                                            <>
                                                                <Loader size={14} className="animate-spin" />
                                                                Enrolling...
                                                            </>
                                                        ) : (
                                                            <>
                                                                <UserCheck size={14} />
                                                                Enroll
                                                            </>
                                                        )}
                                                    </button>
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
            {!loading && filteredApplications.length === 0 && (
                <div className="bg-white rounded-2xl shadow-sm p-12 text-center">
                    <p className="text-gray-500 text-lg">No {selectedFilter.toLowerCase()} applications found</p>
                </div>
            )}

            {/* Enrollment Modal */}
            {selectedApplicationForEnrollment && (
                <EnrollmentModal
                    isOpen={enrollmentModalOpen}
                    applicationId={selectedApplicationForEnrollment.id}
                    beneficiaryName={`${selectedApplicationForEnrollment.first_name} ${selectedApplicationForEnrollment.middle_name || ''} ${selectedApplicationForEnrollment.last_name}`}
                    programType={selectedApplicationForEnrollment.program_type}
                    onClose={() => {
                        setEnrollmentModalOpen(false);
                        setSelectedApplicationForEnrollment(null);
                    }}
                    onEnroll={handleEnrollmentComplete}
                />
            )}
        </div>
    );
};

export default ApplicationApproval;
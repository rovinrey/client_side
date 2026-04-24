import { useState, useEffect, useMemo, useCallback } from "react";
import {
    Plus, Search, Download, X, Pencil, Trash2, Eye, ChevronLeft, ChevronRight,
    AlertTriangle, Flag, FlagOff, XCircle, CheckCircle, RefreshCw, ChevronDown, ChevronUp, Users, Copy as CopyIcon
} from "lucide-react";
import axios from "axios";
import { useNavigate, useSearchParams, useLocation } from "react-router-dom";
import { API_BASE_URL } from '../../../api/config';

interface Beneficiary {
    beneficiary_id: number;
    user_id: number | null;
    first_name: string;
    middle_name: string | null;
    last_name: string;
    extension_name: string | null;
    birth_date: string;
    gender: string;
    civil_status: string;
    contact_number: string | null;
    address: string;
    is_active: number;
    application_id: number | null;
    program_type: string | null;
    program_id: number | null;
    program_name: string | null;
    application_status: string | null;
    approval_date: string | null;
    applied_at: string | null;
}

interface BeneficiaryFormData {
    first_name: string;
    middle_name: string;
    last_name: string;
    extension_name: string;
    birth_date: string;
    gender: string;
    civil_status: string;
    contact_number: string;
    address: string;
    program_type: string;
}

// â”€â”€â”€ Program detail defaults â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€
const emptyTupadDetails: Record<string, string> = {
    valid_id_type: "", id_number: "", occupation: "", monthly_income: "",
    work_category: "", job_preference: "", educational_attainment: "",
};

const emptySpesDetails: Record<string, string> = {
    place_of_birth: "", citizenship: "Filipino", social_media_account: "",
    type_of_student: "Student", parent_status: "Living together",
    father_name: "", father_occupation: "", father_contact: "",
    mother_maiden_name: "", mother_occupation: "", mother_contact: "",
    education_level: "Secondary", name_of_school: "", degree_earned_course: "",
    year_level: "", present_address: "", permanent_address: "",
};

const emptyDilpDetails: Record<string, string> = {
    proponent_name: "", email: "", project_title: "", project_type: "Individual",
    category: "Formation", proposed_amount: "", location: "", barangay: "",
    city: "", province: "", contact_person: "", business_experience: "",
    estimated_monthly_income: "", number_of_beneficiaries: "", skills_training: "",
    valid_id_number: "", brief_description: "",
};

const emptyGipDetails: Record<string, string> = {
    valid_id_type: "", id_number: "", educational_attainment: "",
    institution: "", course: "", year_graduated: "",
};

const emptyJobseekersDetails: Record<string, string> = {
    valid_id_type: "", id_number: "", educational_attainment: "",
    skills: "", work_experience: "", preferred_occupation: "",
};

const getEmptyProgramDetails = (program: string): Record<string, string> => {
    if (program === "tupad") return { ...emptyTupadDetails };
    if (program === "spes") return { ...emptySpesDetails };
    if (program === "dilp") return { ...emptyDilpDetails };
    if (program === "gip") return { ...emptyGipDetails };
    if (program === "job_seekers") return { ...emptyJobseekersDetails };
    return {};
};

interface BeneficiaryDetails {
    application: Record<string, any>;
    details: {
        tupad: Record<string, any> | null;
        spes: Record<string, any> | null;
        dilp: Record<string, any> | null;
        gip: Record<string, any> | null;
        jobseeker: Record<string, any> | null;
    };
}

const PROGRAM_OPTIONS = [
    { value: "", label: "Select Program" },
    { value: "tupad", label: "TUPAD" },
    { value: "spes", label: "SPES" },
    { value: "dilp", label: "DILP" },
    { value: "gip", label: "GIP" },
    { value: "job_seekers", label: "Job Seekers" },
];

const GENDER_OPTIONS = ["Male", "Female", "Other"];
const CIVIL_STATUS_OPTIONS = ["Single", "Married", "Widowed", "Separated"];
const ROWS_PER_PAGE = 10;

const emptyForm: BeneficiaryFormData = {
    first_name: "",
    middle_name: "",
    last_name: "",
    extension_name: "",
    birth_date: "",
    gender: "",
    civil_status: "",
    contact_number: "",
    address: "",
    program_type: "",
};

// â”€â”€â”€ Duplicate types â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€
interface DupApplication {
    application_id: number;
    user_id: number;
    program_type: string;
    status: string;
    is_duplicate: number;
    duplicate_notes: string | null;
    applied_at: string | null;
    first_name: string | null;
    middle_name: string | null;
    last_name: string | null;
    birth_date: string | null;
    contact_number: string | null;
    address: string | null;
    email: string | null;
    duplicate_type?: string;
}

interface DupBeneficiary {
    beneficiary_id: number;
    user_id: number | null;
    first_name: string;
    middle_name: string | null;
    last_name: string;
    extension_name: string | null;
    birth_date: string | null;
    gender: string | null;
    civil_status: string | null;
    contact_number: string | null;
    address: string | null;
    is_active: number;
    email: string | null;
    user_name: string | null;
}

interface DupAttendance {
    attendance_id: number;
    user_id: number;
    program_type: string | null;
    attendance_date: string;
    time_in: string | null;
    time_out: string | null;
    attendance_status: string | null;
    beneficiary_name: string | null;
    first_name: string | null;
    last_name: string | null;
    birth_date: string | null;
    email: string | null;
}

type DupCategory = "applications" | "beneficiaries" | "attendance";

// â”€â”€â”€ Component â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€
const BeneficiaryPage = () => {
    const navigate = useNavigate();
    const location = useLocation();
    const [searchParams] = useSearchParams();
    const programFromUrl = searchParams.get("program") || "";

    const [beneficiaries, setBeneficiaries] = useState<Beneficiary[]>([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);

    // Main page tab: "management" or "duplicates"
    const [mainTab, setMainTab] = useState<"management" | "duplicates">("management");

    // Search & Filter
    const [searchQuery, setSearchQuery] = useState("");
    const [programFilter, setProgramFilter] = useState(programFromUrl);

    // Pagination
    const [currentPage, setCurrentPage] = useState(1);

    // Add / Edit modal
    const [showFormModal, setShowFormModal] = useState(false);
    const [formData, setFormData] = useState<BeneficiaryFormData>({ ...emptyForm });
    const [programDetails, setProgramDetails] = useState<Record<string, string>>({});
    const [editingBeneficiary, setEditingBeneficiary] = useState<Beneficiary | null>(null);
    const [formSaving, setFormSaving] = useState(false);
    const [formError, setFormError] = useState<string | null>(null);

    // Delete confirmation
    const [deleteTarget, setDeleteTarget] = useState<Beneficiary | null>(null);
    const [deleting, setDeleting] = useState(false);

    // View details modal
    const [selectedDetails, setSelectedDetails] = useState<BeneficiaryDetails | null>(null);
    const [detailsLoading, setDetailsLoading] = useState(false);
    const [detailsError, setDetailsError] = useState<string | null>(null);

    const getAuthHeaders = () => {
        const token = localStorage.getItem("token");
        return token ? { Authorization: `Bearer ${token}` } : {};
    };

    // â”€â”€â”€ Duplicate checker state â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€
    const [dupCategory, setDupCategory] = useState<DupCategory>("applications");
    const [dupApps, setDupApps] = useState<DupApplication[]>([]);
    const [dupBens, setDupBens] = useState<DupBeneficiary[]>([]);
    const [dupAtt, setDupAtt] = useState<DupAttendance[]>([]);
    const [dupLoading, setDupLoading] = useState(false);
    const [dupError, setDupError] = useState<string | null>(null);
    const [dupSuccess, setDupSuccess] = useState<string | null>(null);
    const [dupSearch, setDupSearch] = useState("");
    const [dupExpandedId, setDupExpandedId] = useState<number | null>(null);
    const [dupNoteInput, setDupNoteInput] = useState("");
    const [dupActionLoading, setDupActionLoading] = useState<number | null>(null);

    const fetchDuplicates = useCallback(async () => {
        setDupLoading(true);
        setDupError(null);
        try {
            if (dupCategory === "applications") {
                const res = await axios.get<{ duplicates: DupApplication[] }>(`${API_BASE_URL}/api/applications/duplicates/detect`, { headers: getAuthHeaders() });
                setDupApps(res.data.duplicates);
            } else if (dupCategory === "beneficiaries") {
                const res = await axios.get<{ duplicates: DupBeneficiary[] }>(`${API_BASE_URL}/api/applications/duplicates/beneficiaries`, { headers: getAuthHeaders() });
                setDupBens(res.data.duplicates);
            } else {
                const res = await axios.get<{ duplicates: DupAttendance[] }>(`${API_BASE_URL}/api/applications/duplicates/attendance`, { headers: getAuthHeaders() });
                setDupAtt(res.data.duplicates);
            }
        } catch (err: any) {
            setDupError(err?.response?.data?.message || "Failed to load duplicates");
        } finally {
            setDupLoading(false);
        }
    }, [dupCategory]);

    useEffect(() => {
        if (mainTab === "duplicates") fetchDuplicates();
    }, [mainTab, fetchDuplicates]);

    // â”€â”€â”€ Duplicate actions â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€
    const dupAppAction = async (appId: number, action: "mark" | "unmark" | "reject" | "keep") => {
        setDupActionLoading(appId);
        setDupSuccess(null);
        try {
            if (action === "mark") {
                await axios.put(`${API_BASE_URL}/api/applications/duplicates/${appId}/mark`, { notes: dupNoteInput || "Marked as duplicate" }, { headers: getAuthHeaders() });
                setDupSuccess(`Application #${appId} marked as duplicate`);
            } else if (action === "unmark") {
                await axios.put(`${API_BASE_URL}/api/applications/duplicates/${appId}/unmark`, {}, { headers: getAuthHeaders() });
                setDupSuccess(`Duplicate flag removed from #${appId}`);
            } else {
                await axios.put(`${API_BASE_URL}/api/applications/duplicates/${appId}/resolve`, { action }, { headers: getAuthHeaders() });
                setDupSuccess(action === "reject" ? `Application #${appId} rejected` : `Application #${appId} kept`);
            }
            setDupExpandedId(null);
            setDupNoteInput("");
            fetchDuplicates();
        } catch (err: any) {
            setDupError(err?.response?.data?.message || "Action failed");
        } finally {
            setDupActionLoading(null);
        }
    };

    const deleteDupBeneficiary = async (id: number) => {
        if (!confirm("Delete this duplicate beneficiary record? This cannot be undone.")) return;
        setDupActionLoading(id);
        try {
            await axios.delete(`${API_BASE_URL}/api/applications/duplicates/beneficiaries/${id}`, { headers: getAuthHeaders() });
            setDupSuccess(`Beneficiary #${id} deleted`);
            fetchDuplicates();
        } catch (err: any) {
            setDupError(err?.response?.data?.message || "Delete failed");
        } finally {
            setDupActionLoading(null);
        }
    };

    const deleteDupAttendance = async (id: number) => {
        if (!confirm("Delete this duplicate attendance record?")) return;
        setDupActionLoading(id);
        try {
            await axios.delete(`${API_BASE_URL}/api/applications/duplicates/attendance/${id}`, { headers: getAuthHeaders() });
            setDupSuccess(`Attendance record #${id} deleted`);
            fetchDuplicates();
        } catch (err: any) {
            setDupError(err?.response?.data?.message || "Delete failed");
        } finally {
            setDupActionLoading(null);
        }
    };

    // â”€â”€â”€ Fetch â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€
    useEffect(() => {
        fetchBeneficiaries();
    }, []);

    const fetchBeneficiaries = async () => {
        setLoading(true);
        setError(null);
        try {
            const res = await axios.get(`${API_BASE_URL}/api/beneficiaries/admin/all`, {
                headers: getAuthHeaders(),
            });
            setBeneficiaries(Array.isArray(res.data) ? res.data : []);
        } catch (err: any) {
            console.error(err);
            // Fallback to the original endpoint
            try {
                const fallback = await axios.get(`${API_BASE_URL}/api/beneficiaries`);
                const rows = Array.isArray(fallback.data) ? fallback.data : [];
                setBeneficiaries(rows);
            } catch {
                setError("Failed to load beneficiaries. Please try again.");
            }
        } finally {
            setLoading(false);
        }
    };

    // â”€â”€â”€ Filtering & Pagination â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€
    const filtered = useMemo(() => {
        let list = beneficiaries;

        if (searchQuery.trim()) {
            const q = searchQuery.toLowerCase();
            list = list.filter((b) => {
                const fullName = `${b.first_name || ""} ${b.middle_name || ""} ${b.last_name || ""}`.toLowerCase();
                const contact = (b.contact_number || "").toLowerCase();
                const address = (b.address || "").toLowerCase();
                return fullName.includes(q) || contact.includes(q) || address.includes(q);
            });
        }

        if (programFilter) {
            list = list.filter((b) => b.program_type === programFilter);
        }

        return list;
    }, [beneficiaries, searchQuery, programFilter]);

    const totalPages = Math.max(1, Math.ceil(filtered.length / ROWS_PER_PAGE));
    const paginated = filtered.slice((currentPage - 1) * ROWS_PER_PAGE, currentPage * ROWS_PER_PAGE);

    // Reset page when filters change
    useEffect(() => {
        setCurrentPage(1);
    }, [searchQuery, programFilter]);

    // â”€â”€â”€ Form handlers â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€
    const openAddModal = () => {
        setEditingBeneficiary(null);
        setFormData({ ...emptyForm });
        setProgramDetails({});
        setFormError(null);
        setShowFormModal(true);
    };

    const openEditModal = (b: Beneficiary) => {
        setEditingBeneficiary(b);
        setFormData({
            first_name: b.first_name || "",
            middle_name: b.middle_name || "",
            last_name: b.last_name || "",
            extension_name: b.extension_name || "",
            birth_date: b.birth_date ? b.birth_date.split("T")[0] : "",
            gender: b.gender || "",
            civil_status: b.civil_status || "",
            contact_number: b.contact_number || "",
            address: b.address || "",
            program_type: b.program_type || "",
        });
        setFormError(null);
        setShowFormModal(true);
    };

    const handleFormChange = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement | HTMLTextAreaElement>) => {
        const { name, value } = e.target;
        setFormData((prev) => ({ ...prev, [name]: value }));
        if (name === "program_type") {
            setProgramDetails(value ? getEmptyProgramDetails(value) : {});
        }
    };

    const handleDetailChange = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement | HTMLTextAreaElement>) => {
        setProgramDetails((prev) => ({ ...prev, [e.target.name]: e.target.value }));
    };

    const handleFormSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        setFormSaving(true);
        setFormError(null);

        try {
            if (editingBeneficiary) {
                // Update
                await axios.put(
                    `${API_BASE_URL}/api/beneficiaries/admin/${editingBeneficiary.beneficiary_id}`,
                    {
                        ...formData,
                        application_id: editingBeneficiary.application_id,
                    },
                    { headers: getAuthHeaders() }
                );
            } else {
                // Create â€” include program_details
                const hasDetails = Object.values(programDetails).some((v) => v.trim() !== "");
                await axios.post(
                    `${API_BASE_URL}/api/beneficiaries/admin`,
                    {
                        ...formData,
                        program_details: hasDetails ? programDetails : undefined,
                    },
                    { headers: getAuthHeaders() }
                );
            }

            setShowFormModal(false);
            await fetchBeneficiaries();
        } catch (err: any) {
            const msg = err.response?.data?.message || "Failed to save beneficiary.";
            setFormError(msg);
        } finally {
            setFormSaving(false);
        }
    };

    // â”€â”€â”€ Delete handler â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€
    const handleDelete = async () => {
        if (!deleteTarget) return;
        setDeleting(true);
        try {
            await axios.delete(
                `${API_BASE_URL}/api/beneficiaries/admin/${deleteTarget.beneficiary_id}`,
                { headers: getAuthHeaders() }
            );
            setDeleteTarget(null);
            await fetchBeneficiaries();
        } catch (err: any) {
            console.error(err);
            alert(err.response?.data?.message || "Failed to delete beneficiary.");
        } finally {
            setDeleting(false);
        }
    };

    // â”€â”€â”€ View details handler â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€
    const openDetails = async (applicationId: number) => {
        setDetailsLoading(true);
        setDetailsError(null);
        setSelectedDetails(null);

        try {
            const res = await axios.get(`${API_BASE_URL}/api/beneficiaries/${applicationId}/details`, {
                headers: getAuthHeaders(),
            });
            setSelectedDetails(res.data);
        } catch {
            setDetailsError("Failed to load beneficiary details.");
        } finally {
            setDetailsLoading(false);
        }
    };

    // â”€â”€â”€ Export handler â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€
    const handleExport = async () => {
        try {
            const res = await axios.get(`${API_BASE_URL}/api/beneficiaries`, { responseType: "blob" });
            // If backend returns json (array), build a CSV client-side
            if (res.headers["content-type"]?.includes("json")) {
                const data = Array.isArray(res.data) ? res.data : [];
                if (data.length === 0) return;
                const headers = Object.keys(data[0]);
                const csv = [
                    headers.join(","),
                    ...data.map((row: any) => headers.map((h) => `"${String(row[h] ?? "").replace(/"/g, '""')}"`).join(","))
                ].join("\n");
                const blob = new Blob([csv], { type: "text/csv" });
                const url = URL.createObjectURL(blob);
                const a = document.createElement("a");
                a.href = url;
                a.download = "beneficiaries.csv";
                a.click();
                URL.revokeObjectURL(url);
            }
        } catch {
            alert("Export failed.");
        }
    };

    // â”€â”€â”€ Helpers â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€
    const toLabel = (value: string) => value.replace(/_/g, " ").replace(/\b\w/g, (c) => c.toUpperCase());

    const fullName = (b: Beneficiary) =>
        `${b.first_name || ""} ${b.middle_name || ""} ${b.last_name || ""}${b.extension_name ? " " + b.extension_name : ""}`.replace(/\s+/g, " ").trim() || "N/A";

    const renderObjectSection = (title: string, data: Record<string, any> | null) => {
        if (!data) return null;
        const entries = Object.entries(data).filter(([, v]) => v !== null && v !== undefined && v !== "");
        if (entries.length === 0) return null;
        return (
            <section className="rounded-xl border border-gray-200 bg-gray-50 p-4">
                <h4 className="text-sm font-bold text-gray-700 uppercase tracking-wide mb-3">{title}</h4>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                    {entries.map(([key, value]) => (
                        <div key={key} className="text-sm">
                            <p className="text-[11px] text-gray-500 uppercase tracking-wider">{toLabel(key)}</p>
                            <p className="font-semibold text-gray-800 break-words">{String(value)}</p>
                        </div>
                    ))}
                </div>
            </section>
        );
    };

    // â”€â”€â”€ Helpers â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€
    const fmtDate = (d: string | null | undefined) => {
        if (!d) return "â€”";
        return new Date(d).toLocaleDateString("en-PH", { year: "numeric", month: "short", day: "numeric" });
    };

    const statusColor = (s: string) => {
        if (s === "Approved") return "bg-green-100 text-green-700";
        if (s === "Rejected") return "bg-red-100 text-red-700";
        return "bg-yellow-100 text-yellow-700";
    };

    const dupAppFullName = (r: DupApplication) =>
        [r.first_name, r.middle_name, r.last_name].filter(Boolean).join(" ") || "â€”";

    const dupBenFullName = (r: DupBeneficiary) =>
        [r.first_name, r.middle_name, r.last_name].filter(Boolean).join(" ") || "â€”";

    // â”€â”€â”€ Render â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€
    return (
        <div className="space-y-6">
            {/* Back to Programs link when navigated from Programs page */}
            {programFromUrl && (
                <button
                    onClick={() => navigate(location.pathname.startsWith('/staff') ? '/staff/programs' : '/programs')}
                    className="flex items-center gap-1 text-sm text-teal-600 hover:text-teal-800 font-medium transition-colors"
                >
                    <ChevronLeft size={16} />
                    Back to Programs
                </button>
            )}

            {/* Page Header */}
            <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
                <div>
                    <h1 className="text-2xl font-bold text-gray-900">
                        {programFromUrl
                            ? `${({tupad:"TUPAD",spes:"SPES",dilp:"DILP",gip:"GIP",job_seekers:"Job Seekers"} as Record<string,string>)[programFromUrl] || programFromUrl.toUpperCase()} Beneficiaries`
                            : "Beneficiary Management"}
                    </h1>
                    <p className="text-sm text-gray-500">
                        {programFromUrl
                            ? `Viewing beneficiaries enrolled in the ${({tupad:"TUPAD",spes:"SPES",dilp:"DILP",gip:"GIP",job_seekers:"Job Seekers"} as Record<string,string>)[programFromUrl] || programFromUrl.toUpperCase()} program.`
                            : "Manage beneficiaries and check for duplicates."}
                    </p>
                </div>
                {mainTab === "management" && (
                    <div className="flex items-center gap-3">
                        <button
                            onClick={handleExport}
                            className="flex items-center gap-2 px-4 py-2 border border-gray-300 rounded-xl text-gray-700 hover:bg-gray-50 transition-all font-medium text-sm"
                        >
                            <Download size={18} />
                            Export
                        </button>
                        <button
                            onClick={openAddModal}
                            className="flex items-center gap-2 px-4 py-2 bg-teal-600 text-white rounded-xl hover:bg-teal-700 transition-all shadow-md shadow-teal-100 font-medium text-sm"
                        >
                            <Plus size={18} />
                            Add Beneficiary
                        </button>
                    </div>
                )}
            </div>

            {/* Main Tab Switcher */}
            <div className="flex rounded-xl border border-gray-200 overflow-hidden bg-white shadow-sm w-fit">
                <button
                    onClick={() => setMainTab("management")}
                    className={`flex items-center gap-2 px-5 py-2.5 text-sm font-semibold transition-colors ${
                        mainTab === "management" ? "bg-teal-600 text-white" : "text-gray-600 hover:bg-gray-50"
                    }`}
                >
                    <Users size={16} /> Beneficiaries
                </button>
                <button
                    onClick={() => setMainTab("duplicates")}
                    className={`flex items-center gap-2 px-5 py-2.5 text-sm font-semibold transition-colors ${
                        mainTab === "duplicates" ? "bg-amber-500 text-white" : "text-gray-600 hover:bg-gray-50"
                    }`}
                >
                    <AlertTriangle size={16} /> Duplicate Checker
                </button>
            </div>

            {/* â•â•â•â•â•â•â• MANAGEMENT TAB â•â•â•â•â•â•â• */}
            {mainTab === "management" && (
            <>
            {/* Filters and Search */}
            <div className="bg-white p-4 rounded-xl border border-gray-200 shadow-sm flex flex-wrap items-center gap-4">
                <div className="relative flex-1 min-w-[300px]">
                    <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" size={18} />
                    <input
                        type="text"
                        placeholder="Search by name, contact, or address..."
                        value={searchQuery}
                        onChange={(e) => setSearchQuery(e.target.value)}
                        className="w-full pl-10 pr-4 py-2 bg-gray-50 border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-teal-500/20 focus:border-teal-500 transition-all"
                    />
                </div>
                <div className="flex items-center gap-2">
                    <select
                        value={programFilter}
                        onChange={(e) => setProgramFilter(e.target.value)}
                        className="bg-gray-50 border border-gray-200 text-gray-600 text-sm rounded-lg px-3 py-2 outline-none focus:ring-2 focus:ring-teal-500/20"
                    >
                        <option value="">All Programs</option>
                        <option value="tupad">TUPAD</option>
                        <option value="spes">SPES</option>
                        <option value="dilp">DILP</option>
                        <option value="gip">GIP</option>
                        <option value="job_seekers">Job Seekers</option>
                    </select>
                </div>
            </div>

            {/* Table */}
            <div className="bg-white rounded-xl border border-gray-200 shadow-sm overflow-hidden">
                {loading ? (
                    <div className="p-6 text-center text-gray-500">Loading beneficiaries...</div>
                ) : error ? (
                    <div className="p-6 text-red-600 text-center">{error}</div>
                ) : filtered.length === 0 ? (
                    <div className="p-6 text-gray-500 text-center">
                        {beneficiaries.length === 0
                            ? "No beneficiaries yet. Click 'Add Beneficiary' to create one."
                            : "No beneficiaries match your search."}
                    </div>
                ) : (
                    <div className="overflow-x-auto">
                        <table className="w-full text-left border-collapse">
                            <thead className="bg-gray-50 border-b border-gray-200">
                                <tr>
                                    <th className="px-6 py-4 text-xs uppercase font-bold text-gray-500 tracking-wider">Name</th>
                                    <th className="px-6 py-4 text-xs uppercase font-bold text-gray-500 tracking-wider">Contact</th>
                                    <th className="px-6 py-4 text-xs uppercase font-bold text-gray-500 tracking-wider">Address</th>
                                    <th className="px-6 py-4 text-xs uppercase font-bold text-gray-500 tracking-wider">Program</th>
                                    <th className="px-6 py-4 text-xs uppercase font-bold text-gray-500 tracking-wider">Gender</th>
                                    <th className="px-6 py-4 text-xs uppercase font-bold text-gray-500 tracking-wider">Status</th>
                                    <th className="px-6 py-4 text-xs uppercase font-bold text-gray-500 tracking-wider text-right">Actions</th>
                                </tr>
                            </thead>
                            <tbody className="divide-y divide-gray-100">
                                {paginated.map((b) => (
                                    <tr key={b.beneficiary_id} className="hover:bg-teal-50/60 transition-colors">
                                        <td className="px-6 py-4">
                                            <span className="font-semibold text-gray-900">{fullName(b)}</span>
                                        </td>
                                        <td className="px-6 py-4 text-sm text-gray-600 font-medium">{b.contact_number || "N/A"}</td>
                                        <td className="px-6 py-4 text-sm text-gray-600 font-medium max-w-[200px] truncate">{b.address || "N/A"}</td>
                                        <td className="px-6 py-4">
                                            <div className="flex flex-col gap-0.5">
                                                <span className="px-2 py-1 rounded-md text-[11px] font-bold uppercase tracking-wider bg-purple-50 text-purple-600 w-fit">
                                                    {b.program_type ? toLabel(b.program_type) : "N/A"}
                                                </span>
                                                {b.program_name && (
                                                    <span className="text-[10px] text-gray-500 font-medium pl-2 truncate max-w-[180px]" title={b.program_name}>
                                                        {b.program_name}
                                                    </span>
                                                )}
                                            </div>
                                        </td>
                                        <td className="px-6 py-4 text-sm text-gray-600">{b.gender || "N/A"}</td>
                                        <td className="px-6 py-4">
                                            <span className={`px-2 py-1 rounded-md text-[11px] font-bold uppercase tracking-wider ${b.is_active ? "bg-green-100 text-green-700" : "bg-gray-100 text-gray-500"}`}>
                                                {b.is_active ? "Active" : "Inactive"}
                                            </span>
                                        </td>
                                        <td className="px-6 py-4">
                                            <div className="flex items-center justify-end gap-1">
                                                {b.application_id && (
                                                    <button
                                                        onClick={() => openDetails(b.application_id!)}
                                                        className="p-2 rounded-lg hover:bg-teal-100 text-teal-600 transition-colors"
                                                        title="View Details"
                                                    >
                                                        <Eye size={16} />
                                                    </button>
                                                )}
                                                <button
                                                    onClick={() => openEditModal(b)}
                                                    className="p-2 rounded-lg hover:bg-amber-100 text-amber-600 transition-colors"
                                                    title="Edit"
                                                >
                                                    <Pencil size={16} />
                                                </button>
                                                <button
                                                    onClick={() => setDeleteTarget(b)}
                                                    className="p-2 rounded-lg hover:bg-red-100 text-red-600 transition-colors"
                                                    title="Delete"
                                                >
                                                    <Trash2 size={16} />
                                                </button>
                                            </div>
                                        </td>
                                    </tr>
                                ))}
                            </tbody>
                        </table>
                    </div>
                )}

                {/* Pagination */}
                <div className="p-4 border-t border-gray-100 flex items-center justify-between text-sm text-gray-500">
                    <span>
                        Showing {filtered.length === 0 ? 0 : (currentPage - 1) * ROWS_PER_PAGE + 1}â€“{Math.min(currentPage * ROWS_PER_PAGE, filtered.length)} of {filtered.length} beneficiaries
                    </span>
                    <div className="flex gap-2">
                        <button
                            onClick={() => setCurrentPage((p) => Math.max(1, p - 1))}
                            disabled={currentPage === 1}
                            className="px-3 py-1 border border-gray-200 rounded-lg hover:bg-gray-50 disabled:opacity-50 flex items-center gap-1"
                        >
                            <ChevronLeft size={14} /> Prev
                        </button>
                        <span className="px-3 py-1 text-gray-700 font-medium">
                            {currentPage} / {totalPages}
                        </span>
                        <button
                            onClick={() => setCurrentPage((p) => Math.min(totalPages, p + 1))}
                            disabled={currentPage === totalPages}
                            className="px-3 py-1 border border-gray-200 rounded-lg hover:bg-gray-50 disabled:opacity-50 flex items-center gap-1"
                        >
                            Next <ChevronRight size={14} />
                        </button>
                    </div>
                </div>
            </div>
            </>
            )}

            {/* â•â•â•â•â•â•â• DUPLICATES TAB â•â•â•â•â•â•â• */}
            {mainTab === "duplicates" && (
            <>
            {/* Success toast */}
            {dupSuccess && (
                <div className="flex items-center gap-2 rounded-xl border border-green-200 bg-green-50 px-4 py-3 text-sm text-green-700">
                    <CheckCircle size={16} /> {dupSuccess}
                    <button onClick={() => setDupSuccess(null)} className="ml-auto text-green-500 hover:text-green-700">Ã—</button>
                </div>
            )}

            {/* Category tabs + controls */}
            <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
                <div className="flex rounded-xl border border-gray-200 overflow-hidden bg-white shadow-sm">
                    {(["applications", "beneficiaries", "attendance"] as DupCategory[]).map((cat) => (
                        <button
                            key={cat}
                            onClick={() => { setDupCategory(cat); setDupExpandedId(null); }}
                            className={`px-4 py-2 text-sm font-semibold capitalize transition-colors ${
                                dupCategory === cat ? "bg-amber-500 text-white" : "text-gray-600 hover:bg-gray-50"
                            }`}
                        >
                            {cat === "attendance" ? "Attendance / Payment" : cat}
                        </button>
                    ))}
                </div>
                <div className="flex items-center gap-3">
                    <div className="relative">
                        <Search size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
                        <input
                            type="text"
                            placeholder="Search name, IDâ€¦"
                            value={dupSearch}
                            onChange={(e) => setDupSearch(e.target.value)}
                            className="pl-9 pr-4 py-2 rounded-lg border border-gray-300 bg-white text-sm focus:outline-none focus:ring-2 focus:ring-amber-500/20 w-52"
                        />
                    </div>
                    <button
                        onClick={fetchDuplicates}
                        disabled={dupLoading}
                        className="flex items-center gap-1.5 px-3 py-2 rounded-lg border border-gray-300 text-gray-600 hover:bg-gray-50 text-sm font-medium disabled:opacity-50"
                    >
                        <RefreshCw size={15} className={dupLoading ? "animate-spin" : ""} /> Scan
                    </button>
                </div>
            </div>

            {dupError && <div className="rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">{dupError}</div>}

            {dupLoading && (
                <div className="flex items-center justify-center rounded-2xl border border-gray-200 bg-white py-16 shadow-sm">
                    <RefreshCw className="animate-spin text-amber-500" size={28} />
                </div>
            )}

            {/* â”€â”€ Applications Duplicates â”€â”€ */}
            {!dupLoading && dupCategory === "applications" && (() => {
                const filtered = dupApps.filter((r) => {
                    if (!dupSearch) return true;
                    const q = dupSearch.toLowerCase();
                    return dupAppFullName(r).toLowerCase().includes(q) || String(r.application_id).includes(q) || (r.email || "").toLowerCase().includes(q);
                });
                // Group by person
                const groups: Record<string, DupApplication[]> = {};
                for (const r of filtered) {
                    const k = `${(r.first_name || "").toLowerCase()}_${(r.last_name || "").toLowerCase()}_${r.birth_date || ""}`;
                    if (!groups[k]) groups[k] = [];
                    groups[k].push(r);
                }
                if (filtered.length === 0) return (
                    <div className="flex flex-col items-center justify-center rounded-2xl border border-gray-200 bg-white py-16 shadow-sm text-gray-500">
                        <CheckCircle size={40} className="mb-3 text-green-400" />
                        <p className="font-semibold text-lg text-gray-700">No duplicate applications found</p>
                        <p className="text-sm mt-1">Click Scan to re-check.</p>
                    </div>
                );
                return Object.entries(groups).map(([key, group]) => (
                    <div key={key} className="rounded-2xl border border-amber-200 bg-white shadow-sm overflow-hidden">
                        <div className="bg-amber-50 px-5 py-3 border-b border-amber-100 flex items-center justify-between">
                            <div className="flex items-center gap-2">
                                <AlertTriangle size={16} className="text-amber-500" />
                                <span className="text-sm font-bold text-amber-800">{dupAppFullName(group[0])}</span>
                                <span className="text-xs text-amber-600">â€” {fmtDate(group[0].birth_date)}</span>
                            </div>
                            <span className="text-xs font-semibold bg-amber-200 text-amber-800 px-2 py-0.5 rounded-full">
                                {group.length} application{group.length > 1 ? "s" : ""}
                            </span>
                        </div>
                        <div className="overflow-x-auto">
                            <table className="w-full text-sm">
                                <thead>
                                    <tr className="text-xs uppercase text-gray-500 border-b border-gray-100">
                                        <th className="px-5 py-3 text-left font-semibold">ID</th>
                                        <th className="px-5 py-3 text-left font-semibold">Program</th>
                                        <th className="px-5 py-3 text-left font-semibold">Status</th>
                                        <th className="px-5 py-3 text-left font-semibold">Applied</th>
                                        <th className="px-5 py-3 text-left font-semibold">Type</th>
                                        <th className="px-5 py-3 text-left font-semibold">Flagged</th>
                                        <th className="px-5 py-3 text-right font-semibold">Actions</th>
                                    </tr>
                                </thead>
                                <tbody>
                                    {group.map((row) => (
                                        <tr key={row.application_id} className="border-b border-gray-50 last:border-0">
                                            <td className="px-5 py-3 font-medium text-gray-900">#{row.application_id}</td>
                                            <td className="px-5 py-3"><span className="uppercase font-semibold text-xs px-2 py-0.5 rounded bg-teal-50 text-teal-700">{row.program_type}</span></td>
                                            <td className="px-5 py-3"><span className={`inline-block text-xs font-bold px-2 py-0.5 rounded-full ${statusColor(row.status)}`}>{row.status}</span></td>
                                            <td className="px-5 py-3 text-gray-600">{fmtDate(row.applied_at)}</td>
                                            <td className="px-5 py-3">
                                                {row.duplicate_type === "same_user_program" ? (
                                                    <span className="text-xs px-2 py-0.5 rounded bg-orange-50 text-orange-700 font-medium">Same User</span>
                                                ) : row.duplicate_type === "same_person_different_account" ? (
                                                    <span className="text-xs px-2 py-0.5 rounded bg-purple-50 text-purple-700 font-medium">Same Person</span>
                                                ) : <span className="text-xs text-gray-400">â€”</span>}
                                            </td>
                                            <td className="px-5 py-3">
                                                {row.is_duplicate ? <span className="flex items-center gap-1 text-xs font-bold text-red-600"><Flag size={13} /> Yes</span> : <span className="text-xs text-gray-400">No</span>}
                                            </td>
                                            <td className="px-5 py-3 text-right">
                                                <div className="flex items-center justify-end gap-1.5">
                                                    <button onClick={() => navigate(`/applications/${row.application_id}`)} className="p-1.5 rounded-lg text-gray-500 hover:bg-gray-100 hover:text-gray-800" title="View details"><Eye size={15} /></button>
                                                    <button onClick={() => { setDupExpandedId(dupExpandedId === row.application_id ? null : row.application_id); setDupNoteInput(row.duplicate_notes || ""); }} className="p-1.5 rounded-lg text-gray-500 hover:bg-amber-50 hover:text-amber-700" title="Actions">
                                                        {dupExpandedId === row.application_id ? <ChevronUp size={15} /> : <ChevronDown size={15} />}
                                                    </button>
                                                </div>
                                            </td>
                                        </tr>
                                    ))}
                                    {group.map((row) => {
                                        if (dupExpandedId !== row.application_id) return null;
                                        const busy = dupActionLoading === row.application_id;
                                        return (
                                            <tr key={`exp-${row.application_id}`}>
                                                <td colSpan={7} className="px-5 py-4 bg-gray-50">
                                                    <div className="flex flex-col gap-3 sm:flex-row sm:items-end">
                                                        <div className="flex-1">
                                                            <label className="text-xs font-semibold text-gray-600 mb-1 block">Notes</label>
                                                            <input type="text" placeholder="Add a noteâ€¦" value={dupNoteInput} onChange={(e) => setDupNoteInput(e.target.value)} className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-amber-500/20" />
                                                        </div>
                                                        <div className="flex items-center gap-2 flex-shrink-0">
                                                            {!row.is_duplicate ? (
                                                                <button disabled={busy} onClick={() => dupAppAction(row.application_id, "mark")} className="flex items-center gap-1.5 px-3 py-2 rounded-lg bg-amber-500 text-white text-xs font-semibold hover:bg-amber-600 disabled:opacity-50"><Flag size={13} /> {busy ? "Savingâ€¦" : "Mark Duplicate"}</button>
                                                            ) : (
                                                                <button disabled={busy} onClick={() => dupAppAction(row.application_id, "unmark")} className="flex items-center gap-1.5 px-3 py-2 rounded-lg bg-gray-200 text-gray-700 text-xs font-semibold hover:bg-gray-300 disabled:opacity-50"><FlagOff size={13} /> {busy ? "Savingâ€¦" : "Unmark"}</button>
                                                            )}
                                                            {row.status !== "Rejected" && (
                                                                <button disabled={busy} onClick={() => dupAppAction(row.application_id, "reject")} className="flex items-center gap-1.5 px-3 py-2 rounded-lg bg-red-600 text-white text-xs font-semibold hover:bg-red-700 disabled:opacity-50"><XCircle size={13} /> {busy ? "â€¦" : "Reject"}</button>
                                                            )}
                                                            {row.is_duplicate && (
                                                                <button disabled={busy} onClick={() => dupAppAction(row.application_id, "keep")} className="flex items-center gap-1.5 px-3 py-2 rounded-lg bg-green-600 text-white text-xs font-semibold hover:bg-green-700 disabled:opacity-50"><CheckCircle size={13} /> {busy ? "â€¦" : "Keep"}</button>
                                                            )}
                                                        </div>
                                                    </div>
                                                    {row.duplicate_notes && <p className="mt-2 text-xs text-gray-500 italic">Note: {row.duplicate_notes}</p>}
                                                </td>
                                            </tr>
                                        );
                                    })}
                                </tbody>
                            </table>
                        </div>
                    </div>
                ));
            })()}

            {/* â”€â”€ Beneficiary Duplicates â”€â”€ */}
            {!dupLoading && dupCategory === "beneficiaries" && (() => {
                const filtered = dupBens.filter((r) => {
                    if (!dupSearch) return true;
                    const q = dupSearch.toLowerCase();
                    return dupBenFullName(r).toLowerCase().includes(q) || String(r.beneficiary_id).includes(q) || (r.email || "").toLowerCase().includes(q);
                });
                const groups: Record<string, DupBeneficiary[]> = {};
                for (const r of filtered) {
                    const k = `${r.first_name.toLowerCase().trim()}_${r.last_name.toLowerCase().trim()}`;
                    if (!groups[k]) groups[k] = [];
                    groups[k].push(r);
                }
                if (filtered.length === 0) return (
                    <div className="flex flex-col items-center justify-center rounded-2xl border border-gray-200 bg-white py-16 shadow-sm text-gray-500">
                        <CheckCircle size={40} className="mb-3 text-green-400" />
                        <p className="font-semibold text-lg text-gray-700">No duplicate beneficiaries found</p>
                    </div>
                );
                return Object.entries(groups).map(([key, group]) => (
                    <div key={key} className="rounded-2xl border border-purple-200 bg-white shadow-sm overflow-hidden">
                        <div className="bg-purple-50 px-5 py-3 border-b border-purple-100 flex items-center justify-between">
                            <div className="flex items-center gap-2">
                                <CopyIcon size={16} className="text-purple-500" />
                                <span className="text-sm font-bold text-purple-800">{dupBenFullName(group[0])}</span>
                            </div>
                            <span className="text-xs font-semibold bg-purple-200 text-purple-800 px-2 py-0.5 rounded-full">{group.length} records</span>
                        </div>
                        <div className="overflow-x-auto">
                            <table className="w-full text-sm">
                                <thead>
                                    <tr className="text-xs uppercase text-gray-500 border-b border-gray-100">
                                        <th className="px-5 py-3 text-left font-semibold">ID</th>
                                        <th className="px-5 py-3 text-left font-semibold">Name</th>
                                        <th className="px-5 py-3 text-left font-semibold">Birth Date</th>
                                        <th className="px-5 py-3 text-left font-semibold">Gender</th>
                                        <th className="px-5 py-3 text-left font-semibold">Contact</th>
                                        <th className="px-5 py-3 text-left font-semibold">Email</th>
                                        <th className="px-5 py-3 text-left font-semibold">Active</th>
                                        <th className="px-5 py-3 text-right font-semibold">Actions</th>
                                    </tr>
                                </thead>
                                <tbody>
                                    {group.map((row) => (
                                        <tr key={row.beneficiary_id} className="border-b border-gray-50 last:border-0">
                                            <td className="px-5 py-3 font-medium text-gray-900">#{row.beneficiary_id}</td>
                                            <td className="px-5 py-3">{dupBenFullName(row)}{row.extension_name ? ` ${row.extension_name}` : ""}</td>
                                            <td className="px-5 py-3 text-gray-600">{fmtDate(row.birth_date)}</td>
                                            <td className="px-5 py-3 text-gray-600">{row.gender || "â€”"}</td>
                                            <td className="px-5 py-3 text-gray-600">{row.contact_number || "â€”"}</td>
                                            <td className="px-5 py-3 text-gray-600">{row.email || "â€”"}</td>
                                            <td className="px-5 py-3">
                                                <span className={`text-xs font-bold px-2 py-0.5 rounded-full ${row.is_active ? "bg-green-100 text-green-700" : "bg-gray-100 text-gray-500"}`}>
                                                    {row.is_active ? "Yes" : "No"}
                                                </span>
                                            </td>
                                            <td className="px-5 py-3 text-right">
                                                <div className="flex items-center justify-end gap-1.5">
                                                    <button
                                                        onClick={() => {
                                                            const b = beneficiaries.find((x) => x.beneficiary_id === row.beneficiary_id);
                                                            if (b) openEditModal(b);
                                                        }}
                                                        className="p-1.5 rounded-lg text-amber-600 hover:bg-amber-50" title="Edit"
                                                    ><Pencil size={15} /></button>
                                                    <button
                                                        disabled={dupActionLoading === row.beneficiary_id}
                                                        onClick={() => deleteDupBeneficiary(row.beneficiary_id)}
                                                        className="p-1.5 rounded-lg text-red-600 hover:bg-red-50 disabled:opacity-50" title="Delete"
                                                    ><Trash2 size={15} /></button>
                                                </div>
                                            </td>
                                        </tr>
                                    ))}
                                </tbody>
                            </table>
                        </div>
                    </div>
                ));
            })()}

            {/* â”€â”€ Attendance / Payment Duplicates â”€â”€ */}
            {!dupLoading && dupCategory === "attendance" && (() => {
                const filtered = dupAtt.filter((r) => {
                    if (!dupSearch) return true;
                    const q = dupSearch.toLowerCase();
                    return (r.beneficiary_name || "").toLowerCase().includes(q) || String(r.attendance_id).includes(q) || (r.email || "").toLowerCase().includes(q);
                });
                const groups: Record<string, DupAttendance[]> = {};
                for (const r of filtered) {
                    const k = `${(r.first_name || "").toLowerCase()}_${(r.last_name || "").toLowerCase()}_${r.attendance_date}`;
                    if (!groups[k]) groups[k] = [];
                    groups[k].push(r);
                }
                if (filtered.length === 0) return (
                    <div className="flex flex-col items-center justify-center rounded-2xl border border-gray-200 bg-white py-16 shadow-sm text-gray-500">
                        <CheckCircle size={40} className="mb-3 text-green-400" />
                        <p className="font-semibold text-lg text-gray-700">No duplicate attendance / payment records found</p>
                    </div>
                );
                return Object.entries(groups).map(([key, group]) => (
                    <div key={key} className="rounded-2xl border border-teal-200 bg-white shadow-sm overflow-hidden">
                        <div className="bg-teal-50 px-5 py-3 border-b border-teal-100 flex items-center justify-between">
                            <div className="flex items-center gap-2">
                                <AlertTriangle size={16} className="text-teal-500" />
                                <span className="text-sm font-bold text-teal-800">{group[0].beneficiary_name || "Unknown"}</span>
                                <span className="text-xs text-teal-600">â€” {fmtDate(group[0].attendance_date)}</span>
                            </div>
                            <span className="text-xs font-semibold bg-teal-200 text-teal-800 px-2 py-0.5 rounded-full">{group.length} records</span>
                        </div>
                        <div className="overflow-x-auto">
                            <table className="w-full text-sm">
                                <thead>
                                    <tr className="text-xs uppercase text-gray-500 border-b border-gray-100">
                                        <th className="px-5 py-3 text-left font-semibold">ID</th>
                                        <th className="px-5 py-3 text-left font-semibold">Name</th>
                                        <th className="px-5 py-3 text-left font-semibold">Date</th>
                                        <th className="px-5 py-3 text-left font-semibold">Time In</th>
                                        <th className="px-5 py-3 text-left font-semibold">Time Out</th>
                                        <th className="px-5 py-3 text-left font-semibold">Status</th>
                                        <th className="px-5 py-3 text-left font-semibold">Program</th>
                                        <th className="px-5 py-3 text-right font-semibold">Actions</th>
                                    </tr>
                                </thead>
                                <tbody>
                                    {group.map((row) => (
                                        <tr key={row.attendance_id} className="border-b border-gray-50 last:border-0">
                                            <td className="px-5 py-3 font-medium text-gray-900">#{row.attendance_id}</td>
                                            <td className="px-5 py-3">{row.beneficiary_name || "â€”"}</td>
                                            <td className="px-5 py-3 text-gray-600">{fmtDate(row.attendance_date)}</td>
                                            <td className="px-5 py-3 text-gray-600">{row.time_in ? new Date(row.time_in).toLocaleTimeString("en-PH", { hour: "2-digit", minute: "2-digit" }) : "â€”"}</td>
                                            <td className="px-5 py-3 text-gray-600">{row.time_out ? new Date(row.time_out).toLocaleTimeString("en-PH", { hour: "2-digit", minute: "2-digit" }) : "â€”"}</td>
                                            <td className="px-5 py-3"><span className={`text-xs font-bold px-2 py-0.5 rounded-full ${row.attendance_status === "Present" ? "bg-green-100 text-green-700" : "bg-yellow-100 text-yellow-700"}`}>{row.attendance_status || "â€”"}</span></td>
                                            <td className="px-5 py-3"><span className="uppercase font-semibold text-xs px-2 py-0.5 rounded bg-teal-50 text-teal-700">{row.program_type || "â€”"}</span></td>
                                            <td className="px-5 py-3 text-right">
                                                <button
                                                    disabled={dupActionLoading === row.attendance_id}
                                                    onClick={() => deleteDupAttendance(row.attendance_id)}
                                                    className="p-1.5 rounded-lg text-red-600 hover:bg-red-50 disabled:opacity-50" title="Delete"
                                                ><Trash2 size={15} /></button>
                                            </td>
                                        </tr>
                                    ))}
                                </tbody>
                            </table>
                        </div>
                    </div>
                ));
            })()}

            {/* Summary */}
            {!dupLoading && (
                <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                    <div className="rounded-xl border border-gray-200 bg-white p-4 shadow-sm">
                        <p className="text-xs font-semibold uppercase text-gray-500">Dup. Applications</p>
                        <p className="text-xl font-bold text-amber-600 mt-1">{dupApps.length}</p>
                    </div>
                    <div className="rounded-xl border border-gray-200 bg-white p-4 shadow-sm">
                        <p className="text-xs font-semibold uppercase text-gray-500">Dup. Beneficiaries</p>
                        <p className="text-xl font-bold text-purple-600 mt-1">{dupBens.length}</p>
                    </div>
                    <div className="rounded-xl border border-gray-200 bg-white p-4 shadow-sm">
                        <p className="text-xs font-semibold uppercase text-gray-500">Dup. Attendance</p>
                        <p className="text-xl font-bold text-teal-600 mt-1">{dupAtt.length}</p>
                    </div>
                </div>
            )}
            </>
            )}

            {/* â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€ Add / Edit Modal â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€ */}
            {showFormModal && (
                <div className="fixed inset-0 z-50 bg-black/50 flex items-center justify-center p-4">
                    <div className="w-full max-w-2xl max-h-[92vh] overflow-y-auto rounded-2xl bg-white border border-gray-200 shadow-2xl">
                        <div className="sticky top-0 bg-white border-b border-gray-100 px-5 py-4 flex items-center justify-between">
                            <div>
                                <h3 className="text-lg font-black text-gray-900">
                                    {editingBeneficiary ? "Edit Beneficiary" : "Add Beneficiary"}
                                </h3>
                                <p className="text-xs text-gray-500">
                                    {editingBeneficiary ? "Update beneficiary information" : "Fill in details to register a new beneficiary"}
                                </p>
                            </div>
                            <button onClick={() => setShowFormModal(false)} className="p-2 rounded-lg hover:bg-gray-100">
                                <X size={18} />
                            </button>
                        </div>

                        <form onSubmit={handleFormSubmit} className="p-5 space-y-5">
                            {formError && (
                                <div className="p-3 bg-red-50 border border-red-200 rounded-lg text-sm text-red-700">{formError}</div>
                            )}

                            {/* Name row */}
                            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                                <div>
                                    <label className="block text-xs font-semibold text-gray-600 mb-1">First Name *</label>
                                    <input
                                        name="first_name"
                                        value={formData.first_name}
                                        onChange={handleFormChange}
                                        required
                                        className="w-full px-3 py-2 border border-gray-200 rounded-lg bg-gray-50 focus:outline-none focus:ring-2 focus:ring-teal-500/20 focus:border-teal-500"
                                    />
                                </div>
                                <div>
                                    <label className="block text-xs font-semibold text-gray-600 mb-1">Middle Name</label>
                                    <input
                                        name="middle_name"
                                        value={formData.middle_name}
                                        onChange={handleFormChange}
                                        className="w-full px-3 py-2 border border-gray-200 rounded-lg bg-gray-50 focus:outline-none focus:ring-2 focus:ring-teal-500/20 focus:border-teal-500"
                                    />
                                </div>
                                <div>
                                    <label className="block text-xs font-semibold text-gray-600 mb-1">Last Name *</label>
                                    <input
                                        name="last_name"
                                        value={formData.last_name}
                                        onChange={handleFormChange}
                                        required
                                        className="w-full px-3 py-2 border border-gray-200 rounded-lg bg-gray-50 focus:outline-none focus:ring-2 focus:ring-teal-500/20 focus:border-teal-500"
                                    />
                                </div>
                            </div>

                            {/* Extension & Birth date */}
                            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                                <div>
                                    <label className="block text-xs font-semibold text-gray-600 mb-1">Extension (Jr, Sr, III)</label>
                                    <input
                                        name="extension_name"
                                        value={formData.extension_name}
                                        onChange={handleFormChange}
                                        className="w-full px-3 py-2 border border-gray-200 rounded-lg bg-gray-50 focus:outline-none focus:ring-2 focus:ring-teal-500/20 focus:border-teal-500"
                                    />
                                </div>
                                <div>
                                    <label className="block text-xs font-semibold text-gray-600 mb-1">Birth Date *</label>
                                    <input
                                        type="date"
                                        name="birth_date"
                                        value={formData.birth_date}
                                        onChange={handleFormChange}
                                        required
                                        className="w-full px-3 py-2 border border-gray-200 rounded-lg bg-gray-50 focus:outline-none focus:ring-2 focus:ring-teal-500/20 focus:border-teal-500"
                                    />
                                </div>
                                <div>
                                    <label className="block text-xs font-semibold text-gray-600 mb-1">Contact Number</label>
                                    <input
                                        name="contact_number"
                                        value={formData.contact_number}
                                        onChange={handleFormChange}
                                        placeholder="09xxxxxxxxx"
                                        className="w-full px-3 py-2 border border-gray-200 rounded-lg bg-gray-50 focus:outline-none focus:ring-2 focus:ring-teal-500/20 focus:border-teal-500"
                                    />
                                </div>
                            </div>

                            {/* Gender, Civil Status, Program */}
                            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                                <div>
                                    <label className="block text-xs font-semibold text-gray-600 mb-1">Gender *</label>
                                    <select
                                        name="gender"
                                        value={formData.gender}
                                        onChange={handleFormChange}
                                        required
                                        className="w-full px-3 py-2 border border-gray-200 rounded-lg bg-gray-50 focus:outline-none focus:ring-2 focus:ring-teal-500/20 focus:border-teal-500"
                                    >
                                        <option value="">Select Gender</option>
                                        {GENDER_OPTIONS.map((g) => (
                                            <option key={g} value={g}>{g}</option>
                                        ))}
                                    </select>
                                </div>
                                <div>
                                    <label className="block text-xs font-semibold text-gray-600 mb-1">Civil Status *</label>
                                    <select
                                        name="civil_status"
                                        value={formData.civil_status}
                                        onChange={handleFormChange}
                                        required
                                        className="w-full px-3 py-2 border border-gray-200 rounded-lg bg-gray-50 focus:outline-none focus:ring-2 focus:ring-teal-500/20 focus:border-teal-500"
                                    >
                                        <option value="">Select Status</option>
                                        {CIVIL_STATUS_OPTIONS.map((s) => (
                                            <option key={s} value={s}>{s}</option>
                                        ))}
                                    </select>
                                </div>
                                <div>
                                    <label className="block text-xs font-semibold text-gray-600 mb-1">Program</label>
                                    <select
                                        name="program_type"
                                        value={formData.program_type}
                                        onChange={handleFormChange}
                                        className="w-full px-3 py-2 border border-gray-200 rounded-lg bg-gray-50 focus:outline-none focus:ring-2 focus:ring-teal-500/20 focus:border-teal-500"
                                    >
                                        {PROGRAM_OPTIONS.map((p) => (
                                            <option key={p.value} value={p.value}>{p.label}</option>
                                        ))}
                                    </select>
                                </div>
                            </div>

                            {/* Address */}
                            <div>
                                <label className="block text-xs font-semibold text-gray-600 mb-1">Address *</label>
                                <textarea
                                    name="address"
                                    value={formData.address}
                                    onChange={handleFormChange}
                                    required
                                    rows={2}
                                    className="w-full px-3 py-2 border border-gray-200 rounded-lg bg-gray-50 focus:outline-none focus:ring-2 focus:ring-teal-500/20 focus:border-teal-500 resize-none"
                                />
                            </div>

                            {/* â”€â”€â”€ Program-Specific Details â”€â”€â”€ */}
                            {!editingBeneficiary && formData.program_type && (
                                <div className="rounded-xl border border-teal-200 bg-teal-50/40 p-4 space-y-4">
                                    <div className="flex items-center gap-2 mb-1">
                                        <div className="flex h-7 w-7 items-center justify-center rounded-lg bg-teal-100 text-teal-600">
                                            <svg className="h-4 w-4" viewBox="0 0 20 20" fill="currentColor"><path fillRule="evenodd" d="M4 4a2 2 0 012-2h4.586A2 2 0 0112 2.586L15.414 6A2 2 0 0116 7.414V16a2 2 0 01-2 2H6a2 2 0 01-2-2V4z" clipRule="evenodd" /></svg>
                                        </div>
                                        <h4 className="text-sm font-bold text-teal-900">
                                            {PROGRAM_OPTIONS.find((p) => p.value === formData.program_type)?.label} Details
                                        </h4>
                                        <span className="ml-auto text-[10px] font-medium text-teal-500 uppercase tracking-wider">Optional</span>
                                    </div>

                                    {/* â”€â”€ TUPAD â”€â”€ */}
                                    {formData.program_type === "tupad" && (
                                        <>
                                            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                                <div>
                                                    <label className="block text-xs font-semibold text-gray-600 mb-1">Valid ID Type</label>
                                                    <select name="valid_id_type" value={programDetails.valid_id_type || ""} onChange={handleDetailChange}
                                                        className="w-full px-3 py-2 border border-gray-200 rounded-lg bg-white focus:outline-none focus:ring-2 focus:ring-teal-500/20 focus:border-teal-500">
                                                        <option value="">Select ID Type</option>
                                                        <option value="SSS">SSS</option><option value="PhilHealth">PhilHealth</option>
                                                        <option value="Pag-IBIG">Pag-IBIG</option><option value="Postal ID">Postal ID</option>
                                                        <option value="Driver's License">Driver's License</option><option value="Voter's ID">Voter's ID</option>
                                                        <option value="National ID">National ID</option><option value="Barangay ID">Barangay ID</option>
                                                        <option value="Other">Other</option>
                                                    </select>
                                                </div>
                                                <div>
                                                    <label className="block text-xs font-semibold text-gray-600 mb-1">ID Number</label>
                                                    <input name="id_number" value={programDetails.id_number || ""} onChange={handleDetailChange} placeholder="Enter ID number"
                                                        className="w-full px-3 py-2 border border-gray-200 rounded-lg bg-white focus:outline-none focus:ring-2 focus:ring-teal-500/20 focus:border-teal-500" />
                                                </div>
                                            </div>
                                            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                                <div>
                                                    <label className="block text-xs font-semibold text-gray-600 mb-1">Occupation</label>
                                                    <input name="occupation" value={programDetails.occupation || ""} onChange={handleDetailChange} placeholder="Current occupation"
                                                        className="w-full px-3 py-2 border border-gray-200 rounded-lg bg-white focus:outline-none focus:ring-2 focus:ring-teal-500/20 focus:border-teal-500" />
                                                </div>
                                                <div>
                                                    <label className="block text-xs font-semibold text-gray-600 mb-1">Monthly Income (â‚±)</label>
                                                    <input name="monthly_income" type="number" value={programDetails.monthly_income || ""} onChange={handleDetailChange} placeholder="0.00"
                                                        className="w-full px-3 py-2 border border-gray-200 rounded-lg bg-white focus:outline-none focus:ring-2 focus:ring-teal-500/20 focus:border-teal-500" />
                                                </div>
                                            </div>
                                            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                                                <div>
                                                    <label className="block text-xs font-semibold text-gray-600 mb-1">Work Category</label>
                                                    <input name="work_category" value={programDetails.work_category || ""} onChange={handleDetailChange} placeholder="e.g. Construction"
                                                        className="w-full px-3 py-2 border border-gray-200 rounded-lg bg-white focus:outline-none focus:ring-2 focus:ring-teal-500/20 focus:border-teal-500" />
                                                </div>
                                                <div>
                                                    <label className="block text-xs font-semibold text-gray-600 mb-1">Job Preference</label>
                                                    <input name="job_preference" value={programDetails.job_preference || ""} onChange={handleDetailChange} placeholder="Preferred work"
                                                        className="w-full px-3 py-2 border border-gray-200 rounded-lg bg-white focus:outline-none focus:ring-2 focus:ring-teal-500/20 focus:border-teal-500" />
                                                </div>
                                                <div>
                                                    <label className="block text-xs font-semibold text-gray-600 mb-1">Educational Attainment</label>
                                                    <select name="educational_attainment" value={programDetails.educational_attainment || ""} onChange={handleDetailChange}
                                                        className="w-full px-3 py-2 border border-gray-200 rounded-lg bg-white focus:outline-none focus:ring-2 focus:ring-teal-500/20 focus:border-teal-500">
                                                        <option value="">Select</option>
                                                        <option value="Elementary">Elementary</option><option value="High School">High School</option>
                                                        <option value="Senior High">Senior High</option><option value="Vocational">Vocational</option>
                                                        <option value="College Level">College Level</option><option value="College Graduate">College Graduate</option>
                                                        <option value="Post-Graduate">Post-Graduate</option>
                                                    </select>
                                                </div>
                                            </div>
                                        </>
                                    )}

                                    {/* â”€â”€ SPES â”€â”€ */}
                                    {formData.program_type === "spes" && (
                                        <>
                                            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                                                <div>
                                                    <label className="block text-xs font-semibold text-gray-600 mb-1">Place of Birth</label>
                                                    <input name="place_of_birth" value={programDetails.place_of_birth || ""} onChange={handleDetailChange}
                                                        className="w-full px-3 py-2 border border-gray-200 rounded-lg bg-white focus:outline-none focus:ring-2 focus:ring-teal-500/20 focus:border-teal-500" />
                                                </div>
                                                <div>
                                                    <label className="block text-xs font-semibold text-gray-600 mb-1">Citizenship</label>
                                                    <input name="citizenship" value={programDetails.citizenship || "Filipino"} onChange={handleDetailChange}
                                                        className="w-full px-3 py-2 border border-gray-200 rounded-lg bg-white focus:outline-none focus:ring-2 focus:ring-teal-500/20 focus:border-teal-500" />
                                                </div>
                                                <div>
                                                    <label className="block text-xs font-semibold text-gray-600 mb-1">Social Media</label>
                                                    <input name="social_media_account" value={programDetails.social_media_account || ""} onChange={handleDetailChange} placeholder="FB / IG handle"
                                                        className="w-full px-3 py-2 border border-gray-200 rounded-lg bg-white focus:outline-none focus:ring-2 focus:ring-teal-500/20 focus:border-teal-500" />
                                                </div>
                                            </div>
                                            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                                                <div>
                                                    <label className="block text-xs font-semibold text-gray-600 mb-1">Type of Student</label>
                                                    <select name="type_of_student" value={programDetails.type_of_student || "Student"} onChange={handleDetailChange}
                                                        className="w-full px-3 py-2 border border-gray-200 rounded-lg bg-white focus:outline-none focus:ring-2 focus:ring-teal-500/20 focus:border-teal-500">
                                                        <option value="Student">Student</option><option value="ALS student">ALS Student</option>
                                                        <option value="out-of-school (OSY)">Out-of-School (OSY)</option>
                                                    </select>
                                                </div>
                                                <div>
                                                    <label className="block text-xs font-semibold text-gray-600 mb-1">Parent Status</label>
                                                    <select name="parent_status" value={programDetails.parent_status || "Living together"} onChange={handleDetailChange}
                                                        className="w-full px-3 py-2 border border-gray-200 rounded-lg bg-white focus:outline-none focus:ring-2 focus:ring-teal-500/20 focus:border-teal-500">
                                                        <option value="Living together">Living Together</option><option value="Solo Parent">Solo Parent</option>
                                                        <option value="Separated">Separated</option>
                                                    </select>
                                                </div>
                                                <div>
                                                    <label className="block text-xs font-semibold text-gray-600 mb-1">Education Level</label>
                                                    <select name="education_level" value={programDetails.education_level || "Secondary"} onChange={handleDetailChange}
                                                        className="w-full px-3 py-2 border border-gray-200 rounded-lg bg-white focus:outline-none focus:ring-2 focus:ring-teal-500/20 focus:border-teal-500">
                                                        <option value="Elementary">Elementary</option><option value="Secondary">Secondary</option>
                                                        <option value="Tertiary">Tertiary</option><option value="Tech-Voc">Tech-Voc</option>
                                                    </select>
                                                </div>
                                            </div>
                                            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                                                <div>
                                                    <label className="block text-xs font-semibold text-gray-600 mb-1">School Name</label>
                                                    <input name="name_of_school" value={programDetails.name_of_school || ""} onChange={handleDetailChange}
                                                        className="w-full px-3 py-2 border border-gray-200 rounded-lg bg-white focus:outline-none focus:ring-2 focus:ring-teal-500/20 focus:border-teal-500" />
                                                </div>
                                                <div>
                                                    <label className="block text-xs font-semibold text-gray-600 mb-1">Course / Track</label>
                                                    <input name="degree_earned_course" value={programDetails.degree_earned_course || ""} onChange={handleDetailChange}
                                                        className="w-full px-3 py-2 border border-gray-200 rounded-lg bg-white focus:outline-none focus:ring-2 focus:ring-teal-500/20 focus:border-teal-500" />
                                                </div>
                                                <div>
                                                    <label className="block text-xs font-semibold text-gray-600 mb-1">Year Level</label>
                                                    <input name="year_level" value={programDetails.year_level || ""} onChange={handleDetailChange} placeholder="e.g. 2nd Year"
                                                        className="w-full px-3 py-2 border border-gray-200 rounded-lg bg-white focus:outline-none focus:ring-2 focus:ring-teal-500/20 focus:border-teal-500" />
                                                </div>
                                            </div>
                                            <p className="text-xs font-semibold text-gray-500 uppercase tracking-wider mt-2">Parent / Guardian Information</p>
                                            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                                                <div>
                                                    <label className="block text-xs font-semibold text-gray-600 mb-1">Father's Name</label>
                                                    <input name="father_name" value={programDetails.father_name || ""} onChange={handleDetailChange}
                                                        className="w-full px-3 py-2 border border-gray-200 rounded-lg bg-white focus:outline-none focus:ring-2 focus:ring-teal-500/20 focus:border-teal-500" />
                                                </div>
                                                <div>
                                                    <label className="block text-xs font-semibold text-gray-600 mb-1">Father's Occupation</label>
                                                    <input name="father_occupation" value={programDetails.father_occupation || ""} onChange={handleDetailChange}
                                                        className="w-full px-3 py-2 border border-gray-200 rounded-lg bg-white focus:outline-none focus:ring-2 focus:ring-teal-500/20 focus:border-teal-500" />
                                                </div>
                                                <div>
                                                    <label className="block text-xs font-semibold text-gray-600 mb-1">Father's Contact</label>
                                                    <input name="father_contact" value={programDetails.father_contact || ""} onChange={handleDetailChange}
                                                        className="w-full px-3 py-2 border border-gray-200 rounded-lg bg-white focus:outline-none focus:ring-2 focus:ring-teal-500/20 focus:border-teal-500" />
                                                </div>
                                            </div>
                                            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                                                <div>
                                                    <label className="block text-xs font-semibold text-gray-600 mb-1">Mother's Maiden Name</label>
                                                    <input name="mother_maiden_name" value={programDetails.mother_maiden_name || ""} onChange={handleDetailChange}
                                                        className="w-full px-3 py-2 border border-gray-200 rounded-lg bg-white focus:outline-none focus:ring-2 focus:ring-teal-500/20 focus:border-teal-500" />
                                                </div>
                                                <div>
                                                    <label className="block text-xs font-semibold text-gray-600 mb-1">Mother's Occupation</label>
                                                    <input name="mother_occupation" value={programDetails.mother_occupation || ""} onChange={handleDetailChange}
                                                        className="w-full px-3 py-2 border border-gray-200 rounded-lg bg-white focus:outline-none focus:ring-2 focus:ring-teal-500/20 focus:border-teal-500" />
                                                </div>
                                                <div>
                                                    <label className="block text-xs font-semibold text-gray-600 mb-1">Mother's Contact</label>
                                                    <input name="mother_contact" value={programDetails.mother_contact || ""} onChange={handleDetailChange}
                                                        className="w-full px-3 py-2 border border-gray-200 rounded-lg bg-white focus:outline-none focus:ring-2 focus:ring-teal-500/20 focus:border-teal-500" />
                                                </div>
                                            </div>
                                            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                                <div>
                                                    <label className="block text-xs font-semibold text-gray-600 mb-1">Present Address</label>
                                                    <input name="present_address" value={programDetails.present_address || ""} onChange={handleDetailChange}
                                                        className="w-full px-3 py-2 border border-gray-200 rounded-lg bg-white focus:outline-none focus:ring-2 focus:ring-teal-500/20 focus:border-teal-500" />
                                                </div>
                                                <div>
                                                    <label className="block text-xs font-semibold text-gray-600 mb-1">Permanent Address</label>
                                                    <input name="permanent_address" value={programDetails.permanent_address || ""} onChange={handleDetailChange}
                                                        className="w-full px-3 py-2 border border-gray-200 rounded-lg bg-white focus:outline-none focus:ring-2 focus:ring-teal-500/20 focus:border-teal-500" />
                                                </div>
                                            </div>
                                        </>
                                    )}

                                    {/* â”€â”€ DILP â”€â”€ */}
                                    {formData.program_type === "dilp" && (
                                        <>
                                            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                                <div>
                                                    <label className="block text-xs font-semibold text-gray-600 mb-1">Proponent Name</label>
                                                    <input name="proponent_name" value={programDetails.proponent_name || ""} onChange={handleDetailChange}
                                                        className="w-full px-3 py-2 border border-gray-200 rounded-lg bg-white focus:outline-none focus:ring-2 focus:ring-teal-500/20 focus:border-teal-500" />
                                                </div>
                                                <div>
                                                    <label className="block text-xs font-semibold text-gray-600 mb-1">Email</label>
                                                    <input name="email" type="email" value={programDetails.email || ""} onChange={handleDetailChange}
                                                        className="w-full px-3 py-2 border border-gray-200 rounded-lg bg-white focus:outline-none focus:ring-2 focus:ring-teal-500/20 focus:border-teal-500" />
                                                </div>
                                            </div>
                                            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                                                <div>
                                                    <label className="block text-xs font-semibold text-gray-600 mb-1">Project Title</label>
                                                    <input name="project_title" value={programDetails.project_title || ""} onChange={handleDetailChange}
                                                        className="w-full px-3 py-2 border border-gray-200 rounded-lg bg-white focus:outline-none focus:ring-2 focus:ring-teal-500/20 focus:border-teal-500" />
                                                </div>
                                                <div>
                                                    <label className="block text-xs font-semibold text-gray-600 mb-1">Project Type</label>
                                                    <select name="project_type" value={programDetails.project_type || "Individual"} onChange={handleDetailChange}
                                                        className="w-full px-3 py-2 border border-gray-200 rounded-lg bg-white focus:outline-none focus:ring-2 focus:ring-teal-500/20 focus:border-teal-500">
                                                        <option value="Individual">Individual</option><option value="Group">Group</option>
                                                    </select>
                                                </div>
                                                <div>
                                                    <label className="block text-xs font-semibold text-gray-600 mb-1">Category</label>
                                                    <select name="category" value={programDetails.category || "Formation"} onChange={handleDetailChange}
                                                        className="w-full px-3 py-2 border border-gray-200 rounded-lg bg-white focus:outline-none focus:ring-2 focus:ring-teal-500/20 focus:border-teal-500">
                                                        <option value="Formation">Formation</option><option value="Enhancement">Enhancement</option>
                                                        <option value="Restoration">Restoration</option>
                                                    </select>
                                                </div>
                                            </div>
                                            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                                                <div>
                                                    <label className="block text-xs font-semibold text-gray-600 mb-1">Proposed Amount (â‚±)</label>
                                                    <input name="proposed_amount" type="number" value={programDetails.proposed_amount || ""} onChange={handleDetailChange} placeholder="0.00"
                                                        className="w-full px-3 py-2 border border-gray-200 rounded-lg bg-white focus:outline-none focus:ring-2 focus:ring-teal-500/20 focus:border-teal-500" />
                                                </div>
                                                <div>
                                                    <label className="block text-xs font-semibold text-gray-600 mb-1">Location</label>
                                                    <input name="location" value={programDetails.location || ""} onChange={handleDetailChange}
                                                        className="w-full px-3 py-2 border border-gray-200 rounded-lg bg-white focus:outline-none focus:ring-2 focus:ring-teal-500/20 focus:border-teal-500" />
                                                </div>
                                                <div>
                                                    <label className="block text-xs font-semibold text-gray-600 mb-1">Valid ID Number</label>
                                                    <input name="valid_id_number" value={programDetails.valid_id_number || ""} onChange={handleDetailChange}
                                                        className="w-full px-3 py-2 border border-gray-200 rounded-lg bg-white focus:outline-none focus:ring-2 focus:ring-teal-500/20 focus:border-teal-500" />
                                                </div>
                                            </div>
                                            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                                                <div>
                                                    <label className="block text-xs font-semibold text-gray-600 mb-1">Barangay</label>
                                                    <input name="barangay" value={programDetails.barangay || ""} onChange={handleDetailChange}
                                                        className="w-full px-3 py-2 border border-gray-200 rounded-lg bg-white focus:outline-none focus:ring-2 focus:ring-teal-500/20 focus:border-teal-500" />
                                                </div>
                                                <div>
                                                    <label className="block text-xs font-semibold text-gray-600 mb-1">City</label>
                                                    <input name="city" value={programDetails.city || ""} onChange={handleDetailChange}
                                                        className="w-full px-3 py-2 border border-gray-200 rounded-lg bg-white focus:outline-none focus:ring-2 focus:ring-teal-500/20 focus:border-teal-500" />
                                                </div>
                                                <div>
                                                    <label className="block text-xs font-semibold text-gray-600 mb-1">Province</label>
                                                    <input name="province" value={programDetails.province || ""} onChange={handleDetailChange}
                                                        className="w-full px-3 py-2 border border-gray-200 rounded-lg bg-white focus:outline-none focus:ring-2 focus:ring-teal-500/20 focus:border-teal-500" />
                                                </div>
                                            </div>
                                            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                                <div>
                                                    <label className="block text-xs font-semibold text-gray-600 mb-1">Contact Person</label>
                                                    <input name="contact_person" value={programDetails.contact_person || ""} onChange={handleDetailChange}
                                                        className="w-full px-3 py-2 border border-gray-200 rounded-lg bg-white focus:outline-none focus:ring-2 focus:ring-teal-500/20 focus:border-teal-500" />
                                                </div>
                                                <div>
                                                    <label className="block text-xs font-semibold text-gray-600 mb-1">Est. Monthly Income (â‚±)</label>
                                                    <input name="estimated_monthly_income" type="number" value={programDetails.estimated_monthly_income || ""} onChange={handleDetailChange} placeholder="0.00"
                                                        className="w-full px-3 py-2 border border-gray-200 rounded-lg bg-white focus:outline-none focus:ring-2 focus:ring-teal-500/20 focus:border-teal-500" />
                                                </div>
                                            </div>
                                            <div>
                                                <label className="block text-xs font-semibold text-gray-600 mb-1">Brief Description</label>
                                                <textarea name="brief_description" value={programDetails.brief_description || ""} onChange={handleDetailChange} rows={2}
                                                    className="w-full px-3 py-2 border border-gray-200 rounded-lg bg-white focus:outline-none focus:ring-2 focus:ring-teal-500/20 focus:border-teal-500 resize-none" />
                                            </div>
                                            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                                <div>
                                                    <label className="block text-xs font-semibold text-gray-600 mb-1">Business Experience</label>
                                                    <textarea name="business_experience" value={programDetails.business_experience || ""} onChange={handleDetailChange} rows={2}
                                                        className="w-full px-3 py-2 border border-gray-200 rounded-lg bg-white focus:outline-none focus:ring-2 focus:ring-teal-500/20 focus:border-teal-500 resize-none" />
                                                </div>
                                                <div>
                                                    <label className="block text-xs font-semibold text-gray-600 mb-1">Skills / Training</label>
                                                    <textarea name="skills_training" value={programDetails.skills_training || ""} onChange={handleDetailChange} rows={2}
                                                        className="w-full px-3 py-2 border border-gray-200 rounded-lg bg-white focus:outline-none focus:ring-2 focus:ring-teal-500/20 focus:border-teal-500 resize-none" />
                                                </div>
                                            </div>
                                        </>
                                    )}

                                    {/* â”€â”€ GIP â”€â”€ */}
                                    {formData.program_type === "gip" && (
                                        <>
                                            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                                <div>
                                                    <label className="block text-xs font-semibold text-gray-600 mb-1">Valid ID Type</label>
                                                    <select name="valid_id_type" value={programDetails.valid_id_type || ""} onChange={handleDetailChange}
                                                        className="w-full px-3 py-2 border border-gray-200 rounded-lg bg-white focus:outline-none focus:ring-2 focus:ring-teal-500/20 focus:border-teal-500">
                                                        <option value="">Select ID Type</option>
                                                        <option value="National ID">National ID</option><option value="Driver's License">Driver's License</option>
                                                        <option value="Passport">Passport</option><option value="Voter's ID">Voter's ID</option>
                                                        <option value="Other">Other</option>
                                                    </select>
                                                </div>
                                                <div>
                                                    <label className="block text-xs font-semibold text-gray-600 mb-1">ID Number</label>
                                                    <input name="id_number" value={programDetails.id_number || ""} onChange={handleDetailChange}
                                                        className="w-full px-3 py-2 border border-gray-200 rounded-lg bg-white focus:outline-none focus:ring-2 focus:ring-teal-500/20 focus:border-teal-500" />
                                                </div>
                                            </div>
                                            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                                                <div>
                                                    <label className="block text-xs font-semibold text-gray-600 mb-1">Educational Attainment</label>
                                                    <select name="educational_attainment" value={programDetails.educational_attainment || ""} onChange={handleDetailChange}
                                                        className="w-full px-3 py-2 border border-gray-200 rounded-lg bg-white focus:outline-none focus:ring-2 focus:ring-teal-500/20 focus:border-teal-500">
                                                        <option value="">Select</option>
                                                        <option value="College Level">College Level</option><option value="College Graduate">College Graduate</option>
                                                        <option value="Post-Graduate">Post-Graduate</option>
                                                    </select>
                                                </div>
                                                <div>
                                                    <label className="block text-xs font-semibold text-gray-600 mb-1">Institution</label>
                                                    <input name="institution" value={programDetails.institution || ""} onChange={handleDetailChange}
                                                        className="w-full px-3 py-2 border border-gray-200 rounded-lg bg-white focus:outline-none focus:ring-2 focus:ring-teal-500/20 focus:border-teal-500" />
                                                </div>
                                                <div>
                                                    <label className="block text-xs font-semibold text-gray-600 mb-1">Course</label>
                                                    <input name="course" value={programDetails.course || ""} onChange={handleDetailChange}
                                                        className="w-full px-3 py-2 border border-gray-200 rounded-lg bg-white focus:outline-none focus:ring-2 focus:ring-teal-500/20 focus:border-teal-500" />
                                                </div>
                                            </div>
                                            <div>
                                                <label className="block text-xs font-semibold text-gray-600 mb-1">Year Graduated</label>
                                                <input name="year_graduated" value={programDetails.year_graduated || ""} onChange={handleDetailChange} placeholder="e.g. 2024"
                                                    className="w-full max-w-xs px-3 py-2 border border-gray-200 rounded-lg bg-white focus:outline-none focus:ring-2 focus:ring-teal-500/20 focus:border-teal-500" />
                                            </div>
                                        </>
                                    )}

                                    {/* â”€â”€ Job Seekers â”€â”€ */}
                                    {formData.program_type === "job_seekers" && (
                                        <>
                                            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                                <div>
                                                    <label className="block text-xs font-semibold text-gray-600 mb-1">Valid ID Type</label>
                                                    <select name="valid_id_type" value={programDetails.valid_id_type || ""} onChange={handleDetailChange}
                                                        className="w-full px-3 py-2 border border-gray-200 rounded-lg bg-white focus:outline-none focus:ring-2 focus:ring-teal-500/20 focus:border-teal-500">
                                                        <option value="">Select ID Type</option>
                                                        <option value="National ID">National ID</option><option value="SSS">SSS</option>
                                                        <option value="PhilHealth">PhilHealth</option><option value="Driver's License">Driver's License</option>
                                                        <option value="Voter's ID">Voter's ID</option><option value="Passport">Passport</option>
                                                        <option value="Other">Other</option>
                                                    </select>
                                                </div>
                                                <div>
                                                    <label className="block text-xs font-semibold text-gray-600 mb-1">ID Number</label>
                                                    <input name="id_number" value={programDetails.id_number || ""} onChange={handleDetailChange}
                                                        className="w-full px-3 py-2 border border-gray-200 rounded-lg bg-white focus:outline-none focus:ring-2 focus:ring-teal-500/20 focus:border-teal-500" />
                                                </div>
                                            </div>
                                            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                                <div>
                                                    <label className="block text-xs font-semibold text-gray-600 mb-1">Educational Attainment</label>
                                                    <select name="educational_attainment" value={programDetails.educational_attainment || ""} onChange={handleDetailChange}
                                                        className="w-full px-3 py-2 border border-gray-200 rounded-lg bg-white focus:outline-none focus:ring-2 focus:ring-teal-500/20 focus:border-teal-500">
                                                        <option value="">Select</option>
                                                        <option value="Elementary">Elementary</option><option value="High School">High School</option>
                                                        <option value="Senior High">Senior High</option><option value="Vocational">Vocational</option>
                                                        <option value="College Level">College Level</option><option value="College Graduate">College Graduate</option>
                                                        <option value="Post-Graduate">Post-Graduate</option>
                                                    </select>
                                                </div>
                                                <div>
                                                    <label className="block text-xs font-semibold text-gray-600 mb-1">Preferred Occupation</label>
                                                    <input name="preferred_occupation" value={programDetails.preferred_occupation || ""} onChange={handleDetailChange} placeholder="Desired job / role"
                                                        className="w-full px-3 py-2 border border-gray-200 rounded-lg bg-white focus:outline-none focus:ring-2 focus:ring-teal-500/20 focus:border-teal-500" />
                                                </div>
                                            </div>
                                            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                                <div>
                                                    <label className="block text-xs font-semibold text-gray-600 mb-1">Skills</label>
                                                    <textarea name="skills" value={programDetails.skills || ""} onChange={handleDetailChange} rows={2} placeholder="List relevant skills"
                                                        className="w-full px-3 py-2 border border-gray-200 rounded-lg bg-white focus:outline-none focus:ring-2 focus:ring-teal-500/20 focus:border-teal-500 resize-none" />
                                                </div>
                                                <div>
                                                    <label className="block text-xs font-semibold text-gray-600 mb-1">Work Experience</label>
                                                    <textarea name="work_experience" value={programDetails.work_experience || ""} onChange={handleDetailChange} rows={2} placeholder="Previous employment"
                                                        className="w-full px-3 py-2 border border-gray-200 rounded-lg bg-white focus:outline-none focus:ring-2 focus:ring-teal-500/20 focus:border-teal-500 resize-none" />
                                                </div>
                                            </div>
                                        </>
                                    )}
                                </div>
                            )}

                            {/* Actions */}
                            <div className="flex justify-end gap-3 pt-2">
                                <button
                                    type="button"
                                    onClick={() => setShowFormModal(false)}
                                    className="px-5 py-2 border border-gray-300 rounded-xl text-gray-700 hover:bg-gray-50 font-medium text-sm"
                                >
                                    Cancel
                                </button>
                                <button
                                    type="submit"
                                    disabled={formSaving}
                                    className="px-5 py-2 bg-teal-600 text-white rounded-xl hover:bg-teal-700 disabled:opacity-50 font-medium text-sm shadow-md shadow-teal-100"
                                >
                                    {formSaving ? "Saving..." : editingBeneficiary ? "Update Beneficiary" : "Add Beneficiary"}
                                </button>
                            </div>
                        </form>
                    </div>
                </div>
            )}

            {/* â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€ Delete Confirmation â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€ */}
            {deleteTarget && (
                <div className="fixed inset-0 z-50 bg-black/50 flex items-center justify-center p-4">
                    <div className="w-full max-w-md rounded-2xl bg-white border border-gray-200 shadow-2xl p-6">
                        <h3 className="text-lg font-bold text-gray-900 mb-2">Delete Beneficiary</h3>
                        <p className="text-sm text-gray-600 mb-1">
                            Are you sure you want to delete <span className="font-semibold">{fullName(deleteTarget)}</span>?
                        </p>
                        <p className="text-xs text-red-500 mb-5">
                            This action cannot be undone. All related attendance records will also be removed.
                        </p>
                        <div className="flex justify-end gap-3">
                            <button
                                onClick={() => setDeleteTarget(null)}
                                className="px-5 py-2 border border-gray-300 rounded-xl text-gray-700 hover:bg-gray-50 font-medium text-sm"
                            >
                                Cancel
                            </button>
                            <button
                                onClick={handleDelete}
                                disabled={deleting}
                                className="px-5 py-2 bg-red-600 text-white rounded-xl hover:bg-red-700 disabled:opacity-50 font-medium text-sm shadow-md shadow-red-100"
                            >
                                {deleting ? "Deleting..." : "Delete"}
                            </button>
                        </div>
                    </div>
                </div>
            )}

            {/* â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€ Details Modal â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€ */}
            {(detailsLoading || selectedDetails || detailsError) && (
                <div className="fixed inset-0 z-50 bg-black/50 flex items-center justify-center p-4">
                    <div className="w-full max-w-5xl max-h-[92vh] overflow-y-auto rounded-2xl bg-white border border-gray-200 shadow-2xl">
                        <div className="sticky top-0 bg-white border-b border-gray-100 px-5 py-4 flex items-center justify-between">
                            <div>
                                <h3 className="text-lg font-black text-gray-900">Beneficiary Application Details</h3>
                                <p className="text-xs text-gray-500">Complete data submitted by the user</p>
                            </div>
                            <button
                                onClick={() => { setSelectedDetails(null); setDetailsError(null); setDetailsLoading(false); }}
                                className="p-2 rounded-lg hover:bg-gray-100"
                            >
                                <X size={18} />
                            </button>
                        </div>
                        <div className="p-5 space-y-4">
                            {detailsLoading && <p className="text-sm text-gray-600">Loading details...</p>}
                            {detailsError && <p className="text-sm text-red-600">{detailsError}</p>}
                            {!detailsLoading && !detailsError && selectedDetails && (
                                <>
                                    {renderObjectSection("Application Information", selectedDetails.application)}
                                    {renderObjectSection("TUPAD Form Data", selectedDetails.details.tupad)}
                                    {renderObjectSection("SPES Form Data", selectedDetails.details.spes)}
                                    {renderObjectSection("DILP Form Data", selectedDetails.details.dilp)}
                                    {renderObjectSection("GIP Form Data", selectedDetails.details.gip)}
                                    {renderObjectSection("Jobseeker Form Data", selectedDetails.details.jobseeker)}
                                </>
                            )}
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
};

export default BeneficiaryPage;
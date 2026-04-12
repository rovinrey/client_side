import { useState, useEffect, type JSX } from "react";
import { useNavigate, useLocation } from "react-router-dom";
import { 
  Plus, 
  Calendar, 
  Users, 
  ChevronRight, 
  Briefcase,
  Hammer,
  X,
  Trash2,
  Pencil,
  CheckCircle,
  AlertCircle,
  FolderOpen,
  ClipboardCheck
} from "lucide-react";
import axios from "axios";
import { API_BASE_URL } from '../../../api/config';
import { validateProgramForm, formatErrors } from '../../../utils/validation';

interface Program {
    id: number;
    program_name: string;
    location: string;
    slots: number;
    filled: number;
    budget: number;
    used: number;
    status: string;
    start_date: string | null;
    end_date: string | null;
    icon?: JSX.Element;
}

const Programs = () => {
    const navigate = useNavigate();
    const location = useLocation();
    const [programs, setPrograms] = useState<Program[]>([]);
    const [loading, setLoading] = useState(true);
    const [isModalOpen, setIsModalOpen] = useState(false);
    const [editingProgram, setEditingProgram] = useState<Program | null>(null);
    const [deleteConfirm, setDeleteConfirm] = useState<{ show: boolean; programId: number | null }>({
        show: false,
        programId: null
    });
    const [submitting, setSubmitting] = useState(false);
    const [toast, setToast] = useState<{ message: string; type: 'success' | 'error' } | null>(null);
    const [formData, setFormData] = useState({
        name: "",
        location: "",
        slots: "",
        budget: "",
        status: "ongoing",
        start_date: "",
        end_date: ""
    });

    // Fetch programs from backend on component mount
    useEffect(() => {
        fetchPrograms();
    }, []);

    // Auto-dismiss toast after 3 seconds
    useEffect(() => {
        if (toast) {
            const timer = setTimeout(() => setToast(null), 3000);
            return () => clearTimeout(timer);
        }
    }, [toast]);

    // Map program name to the filter value used by the Beneficiary page
    const getProgramFilterValue = (programName: string): string => {
        const name = programName.toUpperCase();
        if (name.includes('TUPAD')) return 'tupad';
        if (name.includes('SPES')) return 'spes';
        if (name.includes('DILP')) return 'dilp';
        if (name.includes('GIP')) return 'gip';
        if (name.includes('JOB')) return 'job_seekers';
        return programName.toLowerCase();
    };

    // Navigate to beneficiary list filtered by the selected program
    const handleViewBeneficiaries = (programName: string) => {
        const filterValue = getProgramFilterValue(programName);
        const isStaff = location.pathname.startsWith('/staff');
        const basePath = isStaff ? '/staff/beneficiaries' : '/beneficiaries';
        navigate(`${basePath}?program=${encodeURIComponent(filterValue)}`);
    };

    // Navigate to attendance page filtered by the selected program
    const handleViewAttendance = (programName: string) => {
        const filterValue = getProgramFilterValue(programName);
        const isStaff = location.pathname.startsWith('/staff');
        const basePath = isStaff ? '/staff/programs/attendance' : '/programs/attendance';
        navigate(`${basePath}?program=${encodeURIComponent(filterValue)}&name=${encodeURIComponent(programName)}`);
    };

    const getAuthHeaders = () => {
        const token = localStorage.getItem("token");
        return token ? { Authorization: `Bearer ${token}` } : {};
    };

    // get all programs and display in the admin UI 
    const fetchPrograms = async () => {
        setLoading(true);
        try {
            const response = await axios.get(`${API_BASE_URL}/api/programs/allPrograms`, { headers: getAuthHeaders() });
            setPrograms(response.data.map((prog: any) => ({
                id: prog.program_id,
                program_name: prog.program_name,
                location: prog.location,
                slots: prog.slots,
                filled: prog.filled,
                budget: prog.budget,
                used: prog.used,
                status: prog.status,
                start_date: prog.start_date || null,
                end_date: prog.end_date || null,
                icon: prog.program_name.includes('TUPAD') 
                    ? <Hammer className="text-orange-600" size={20} />
                    : <Briefcase className="text-purple-600" size={20} />
            })));
        } catch (error) {
            console.error("Error fetching programs:", error);
        } finally {
            setLoading(false);
        }
    };

    const createProgram = () => {
        setEditingProgram(null);
        setFormData({
            name: "",
            location: "",
            slots: "",
            budget: "",
            status: "ongoing",
            start_date: "",
            end_date: ""
        });
        setIsModalOpen(true);
    };

    const openEditModal = (prog: Program) => {
        setEditingProgram(prog);
        setFormData({
            name: prog.program_name,
            location: prog.location,
            slots: String(prog.slots),
            budget: String(prog.budget),
            status: prog.status,
            start_date: prog.start_date ? prog.start_date.split('T')[0] : "",
            end_date: prog.end_date ? prog.end_date.split('T')[0] : ""
        });
        setIsModalOpen(true);
    };

    const closeModal = () => {
        setIsModalOpen(false);
        setEditingProgram(null);
        setFormData({
            name: "",
            location: "",
            slots: "",
            budget: "",
            status: "ongoing",
            start_date: "",
            end_date: ""
        });
    };

    const handleInputChange = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>) => {
        const { name, value } = e.target;
        setFormData(prev => ({
            ...prev,
            [name]: value
        }));
    };

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();

        // Validate form
        const validationErrors = validateProgramForm(formData);
        if (validationErrors.length > 0) {
            setToast({ message: formatErrors(validationErrors), type: "error" });
            return;
        }

        setSubmitting(true);

        const payload = {
            name: formData.name,
            location: formData.location,
            slots: parseInt(formData.slots),
            budget: parseInt(formData.budget),
            status: formData.status,
            start_date: formData.start_date || null,
            end_date: formData.end_date || null
        };

        try {
            if (editingProgram) {
                const response = await axios.put(
                    `${API_BASE_URL}/api/programs/${editingProgram.id}`,
                    payload,
                    { headers: getAuthHeaders() }
                );
                if (response.status === 200) {
                    closeModal();
                    fetchPrograms();
                    setToast({ message: "Program updated successfully!", type: "success" });
                }
            } else {
                const response = await axios.post(`${API_BASE_URL}/api/programs`, payload, { headers: getAuthHeaders() });
                if (response.status === 201) {
                    closeModal();
                    fetchPrograms();
                    setToast({ message: "Program created successfully!", type: "success" });
                }
            }
        } catch (error) {
            console.error(editingProgram ? "Error updating program:" : "Error creating program:", error);
            setToast({ message: editingProgram ? "Failed to update program." : "Failed to create program.", type: "error" });
        } finally {
            setSubmitting(false);
        }
    };

    const openDeleteConfirm = (programId: number) => {
        setDeleteConfirm({ show: true, programId });
    };

    const closeDeleteConfirm = () => {
        setDeleteConfirm({ show: false, programId: null });
    };

    const confirmDelete = async () => {
        if (deleteConfirm.programId !== null) {
            try {
                await axios.delete(`${API_BASE_URL}/api/programs/${deleteConfirm.programId}`, {
                    headers: getAuthHeaders(),
                });
                closeDeleteConfirm();
                fetchPrograms();
                setToast({ message: "Program deleted successfully!", type: "success" });
            } catch (error) {
                console.error("Error deleting program:", error);
                setToast({ message: "Failed to delete program.", type: "error" });
            }
        }
    };
    return (
        <div className="space-y-8">
            {/* Header */}
            <div className="flex flex-col sm:flex-row sm:justify-between sm:items-end gap-4">
                <div>
                    <h1 className="text-2xl font-bold text-gray-900 tracking-tight">Program Management</h1>
                    <p className="text-gray-500 text-sm">Monitor budget utilization and beneficiary allocation.</p>
                </div>
                <button 
                    onClick={createProgram}
                    className="flex-shrink-0 flex items-center gap-2 bg-teal-600 hover:bg-teal-700 text-white px-5 py-2.5 rounded-xl font-semibold text-sm transition-all shadow-lg shadow-teal-100">
                    <Plus size={18} />
                    Create New Program
                </button>
            </div>

            {/* Program Grid */}
            {loading ? (
                <div className="grid grid-cols-1 xl:grid-cols-2 gap-6">
                    {[1, 2, 3, 4].map((i) => (
                        <div key={i} className="bg-white border border-gray-200 rounded-2xl p-6 shadow-sm animate-pulse">
                            <div className="flex justify-between items-start mb-6">
                                <div className="flex gap-4">
                                    <div className="w-11 h-11 bg-gray-200 rounded-xl" />
                                    <div className="space-y-2">
                                        <div className="h-4 w-40 bg-gray-200 rounded" />
                                        <div className="h-3 w-56 bg-gray-100 rounded" />
                                    </div>
                                </div>
                                <div className="h-6 w-16 bg-gray-200 rounded-full" />
                            </div>
                            <div className="space-y-6">
                                <div>
                                    <div className="flex justify-between mb-2">
                                        <div className="h-3 w-28 bg-gray-100 rounded" />
                                        <div className="h-3 w-16 bg-gray-100 rounded" />
                                    </div>
                                    <div className="h-2 w-full bg-gray-100 rounded-full" />
                                </div>
                                <div>
                                    <div className="flex justify-between mb-2">
                                        <div className="h-3 w-28 bg-gray-100 rounded" />
                                        <div className="h-3 w-16 bg-gray-100 rounded" />
                                    </div>
                                    <div className="h-2 w-full bg-gray-100 rounded-full" />
                                </div>
                            </div>
                            <div className="mt-8 pt-6 border-t border-gray-50 flex justify-end">
                                <div className="h-4 w-32 bg-gray-100 rounded" />
                            </div>
                        </div>
                    ))}
                </div>
            ) : (
            <div className="grid grid-cols-1 xl:grid-cols-2 gap-6">
                {programs.map((prog) => {
                    const filledSlots = prog.filled || 0;
                    const remainingSlots = Math.max(prog.slots - filledSlots, 0);
                    const progress = prog.slots > 0 ? Math.min((filledSlots / prog.slots) * 100, 100) : 0;
                    const budgetProgress = prog.budget > 0 ? Math.min((prog.used / prog.budget) * 100, 100) : 0;
                    const slotsColor = remainingSlots === 0 ? 'text-red-600' : remainingSlots <= 5 ? 'text-amber-600' : 'text-gray-900';

                    return (
                        <div key={prog.id} className="bg-white border border-gray-200 rounded-2xl p-6 shadow-sm hover:shadow-md transition-shadow">
                            <div className="flex justify-between items-start mb-6">
                                <div className="flex gap-4">
                                    <div className="p-3 bg-gray-50 rounded-xl">
                                        {prog.icon}
                                    </div>
                                    <div>
                                        <h3 className="font-bold text-gray-900">{prog.program_name}</h3>
                                        <p className="text-xs text-gray-500 flex items-center gap-1">
                                            <Calendar size={12} />
                                            {prog.start_date
                                                ? `${new Date(prog.start_date).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })}${prog.end_date ? ` – ${new Date(prog.end_date).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })}` : ''}`
                                                : 'No dates set'}
                                            {' • '}{prog.location}
                                        </p>
                                    </div>
                                </div>
                                <div className="flex items-center gap-2">
                                    <span className={`px-3 py-1 rounded-full text-[10px] font-bold uppercase tracking-wider ${
                                        prog.status === 'ongoing' || prog.status === 'active'
                                            ? 'bg-green-100 text-green-700'
                                            : prog.status === 'completed'
                                            ? 'bg-gray-100 text-gray-600'
                                            : prog.status === 'pending'
                                            ? 'bg-amber-100 text-amber-700'
                                            : 'bg-teal-100 text-teal-700'
                                    }`}>
                                        {prog.status.charAt(0).toUpperCase() + prog.status.slice(1)}
                                    </span>
                                    <button
                                        onClick={() => openEditModal(prog)}
                                        className="text-blue-500 hover:text-blue-700 hover:bg-blue-50 p-2 rounded-lg transition-colors"
                                        title="Edit Program"
                                    >
                                        <Pencil size={16} />
                                    </button>
                                    <button
                                        onClick={() => openDeleteConfirm(prog.id)}
                                        className="text-red-500 hover:text-red-700 hover:bg-red-50 p-2 rounded-lg transition-colors"
                                        title="Delete Program"
                                    >
                                        <Trash2 size={18} />
                                    </button>
                                </div>
                            </div>

                            <div className="space-y-6">
                                {/* Beneficiary Slots Progress */}
                                <div>
                                    <div className="flex justify-between text-xs mb-2">
                                        <span className="text-gray-500 font-medium">Beneficiary Slots</span>
                                        <span className={`font-bold ${slotsColor}`}>{filledSlots} / {prog.slots}</span>
                                    </div>
                                    <div className="h-2 w-full bg-gray-100 rounded-full overflow-hidden">
                                        <div 
                                            className={`h-full rounded-full transition-all duration-500 ${
                                                remainingSlots === 0 ? 'bg-red-500' : remainingSlots <= 5 ? 'bg-amber-500' : 'bg-teal-500'
                                            }`}
                                            style={{ width: `${progress}%` }}
                                        />
                                    </div>
                                    <p className="text-[11px] text-gray-400 mt-1">{remainingSlots} {remainingSlots === 1 ? 'slot' : 'slots'} remaining</p>
                                </div>

                                {/* Budget Utilization Progress */}
                                <div>
                                    <div className="flex justify-between text-xs mb-2">
                                        <span className="text-gray-500 font-medium">Budget Utilization</span>
                                        <span className="text-gray-900 font-bold">₱{prog.used.toLocaleString()} / ₱{prog.budget.toLocaleString()}</span>
                                     </div>
                                    <div className="h-2 w-full bg-gray-100 rounded-full overflow-hidden">
                                        <div 
                                            className="h-full bg-emerald-500 rounded-full transition-all duration-500" 
                                            style={{ width: `${budgetProgress}%` }}
                                        />
                                    </div>
                                </div>
                            </div>

                            <div className="mt-6 pt-4 border-t border-gray-100 flex justify-between items-center">
                                <div className="flex items-center gap-2 text-sm text-gray-500">
                                    <Users size={16} />
                                    <span>{filledSlots} {filledSlots === 1 ? 'beneficiary' : 'beneficiaries'} enrolled</span>
                                </div>
                                <div className="flex items-center gap-3">
                                    <button 
                                        onClick={() => handleViewAttendance(prog.program_name)}
                                        className="text-amber-600 font-semibold text-sm flex items-center gap-1 hover:gap-2 transition-all"
                                    >
                                        Attendance <ClipboardCheck size={16} />
                                    </button>
                                    <button 
                                        onClick={() => handleViewBeneficiaries(prog.program_name)}
                                        className="text-teal-600 font-semibold text-sm flex items-center gap-1 hover:gap-2 transition-all"
                                    >
                                        View Beneficiaries <ChevronRight size={16} />
                                    </button>
                                </div>
                            </div>
                        </div>
                    );
                })}
            </div>
            )}

            {/* Empty State */}
            {!loading && programs.length === 0 && (
                <div className="bg-white rounded-2xl shadow-sm p-12 text-center">
                    <div className="w-16 h-16 bg-gray-100 rounded-full flex items-center justify-center mx-auto mb-4">
                        <FolderOpen className="text-gray-400" size={28} />
                    </div>
                    <h3 className="text-lg font-semibold text-gray-700 mb-1">No Programs Yet</h3>
                    <p className="text-gray-500 text-sm">Create your first program to get started.</p>
                </div>
            )}

            {/* Delete Confirmation Modal */}
            {deleteConfirm.show && (
                <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
                    <div className="bg-white rounded-2xl shadow-2xl w-full max-w-sm">
                        <div className="p-6 text-center">
                            <div className="w-16 h-16 bg-red-100 rounded-full flex items-center justify-center mx-auto mb-4">
                                <Trash2 className="text-red-600" size={32} />
                            </div>
                            <h3 className="text-lg font-bold text-gray-900 mb-2">Delete Program?</h3>
                            <p className="text-gray-600 text-sm mb-6">
                                Are you sure you want to delete this program? This action cannot be undone.
                            </p>
                            <div className="flex gap-3">
                                <button
                                    onClick={closeDeleteConfirm}
                                    className="flex-1 px-4 py-2 border border-gray-300 text-gray-700 rounded-lg font-medium hover:bg-gray-50 transition-colors"
                                >
                                    Cancel
                                </button>
                                <button
                                    onClick={confirmDelete}
                                    className="flex-1 px-4 py-2 bg-red-600 text-white rounded-lg font-medium hover:bg-red-700 transition-colors"
                                >
                                    Delete
                                </button>
                            </div>
                        </div>
                    </div>
                </div>
            )}

            {/* Create Program Modal */}
            {isModalOpen && (
                <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
                    <div className="bg-white rounded-2xl shadow-2xl w-full max-w-md max-h-[90vh] flex flex-col">
                        {/* Modal Header */}
                        <div className="flex justify-between items-center p-6 border-b border-gray-200">
                            <h2 className="text-xl font-bold text-gray-900">{editingProgram ? 'Edit Program' : 'Create New Program'}</h2>
                            <button
                                onClick={closeModal}
                                className="text-gray-500 hover:text-gray-700 transition-colors"
                            >
                                <X size={24} />
                            </button>
                        </div>

                        {/* Modal Body */}
                        <form onSubmit={handleSubmit} className="p-6 space-y-4 overflow-y-auto">
                            {/* Program Name */}
                            <div>
                                <label className="block text-sm font-medium text-gray-700 mb-2">
                                    Program Name
                                </label>
                                <input
                                    type="text"
                                    name="name"
                                    value={formData.name}
                                    onChange={handleInputChange}
                                    placeholder="e.g., TUPAD - Emergency Employment"
                                    className="w-full px-4 py-2 border border-gray-300 rounded-lg text-gray-900 focus:outline-none focus:ring-2 focus:ring-teal-500"
                                    required
                                />
                            </div>

                            {/* Location */}
                            <div>
                                <label className="block text-sm font-medium text-gray-700 mb-2">
                                    Location
                                </label>
                                <input
                                    type="text"
                                    name="location"
                                    value={formData.location}
                                    onChange={handleInputChange}
                                    placeholder="e.g., Juban, Sorsogon"
                                    className="w-full px-4 py-2 border border-gray-300 rounded-lg text-gray-900 focus:outline-none focus:ring-2 focus:ring-teal-500"
                                    required
                                />
                            </div>

                            {/* Slots */}
                            <div>
                                <label className="block text-sm font-medium text-gray-700 mb-2">
                                    Number of Slots
                                </label>
                                <input
                                    type="number"
                                    name="slots"
                                    value={formData.slots}
                                    onChange={handleInputChange}
                                    placeholder="e.g., 500"
                                    className="w-full px-4 py-2 border border-gray-300 rounded-lg text-gray-900 focus:outline-none focus:ring-2 focus:ring-teal-500"
                                    required
                                />
                            </div>

                            {/* Budget */}
                            <div>
                                <label className="block text-sm font-medium text-gray-700 mb-2">
                                    Budget (₱)
                                </label>
                                <input
                                    type="number"
                                    name="budget"
                                    value={formData.budget}
                                    onChange={handleInputChange}
                                    placeholder="e.g., 2500000"
                                    className="w-full px-4 py-2 border border-gray-300 rounded-lg text-gray-900 focus:outline-none focus:ring-2 focus:ring-teal-500"
                                    required
                                />
                            </div>

                            {/* Status */}
                            <div>
                                <label className="block text-sm font-medium text-gray-700 mb-2">
                                    Status
                                </label>
                                <select
                                    name="status"
                                    value={formData.status}
                                    onChange={handleInputChange}
                                    className="w-full px-4 py-2 border border-gray-300 rounded-lg text-gray-900 focus:outline-none focus:ring-2 focus:ring-teal-500"
                                >
                                    <option value="ongoing">Ongoing</option>
                                    <option value="active">Active</option>
                                    <option value="pending">Pending</option>
                                    <option value="completed">Completed</option>
                                </select>
                            </div>

                            {/* Start Date */}
                            <div>
                                <label className="block text-sm font-medium text-gray-700 mb-2">
                                    Start Date
                                </label>
                                <input
                                    type="date"
                                    name="start_date"
                                    value={formData.start_date}
                                    onChange={handleInputChange}
                                    className="w-full px-4 py-2 border border-gray-300 rounded-lg text-gray-900 focus:outline-none focus:ring-2 focus:ring-teal-500"
                                    required
                                />
                            </div>

                            {/* End Date */}
                            <div>
                                <label className="block text-sm font-medium text-gray-700 mb-2">
                                    End Date
                                </label>
                                <input
                                    type="date"
                                    name="end_date"
                                    value={formData.end_date}
                                    onChange={handleInputChange}
                                    min={formData.start_date || undefined}
                                    className="w-full px-4 py-2 border border-gray-300 rounded-lg text-gray-900 focus:outline-none focus:ring-2 focus:ring-teal-500"
                                    required
                                />
                            </div>

                            {/* Modal Actions */}
                            <div className="flex gap-3 pt-4">
                                <button
                                    type="button"
                                    onClick={closeModal}
                                    disabled={submitting}
                                    className="flex-1 px-4 py-2 border border-gray-300 text-gray-700 rounded-lg font-medium hover:bg-gray-50 transition-colors disabled:opacity-50"
                                >
                                    Cancel
                                </button>
                                <button
                                    type="submit"
                                    disabled={submitting}
                                    className={`flex-1 px-4 py-2 rounded-lg font-medium transition-colors ${
                                        submitting
                                            ? 'bg-gray-400 cursor-not-allowed'
                                            : 'bg-teal-600 text-white hover:bg-teal-700'
                                    }`}
                                >
                                    {submitting
                                        ? (editingProgram ? 'Updating...' : 'Creating...')
                                        : (editingProgram ? 'Update Program' : 'Create Program')}
                                </button>
                            </div>
                        </form>
                    </div>
                </div>
            )}

            {/* Toast Notification */}
            {toast && (
                <div className={`fixed bottom-6 right-6 z-50 flex items-center gap-3 px-5 py-3 rounded-xl shadow-lg text-sm font-medium transition-all ${
                    toast.type === 'success'
                        ? 'bg-green-50 text-green-800 border border-green-200'
                        : 'bg-red-50 text-red-800 border border-red-200'
                }`}>
                    {toast.type === 'success'
                        ? <CheckCircle size={18} className="text-green-600" />
                        : <AlertCircle size={18} className="text-red-600" />
                    }
                    {toast.message}
                    <button onClick={() => setToast(null)} className="ml-2 text-gray-400 hover:text-gray-600">
                        <X size={14} />
                    </button>
                </div>
            )}
        </div>
    );
};

export default Programs;
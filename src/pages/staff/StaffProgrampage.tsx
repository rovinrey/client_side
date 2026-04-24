import { useState, useEffect, type JSX } from "react";
import { useNavigate, useLocation } from "react-router-dom";
import {  
  Calendar, 
  Users, 
  ChevronRight, 
  Briefcase,
  Hammer,
  X,
  CheckCircle,
  AlertCircle,
  FolderOpen,
  ClipboardCheck
} from "lucide-react";
import axios from "axios";
import { API_BASE_URL } from '../../api/config';


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

const StaffProgramPage = () => {
    const navigate = useNavigate();
    const location = useLocation();
    const [programs, setPrograms] = useState<Program[]>([]);
    const [loading, setLoading] = useState(true);
   
    const [toast, setToast] = useState<{ message: string; type: 'success' | 'error' } | null>(null);
    

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

    return (
        <div className="space-y-8">
            {/* Header */}
            <div className="flex flex-col sm:flex-row sm:justify-between sm:items-end gap-4">
                <div>
                    <h1 className="text-2xl font-bold text-gray-900 tracking-tight">Program Management</h1>
                    <p className="text-gray-500 text-sm">Monitor budget utilization and beneficiary allocation.</p>
                </div>
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

export default StaffProgramPage;
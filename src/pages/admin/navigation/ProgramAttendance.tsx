import { useState, useEffect } from "react";
import { useSearchParams, useNavigate, useLocation } from "react-router-dom";
import { ArrowLeft, CheckCircle, XCircle, Loader, UserCheck, UserX, Calendar } from "lucide-react";
import axios from "axios";
import { API_BASE_URL } from "../../../api/config";

interface BeneficiaryAttendance {
    user_id: number;
    beneficiary_name: string;
    program_type: string;
    attendance_id: number | null;
    attendance_date: string | null;
    time_in: string | null;
    time_out: string | null;
    attendance_status: string | null;
    remarks: string | null;
}

const ProgramAttendance = () => {
    const [searchParams] = useSearchParams();
    const navigate = useNavigate();
    const location = useLocation();
    const programType = searchParams.get("program") || "";
    const programName = searchParams.get("name") || programType.toUpperCase();

    const [records, setRecords] = useState<BeneficiaryAttendance[]>([]);
    const [loading, setLoading] = useState(true);
    const [selectedDate, setSelectedDate] = useState(() => new Date().toISOString().slice(0, 10));
    const [processingId, setProcessingId] = useState<number | null>(null);
    const [toast, setToast] = useState<{ message: string; type: "success" | "error" } | null>(null);

    const token = localStorage.getItem("token");
    const authHeaders = token ? { Authorization: `Bearer ${token}` } : {};

    const isStaff = location.pathname.startsWith("/staff");

    useEffect(() => {
        if (programType) fetchAttendance();
    }, [programType, selectedDate]);

    useEffect(() => {
        if (toast) {
            const timer = setTimeout(() => setToast(null), 3000);
            return () => clearTimeout(timer);
        }
    }, [toast]);

    const fetchAttendance = async () => {
        setLoading(true);
        try {
            const res = await axios.get(
                `${API_BASE_URL}/api/attendance/program/${encodeURIComponent(programType)}`,
                { headers: authHeaders, params: { date: selectedDate } }
            );
            setRecords(res.data);
        } catch (err) {
            console.error("Error fetching program attendance:", err);
        } finally {
            setLoading(false);
        }
    };

    const handleMark = async (userId: number, status: "Present" | "Absent") => {
        setProcessingId(userId);
        try {
            await axios.post(
                `${API_BASE_URL}/api/attendance/mark`,
                { userId, programType, date: selectedDate, status },
                { headers: authHeaders }
            );
            setToast({ message: `Marked as ${status}`, type: "success" });
            fetchAttendance();
        } catch (err) {
            console.error("Error marking attendance:", err);
            setToast({ message: "Failed to mark attendance", type: "error" });
        } finally {
            setProcessingId(null);
        }
    };

    const formatTime = (value: string | null) => {
        if (!value) return "—";
        return new Date(value).toLocaleTimeString("en-PH", { hour: "2-digit", minute: "2-digit" });
    };

    const presentCount = records.filter((r) => r.attendance_status === "Present").length;
    const absentCount = records.filter((r) => r.attendance_status === "Absent").length;
    const unmarkedCount = records.filter((r) => !r.attendance_status || (r.attendance_status !== "Present" && r.attendance_status !== "Absent")).length;

    return (
        <div className="space-y-6">
            {/* Header */}
            <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
                <div className="flex items-center gap-3">
                    <button
                        onClick={() => navigate(isStaff ? "/staff/programs" : "/programs")}
                        className="p-2 rounded-lg hover:bg-gray-100 transition-colors"
                    >
                        <ArrowLeft size={20} className="text-gray-600" />
                    </button>
                    <div>
                        <h1 className="text-2xl font-bold text-gray-900">
                            {programName} — Attendance
                        </h1>
                        <p className="text-sm text-gray-500">
                            Mark beneficiaries as present or absent
                        </p>
                    </div>
                </div>

                <div className="flex items-center gap-2">
                    <Calendar size={16} className="text-gray-500" />
                    <input
                        type="date"
                        value={selectedDate}
                        onChange={(e) => setSelectedDate(e.target.value)}
                        className="px-3 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-teal-500"
                    />
                </div>
            </div>

            {/* Summary Cards */}
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                <div className="bg-white border border-gray-200 rounded-xl p-4 flex items-center gap-3">
                    <div className="p-2 bg-green-100 rounded-lg">
                        <UserCheck size={20} className="text-green-600" />
                    </div>
                    <div>
                        <p className="text-2xl font-bold text-gray-900">{presentCount}</p>
                        <p className="text-xs text-gray-500 font-medium">Present</p>
                    </div>
                </div>
                <div className="bg-white border border-gray-200 rounded-xl p-4 flex items-center gap-3">
                    <div className="p-2 bg-red-100 rounded-lg">
                        <UserX size={20} className="text-red-600" />
                    </div>
                    <div>
                        <p className="text-2xl font-bold text-gray-900">{absentCount}</p>
                        <p className="text-xs text-gray-500 font-medium">Absent</p>
                    </div>
                </div>
                <div className="bg-white border border-gray-200 rounded-xl p-4 flex items-center gap-3">
                    <div className="p-2 bg-gray-100 rounded-lg">
                        <Calendar size={20} className="text-gray-500" />
                    </div>
                    <div>
                        <p className="text-2xl font-bold text-gray-900">{unmarkedCount}</p>
                        <p className="text-xs text-gray-500 font-medium">Unmarked</p>
                    </div>
                </div>
            </div>

            {/* Attendance Table */}
            {loading ? (
                <div className="flex justify-center py-12">
                    <Loader className="animate-spin text-teal-600" size={32} />
                </div>
            ) : records.length === 0 ? (
                <div className="bg-white rounded-2xl shadow-sm p-12 text-center">
                    <p className="text-gray-500 text-lg">No approved beneficiaries found for this program.</p>
                </div>
            ) : (
                <div className="bg-white rounded-2xl shadow-sm border border-gray-200 overflow-hidden">
                    <div className="overflow-x-auto">
                        <table className="w-full">
                            <thead>
                                <tr className="bg-gray-50 border-b border-gray-200">
                                    <th className="px-6 py-4 text-left text-xs font-semibold text-gray-600 uppercase tracking-wider">
                                        Beneficiary
                                    </th>
                                    <th className="px-6 py-4 text-left text-xs font-semibold text-gray-600 uppercase tracking-wider">
                                        Time In
                                    </th>
                                    <th className="px-6 py-4 text-left text-xs font-semibold text-gray-600 uppercase tracking-wider">
                                        Time Out
                                    </th>
                                    <th className="px-6 py-4 text-left text-xs font-semibold text-gray-600 uppercase tracking-wider">
                                        Status
                                    </th>
                                    <th className="px-6 py-4 text-center text-xs font-semibold text-gray-600 uppercase tracking-wider">
                                        Action
                                    </th>
                                </tr>
                            </thead>
                            <tbody className="divide-y divide-gray-100">
                                {records.map((r) => (
                                    <tr key={r.user_id} className="hover:bg-gray-50 transition-colors">
                                        <td className="px-6 py-4">
                                            <p className="text-sm font-medium text-gray-900">{r.beneficiary_name}</p>
                                            <p className="text-xs text-gray-400">ID: {r.user_id}</p>
                                        </td>
                                        <td className="px-6 py-4 text-sm text-gray-600">
                                            {formatTime(r.time_in)}
                                        </td>
                                        <td className="px-6 py-4 text-sm text-gray-600">
                                            {formatTime(r.time_out)}
                                        </td>
                                        <td className="px-6 py-4">
                                            {r.attendance_status === "Present" ? (
                                                <span className="px-3 py-1 rounded-full text-[10px] font-bold uppercase tracking-wider bg-green-100 text-green-700">
                                                    Present
                                                </span>
                                            ) : r.attendance_status === "Absent" ? (
                                                <span className="px-3 py-1 rounded-full text-[10px] font-bold uppercase tracking-wider bg-red-100 text-red-700">
                                                    Absent
                                                </span>
                                            ) : r.attendance_status === "Incomplete" ? (
                                                <span className="px-3 py-1 rounded-full text-[10px] font-bold uppercase tracking-wider bg-yellow-100 text-yellow-700">
                                                    Incomplete
                                                </span>
                                            ) : (
                                                <span className="px-3 py-1 rounded-full text-[10px] font-bold uppercase tracking-wider bg-gray-100 text-gray-500">
                                                    No Record
                                                </span>
                                            )}
                                        </td>
                                        <td className="px-6 py-4">
                                            <div className="flex justify-center gap-2">
                                                <button
                                                    onClick={() => handleMark(r.user_id, "Present")}
                                                    disabled={processingId === r.user_id}
                                                    className={`p-2 rounded-lg transition-colors disabled:opacity-50 ${
                                                        r.attendance_status === "Present"
                                                            ? "bg-green-100 text-green-700"
                                                            : "text-green-600 hover:bg-green-50"
                                                    }`}
                                                    title="Mark Present"
                                                >
                                                    {processingId === r.user_id ? (
                                                        <Loader size={18} className="animate-spin" />
                                                    ) : (
                                                        <CheckCircle size={18} />
                                                    )}
                                                </button>
                                                <button
                                                    onClick={() => handleMark(r.user_id, "Absent")}
                                                    disabled={processingId === r.user_id}
                                                    className={`p-2 rounded-lg transition-colors disabled:opacity-50 ${
                                                        r.attendance_status === "Absent"
                                                            ? "bg-red-100 text-red-700"
                                                            : "text-red-600 hover:bg-red-50"
                                                    }`}
                                                    title="Mark Absent"
                                                >
                                                    {processingId === r.user_id ? (
                                                        <Loader size={18} className="animate-spin" />
                                                    ) : (
                                                        <XCircle size={18} />
                                                    )}
                                                </button>
                                            </div>
                                        </td>
                                    </tr>
                                ))}
                            </tbody>
                        </table>
                    </div>
                </div>
            )}

            {/* Toast */}
            {toast && (
                <div
                    className={`fixed bottom-6 right-6 z-50 flex items-center gap-3 px-5 py-3 rounded-xl shadow-lg text-sm font-medium ${
                        toast.type === "success"
                            ? "bg-green-50 text-green-800 border border-green-200"
                            : "bg-red-50 text-red-800 border border-red-200"
                    }`}
                >
                    {toast.type === "success" ? (
                        <CheckCircle size={18} className="text-green-600" />
                    ) : (
                        <XCircle size={18} className="text-red-600" />
                    )}
                    {toast.message}
                </div>
            )}
        </div>
    );
};

export default ProgramAttendance;

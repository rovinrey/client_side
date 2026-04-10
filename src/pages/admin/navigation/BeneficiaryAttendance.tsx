import { useState, useEffect } from "react";
import { useParams, useNavigate } from "react-router-dom";
import axios from "axios";
import { Plus } from "lucide-react";
import { API_BASE_URL } from '../../../api/config';

interface AttendanceRecord {
    id: number;
    beneficiary_id: number;
    date: string;
    status: string;
    notes?: string;
}

const BeneficiaryAttendance = () => {
    const { id } = useParams<{ id: string }>();
    const navigate = useNavigate();
    const [records, setRecords] = useState<AttendanceRecord[]>([]);
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState<string | null>(null);

    // new record form state
    const [newDate, setNewDate] = useState<string>(new Date().toISOString().slice(0, 10));
    const [newStatus, setNewStatus] = useState<string>("Present");
    const [newNotes, setNewNotes] = useState<string>("");

    useEffect(() => {
        if (id) {
            fetchRecords(parseInt(id));
        }
    }, [id]);

    const fetchRecords = async (beneficiaryId: number) => {
        setLoading(true);
        setError(null);
        try {
            const res = await axios.get(`${API_BASE_URL}/api/attendance/beneficiary/${beneficiaryId}`);
            setRecords(res.data);
        } catch (err: any) {
            console.error(err);
            setError("Failed to load attendance records.");
        } finally {
            setLoading(false);
        }
    };

    const addRecord = async () => {
        if (!id) return;
        try {
            await axios.post(`${API_BASE_URL}/api/attendance/beneficiary/${id}`, {
                date: newDate,
                status: newStatus,
                notes: newNotes || null,
            });
            setNewNotes("");
            fetchRecords(parseInt(id));
        } catch (err) {
            console.error(err);
            alert("Failed to add attendance record");
        }
    };

    return (
        <div className="space-y-6">
            <button
                onClick={() => navigate(-1)}
                className="text-teal-600 hover:underline text-sm"
            >
                &larr; Back to beneficiaries
            </button>

            <h1 className="text-2xl font-bold text-gray-900">
                Attendance for beneficiary {id}
            </h1>

            {/* new record form */}
            <div className="bg-white p-4 rounded-xl border border-gray-200 shadow-sm">
                <h2 className="font-semibold mb-2">Record Attendance</h2>
                <div className="flex flex-wrap gap-4 items-end">
                    <div>
                        <label className="block text-xs font-medium text-gray-600">
                            Date
                        </label>
                        <input
                            type="date"
                            className="mt-1 block w-full border-gray-200 rounded-lg"
                            value={newDate}
                            onChange={e => setNewDate(e.target.value)}
                        />
                    </div>
                    <div>
                        <label className="block text-xs font-medium text-gray-600">
                            Status
                        </label>
                        <select
                            className="mt-1 block w-full border-gray-200 rounded-lg"
                            value={newStatus}
                            onChange={e => setNewStatus(e.target.value)}
                        >
                            <option value="Present">Present</option>
                            <option value="Absent">Absent</option>
                        </select>
                    </div>
                    <div className="flex-1">
                        <label className="block text-xs font-medium text-gray-600">
                            Notes (optional)
                        </label>
                        <input
                            type="text"
                            className="mt-1 block w-full border-gray-200 rounded-lg"
                            value={newNotes}
                            onChange={e => setNewNotes(e.target.value)}
                        />
                    </div>
                    <button
                        onClick={addRecord}
                        className="flex items-center gap-2 px-4 py-2 bg-green-600 text-white rounded-xl hover:bg-green-700 transition-all text-sm"
                    >
                        <Plus size={16} />
                        Add
                    </button>
                </div>
            </div>

            {/* records table */}
            <div className="bg-white rounded-xl border border-gray-200 shadow-sm overflow-x-auto">
                {loading ? (
                    <div className="p-6 text-center">Loading records...</div>
                ) : error ? (
                    <div className="p-6 text-red-600 text-center">{error}</div>
                ) : records.length === 0 ? (
                    <div className="p-6 text-gray-500 text-center">
                        No attendance records yet.
                    </div>
                ) : (
                    <table className="w-full text-left">
                        <thead className="bg-gray-50 text-gray-600 text-xs uppercase font-semibold">
                            <tr>
                                <th className="px-6 py-4">Date</th>
                                <th className="px-6 py-4">Status</th>
                                <th className="px-6 py-4">Notes</th>
                            </tr>
                        </thead>
                        <tbody className="divide-y divide-gray-100">
                            {records.map(r => (
                                <tr key={r.id} className="hover:bg-gray-50 transition-colors">
                                    <td className="px-6 py-4 text-sm text-gray-900">
                                        {new Date(r.date).toLocaleDateString()}
                                    </td>
                                    <td className="px-6 py-4 text-sm">
                                        <span className={`px-2 py-1 rounded-full text-xs font-medium ${
                                            r.status === 'Present' ? 'bg-green-100 text-green-700' : 'bg-red-100 text-red-700'
                                        }`}>
                                            {r.status}
                                        </span>
                                    </td>
                                    <td className="px-6 py-4 text-sm text-gray-600">
                                        {r.notes || '-'}
                                    </td>
                                </tr>
                            ))}
                        </tbody>
                    </table>
                )}
            </div>
        </div>
    );
};

export default BeneficiaryAttendance;

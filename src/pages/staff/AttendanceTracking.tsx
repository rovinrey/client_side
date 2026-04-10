import { useState, useEffect } from "react";
import { Search, Plus, Edit2, Trash2, Calendar, Users } from "lucide-react";
import axios from "axios";
import { API_BASE_URL } from '../../api/config';

interface AttendanceRecord {
    id: number;
    beneficiary_id: number;
    beneficiary_name: string;
    program: string;
    date: string;
    status: 'Present' | 'Absent' | 'Late';
    remarks: string;
}

const AttendanceTracking = () => {
    const [attendance, setAttendance] = useState<AttendanceRecord[]>([]);
    const [loading, setLoading] = useState(true);
    const [search, setSearch] = useState("");
    const [selectedProgram, setSelectedProgram] = useState("All");
    const [showModal, setShowModal] = useState(false);
    const [formData, setFormData] = useState({
        beneficiary_id: "",
        program: "",
        date: new Date().toISOString().split('T')[0],
        status: "Present",
        remarks: ""
    });

    useEffect(() => {
        fetchAttendance();
    }, [selectedProgram]);

    const fetchAttendance = async () => {
        setLoading(true);
        try {
            const response = await axios.get(`${API_BASE_URL}/api/attendance`);
            setAttendance(response.data);
        } catch (error) {
            console.error("Error fetching attendance:", error);
        } finally {
            setLoading(false);
        }
    };

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        try {
            await axios.post(`${API_BASE_URL}/api/attendance`, formData);
            setFormData({
                beneficiary_id: "",
                program: "",
                date: new Date().toISOString().split('T')[0],
                status: "Present",
                remarks: ""
            });
            setShowModal(false);
            fetchAttendance();
            alert("Attendance recorded successfully!");
        } catch (error) {
            console.error("Error recording attendance:", error);
            alert("Failed to record attendance");
        }
    };

    const filteredAttendance = attendance.filter(record =>
        (selectedProgram === "All" || record.program === selectedProgram) &&
        record.beneficiary_name.toLowerCase().includes(search.toLowerCase())
    );

    const programs = ["All", ...new Set(attendance.map(a => a.program))];

    return (
        <div className="space-y-6">
            {/* Header */}
            <div className="flex justify-between items-end">
                <div>
                    <h1 className="text-2xl font-bold text-gray-900 flex items-center gap-2">
                        <Calendar size={28} /> Attendance Tracking
                    </h1>
                    <p className="text-gray-500 text-sm">Record and monitor program attendance</p>
                </div>
                <button
                    onClick={() => setShowModal(true)}
                    className="flex items-center gap-2 bg-teal-600 hover:bg-teal-700 text-white px-5 py-2.5 rounded-xl font-semibold text-sm transition-all shadow-lg shadow-teal-100"
                >
                    <Plus size={18} />
                    Record Attendance
                </button>
            </div>

            {/* Filters */}
            <div className="flex gap-4 flex-wrap">
                <div className="flex-1 min-w-64">
                    <input
                        type="text"
                        placeholder="Search beneficiary name..."
                        value={search}
                        onChange={(e) => setSearch(e.target.value)}
                        className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-teal-500"
                    />
                </div>
                <select
                    value={selectedProgram}
                    onChange={(e) => setSelectedProgram(e.target.value)}
                    className="px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-teal-500"
                >
                    {programs.map(prog => (
                        <option key={prog} value={prog}>{prog}</option>
                    ))}
                </select>
            </div>

            {/* Attendance Table */}
            {loading ? (
                <div className="flex justify-center py-12">
                    <p className="text-gray-500">Loading attendance records...</p>
                </div>
            ) : (
                <div className="bg-white rounded-2xl shadow-sm border border-gray-200 overflow-hidden">
                    <div className="overflow-x-auto">
                        <table className="w-full">
                            <thead>
                                <tr className="bg-gray-50 border-b border-gray-200">
                                    <th className="px-6 py-4 text-left text-sm font-semibold text-gray-700">Name</th>
                                    <th className="px-6 py-4 text-left text-sm font-semibold text-gray-700">Program</th>
                                    <th className="px-6 py-4 text-left text-sm font-semibold text-gray-700">Date</th>
                                    <th className="px-6 py-4 text-left text-sm font-semibold text-gray-700">Status</th>
                                    <th className="px-6 py-4 text-left text-sm font-semibold text-gray-700">Remarks</th>
                                    <th className="px-6 py-4 text-center text-sm font-semibold text-gray-700">Actions</th>
                                </tr>
                            </thead>
                            <tbody>
                                {filteredAttendance.map(record => (
                                    <tr key={record.id} className="border-b border-gray-200 hover:bg-gray-50">
                                        <td className="px-6 py-4 text-sm font-medium text-gray-900">{record.beneficiary_name}</td>
                                        <td className="px-6 py-4 text-sm text-gray-600">{record.program}</td>
                                        <td className="px-6 py-4 text-sm text-gray-600">{new Date(record.date).toLocaleDateString()}</td>
                                        <td className="px-6 py-4 text-sm">
                                            <span className={`px-3 py-1 rounded-full text-xs font-semibold ${
                                                record.status === 'Present' ? 'bg-green-100 text-green-700' :
                                                record.status === 'Late' ? 'bg-yellow-100 text-yellow-700' :
                                                'bg-red-100 text-red-700'
                                            }`}>
                                                {record.status}
                                            </span>
                                        </td>
                                        <td className="px-6 py-4 text-sm text-gray-600">{record.remarks}</td>
                                        <td className="px-6 py-4 text-center">
                                            <button className="text-teal-600 hover:text-teal-700 mr-2">
                                                <Edit2 size={16} />
                                            </button>
                                            <button className="text-red-600 hover:text-red-700">
                                                <Trash2 size={16} />
                                            </button>
                                        </td>
                                    </tr>
                                ))}
                            </tbody>
                        </table>
                    </div>
                </div>
            )}

            {/* Modal */}
            {showModal && (
                <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
                    <div className="bg-white rounded-2xl p-8 w-full max-w-md">
                        <h2 className="text-xl font-bold mb-6">Record Attendance</h2>
                        <form onSubmit={handleSubmit} className="space-y-4">
                            <div>
                                <label className="block text-sm font-medium text-gray-700 mb-2">Beneficiary ID</label>
                                <input
                                    type="text"
                                    value={formData.beneficiary_id}
                                    onChange={(e) => setFormData({...formData, beneficiary_id: e.target.value})}
                                    className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-teal-500"
                                    required
                                />
                            </div>
                            <div>
                                <label className="block text-sm font-medium text-gray-700 mb-2">Program</label>
                                <input
                                    type="text"
                                    value={formData.program}
                                    onChange={(e) => setFormData({...formData, program: e.target.value})}
                                    className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-teal-500"
                                    required
                                />
                            </div>
                            <div>
                                <label className="block text-sm font-medium text-gray-700 mb-2">Date</label>
                                <input
                                    type="date"
                                    value={formData.date}
                                    onChange={(e) => setFormData({...formData, date: e.target.value})}
                                    className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-teal-500"
                                    required
                                />
                            </div>
                            <div>
                                <label className="block text-sm font-medium text-gray-700 mb-2">Status</label>
                                <select
                                    value={formData.status}
                                    onChange={(e) => setFormData({...formData, status: e.target.value as 'Present' | 'Absent' | 'Late'})}
                                    className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-teal-500"
                                >
                                    <option value="Present">Present</option>
                                    <option value="Absent">Absent</option>
                                    <option value="Late">Late</option>
                                </select>
                            </div>
                            <div>
                                <label className="block text-sm font-medium text-gray-700 mb-2">Remarks</label>
                                <textarea
                                    value={formData.remarks}
                                    onChange={(e) => setFormData({...formData, remarks: e.target.value})}
                                    className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-teal-500"
                                    rows={3}
                                />
                            </div>
                            <div className="flex gap-3 pt-4">
                                <button type="button" onClick={() => setShowModal(false)} className="flex-1 px-4 py-2 border border-gray-300 rounded-lg hover:bg-gray-50">Cancel</button>
                                <button type="submit" className="flex-1 px-4 py-2 bg-teal-600 text-white rounded-lg hover:bg-teal-700">Submit</button>
                            </div>
                        </form>
                    </div>
                </div>
            )}
        </div>
    );
};

export default AttendanceTracking;

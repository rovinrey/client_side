import { useState, useEffect } from "react";
import axios from "axios";
import { API_BASE_URL } from '../api/config';

interface AttendanceRecord {
    id: number;
    userId: number;
    beneficiaryName: string;
    programType: string;
    date: string;
    timeIn: string | null;
    timeOut: string | null;
    status: string;
    description: string;
}

interface MonitoringApiRecord {
    attendance_id: number;
    user_id: number;
    beneficiary_name: string | null;
    program_type: string | null;
    attendance_date: string;
    time_in: string | null;
    time_out: string | null;
    status: string;
    remarks: string | null;
}

const AttendanceMonitoringTable = () => {
    const [attendanceRecords, setAttendanceRecords] = useState<AttendanceRecord[]>([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);

    const token = localStorage.getItem("token");

    useEffect(() => {
        fetchAttendanceRecords();
    }, []);

    const fetchAttendanceRecords = async () => {
        setLoading(true);
        setError(null);

        try {
            const response = await axios.get<MonitoringApiRecord[]>(
                `${API_BASE_URL}/api/attendance/monitoring?limit=200`,
                { headers: { Authorization: `Bearer ${token}` } }
            );

            const mapped = (response.data || []).map((record) => ({
                id: record.attendance_id,
                userId: record.user_id,
                beneficiaryName: record.beneficiary_name || `User #${record.user_id}`,
                programType: record.program_type || "N/A",
                date: record.attendance_date,
                timeIn: record.time_in,
                timeOut: record.time_out,
                status: record.status || "Incomplete",
                description: record.remarks || "-"
            }));

            setAttendanceRecords(mapped);
        } catch (err: any) {
            console.error(err);
            setError(err?.response?.data?.message || "Failed to load attendance records. Please try again.");
        } finally {
            setLoading(false);
        }
    };

    const formatDate = (value: string) => {
        return new Date(value).toLocaleDateString('en-PH', {
            month: 'short',
            day: 'numeric',
            year: 'numeric'
        });
    };

    const formatTime = (value: string | null) => {
        if (!value) return '—';
        return new Date(value).toLocaleTimeString('en-PH', {
            hour: '2-digit',
            minute: '2-digit'
        });
    };

    if (loading) {
        return (
            <div className="flex items-center justify-center py-20">
                <div className="flex flex-col items-center">
                    <div className="animate-spin rounded-full h-16 w-16 border-t-4 border-teal-600 border-solid mb-4" />
                    <span className="text-gray-600 text-lg font-semibold">Loading attendance records...</span>
                </div>
            </div>
        );
    }

    if (error) {
        return (
            <div className="text-center py-20">
                <p className="text-red-500 text-lg">{error}</p>
                <button
                    onClick={fetchAttendanceRecords}
                    className="mt-4 px-4 py-2 bg-teal-600 text-white rounded-lg hover:bg-teal-700"
                >
                    Retry
                </button>
            </div>
        );
    }

    return (
        <div className="bg-white rounded-lg shadow-sm border border-gray-200 overflow-hidden">
            <div className="px-6 py-4 border-b border-gray-200">
                <h2 className="text-xl font-semibold text-gray-900">Attendance Monitoring</h2>
                <p className="text-sm text-gray-600 mt-1">Track beneficiary attendance across programs</p>
            </div>

            <div className="overflow-x-auto">
                <table className="min-w-full divide-y divide-gray-200">
                    <thead className="bg-gray-50">
                        <tr>
                            <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                                User ID
                            </th>
                            <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                                Beneficiary
                            </th>
                            <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                                Program
                            </th>
                            <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                                Date
                            </th>
                            <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                                Time In
                            </th>
                            <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                                Time Out
                            </th>
                            <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                                Status
                            </th>
                            <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                                Description
                            </th>
                        </tr>
                    </thead>
                    <tbody className="bg-white divide-y divide-gray-200">
                        {attendanceRecords.map((record) => (
                            <tr key={record.id} className="hover:bg-gray-50">
                                <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-900">
                                    {record.userId}
                                </td>
                                <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                                    {record.beneficiaryName}
                                </td>
                                <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                                    {record.programType}
                                </td>
                                <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                                    {formatDate(record.date)}
                                </td>
                                <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                                    {formatTime(record.timeIn)}
                                </td>
                                <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                                    {formatTime(record.timeOut)}
                                </td>
                                <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                                    {record.status}
                                </td>
                                <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                                    {record.description}
                                </td>
                            </tr>
                        ))}
                    </tbody>
                </table>
            </div>

            {attendanceRecords.length === 0 && (
                <div className="text-center py-12">
                    <p className="text-gray-500 text-lg">No attendance records found.</p>
                </div>
            )}
        </div>
    );
};

export default AttendanceMonitoringTable;